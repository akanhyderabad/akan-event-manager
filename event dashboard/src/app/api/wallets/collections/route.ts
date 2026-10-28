import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/events';
import { getEventWalletCollections } from '@/lib/wallet-collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const session = await requireRole(['host', 'manager', 'entry']);
  if ('forbidden' in session) {
    return NextResponse.json({ ok: false, message: session.message }, { status: session.status, headers });
  }
  const eventId = req.nextUrl.searchParams.get('eventId')?.trim();
  if (!eventId) return NextResponse.json({ ok: false, message: 'Select an event.' }, { status: 400, headers });
  if (!getEvent(eventId)) return NextResponse.json({ ok: false, message: 'Event not found.' }, { status: 404, headers });
  try {
    return NextResponse.json({ ok: true, collections: getEventWalletCollections(eventId) }, { headers });
  } catch {
    return NextResponse.json({ ok: false, message: 'Could not load event collections. Please refresh.' }, { status: 500, headers });
  }
}
