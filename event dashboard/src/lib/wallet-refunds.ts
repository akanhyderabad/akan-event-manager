import { nanoid } from 'nanoid';
import { getDb } from './db';
import { logAudit } from './audit';
import { COLLECTION_METHODS, type CollectionMethod } from './collection-types';
import { isValidNonNegativeMoney, MAX_WALLET_AMOUNT_INR } from './money';
import { issueReceiptsCte } from './wallet-issue-receipts';
import type { RefundRecord, RefundWallet } from './refund-types';

export class RefundError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const qrCodeSql = `(SELECT CAST(c.id + 9999 AS TEXT) FROM wallet_qr_codes c WHERE c.txn_id = w.txn_id)`;
const refundSelect = `SELECT r.id, r.txn_id AS txnId, ${qrCodeSql} AS qrCodeId, g.name AS guestName, g.phone AS guestPhone,
  r.amount_paise / 100.0 AS amount, r.method, r.reason, r.reference,
  r.recorded_by AS recordedBy, r.created_at AS createdAt,
  r.balance_after_paise / 100.0 AS balanceAfter
  FROM wallet_refunds r JOIN wallets w ON w.txn_id = r.txn_id
  JOIN guests g ON g.id = w.guest_id`;

function walletQuery(scope: 'event' | 'wallet') {
  return `${issueReceiptsCte(scope)}
    SELECT w.txn_id AS txnId, ${qrCodeSql} AS qrCodeId, g.name AS guestName, g.phone AS guestPhone,
      w.status, w.balance, issued.cover AS issuedCover,
      COALESCE((SELECT SUM(amount_paise) FROM wallet_refunds WHERE txn_id = w.txn_id), 0) / 100.0 AS refunded
    FROM issued JOIN wallets w ON w.txn_id = issued.txn_id
    JOIN guests g ON g.id = w.guest_id`;
}

function withAvailable(row: Omit<RefundWallet, 'refundable'>): RefundWallet {
  // Expired balances can be returned without reactivating the wallet. Voids,
  // revoked/flagged wallets and complimentary credit are never refundable here.
  const eligible = row.status === 'active' || row.status === 'expired';
  const remainingIssue = Math.round(row.issuedCover * 100) - Math.round(row.refunded * 100);
  return { ...row, refundable: eligible ? Math.max(0, Math.min(Math.round(row.balance * 100), remainingIssue)) / 100 : 0 };
}

export function getEventRefunds(eventId: string, query: string, offset: number) {
  const db = getDb();
  const search = query.trim().toLowerCase();
  const predicate = `(? = '' OR instr(lower(g.name), ?) > 0 OR instr(g.phone, ?) > 0 OR instr(lower(w.txn_id), ?) > 0 OR ${qrCodeSql} = ?)`;
  const terms = [search, search, search, search, search];
  const wallets = (db.prepare(`${walletQuery('event')}
    WHERE ${predicate} ORDER BY w.issued_at DESC, w.txn_id LIMIT 20
  `).all(eventId, ...terms) as Omit<RefundWallet, 'refundable'>[]).map(withAvailable);
  const refunds = db.prepare(`${refundSelect}
    WHERE w.event_id = ? AND ${predicate}
    ORDER BY r.created_at DESC, r.id DESC LIMIT 50 OFFSET ?
  `).all(eventId, ...terms, offset) as RefundRecord[];
  const count = db.prepare(`SELECT COUNT(*) AS count FROM wallet_refunds r
    JOIN wallets w ON w.txn_id = r.txn_id JOIN guests g ON g.id = w.guest_id
    WHERE w.event_id = ? AND ${predicate}`).get(eventId, ...terms) as { count: number };
  return { eventId, wallets, refunds, refundCount: count.count };
}

export interface RecordRefundInput {
  eventId: string;
  txnId: string;
  requestId: string;
  amount: number;
  method: CollectionMethod;
  reason: string;
  reference: string;
  confirmedPaid: boolean;
}

/** Records money already returned by staff. Never calls a payment provider.
 * Immediate SQLite transaction serializes balance checks, ledger and audit writes.
 */
