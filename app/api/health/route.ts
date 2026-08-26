import { NextResponse } from 'next/server';

import { agentConfigured, agentHealthy } from '@/lib/agent';
import { healthCheck } from '@/lib/db';
import { buildIndex } from '@/lib/search-index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness and readiness for the load balancer or container orchestrator.
 *
 * It touches the database on purpose. A process that is up but cannot write
 * bookings is not healthy — it will accept requests and lose them, which is
 * worse than being taken out of rotation. Nothing identifying is returned.
 *
 * The citizen-service assistant is reported but never fails the check. The
 * site answers from its own content without it, so an assistant that is down
 * is something to page an engineer about — not a reason to pull the whole
 * portal out of rotation.
 */
export async function GET() {
  const database = await healthCheck();
  const ok = database.ok;

  const assistant = agentConfigured()
    ? { configured: true, reachable: await agentHealthy() }
    : { configured: false, reachable: false };

  /* The chat panel answers from this corpus whenever the agent is not in play,
     so an empty one is the difference between answering a resident and telling
     them the site has nothing — while every page still serves perfectly. That
     failure is invisible from the outside, which is exactly why it is counted
     here rather than left to be discovered in a conversation. */
  let search: { docs: number; ok: boolean; error?: string };
  try {
    const docs = await buildIndex('ar');
    search = { docs: docs.length, ok: docs.length > 0 };
  } catch (error) {
    search = { docs: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      database,
      assistant,
      search,
      uptimeSeconds: Math.round(process.uptime()),
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
