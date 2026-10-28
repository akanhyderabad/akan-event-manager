/** Immutable entrance receipts, excluding complimentary credit and later top-ups. */
export function issueReceiptsCte(scope: 'event' | 'wallet'): string {
  return `
    WITH event_wallets AS (
      SELECT txn_id, payment_method, entry_fee, cover_issued FROM wallets
      WHERE ${scope === 'event' ? 'event_id' : 'txn_id'} = ? AND payment_method != 'comp'
    ), issue_audit AS (
      SELECT a.entity_id,
        CASE WHEN json_valid(a.details) THEN a.details ELSE '{}' END AS details,
        ROW_NUMBER() OVER (PARTITION BY a.entity_id ORDER BY a.id) AS occurrence
      FROM audit_log a JOIN event_wallets w ON w.txn_id = a.entity_id
      WHERE a.entity_type = 'wallet' AND a.action = 'issue_wallet'
    ), uncredited_topups AS (
      SELECT DISTINCT entity_id FROM audit_log
      WHERE entity_type = 'payment' AND action = 'wallet_topup_after_inactive'
    ), credited_topups AS (
      SELECT p.txn_id, SUM(p.amount) AS amount
      FROM payments p JOIN event_wallets w ON w.txn_id = p.txn_id
      LEFT JOIN uncredited_topups u ON u.entity_id = p.id
      WHERE p.status = 'captured' AND u.entity_id IS NULL
        AND json_extract(CASE WHEN json_valid(p.notes) THEN p.notes ELSE '{}' END, '$.kind') = 'wallet_topup'
      GROUP BY p.txn_id
    ), issued AS (
      SELECT w.txn_id, w.payment_method,
        CASE WHEN json_type(a.details, '$.entry') IN ('integer', 'real')
          THEN json_extract(a.details, '$.entry') ELSE w.entry_fee END AS entry,
        CASE WHEN json_type(a.details, '$.cover') IN ('integer', 'real')
          THEN json_extract(a.details, '$.cover')
          ELSE MAX(0, w.cover_issued - COALESCE(t.amount, 0)) END AS cover
      FROM event_wallets w
      LEFT JOIN issue_audit a ON a.entity_id = w.txn_id AND a.occurrence = 1
      LEFT JOIN credited_topups t ON t.txn_id = w.txn_id
    )
  `;
}
