#!/usr/bin/env node
/**
 * Puts the running site on the public internet, for testing.
 *
 *   npm run preview            open (or reuse) a tunnel and align the site to it
 *   npm run preview -- --stop  close it again
 *
 * A Cloudflare quick tunnel: a free, throwaway `*.trycloudflare.com` address
 * with real TLS, reached outbound from this machine. No account, no domain, no
 * port forwarding, and nothing listening on the host — which is what makes it
 * work from a laptop behind NAT, or a machine whose 80 and 443 are already
 * taken by something else.
 *
 * It also rebuilds the site against the address it just got. That is not
 * decoration: NEXT_PUBLIC_SITE_URL is what sitemap.xml, robots.txt and every
 * canonical and hreflang tag are built from, and sitemap and robots are fully
 * static — so a site serving on one address while advertising another is
 * misindexed and its social cards resolve to nothing. Two minutes of rebuild
 * buys a preview that is actually representative.
 *
 * THIS IS FOR TESTING. The address is random, and a new one is issued every
 * time the tunnel restarts, so it cannot be given to residents. For the real
 * thing put a domain in front of it — see the deployment runbook.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT = 'montazah-thani';
const NETWORK = `${PROJECT}_internal`;
const TUNNEL = `${PROJECT}-tunnel`;
const IMAGE = 'cloudflare/cloudflared:latest';
const ENV_FILE = path.join(process.cwd(), '.env');

const stop = process.argv.includes('--stop');

function docker(args, options = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function quiet(args) {
  try {
    return docker(args).trim();
  } catch {
    return '';
  }
}

/**
 * A container's log, both streams together.
 *
 * cloudflared writes everything — including the one line that carries the
 * address — to stderr, and execFileSync hands back stdout alone. Reading only
 * stdout here means waiting sixty seconds for a banner that is already there.
 */
