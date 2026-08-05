/**
 * GET /api/reservations/ticket/[token]
 *
 * PUBLIC endpoint — no session auth. Gated by the HMAC-signed reservation QR
 * token (the same token that authorises qr-png). Returns the display fields
 * the customer confirmation page (/confirmed on the public app) needs to render
 * the ticket: booking id, guest name, pax, status, plus the event's
 * title / date / time / image.
 *
 * Guest name is PII, but it is only reachable by a holder of the non-guessable
 * token — i.e. the guest themselves (or door staff scanning their pass). No
 * other reservation's data is exposed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyReservationQrToken } from '@/lib/signed-url';
import { getReservationSummary } from '@/lib/reservation-ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const payload = verifyReservationQrToken(decodeURIComponent(token));
  if (!payload) {
    return NextResponse.json({ ok: false, message: 'Invalid or expired link.' }, { status: 404 });
  }

  const summary = getReservationSummary(payload.reservationId);
  if (!summary) {
    return NextResponse.json({ ok: false, message: 'Reservation not found.' }, { status: 404 });
  }

  // Event visual fields (image / time / slug) aren't part of the ledger
  // summary — pull them directly so the ticket renders fully in one round-trip.
  let event: {
    slug: string | null;
    title: string | null;
    date: string | null;
    time: string | null;
    image: string | null;
  } = {
    slug: null,
    title: summary.event_name,
    date: summary.event_date,
    time: null,
    image: null,
  };

  if (summary.event_id) {
    const db = getDb();
    const ev = db
      .prepare(
        `SELECT slug, name, event_date, start_time, image_data, card_image
           FROM events WHERE id = ? LIMIT 1`,
      )
      .get(summary.event_id) as
      | {
          slug: string | null;
          name: string | null;
          event_date: string | null;
          start_time: string | null;
          image_data: string | null;
          card_image: string | null;
        }
      | undefined;
    if (ev) {
      event = {
        slug: ev.slug ?? null,
        title: ev.name ?? summary.event_name,
        date: ev.event_date ?? summary.event_date,
        time: ev.start_time ?? null,
        image: ev.image_data || ev.card_image || null,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    ticket: {
      reservationId: summary.reservation_id,
      displayCode: summary.display_code,
      guestName: summary.guest_name,
      pax: summary.total_pax,
      status: summary.reservation_status,
      event,
    },
  });
}
