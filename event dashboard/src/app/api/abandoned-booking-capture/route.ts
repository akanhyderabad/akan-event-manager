import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { upsertAbandonedLeadCapture } from '@/lib/abandoned-bookings';
import { normalizePhone } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const ipHits = new Map<string, number[]>();
let lastCleanupAt = 0;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanupAt > 60_000) {
    lastCleanupAt = now;
    for (const [key, hits] of ipHits) {
      const filtered = hits.filter((t) => now - t < RATE_WINDOW_MS);
      if (filtered.length === 0) ipHits.delete(key);
      else if (filtered.length !== hits.length) ipHits.set(key, filtered);
    }
  }
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, message: 'Too many requests.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as {
    draftId?: unknown;
    eventId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    pax?: unknown;
    maleCount?: unknown;
    femaleCount?: unknown;
    coupleCount?: unknown;
  };

  const draftId = typeof body.draftId === 'string' ? body.draftId.trim().slice(0, 120) : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim().slice(0, 80) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  const normalizedPhone = phoneRaw ? normalizePhone(phoneRaw) : '';
  const phone = normalizedPhone || phoneRaw || null;
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 160) : '';
  const pax = Number.isFinite(Number(body.pax)) ? Math.max(1, Math.floor(Number(body.pax))) : null;
  const maleCount = Number.isFinite(Number(body.maleCount)) ? Math.max(0, Math.floor(Number(body.maleCount))) : null;
  const femaleCount = Number.isFinite(Number(body.femaleCount)) ? Math.max(0, Math.floor(Number(body.femaleCount))) : null;
  const coupleCount = Number.isFinite(Number(body.coupleCount)) ? Math.max(0, Math.floor(Number(body.coupleCount))) : null;

  if (!draftId) {
    return NextResponse.json({ ok: false, message: 'draftId is required.' }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ ok: false, message: 'Name must be at least 2 characters.' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ ok: false, message: 'Phone or email is required.' }, { status: 400 });
  }
  if (eventId) {
    const exists = getDb().prepare('SELECT 1 FROM events WHERE id = ? LIMIT 1').get(eventId) as { 1: number } | undefined;
    if (!exists) {
      return NextResponse.json({ ok: false, message: 'Event not found.' }, { status: 404 });
    }
  }

  upsertAbandonedLeadCapture({
    id: draftId,
    eventId: eventId || null,
    name,
    phone,
    email: email || null,
    pax,
    maleCount,
    femaleCount,
    coupleCount,
  });

  return NextResponse.json({ ok: true, draftId });
}