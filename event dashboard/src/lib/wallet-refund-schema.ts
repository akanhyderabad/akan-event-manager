import type Database from 'better-sqlite3';

/** Additive migration. Historical void audits are not evidence of money returned. */
export function initWalletRefundSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_refunds (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      txn_id TEXT NOT NULL REFERENCES wallets(txn_id),
      amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
      method TEXT NOT NULL CHECK(method IN ('cash', 'upi', 'card', 'online', 'razorpay')),
      reason TEXT NOT NULL,
      reference TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL,
      recorded_by_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      balance_before_paise INTEGER NOT NULL,
      balance_after_paise INTEGER NOT NULL CHECK(balance_after_paise >= 0)
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_refunds_txn ON wallet_refunds(txn_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_refunds_created ON wallet_refunds(created_at DESC);
  `);
}
