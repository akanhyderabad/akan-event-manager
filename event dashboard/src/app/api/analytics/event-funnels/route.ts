import { NextRequest, NextResponse } from 'next/server';
import { getEventsAnalyticsOverview } from '@/lib/event-analytics';
import { requireRole } from '@/lib/auth';
import { resolveAnalyticsRange } from '../_range';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cross-event conversion funnel + booking stats for /admin/event-analytics.
 *
 * Returns per-event funnel rows (sorted by page views desc) plus aggregate
 * totals, scoped to the given range.
 *
 * Auth: manager+ (host or manager).
 *
 * Query params:
 *   from — UTC ms (default: now - 30d)
 *   to   — UTC ms (default: now)
 */
export async function GET(req: NextRequest) {
  const session = await requireRole(['host', 'manager']);
  if ('forbidden' in session) {
    return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
  }

  const sp = req.nextUrl.searchParams;
  const range = resolveAnalyticsRange(sp.get('from'), sp.get('to'));
  if ('error' in range) {
    return NextResponse.json({ ok: false, message: range.error }, { status: 400 });
  }

  const overview = getEventsAnalyticsOverview(range.from, range.to);

  return NextResponse.json(
    { ok: true, ...overview, rangeFrom: range.from, rangeTo: range.to },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