function logs(container) {
  const r = spawnSync('docker', ['logs', container], { encoding: 'utf8' });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------- stop */

if (stop) {
  if (quiet(['ps', '-aq', '-f', `name=^${TUNNEL}$`])) {
    quiet(['rm', '-f', TUNNEL]);
    console.log(`\nTunnel closed. The address is gone for good — a new one is issued next time.\n`);
  } else {
    console.log('\nNo tunnel was running.\n');
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ start */

console.log(`\nPublic preview — حي المنتزه الثانية\n${'─'.repeat(72)}\n`);

// The tunnel joins the compose network and reaches the site by service name,
// so the site itself never needs a port on the host.
if (!quiet(['network', 'ls', '-q', '-f', `name=^${NETWORK}$`])) {
  console.error(`The compose network ${NETWORK} does not exist.`);
  console.error('Start the stack first:  docker compose up -d\n');
  process.exit(1);
}

/**
 * Point the tunnel at nginx when nginx is up, and at the site directly when it
 * is not.
 *
 * This is the difference between testing the site and testing the deployment.
 * Going straight to web:3000 skips nginx entirely — its proxy headers, its
 * timeouts, its gzip, its buffering rules — so the preview passes while the
 * thing that will actually face the public has never served a request. When
 * nginx is running, everything goes through it.
 */
const viaNginx = Boolean(quiet(['ps', '-q', '-f', `name=^${PROJECT}-nginx$`]));
const target = viaNginx ? 'http://nginx:80' : 'http://web:3000';
const wanted = `preview-target=${target}`;

/* Recreate the tunnel if it is pointed somewhere else — otherwise starting
   nginx and re-running this would silently keep bypassing it. */
const existing = quiet(['ps', '-q', '-f', `name=^${TUNNEL}$`]);
const pointedAt = existing
  ? quiet(['inspect', '--format', '{{index .Config.Labels "preview-target"}}', TUNNEL])
  : '';

if (existing && pointedAt === target) {
  console.log(`  ..  reusing the tunnel already running (via ${viaNginx ? 'nginx' : 'the site directly'})`);
} else {
  if (existing) console.log(`  ..  re-pointing the tunnel at ${target}`);
  quiet(['rm', '-f', TUNNEL]);
  console.log(`  ..  opening a tunnel to ${target}`);
  docker([
    'run', '-d', '--name', TUNNEL, '--restart', 'unless-stopped',
    '--label', wanted,
    '--network', NETWORK, IMAGE,
    'tunnel', '--no-autoupdate', '--url', target,
  ]);
}

if (viaNginx) {
  console.log('  ..  requests will pass through nginx, as they will in production');
} else {
  console.log('  !!  nginx is not running — this bypasses it. `docker compose up -d nginx` to include it.');
}

/* cloudflared prints the address into its log once the edge has accepted the
   connection; there is no other way to learn it for a quick tunnel. */
let url = '';
for (let i = 0; i < 60; i += 1) {
  const match = logs(TUNNEL).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    [url] = match;
    break;
  }
  await sleep(1000);
}

if (!url) {
  console.error('\nThe tunnel did not report an address. Its log:\n');
  console.error(logs(TUNNEL).split('\n').slice(-30).join('\n'));
  process.exit(1);
}

console.log(`  OK  ${url}`);

/* ------------------------------------------------- align the site to it */

const env = fs.readFileSync(ENV_FILE, 'utf8');
const current = env.match(/^NEXT_PUBLIC_SITE_URL=(.*)$/m)?.[1]?.trim() ?? '';

if (current === url) {
  console.log('  ..  the site is already built for this address');
} else {
  const updated = env.match(/^NEXT_PUBLIC_SITE_URL=/m)
    ? env.replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, `NEXT_PUBLIC_SITE_URL=${url}`)
    : `${env.replace(/\n*$/, '\n')}NEXT_PUBLIC_SITE_URL=${url}\n`;
  fs.writeFileSync(ENV_FILE, updated);
  console.log(`  ..  NEXT_PUBLIC_SITE_URL set (was ${current || 'unset'})`);
  console.log('  ..  rebuilding the site so its canonical URLs match — a minute or two');

  execFileSync('docker', ['compose', 'up', '-d', '--build', 'web'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log('  OK  rebuilt and restarted');
}

/* ------------------------------------------------------------------ check */

console.log('\nChecking it from the outside:\n');

async function probe(label, pathname, expect) {
  try {
    const response = await fetch(`${url}${pathname}`, { redirect: 'manual' });
    const ok = expect(response.status);
    console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label} — HTTP ${response.status}`);
    return ok;
  } catch (error) {
    console.log(`  FAIL  ${label} — ${String(error.message).split('\n')[0]}`);
    return false;
  }
}

// The edge needs a moment to route a freshly restarted origin.
await sleep(3000);

const results = [
  await probe('the site', '/ar', (s) => s === 200),
  await probe('English', '/en', (s) => s === 200),
  await probe('health', '/api/health', (s) => s === 200),
  await probe('staff dashboard refuses anonymous access', '/admin', (s) => s === 401),
];

/**
 * Proof that nginx is genuinely in the path, not merely running beside it.
 *
 * Response headers cannot show this: Cloudflare rewrites `Server` to its own
 * name on the way out, so an origin behind a tunnel looks identical whether
 * nginx handled the request or not. What cannot be rewritten is nginx's own
 * access log — so send a request carrying a value nothing else would produce,
 * then look for it there.
 */
if (viaNginx) {
  const probe = `preview-${Date.now().toString(36)}`;
  try {
    await fetch(`${url}/ar?probe=${probe}`);
    await sleep(1200); // the log line is written after the response is sent
    /* Read the container's stdout, not the file. In the nginx image
       /var/log/nginx/access.log is a symlink to /dev/stdout, so `tail` on it
       blocks forever waiting for a stream that never ends. */
    const seen = logs(`${PROJECT}-nginx`).includes(probe);
    console.log(`  ${seen ? 'OK  ' : 'FAIL'}  nginx handled the request${seen ? '' : ' — not found in its access log'}`);
    results.push(seen);
  } catch (error) {
    console.log(`  WARN  could not read nginx's access log — ${String(error.message).split('\n')[0]}`);
  }
}

// robots.txt and sitemap.xml are the two files built from NEXT_PUBLIC_SITE_URL,
// so they are what proves the rebuild actually took.
try {
  const robots = await (await fetch(`${url}/robots.txt`)).text();
  const aligned = robots.includes(new URL(url).host);
  console.log(`  ${aligned ? 'OK  ' : 'WARN'}  robots.txt advertises ${aligned ? 'this address' : 'a different address'}`);
  results.push(aligned);
} catch {
  console.log('  WARN  could not read robots.txt');
}

console.log(`\n${'─'.repeat(72)}`);
if (results.every(Boolean)) {
  console.log(`\n  ${url}\n`);
  console.log('  Open it anywhere. Close it again with:  npm run preview -- --stop\n');
  console.log('  Testing only — this address is random and changes whenever the');
  console.log('  tunnel restarts, so do not give it to residents.\n');
} else {
  console.log('\nSomething above did not answer. Check `docker compose ps` and `docker compose logs web`.\n');
  process.exit(1);
}
