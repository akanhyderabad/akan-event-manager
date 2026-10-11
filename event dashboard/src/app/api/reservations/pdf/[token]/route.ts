import { NextRequest, NextResponse } from 'next/server';
import { verifyReservationQrToken } from '@/lib/signed-url';
import { getReservationSummary } from '@/lib/reservation-ledger';
import { getDb } from '@/lib/db';
import { generateReservationPassPdf } from '@/lib/pdf/reservation-pass';
import { resolveRequestOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const decoded = decodeURIComponent(token);
  const payload = verifyReservationQrToken(decoded);
  if (!payload) {
    return NextResponse.json({ ok: false, message: 'Invalid or expired link.' }, { status: 404 });
  }

  const summary = getReservationSummary(payload.reservationId);
  if (!summary) {
    return NextResponse.json({ ok: false, message: 'Reservation not found.' }, { status: 404 });
  }

  const db = getDb();
  const ev = summary.event_id
    ? db.prepare(
      `SELECT name, start_time
         FROM events
        WHERE id = ?
        LIMIT 1`,
    ).get(summary.event_id) as { name: string | null; start_time: string | null } | undefined
    : undefined;

  const origin = resolveRequestOrigin(req);
  const pdf = await generateReservationPassPdf({
    bookingId: summary.reservation_id,
    pin: summary.display_code,
    guestName: summary.guest_name,
    eventName: ev?.name || summary.event_name || 'Akan Event',
    eventDate: summary.event_date || 'Date TBA',
    eventTime: ev?.start_time || null,
    guestCount: summary.total_pax,
    tableSummary: null,
    amountDueAtVenue: summary.entry_amount + summary.cover_amount,
    qrValue: `${origin}/admin/scan?token=${encodeURIComponent(decoded)}`,
  });

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reservation-${summary.reservation_id}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
