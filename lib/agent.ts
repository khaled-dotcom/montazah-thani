import 'server-only';

/**
 * Client for the citizen-service assistant that runs beside this site.
 *
 * The assistant is a separate service (agent/ in this repository — Flask +
 * LangGraph over PostgreSQL) and it is the half of the system that can *act*:
 * it files a complaint, routes it to the right department, books an
 * appointment and issues a reference number. This site's own retrieval
 * assistant can only read.
 *
 * The two are wired so the visitor never sees the seam. `/api/chat` calls the
 * assistant when AGENT_URL is set, and falls back to the site's own answer if
 * the assistant is unreachable, so an outage in one degrades the widget rather
 * than breaking it.
 *
 * The assistant is never exposed to the browser directly: the ticket image it
 * produces is fetched back through `/api/chat/ticket/[reference]`, so the
 * service can sit on a private network and the page's `img-src 'self'` policy
 * holds.
 */

import type { AgentForm, AgentFormKind } from '@/lib/agent-types';

const RAW_URL = process.env.AGENT_URL ?? '';

/** Base URL of the assistant service, without a trailing slash. */
export const agentUrl = RAW_URL.replace(/\/+$/, '');

/**
 * Which district row in the assistant's database this site speaks for. With it
 * set, the assistant knows where a caller is writing from and does not ask.
 */
export const agentDistrictId = (() => {
  const raw = Number.parseInt(process.env.AGENT_DISTRICT_ID ?? '', 10);
  return Number.isInteger(raw) && raw > 0 ? raw : null;
})();

/**
 * Shared secret for this hop, when the assistant is not on a private network.
 *
 * In compose the assistant sits behind nginx on an internal network and no
 * one outside can reach it, so it needs no credential. Hosted in the cloud its
 * ingress is public, and `/api/chat` files complaints in residents' names —
 * ALLOWED_ORIGINS does not stop that, because CORS constrains browsers and a
 * `curl` ignores it entirely.
 *
 * Set AGENT_TOKEN to the same value on both services and the assistant refuses
 * anything that does not present it. Leave it unset and the pair behaves
 * exactly as before, which is correct behind a private network and nowhere
 * else.
 */
const AGENT_TOKEN = (process.env.AGENT_TOKEN ?? '').trim();

/** Headers every call to the assistant carries. */
function agentHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...extra,
    ...(AGENT_TOKEN ? { Authorization: `Bearer ${AGENT_TOKEN}` } : {}),
  };
}

export function agentConfigured(): boolean {
  return agentUrl.length > 0;
}

/** The form shapes live in lib/agent-types.ts, which the browser can import. */
export type { AgentForm, AgentFormField, AgentFormKind } from '@/lib/agent-types';

/**
 * One conversation turn. The assistant is stateful — it keys the citizen's
 * identity, the draft request and the running summary off `sessionId` — so
 * only the newest message is sent, never the transcript.
 */
export type AgentTurn = {
  reply: string;
  intent: string | null;
  /** Complaint or appointment number, once one has been issued. */
  reference: string | null;
  /** Set when the turn produced a downloadable appointment card. */
  ticketReference: string | null;
  /** Set when the turn opened a form for the citizen to fill in. */
  form: AgentForm | null;
};

/**
 * How long to wait for one conversation turn.
 *
 * This has to sit *above* the assistant's own budget, not below it. The
 * assistant gives each model attempt GROQ_TIMEOUT seconds (45 by default) and
 * retries before moving down its fallback chain — so a caller that gives up at
 * 40s quits before the assistant's very first attempt has even failed, and
 * every slow turn looks like an outage. Keep this longer than one attempt, and
 * keep GROQ_TIMEOUT × (GROQ_MAX_RETRIES + 1) below it; see agent/README.md.
 *
 * A normal turn answers in two to ten seconds. This is the ceiling, not the
 * expectation.
 */
