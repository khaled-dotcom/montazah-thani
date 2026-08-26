#!/usr/bin/env node
/**
 * Backs up everything a resident would lose if this machine died.
 *
 *   node scripts/backup.mjs [destination]      (default: ./backups)
 *
 * Three stores, and all three matter:
 *
 *   montazah_site  PostgreSQL — counter bookings, contact messages, and the
 *                  news and landmarks the dashboard publishes
 *   districts_db   PostgreSQL — the assistant's complaints, appointments,
 *                  conversations, knowledge base and its vectors
 *   agent-uploads  complaint attachments and appointment cards — residents'
 *                  photographs, which exist in no other copy
 *
 * The two databases are dumped with pg_dump in custom format: compressed, and
 * restorable table by table with pg_restore. It runs against a live server and
 * takes a consistent snapshot, so residents can go on booking while it works.
 *
 * Every backup is verified after it is written. An unverified backup is a guess,
 * and the day you find out is the day you needed it.
 *
 * This is a local operator tool, not a backup strategy. A single copy on the
 * same disk as the original protects against a bad migration and nothing else —
 * put the output somewhere else, on a schedule, and test a restore.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const root = process.argv[2] ?? path.join(process.cwd(), 'backups');
const outDir = path.join(root, stamp);

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const size = (p) => `${(fs.statSync(p).size / 1024 / 1024).toFixed(1)}MB`;

function docker(args, options = {}) {
  return execFileSync('docker', args, {
    encoding: options.encoding ?? 'utf8',
    maxBuffer: 1024 * 1024 * 512,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

/** Is the stack running under compose, or is this a bare local checkout? */
function composeRunning() {
  try {
    return docker(['compose', 'ps', '--services', '--status', 'running']).trim().length > 0;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- postgres */

/**
 * Dump one database out of the `db` container and prove the file is readable.
 *
 * Verification runs pg_restore --list over the archive, which makes it parse
 * the table of contents. A dump truncated mid-write is still a file of
 * plausible size and still has a plausible name; it fails here, which is the
 * entire reason to check rather than assume.
 */
function dumpDatabase({ label, database, filename, expect = [] }) {
  if (!composeRunning()) {
    record(label, false, 'the stack is not running');
    return;
  }

  const target = path.join(outDir, filename);
  const user = process.env.POSTGRES_USER ?? 'postgres';

  try {
    const dump = docker(
      ['compose', 'exec', '-T', 'db', 'pg_dump', '-U', user, '-d', database, '-F', 'c'],
      { encoding: 'buffer' },
    );
    fs.writeFileSync(target, dump);
  } catch (error) {
    record(label, false, String(error.message).split('\n')[0]);
    return;
  }

  try {
    const toc = execFileSync(
      'docker',
      [
        'compose', 'exec', '-T', 'db', 'sh', '-c',
        'cat > /tmp/verify.dump && pg_restore --list /tmp/verify.dump; rm -f /tmp/verify.dump',
      ],
      { input: fs.readFileSync(target), encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
    );

    const tables = (toc.match(/TABLE DATA/g) ?? []).length;

    /* Naming the tables we expect catches the failure a table count cannot: a
       dump of the wrong database. Both of these live on the same server, and
       an archive full of the assistant's tables is a perfectly valid file that
       restores none of the district's bookings. */
    const missing = expect.filter((table) => !new RegExp(`TABLE DATA public ${table}\\b`).test(toc));

    record(
      label,
      tables > 0 && missing.length === 0,
      missing.length > 0
        ? `wrong database? missing ${missing.join(', ')}`
        : tables > 0
          ? `${size(target)}, ${tables} table(s)`
          : 'the archive has no readable table of contents',
    );
  } catch (error) {
    record(label, false, `unreadable: ${String(error.message).split('\n')[0]}`);
  }
}

function backupSiteDatabase() {
  dumpDatabase({
    label: 'bookings, messages and published content',
    database: process.env.SITE_POSTGRES_DB ?? 'montazah_site',
    filename: 'site.dump',
    expect: ['appointments', 'messages'],
  });
}

function backupAssistantDatabase() {
  dumpDatabase({
    label: 'assistant database',
    database: process.env.POSTGRES_DB ?? 'districts_db',
    filename: 'assistant.dump',
    expect: ['complaints'],
  });
}

/* ------------------------------------------------------------------ uploads */

function backupUploads() {
  if (!composeRunning()) {
    record('complaint attachments and tickets', false, 'the stack is not running');
    return;
  }

  const target = path.join(outDir, 'agent-uploads.tar');
  try {
    const tar = docker(
      ['compose', 'exec', '-T', 'agent', 'tar', '-cf', '-', '-C', '/app/static', 'uploads'],
      { encoding: 'buffer' },
    );
    fs.writeFileSync(target, tar);
    /* --force-local: GNU tar reads a Windows path as host "C", path
       "\path", and fails to resolve it — so the archive is written
       correctly and then declared unverifiable on every Windows machine. */
    const listing = execFileSync('tar', ['--force-local', '-tf', target], { encoding: 'utf8' })
      .split('\n')
      .filter((line) => line.trim() && !line.endsWith('/')).length;
    record('complaint attachments and tickets', true, `${size(target)}, ${listing} file(s)`);
  } catch (error) {
    record('complaint attachments and tickets', false, String(error.message).split('\n')[0]);
  }
}

/* --------------------------------------------------------------------- run */

fs.mkdirSync(outDir, { recursive: true });

console.log(`\nBackup — حي المنتزه الثانية\n${'─'.repeat(72)}`);
console.log(`Writing to ${outDir}\n`);

/* These files are every booking, complaint, national ID and attachment the
   district holds. A consumer sync client will copy all of it into a personal
   cloud account, which is a disclosure, not a backup. */
if (/onedrive|dropbox|google ?drive|icloud/i.test(outDir)) {
  console.log('  !!  This path is inside a consumer cloud-sync folder.');
  console.log('      Everything written here — names, national IDs, telephone');
  console.log('      numbers, complaint photographs — will be uploaded to that');
  console.log('      account. Pass a destination outside it:');
  console.log('        npm run backup -- D:/district-backups\n');
}

backupSiteDatabase();
backupAssistantDatabase();
backupUploads();

const failed = results.filter((r) => !r.ok);

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  `${JSON.stringify({ takenAt: new Date().toISOString(), results }, null, 2)}\n`,
);

console.log(`\n${'─'.repeat(72)}`);
if (failed.length === 0) {
  console.log('All three stores backed up and verified.\n');
  console.log('This copy is on the same disk as the original. Move it off the machine,');
  console.log('and restore it somewhere at least once — an untested backup is a guess.\n');
} else {
  console.log(`${failed.length} of ${results.length} failed. Nothing here is a usable backup yet.\n`);
  process.exit(1);
}
