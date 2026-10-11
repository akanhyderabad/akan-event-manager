/**
 * POST /api/analytics/track — public, rate-limited event ingestion.
 *
 * Body: { eventId, sessionId, kind, metadata? }
 *
 * Always returns 204 No Content (even on validation failure) so the
 * endpoint can't be probed for valid event ids by guessing.
 * trackEvent() handles per-session rate limiting + event_id validation
 * internally; we just normalize the request envelope here.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { trackEvent, isAnalyticsKind } from '@/lib/event-analytics';
import {
  getCapiAccessToken,
  getEffectivePixelId,
  getTestEventCode,
  sendCapiEvent,
} from '@/lib/meta-pixel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // No-204 sentinel. Defined once so all error / success branches are
  // indistinguishable from outside.
  const NO_CONTENT = new NextResponse(null, { status: 204 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NO_CONTENT;
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const kindRaw = body.kind;
  if (!eventId || !sessionId || !isAnalyticsKind(kindRaw)) return NO_CONTENT;

  // Extract first IP from x-forwarded-for. Defensive against multiple
  // commas-separated values from proxy chains.
  const xff = req.headers.get('x-forwarded-for') || '';
  const ip = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const ua = req.headers.get('user-agent') || '';

  const metadata = (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
    ? (body.metadata as Record<string, unknown>)
    : undefined;

  // Silent — never surface validation errors to the public.
  trackEvent({
    eventId,
    sessionId,
    kind: kindRaw,
    metadata,
    ip: ip || undefined,
    ua: ua || undefined,
  });

  // Mirror the key public booking funnel steps into Meta CAPI so they still
  // appear even when browser-side Pixel visibility is inconsistent.
  if (kindRaw === 'book_click' || kindRaw === 'ticket_selected') {
    try {
      const db = getDb();
      const event = db.prepare(`
        SELECT id, slug, name, meta_pixel_id
        FROM events
        WHERE id = ?
        LIMIT 1
      `).get(eventId) as
        | { id: string; slug?: string | null; name?: string | null; meta_pixel_id?: string | null }
        | undefined;

      if (event) {
        const pixelId = getEffectivePixelId(event.meta_pixel_id);
        const accessToken = getCapiAccessToken();
        const testEventCode = getTestEventCode();
        if (pixelId && accessToken) {
          const eventName = kindRaw === 'book_click'
            ? 'EventReservationClick'
            : 'EventGuestCountSelected';
          const pax = Number.isFinite(Number(metadata?.guests ?? metadata?.pax))
            ? Math.max(0, Math.floor(Number(metadata?.guests ?? metadata?.pax)))
            : undefined;
          const sourceUrl = event.slug
            ? `${resolveOrigin(req)}/event/${encodeURIComponent(event.slug)}`
            : undefined;

          await sendCapiEvent({
            pixelId,
            accessToken,
            eventName,
            eventId: `${eventId}:${sessionId}:${kindRaw}`,
            userData: {
              client_ip_address: ip || undefined,
              client_user_agent: ua || undefined,
            },
            customData: {
              content_name: event.name || 'Akan Event',
              content_type: 'event',
              event_id: event.id,
              pax,
            },
            sourceUrl,
            testEventCode: testEventCode || undefined,
          });
        }
      }
    } catch {
      // Analytics is best-effort — never block the funnel on a Meta send.
    }
  }

  return NO_CONTENT;
}

function resolveOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin')?.trim();
  if (origin) return origin.replace(/\/$/, '');
  return 'https://events.akanhyd.com';
}
