'use client';

/**
 * /admin/bookings — global cross-event Bookings dashboard.
 *
 * Surfaces every payment-bearing row across every event (captured, pending,
 * abandoned, refunded) in one place so the operator doesn't have to drill
 * into each event to track booking activity. Replaces the old standalone
 * /admin/abandoned-bookings — that flow lives here now as a status filter.
 *
 * Header strip:
 *   • 4 KPI tiles — Total Bookings · Revenue · Pax · Abandoned-%
 *
 * Toolbar:
 *   • Status tab strip (All / Captured / Pending / Abandoned / Refunded)
 *   • Event dropdown (filters to one event)
 *   • Search box (name / phone / email / order id) — debounced 300ms
 *
 * Table:
 *   • Customer (name + phone) → Event/date → M·F·C breakdown → Zone/slot →
 *     Amount → Status pill → Created-at
 *   • Each row links to /admin/issue?r=<reservationId> when applicable so
 *     the operator can convert a paid booking into a wallet pass quickly.
 *
 * Backend: GET /api/bookings/list — see route.ts for the contract.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface BookingRow {
  id: string;
  bookingCode: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  eventId: string | null;
  eventName: string | null;
  eventDate: string | null;
  eventSlug: string | null;
  reservationId: string | null;
  pax: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  coupleCount: number | null;
  zoneName: string | null;
  slotLabel: string | null;
  amount: number;
  entryAmount: number;
  coverAmount: number;
  discount: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  couponCode: string | null;
  status: 'captured' | 'created' | 'abandoned' | 'failed' | 'refunded' | 'recovered';
  createdAt: number;
  capturedAt: number | null;
  errorDescription: string | null;
  ticketTypeLabel: string | null;
  tableCount: number | null;
  tableSummary: string | null;
}

interface Counts {
  total: number;
  captured: number;
  pending: number;
  abandoned: number;
  refunded: number;
  totalRevenue: number;
  totalPax: number;
}

interface EventOption { id: string; name: string; event_date: string }

type StatusBucket = 'all' | 'captured' | 'pending' | 'abandoned' | 'refunded';

interface ListResponse {
  ok: boolean;
  items?: BookingRow[];
  counts?: Counts;
  message?: string;
}

const EMPTY_COUNTS: Counts = {
  total: 0, captured: 0, pending: 0, abandoned: 0, refunded: 0,
  totalRevenue: 0, totalPax: 0,
};

export default function BookingsPage() {
  const [status, setStatus] = useState<StatusBucket>('all');
  const [eventId, setEventId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<BookingRow[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drop any selections that are no longer in the current result set.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(items.map((i) => i.id));
      const next = new Set<string>();
      for (const id of prev) if (live.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  const toggleOne = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const exportSelected = () => {
    const rows = selectedIds.size > 0 ? items.filter((i) => selectedIds.has(i.id)) : items;
    if (rows.length > 0) exportBookingsCsv(rows);
  };

  // URL → local state. Read it after mount so the server HTML and the
  // first client render stay identical, avoiding hydration drift.
  useEffect(() => {
    const v = new URL(window.location.href).searchParams.get('status') || 'all';
    const next = (['all', 'captured', 'pending', 'abandoned', 'refunded'].includes(v) ? v : 'all') as StatusBucket;
    setStatus(next);
  }, []);

  // Debounce search input — 300ms feels snappy without spamming the DB.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Pull the event list for the filter dropdown once. Cheap — typical
  // venue has under 100 events.
  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.events)) {
          setEvents(d.events.map((e: { id: string; name: string; event_date: string }) => ({
            id: e.id, name: e.name, event_date: e.event_date,
          })));
        }
      })
      .catch(() => { /* silent — filter just stays empty */ });
  }, []);

  // Refetch whenever any filter changes.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = new URL('/api/bookings/list', window.location.origin);
      u.searchParams.set('status', status);
      if (eventId) u.searchParams.set('eventId', eventId);
      if (debouncedQuery) u.searchParams.set('q', debouncedQuery);
      const res = await fetch(u.toString());
      const data = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok || !data.ok) {
        setError(data.message || `HTTP ${res.status}`);
        setItems([]);
        setCounts(EMPTY_COUNTS);
        return;
      }
      setItems(data.items || []);
      setCounts(data.counts || EMPTY_COUNTS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
      setItems([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [status, eventId, debouncedQuery]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="text-[11px] tracking-widest uppercase text-slate-400">Online sales</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Bookings</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Every booking that came through your event pages — paid online, pending at venue,
          failed, refunded. Reservego entries live separately under{' '}
          <Link href="/admin/reservations" className="text-brand-600 hover:underline">Reservego</Link>.
        </p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Total bookings" value={counts.total} />
        <Stat label="Guests" value={counts.totalPax} />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="input !py-1.5 !px-2 text-sm flex-1 min-w-[180px]"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.event_date}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="input !py-1.5 !px-2 text-sm flex-1 min-w-[220px]"
            placeholder="Search name, phone, email, order id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={exportSelected}
            disabled={items.length === 0}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 whitespace-nowrap"
          >
            Export to Excel{selectedIds.size > 0 ? ` (${selectedIds.size})` : ' (all)'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-200">
            {error}
          </div>
        )}
        {loading && items.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-slate-400">Loading bookings…</div>
        ) : items.length === 0 ? (
          <EmptyState status={status} eventId={eventId} query={debouncedQuery} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">Customer</th>
                  <th className="text-left px-3 py-2 font-semibold">Phone</th>
                  <th className="text-left px-3 py-2 font-semibold">Email</th>
                  <th className="text-left px-3 py-2 font-semibold">Booking ID</th>
                  <th className="text-left px-3 py-2 font-semibold">Guests</th>
                  <th className="text-left px-3 py-2 font-semibold">Event Name</th>
                  <th className="text-left px-3 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <BookingRowComp key={row.id} row={row} selected={selectedIds.has(row.id)} onToggle={() => toggleOne(row.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'emerald' | 'amber' }) {
  const toneCls =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'amber' ? 'text-amber-700' :
    'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${toneCls}`}>{value}</div>
    </div>
  );
}

