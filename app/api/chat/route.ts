import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

import { AgentError, agentConfigured, askAgent } from '@/lib/agent';
import {
  answerLocally,
  buildContext,
  parseMessages,
  retrieve,
  systemPrompt,
} from '@/lib/assistant';
import { ui } from '@/content/ui';
import { isLocale, type Locale } from '@/lib/i18n';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Assistant endpoint. Three answering modes, tried in that order:
 *
 *   agent  — the citizen-service assistant in agent/, when AGENT_URL is set.
 *            The only mode that can *do* anything: file a complaint, route it
 *            to a department, book an appointment, issue a reference number,
 *            and report the status of one later.
 *   llm    — Claude over passages retrieved from this site's own content.
 *            Answers questions; cannot act.
 *   local  — the retrieval result on its own, with no model at all.
 *
 * The fallbacks are not a nicety. A resident mid-complaint who gets a blank
 * panel because a container restarted has been failed by the district, so
 * every failure below lands on the next mode down rather than on an error.
 */

const MODEL = 'claude-opus-5';

/** Matches the agent's own session-id rule, so a bad id is rejected here. */
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;

/* A deliberately small in-process limiter. It survives a single server
   instance only — put a real limiter (or the CDN's) in front in production.
   The agent keeps its own limiter in the database, shared across workers. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  if (buckets.size > 5000) buckets.clear(); // crude ceiling on memory
  return bucket.count > MAX_PER_WINDOW;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
}

/** The site's own answer, used on its own and as the floor under the others. */
async function localAnswer(question: string, locale: Locale) {
  const local = await answerLocally(question, locale);
  return NextResponse.json({
    reply: local.reply,
    sources: local.sources.map((h) => ({ title: h.title, href: h.href, type: h.type })),
    mode: 'local',
  });
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const {
    messages: rawMessages,
    locale: rawLocale,
    sessionId: rawSessionId,
  } = (payload ?? {}) as Record<string, unknown>;

  const messages = parseMessages(rawMessages);
  const locale: Locale = typeof rawLocale === 'string' && isLocale(rawLocale) ? rawLocale : 'ar';

  if (!messages) {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const question = messages[messages.length - 1]?.content ?? '';

  // ── agent ──────────────────────────────────────────────────────────────────
  // It is stateful, so it takes the session id and the newest message only —
  // the transcript it needs it already holds.
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId : '';
  if (agentConfigured() && SESSION_ID.test(sessionId)) {
    try {
      const turn = await askAgent(sessionId, question);
      return NextResponse.json({
        reply: turn.reply,
        sources: [],
        mode: 'agent',
        intent: turn.intent,
        reference: turn.reference,
        ticketUrl: turn.ticketReference ? `/api/chat/ticket/${turn.ticketReference}` : null,
      });
    } catch (error) {
      // 429 is the assistant's own rate limit, and it is a real answer to the
      // visitor rather than a fault — pass it straight through instead of
      // silently switching modes and letting them keep typing.
      if (error instanceof AgentError && error.status === 429) {
        return NextResponse.json(
          { reply: error.citizenMessage ?? '', mode: 'agent', error: 'rate_limited' },
          { status: 429, headers: { 'Retry-After': '60' } },
        );
      }
      /* A timeout is not the same as a failure, and must not be answered like
         one. The assistant writes the complaint and issues its reference
         before it composes the reply, so a turn we stopped waiting for may
         have been recorded anyway. Answering with the site's generic
         retrieval text would tell that resident nothing happened — and the
         likely result is that they file the same complaint twice, or give up
         on one that already exists. Say what is actually true instead. */
      if (error instanceof AgentError && error.timedOut) {
        console.error('[assistant] the citizen-service agent timed out', error.message);
        return NextResponse.json({
          reply: ui.chatTimeout[locale],
          sources: [],
          mode: 'agent',
          error: 'timeout',
        });
      }

      console.error('[assistant] the citizen-service agent failed', error);
      // fall through to the site's own assistant
    }
  }

  // ── llm over site content ──────────────────────────────────────────────────
  const hits = await retrieve(question, locale, 5);
  const sources = hits.map((h) => ({ title: h.title, href: h.href, type: h.type }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return await localAnswer(question, locale);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1500, // answers are intentionally short; the widget is a help panel
      // Retrieval has already done the reasoning-heavy part, so keep latency low.
      output_config: { effort: 'low' },
      // Server-side fallback: if a request is declined the API re-runs it on a
      // fallback model in the same call rather than returning nothing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        {
          type: 'text',
          text: systemPrompt(locale, buildContext(hits)),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({
        reply:
          locale === 'ar'
            ? 'لا أستطيع الإجابة عن هذا الطلب. لو كان استفسارًا عن خدمات الحي، أعد صياغته من فضلك.'
            : 'I am not able to answer that request. If it concerns district services, please rephrase it.',
        sources: [],
        mode: 'llm',
      });
    }

    const reply = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!reply) throw new Error('empty response');

    return NextResponse.json({ reply, sources, mode: 'llm' });
  } catch (error) {
    // Never leave the visitor with nothing: degrade to the retrieval answer.
    if (error instanceof Anthropic.RateLimitError) {
      console.error('[assistant] rate limited by the API');
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error('[assistant] ANTHROPIC_API_KEY was rejected');
    } else {
      console.error('[assistant] request failed', error);
    }

    return await localAnswer(question, locale);
  }
}
