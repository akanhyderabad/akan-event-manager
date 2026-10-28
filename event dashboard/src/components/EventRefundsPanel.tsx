'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { COLLECTION_METHODS, type CollectionMethod } from '@/lib/collection-types';
import type { EventRefunds, RefundRecord, RefundWallet } from '@/lib/refund-types';
import { formatMoney } from '@/lib/format';

export function EventRefundsPanel({ eventId, refreshKey, onRecorded }: {
  eventId: string; refreshKey: string; onRecorded: (refund: RefundRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<EventRefunds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<RefundWallet | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CollectionMethod>('cash');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  // Retain a failed request's identity: a lost response must not debit twice.
  const attempt = useRef<{ payload: string; id: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ eventId, q: search, offset: String(offset) });
    fetch(`/api/wallets/refunds?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.ok || body.eventId !== eventId) throw new Error(body.message || 'Could not load refunds.');
        if (!controller.signal.aborted) setData(body);
      })
      .catch((err) => { if (!controller.signal.aborted) { setData(null); setError(err.message || 'Could not load refunds.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, eventId, search, offset, revision, refreshKey]);

  function choose(wallet: RefundWallet) {
    setSelected(wallet); setAmount(''); setMethod('cash'); setReason(''); setReference('');
    setConfirmed(false); setError(''); setSuccess(''); attempt.current = null;
  }

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setSaving(true); setError(''); setSuccess('');
    const payload = { eventId, txnId: selected.txnId, amount: Number(amount), method, reason, reference, confirmedPaid: confirmed };
    const serialized = JSON.stringify(payload);
    if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, id: crypto.randomUUID() };
    try {
      const response = await fetch('/api/wallets/refunds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: attempt.current.id }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.message || 'Could not record refund. Retry the same details.');
      setSuccess(`Refund ${body.refund.id} recorded: ${formatMoney(body.refund.amount)} returned to ${body.refund.guestName}. Remaining cover ${formatMoney(body.refund.balanceAfter)}.`);
      setSelected(null); attempt.current = null; setOffset(0); setRevision((value) => value + 1); onRecorded(body.refund);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record refund. Retry the same details.');
    } finally { inFlight.current = false; setSaving(false); }
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <button type="button" aria-expanded={open} aria-controls="event-refunds-panel" onClick={() => setOpen(!open)} className="btn btn-secondary">
        {open ? 'Hide refunds' : 'Refunds · record or view'}
      </button>
      {open && (
        <div id="event-refunds-panel" className="mt-4 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Cover refunds</h3>
            <p className="text-sm text-slate-500 mt-1">Record money already returned to a guest. This does not send a payment. Only unused entrance cover can be refunded here; entry fees and top-ups are excluded.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setSearch(query.trim()); setOffset(0); setSelected(null); setRevision((value) => value + 1); }} className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="refund-search" className="label">Find guest or cover ID</label>
              <input id="refund-search" className="input" value={query} maxLength={120} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone or cover ID" disabled={saving} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={saving || loading}>Search</button>
          </form>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
          {loading && <p role="status" className="text-sm text-slate-500">Loading refunds…</p>}
          {data && !loading && (
            <>
              {!data.canRecord && <p className="text-sm text-slate-500">An admin can record refunds. You can view the records below.</p>}
              {data.canRecord && !selected && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Latest 20 matching paid wallets. Search to find an older guest.</p>
                  {data.wallets.length === 0 && <p className="text-sm text-slate-500">No paid wallets found for this event.</p>}
                  {data.wallets.map((wallet) => (
                    <div key={wallet.txnId} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900">{wallet.guestName}</div>
                        <div className="text-xs text-slate-500 break-all">{wallet.guestPhone} · {wallet.txnId}</div>
                        <div className="text-xs text-slate-500 mt-1">Available to refund {formatMoney(wallet.refundable)} · Already refunded {formatMoney(wallet.refunded)}</div>
                      </div>
                      <button type="button" className="btn btn-secondary text-xs" disabled={wallet.refundable <= 0} onClick={() => choose(wallet)}>Record refund</button>
                    </div>
                  ))}
                </div>
              )}
              {data.canRecord && selected && (
                <form onSubmit={record} className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
                  <div className="text-sm font-semibold">Refund for {selected.guestName}</div>
                  <p className="text-xs text-slate-600">{selected.guestPhone} · {selected.txnId}<br />Available to refund: {formatMoney(selected.refundable)}</p>
                  <fieldset disabled={saving} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div><label htmlFor="refund-amount" className="label">Amount returned (₹)</label><input id="refund-amount" className="input" type="number" inputMode="decimal" min="0.01" max={selected.refundable} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
                      <div><label htmlFor="refund-method" className="label">Returned via</label><select id="refund-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as CollectionMethod)}>{COLLECTION_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                    </div>
                    <div><label htmlFor="refund-reference" className="label">Refund / receipt reference {method === 'cash' ? '(optional)' : '(required)'}</label><input id="refund-reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} required={method !== 'cash'} placeholder="UPI transaction, card refund or cash receipt" /></div>
                    <div><label htmlFor="refund-reason" className="label">Reason</label><textarea id="refund-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={500} required placeholder="Guest cancelled their visit" /></div>
                    <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} required className="mt-1" />I confirm this money has already been returned to the guest. Recording it reduces their usable cover balance.</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="btn btn-primary">{saving ? 'Recording…' : `Record ${formatMoney(Number(amount) || 0)} refund`}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
                    </div>
                  </fieldset>
                </form>
              )}
              <div className="pt-2">
                <h4 className="text-sm font-semibold">Refund history · {data.refundCount}</h4>
                {data.refunds.length === 0 && <p className="mt-2 text-sm text-slate-500">No recorded refunds for this search.</p>}
                <ol className="mt-2 space-y-2">
                  {data.refunds.map((refund) => (
                    <li key={refund.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{refund.guestName}</span><span className="font-semibold text-rose-700">{formatMoney(refund.amount)} · {COLLECTION_METHODS.find((m) => m.value === refund.method)?.label}</span></div>
                      <p className="text-xs text-slate-500 break-all">{refund.txnId} · {refund.id}</p>
                      <p className="mt-2 break-words">{refund.reason}</p>
                      {refund.reference && <p className="text-xs text-slate-600 mt-1 break-words">Reference: {refund.reference}</p>}
                      <p className="text-xs text-slate-500 mt-1">Recorded by {refund.recordedBy} · {new Date(refund.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                    </li>
                  ))}
                </ol>
                {data.refundCount > 50 && <div className="flex items-center gap-3 mt-3 text-xs">
                  <button type="button" className="btn btn-secondary" disabled={offset === 0 || saving} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button>
                  <span>{offset + 1}–{Math.min(offset + 50, data.refundCount)} of {data.refundCount}</span>
                  <button type="button" className="btn btn-secondary" disabled={offset + 50 >= data.refundCount || saving} onClick={() => setOffset(offset + 50)}>Next</button>
                </div>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