function EmptyState({ status, eventId, query }: { status: StatusBucket; eventId: string; query: string }) {
  const filtered = eventId || query || status !== 'all';
  return (
    <div className="px-4 py-16 text-center text-sm text-slate-400">
      {filtered
        ? 'No bookings match those filters yet.'
        : 'No event-page bookings yet. Rows appear here for both venue-pay and online-pay flows.'}
    </div>
  );
}

function BookingRowComp({ row, selected, onToggle }: { row: BookingRow; selected: boolean; onToggle: () => void }) {
  return (
    <tr className={`border-t border-slate-100 hover:bg-slate-50/50 ${selected ? 'bg-emerald-50/40' : ''}`}>
      <td className="px-3 py-2.5 align-top">
        <input type="checkbox" aria-label={`Select ${row.name || row.bookingCode}`} checked={selected} onChange={onToggle} />
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="text-sm font-semibold text-slate-900">{row.name || '—'}</div>
      </td>
      <td className="px-3 py-2.5 align-top whitespace-nowrap text-sm text-slate-700">{row.phone || '—'}</td>
      <td className="px-3 py-2.5 align-top text-sm text-slate-700">{row.email || '—'}</td>
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <div className="text-sm font-semibold text-slate-900">{row.bookingCode}</div>
        <div className="text-[11px] text-slate-400">{row.reservationId || row.id}</div>
      </td>
      <td className="px-3 py-2.5 align-top text-sm text-slate-700">{row.pax != null ? row.pax : '—'}</td>
      <td className="px-3 py-2.5 align-top text-sm text-slate-800">{row.eventName || '—'}</td>
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <div className="text-xs text-slate-700">{formatRelative(row.createdAt)}</div>
        <div className="text-[10px] text-slate-400">{new Date(row.createdAt).toLocaleString()}</div>
      </td>
    </tr>
  );
}

function exportBookingsCsv(rows: BookingRow[]): void {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ['Customer', 'Phone', 'Email', 'Booking ID', 'Guests', 'Event Name', 'Created'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      esc(r.name || ''),
      esc(r.phone || ''),
      esc(r.email || ''),
      esc(r.bookingCode),
      esc(r.pax ?? ''),
      esc(r.eventName || ''),
      esc(new Date(r.createdAt).toLocaleString()),
    ].join(','));
  }
  // Prepend a UTF-8 BOM so Excel reads accented names / ₹ correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatRelative(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}