export function recordWalletRefund(input: RecordRefundInput, actor: { id: string; name: string }): RefundRecord {
  if (!input || typeof input !== 'object') throw new RefundError('Enter the refund details.');
  if (typeof input.eventId !== 'string' || !input.eventId || typeof input.txnId !== 'string' || !input.txnId) {
    throw new RefundError('Select an event and a wallet.');
  }
  if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)) throw new RefundError('Missing refund request ID. Refresh and try again.');
  if (typeof input.amount !== 'number' || !isValidNonNegativeMoney(input.amount) || input.amount <= 0 || input.amount > MAX_WALLET_AMOUNT_INR) {
    throw new RefundError('Enter a positive refund amount with up to two decimal places.');
  }
  if (!COLLECTION_METHODS.some((m) => m.value === input.method)) throw new RefundError('Choose how the money was returned.');
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  const reference = typeof input.reference === 'string' ? input.reference.trim() : '';
  if (reason.length < 3 || reason.length > 500) throw new RefundError('Enter a reason between 3 and 500 characters.');
  if (reference.length > 120 || (input.method !== 'cash' && !reference)) throw new RefundError('Enter the payment refund reference (up to 120 characters).');
  if (input.confirmedPaid !== true) throw new RefundError('Confirm that the money has already been returned to the guest.');
  const paise = Math.round(input.amount * 100);
  const db = getDb();
  return db.transaction(() => {
    const previous = db.prepare(`SELECT r.*, w.event_id FROM wallet_refunds r
      JOIN wallets w ON w.txn_id = r.txn_id WHERE r.request_id = ?`).get(input.requestId) as {
        id: string; txn_id: string; event_id: string; amount_paise: number; method: string;
        reason: string; reference: string; recorded_by_id: string;
      } | undefined;
    if (previous) {
      if (previous.txn_id !== input.txnId || previous.event_id !== input.eventId || previous.amount_paise !== paise ||
          previous.method !== input.method || previous.reason !== reason || previous.reference !== reference || previous.recorded_by_id !== actor.id) {
        throw new RefundError('This request was already used for different refund details. Refresh before starting another refund.', 409);
      }
      return db.prepare(`${refundSelect} WHERE r.id = ?`).get(previous.id) as RefundRecord;
    }
    const row = db.prepare(`${walletQuery('wallet')} WHERE w.event_id = ?`).get(input.txnId, input.eventId) as Omit<RefundWallet, 'refundable'> | undefined;
    if (!row) throw new RefundError('Paid wallet not found in this event.', 404);
    const wallet = withAvailable(row);
    if (paise > Math.round(wallet.refundable * 100)) {
      throw new RefundError(`Only ₹${wallet.refundable.toFixed(2)} of unused entrance cover is available to refund. Refresh the wallet before retrying.`, 409);
    }
    const before = Math.round(wallet.balance * 100);
    const after = before - paise;
    const status = wallet.status === 'expired' ? 'expired' : after === 0 ? 'exhausted' : 'active';
    const id = `RF-${nanoid(12)}`;
    db.prepare('UPDATE wallets SET balance = ?, status = ? WHERE txn_id = ?').run(after / 100, status, input.txnId);
    db.prepare(`INSERT INTO wallet_refunds
      (id, request_id, txn_id, amount_paise, method, reason, reference, recorded_by, recorded_by_id,
       created_at, balance_before_paise, balance_after_paise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.requestId, input.txnId, paise, input.method, reason, reference, actor.name, actor.id, Date.now(), before, after);
    logAudit({ actor: actor.name, action: 'wallet_refund', entityType: 'wallet', entityId: input.txnId,
      details: { refund_id: id, amount: paise / 100, method: input.method, reason, reference,
        recorded_by_id: actor.id, balance_before: before / 100, balance_after: after / 100, paid_by_staff: true } });
    return db.prepare(`${refundSelect} WHERE r.id = ?`).get(id) as RefundRecord;
  }).immediate();
}
