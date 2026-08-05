'use client';

/**
 * /admin/event-analytics — cross-event conversion funnel + booking stats.
 *
 * Backed by GET /api/analytics/event-funnels (see event-analytics.ts).
 * AdminShell wraps every /admin route via layout.tsx, so this page does NOT
 * import AdminShell itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

interface EventFunnelSummary {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  pageViews: number;
  bookClicks: number;
  paxEntered: number;
  detailsEntered: number;
  bookingsMade: number;
  checkoutFailed: number;
  conversionRate: number;
  newVisitors: number;
  returningVisitors: number;
  firstTimeRate: number;
}

interface Totals {
  events: number;
  pageViews: number;
  bookClicks: number;
  paxEntered: number;
  detailsEntered: number;
  bookingsMade: number;
  checkoutFailed: number;
  conversionRate: number;
  newVisitors: number;
  returningVisitors: number;
  firstTimeRate: number;
}

interface OverviewResponse {
  ok: boolean;
  events?: EventFunnelSummary[];
  totals?: Totals;
  message?: string;
}

const EMPTY_TOTALS: Totals = {
  events: 0, pageViews: 0, bookClicks: 0, paxEntered: 0,
  detailsEntered: 0, bookingsMade: 0, checkoutFailed: 0, conversionRate: 0,
  newVisitors: 0, returningVisitors: 0, firstTimeRate: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES: Array<{ key: string; label: string; days: number }> = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last year', days: 365 },
];

// Funnel stages, top → bottom (already monotonically descending by definition).
const STAGES: Array<{ key: keyof Totals; label: string }> = [
  { key: 'pageViews', label: 'Page viewed' },
  { key: 'bookClicks', label: 'Booking button clicked' },
  { key: 'paxEntered', label: 'Pax entered' },
  { key: 'detailsEntered', label: 'Details entered' },
  { key: 'bookingsMade', label: 'Booking made' },
];

export default function EventAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState<EventFunnelSummary[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const to = Date.now();
      const from = to - days * DAY_MS;
      const u = new URL('/api/analytics/event-funnels', window.location.origin);
      u.searchParams.set('from', String(from));
      u.searchParams.set('to', String(to));
      const res = await fetch(u.toString(), { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as OverviewResponse;
      if (!res.ok || !data.ok) {
        setError(data.message || `HTTP ${res.status}`);
        setEvents([]);
        setTotals(EMPTY_TOTALS);
        return;
      }
      setEvents(data.events || []);
      setTotals(data.totals || EMPTY_TOTALS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
      setEvents([]);
      setTotals(EMPTY_TOTALS);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const maxPageViews = useMemo(
    () => events.reduce((m, e) => Math.max(m, e.pageViews), 0),
    [events],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="text-[11px] tracking-widest uppercase text-slate-400">Events</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Event Analytics</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          How visitors move from viewing an event page to completing a booking — page views,
          booking-button clicks, and successful checkouts, with a conversion funnel per event.
        </p>
      </header>

      {/* Range picker */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setDays(r.days)}
            className={
              'text-xs font-medium px-3 py-1.5 rounded-lg border transition ' +
              (days === r.days
                ? 'bg-brand-50 border-brand-300 text-brand-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
            }
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Stat label="Page views" value={totals.pageViews} />
        <Stat label="Booking clicks" value={totals.bookClicks} />
        <Stat label="Pax entered" value={totals.paxEntered} />
        <Stat label="Details entered" value={totals.detailsEntered} />
        <Stat label="Bookings made" value={totals.bookingsMade} tone="emerald" />
        <Stat label="Conversion" value={`${totals.conversionRate}%`} tone="brand" />
      </div>

      {/* Visitor identity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="First-time rate" value={`${totals.firstTimeRate}%`} tone="brand" />
        <Stat label="New visitors" value={totals.newVisitors} tone="emerald" />
        <Stat label="Returning visitors" value={totals.returningVisitors} />
        <Stat label="Total visits" value={totals.newVisitors + totals.returningVisitors} />
      </div>

      {/* Overall funnel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <div className="text-sm font-semibold text-slate-900 mb-1">Conversion funnel</div>
        <div className="text-xs text-slate-400 mb-4">All events combined · {totals.events} event{totals.events === 1 ? '' : 's'} with activity</div>
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const count = totals[s.key] as number;
            const top = totals.pageViews || 0;
            const pctOfTop = top > 0 ? Math.round((count / top) * 1000) / 10 : 0;
            const prev = i === 0 ? count : (totals[STAGES[i - 1].key] as number);
            const dropoff = i === 0 || prev <= 0 ? 0 : Math.round((Math.max(0, prev - count) / prev) * 1000) / 10;
            const barPct = top > 0 ? (count / top) * 100 : 0;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{i + 1}. {s.label}</span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900 tabular-nums">{count.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400"> · {pctOfTop}% of views</span>
                    {i > 0 && dropoff > 0 && <span className="text-rose-500"> · −{dropoff}%</span>}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(barPct, count > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-event table (descending by page views) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
          By event — busiest first
        </div>
        {loading && events.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : events.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-slate-400">
            No event-page activity in this range yet. Funnel data appears once visitors view your event pages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Event</th>
                  <th className="text-right px-3 py-2 font-semibold">Page views</th>
                  <th className="text-right px-3 py-2 font-semibold">Book clicks</th>
                  <th className="text-right px-3 py-2 font-semibold">Pax entered</th>
                  <th className="text-right px-3 py-2 font-semibold">Details</th>
                  <th className="text-right px-3 py-2 font-semibold">Bookings</th>
                  <th className="text-right px-3 py-2 font-semibold">Conv.</th>
                  <th className="text-right px-3 py-2 font-semibold">First-time</th>
                  <th className="text-left px-3 py-2 font-semibold w-40">Funnel</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.eventId} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-sm font-medium text-slate-900">{e.eventName}</div>
                      {e.eventDate && <div className="text-[11px] text-slate-400">{e.eventDate}</div>}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-slate-700">{e.pageViews.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-slate-700">{e.bookClicks.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-slate-700">{e.paxEntered.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-slate-700">{e.detailsEntered.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums font-semibold text-emerald-700">{e.bookingsMade.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums font-semibold text-slate-900">{e.conversionRate}%</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-slate-700">
                      {e.firstTimeRate}%
                      <div className="text-[10px] text-slate-400">{e.newVisitors} new</div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <MiniFunnel e={e} max={maxPageViews} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniFunnel({ e, max }: { e: EventFunnelSummary; max: number }) {
  const segs = [e.pageViews, e.bookClicks, e.paxEntered, e.detailsEntered, e.bookingsMade];
  const denom = max > 0 ? max : 1;
  return (
    <div className="flex items-end gap-0.5 h-8" title="Page views → Book clicks → Pax → Details → Bookings">
      {segs.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${i === segs.length - 1 ? 'bg-emerald-400' : 'bg-brand-300'}`}
          style={{ height: `${Math.max((v / denom) * 100, v > 0 ? 6 : 2)}%` }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'emerald' | 'brand' }) {
  const toneCls =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'brand' ? 'text-brand-700' :
    'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-bold mt-0.5 tabular-nums ${toneCls}`}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
    </div>
  );
}
