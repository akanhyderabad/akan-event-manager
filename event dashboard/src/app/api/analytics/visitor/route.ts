/**
 * POST /api/analytics/visitor — public visitor classification.
 *
 * Body: { eventId?, cookieId?, components: { canvas, webgl, fonts, audio, screen, os, browser } }
 * Returns: { ok, visitorId, isNew }
 *
 * The client stores visitorId in the evt_visitor cookie and sends it back on
 * subsequent visits (the cookie fast-path). Rate-limited per IP to stop a
 * client from pumping fingerprint rows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { classifyVisitor, type FingerprintComponents } from '@/lib/visitor-identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 60;
const ipHits = new Map<string, number[]>();
let lastCleanupAt = 0;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanupAt > 60_000) {
    lastCleanupAt = now;
    for (const [key, hits] of ipHits) {
      const kept = hits.filter((t) => now - t < RATE_WINDOW_MS);
      if (kept.length === 0) ipHits.delete(key); else ipHits.set(key, kept);
    }
  }
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) { ipHits.set(ip, hits); return true; }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, message: 'Too many requests.' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Bad request.' }, { status: 400 });
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim().slice(0, 80) : null;
  const cookieId = typeof body.cookieId === 'string' ? body.cookieId.trim().slice(0, 80) : null;
  const raw = (body.components && typeof body.components === 'object' && !Array.isArray(body.components))
    ? (body.components as Record<string, unknown>)
    : {};

  const pick = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : undefined);
  const components: FingerprintComponents = {
    canvas: pick('canvas'),
    webgl: pick('webgl'),
    fonts: pick('fonts'),
    audio: pick('audio'),
    screen: pick('screen'),
    os: pick('os'),
    browser: pick('browser'),
  };

  try {
    const result = classifyVisitor({ cookieId, components, eventId });
    return NextResponse.json({ ok: true, visitorId: result.visitorId, isNew: result.isNew });
  } catch {
    return NextResponse.json({ ok: false, message: 'Classification failed.' }, { status: 500 });
  }
}
