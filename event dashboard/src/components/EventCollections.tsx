'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/format';
import type { EventWalletCollections } from '@/lib/collection-types';
import { EventRefundsPanel } from './EventRefundsPanel';
import type { RefundRecord } from '@/lib/refund-types';

export function EventCollections({ eventId, refreshKey, onRefundRecorded }: {
  eventId: string; refreshKey: string; onRefundRecorded?: (refund: RefundRecord) => void;
}) {
  const [data, setData] = useState<EventWalletCollections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    async function load() {
      try {
        const response = await fetch(`/api/wallets/collections?eventId=${encodeURIComponent(eventId)}`, {
          signal: controller.signal, cache: 'no-store',
        });
        const body = await response.json();
        if (!response.ok || !body.ok || body.collections?.eventId !== eventId) {
          throw new Error(body.message || 'Could not load collections. Please refresh.');
        }
        if (!controller.signal.aborted) setData(body.collections);
      } catch (err) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Could not load collections. Please refresh.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [eventId, refreshKey, revision]);

  if (!eventId) return null;
  return (
    <section className="card mt-4" aria-labelledby="event-collections-heading" aria-busy={loading}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="event-collections-heading" className="font-semibold text-slate-900">Event collections</h2>
          <p className="text-xs text-slate-500 mt-1">Collected when wallets were issued · entry + cover</p>
        </div>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading}
          className="text-xs font-semibold text-brand-700 border border-brand-200 rounded-lg px-3 py-2 hover:bg-brand-50 disabled:opacity-50">
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {loading && !data && <p role="status" className="mt-3 text-sm text-slate-500">Loading event collections…</p>}
      {data && data.eventId === eventId && (
        <>
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs text-slate-600">Total collected</div>
              <div className="text-3xl font-bold text-brand-800 tabular-nums">{formatMoney(data.totals.total)}</div>
              <div className="text-xs text-slate-500 mt-1">{data.totals.count} {data.totals.count === 1 ? 'wallet' : 'wallets'}</div>
            </div>
            <dl className="text-sm text-slate-600 space-y-1">
              <div className="flex gap-4 justify-between"><dt>Entry</dt><dd className="font-semibold tabular-nums">{formatMoney(data.totals.entry)}</dd></div>
              <div className="flex gap-4 justify-between"><dt>Cover</dt><dd className="font-semibold tabular-nums">{formatMoney(data.totals.cover)}</dd></div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs text-rose-700">Refunded · {data.totals.refundCount} {data.totals.refundCount === 1 ? 'record' : 'records'}</div>
              <div className="text-2xl font-bold text-rose-800 tabular-nums">{formatMoney(data.totals.refunded)}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700">Net collected</div>
              <div className="text-2xl font-bold text-emerald-800 tabular-nums">{formatMoney(data.totals.net)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {data.methods.map((method) => (
              <div key={method.method} className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs font-medium text-slate-500">{method.label}</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums break-words mt-1">{formatMoney(method.total)}</div>
                <div className="text-[11px] text-slate-500 mt-1">{method.count} {method.count === 1 ? 'wallet' : 'wallets'}</div>
                <div className="text-[11px] text-slate-500 mt-2">Entry {formatMoney(method.entry)} · Cover {formatMoney(method.cover)}</div>
                <dl className="text-xs mt-3 pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex flex-wrap justify-between gap-1"><dt>Refunded</dt><dd className="text-rose-700 tabular-nums">{formatMoney(method.refunded)}</dd></div>
                  <div className="flex flex-wrap justify-between gap-1 font-semibold"><dt>Net</dt><dd className="tabular-nums">{formatMoney(method.net)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Refunds are grouped by how money was returned. Top-ups and complimentary wallets are excluded. Historical voids are not counted as refunds.</p>
        </>
      )}
      <EventRefundsPanel key={eventId} eventId={eventId} refreshKey={refreshKey} onRecorded={(refund) => {
        setRevision((value) => value + 1);
        onRefundRecorded?.(refund);
      }} />
    </section>
  );
}
