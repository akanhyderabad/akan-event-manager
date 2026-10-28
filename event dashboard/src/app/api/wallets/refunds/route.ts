import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/events';
import { getEventRefunds, recordWalletRefund, RefundError } from '@/lib/wallet-refunds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest) {
  const session = await requireRole(['host', 'manager', 'entry']);
  if ('forbidden' in session) return NextResponse.json({ ok: false, message: session.message }, { status: session.status, headers });
  const eventId = req.nextUrl.searchParams.get('eventId')?.trim();
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  const offset = Number(req.nextUrl.searchParams.get('offset') || 0);
  if (!eventId || query.length > 120 || !Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ ok: false, message: 'Select an event and use a valid search.' }, { status: 400, headers });
  }
  if (!getEvent(eventId)) return NextResponse.json({ ok: false, message: 'Event not found.' }, { status: 404, headers });
  return NextResponse.json({ ok: true, ...getEventRefunds(eventId, query, offset), canRecord: session.role === 'host' }, { headers });
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['host']);
  if ('forbidden' in session) return NextResponse.json({ ok: false, message: session.message }, { status: session.status, headers });
  // A page grant must never grant financial reversal permission.
  if (session.role !== 'host') return NextResponse.json({ ok: false, message: 'Only an admin can record refunds.' }, { status: 403, headers });
  const body = await req.json().catch(() => null);
  try {
    const refund = recordWalletRefund(body, { id: session.sub, name: session.name });
    return NextResponse.json({ ok: true, refund }, { headers });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof RefundError ? err.message : 'Could not record the refund. Retry the same request.' }, {
      status: err instanceof RefundError ? err.status : 500, headers,
    });
  }
}
