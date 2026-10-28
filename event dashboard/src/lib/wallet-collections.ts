import { getDb } from './db';
import { issueReceiptsCte } from './wallet-issue-receipts';
import { COLLECTION_METHODS, type EventWalletCollections } from './collection-types';

/** Gross wallet-issue receipts, independent of balance, redemption and expiry.
 * Issue audit snapshots are immutable; wallets.cover_issued also grows on top-up.
 * Legacy rows without a snapshot subtract credited top-ups as a fallback.
 * Complimentary wallets and subsequent top-ups are not issue collections.
 */
export function getEventWalletCollections(eventId: string): EventWalletCollections {
  const rows = getDb().prepare(`
    ${issueReceiptsCte('event')}
    SELECT payment_method AS method, COUNT(*) AS count,
      SUM(CAST(ROUND(entry * 100) AS INTEGER)) AS entryPaise,
      SUM(CAST(ROUND(cover * 100) AS INTEGER)) AS coverPaise
    FROM issued GROUP BY payment_method
  `).all(eventId) as Array<{ method: string; count: number; entryPaise: number; coverPaise: number }>;

  const methods: EventWalletCollections['methods'] = COLLECTION_METHODS.map(({ value, label }) => ({
    method: value, label, count: 0, entry: 0, cover: 0, total: 0, refunded: 0, refundCount: 0, net: 0,
  }));
  let entryPaise = 0;
  let coverPaise = 0;
  let count = 0;
  for (const row of rows) {
    let target = methods.find((method) => method.method === row.method);
    if (!target) {
      target = methods.find((method) => method.method === 'other');
      if (!target) {
        target = { method: 'other', label: 'Other', count: 0, entry: 0, cover: 0, total: 0, refunded: 0, refundCount: 0, net: 0 };
        methods.push(target);
      }
    }
    target.count += row.count;
    target.entry = Math.round(target.entry * 100 + row.entryPaise) / 100;
    target.cover = Math.round(target.cover * 100 + row.coverPaise) / 100;
    target.total = Math.round((target.entry + target.cover) * 100) / 100;
    entryPaise += row.entryPaise;
    coverPaise += row.coverPaise;
    count += row.count;
  }
  const refunds = getDb().prepare(`
    SELECT r.method, COUNT(*) AS count, SUM(r.amount_paise) AS paise
    FROM wallet_refunds r JOIN wallets w ON w.txn_id = r.txn_id
    WHERE w.event_id = ? GROUP BY r.method
  `).all(eventId) as Array<{ method: string; count: number; paise: number }>;
  let refundPaise = 0;
  let refundCount = 0;
  for (const row of refunds) {
    const target = methods.find((method) => method.method === row.method)!;
    target.refunded = row.paise / 100;
    target.refundCount = row.count;
    refundPaise += row.paise;
    refundCount += row.count;
  }
  for (const method of methods) method.net = Math.round((method.total - method.refunded) * 100) / 100;
  return { eventId, methods, totals: { count, entry: entryPaise / 100, cover: coverPaise / 100, total: (entryPaise + coverPaise) / 100, refunded: refundPaise / 100, refundCount, net: (entryPaise + coverPaise - refundPaise) / 100 } };
}
