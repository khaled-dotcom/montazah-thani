import { NextResponse } from 'next/server';

import { agentConfigured, fetchTicket } from '@/lib/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The appointment card the assistant issues, served from this origin.
 *
 * The assistant writes the card as a PNG on its own disk. Proxying it here
 * means the assistant never has to be reachable from a browser — it can stay
 * on the internal network — and the page's `img-src 'self'` policy needs no
 * exception for it.
 *
 * The reference is the only thing that crosses: it is matched against a strict
 * pattern before it is put in a path, so a crafted value cannot walk out of
 * the tickets directory.
 */
const REFERENCE = /^[A-Za-z0-9_-]{4,32}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  if (!agentConfigured()) {
    return NextResponse.json({ error: 'assistant_not_configured' }, { status: 404 });
  }
  if (!REFERENCE.test(reference)) {
    return NextResponse.json({ error: 'invalid_reference' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetchTicket(reference);
  } catch (error) {
    console.error('[assistant] could not fetch the appointment card', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'image/png',
      /* The card is the citizen's own booking. Private, and short-lived in the
         browser only, so a shared cache never holds someone else's. */
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${reference}.png"`,
    },
  });
}