const TIMEOUT_MS = 60_000;

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** The assistant's own Arabic message, when it sent one worth showing. */
    readonly citizenMessage?: string,
    /**
     * True when we stopped waiting rather than being refused.
     *
     * This distinction matters more than it looks. The assistant writes the
     * complaint and issues its reference *before* it composes the reply, so a
     * turn we abandoned may have been recorded anyway. Telling that resident
     * "I could not help" would be a lie that costs them their complaint.
     */
    readonly timedOut = false,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export async function askAgent(sessionId: string, message: string): Promise<AgentTurn> {
  if (!agentConfigured()) throw new AgentError('AGENT_URL is not set');

  let response: Response;
  try {
    response = await fetch(`${agentUrl}/api/chat`, {
      method: 'POST',
      headers: agentHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        session_id: sessionId,
        message,
        district_id: agentDistrictId,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new AgentError(
      timedOut ? `the assistant did not answer within ${TIMEOUT_MS / 1000}s` : 'the assistant is unreachable',
      undefined,
      undefined,
      timedOut,
    );
  }

  const data = (await response.json().catch(() => null)) as {
    reply?: unknown;
    intent?: unknown;
    reference?: unknown;
    ticket_url?: unknown;
    form?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok) {
    throw new AgentError(
      `assistant returned ${response.status}`,
      response.status,
      typeof data?.message === 'string' ? data.message : undefined,
    );
  }

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new AgentError('assistant returned an empty reply');

  return {
    reply,
    intent: typeof data?.intent === 'string' ? data.intent : null,
    reference: typeof data?.reference === 'string' ? data.reference : null,
    ticketReference: ticketReferenceFrom(data?.ticket_url),
    form: formFrom(data?.form),
  };
}

/**
 * Accept a form descriptor only if it has the parts the panel needs to draw
 * something usable. A half-formed descriptor renders as an empty box with a
 * submit button, which is worse than no form at all — the citizen presses it
 * and nothing they typed is there.
 */
function formFrom(value: unknown): AgentForm | null {
  if (!value || typeof value !== 'object') return null;

  const form = value as Partial<AgentForm>;
  if (form.kind !== 'appointment' && form.kind !== 'complaint') return null;
  if (!Array.isArray(form.fields) || form.fields.length === 0) return null;
  if (typeof form.title !== 'string' || typeof form.submitLabel !== 'string') return null;

  return form as AgentForm;
}

/**
 * Submit a form the assistant opened. This is the write path: the assistant
 * re-validates every field and creates the appointment or complaint row, so
 * nothing here is trusted beyond being forwarded.
 */
export async function submitAgentForm(
  sessionId: string,
  kind: AgentFormKind,
  values: Record<string, string>,
): Promise<
  | { ok: true; turn: AgentTurn }
  | { ok: false; status: number; message?: string; fields?: Record<string, string> }
> {
  if (!agentConfigured()) throw new AgentError('AGENT_URL is not set');

  let response: Response;
  try {
    response = await fetch(`${agentUrl}/api/forms/${kind}`, {
      method: 'POST',
      headers: agentHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        session_id: sessionId,
        values,
        district_id: agentDistrictId,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new AgentError(
      timedOut
        ? `the assistant did not answer within ${TIMEOUT_MS / 1000}s`
        : 'the assistant is unreachable',
      undefined,
      undefined,
      timedOut,
    );
  }

  const data = (await response.json().catch(() => null)) as {
    reply?: unknown;
    intent?: unknown;
    reference?: unknown;
    ticket_url?: unknown;
    message?: unknown;
    fields?: unknown;
  } | null;

  if (!response.ok) {
    /* A 422 is the citizen's own data coming back for correction, not a
       fault: it carries a message per field and the panel marks each one. */
    const fields =
      data?.fields && typeof data.fields === 'object'
        ? (data.fields as Record<string, string>)
        : undefined;

    return {
      ok: false,
      status: response.status,
      message: typeof data?.message === 'string' ? data.message : undefined,
      fields,
    };
  }

  return {
    ok: true,
    turn: {
      reply: typeof data?.reply === 'string' ? data.reply.trim() : '',
      intent: typeof data?.intent === 'string' ? data.intent : null,
      reference: typeof data?.reference === 'string' ? data.reference : null,
      ticketReference: ticketReferenceFrom(data?.ticket_url),
      form: null,
    },
  };
}

/**
 * The assistant returns its ticket as a path on its own host. Only the
 * reference is carried across, and `/api/chat/ticket/[reference]` rebuilds the
 * path — so a malformed or hostile value cannot become a URL this server
 * fetches.
 */
function ticketReferenceFrom(ticketUrl: unknown): string | null {
  if (typeof ticketUrl !== 'string') return null;
  const match = /([A-Za-z0-9_-]{4,32})\.png$/.exec(ticketUrl);
  return match ? match[1] : null;
}

/** Fetch one appointment card from the assistant, by reference. */
export async function fetchTicket(reference: string): Promise<Response> {
  if (!agentConfigured()) throw new AgentError('AGENT_URL is not set');

  return fetch(`${agentUrl}/static/uploads/tickets/${reference}.png`, {
    headers: agentHeaders(),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
}

/** Is the assistant service up? Used by /api/health. */
export async function agentHealthy(): Promise<boolean> {
  if (!agentConfigured()) return false;
  try {
    const response = await fetch(`${agentUrl}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
