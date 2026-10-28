import type Database from 'better-sqlite3';

/** Additive: receipt IDs, signed links, balances and existing QR payloads stay intact. */
export function initWalletQrCodeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id BETWEEN 1 AND 90000),
      txn_id TEXT NOT NULL UNIQUE REFERENCES wallets(txn_id)
    );
  `);
}

/** Permanent five-digit staff reference, never a PIN or public access token.
 * AUTOINCREMENT prevents reuse even if a record is removed. Allocation happens
 * in the issue transaction, or lazily when a legacy wallet needs a new voucher.
 */
export function ensureWalletQrCode(db: Database.Database, txnId: string): string {
  return db.transaction(() => {
    const existing = db.prepare('SELECT id FROM wallet_qr_codes WHERE txn_id = ?')
      .get(txnId) as { id: number } | undefined;
    if (existing) return String(existing.id + 9999);
    if (!db.prepare('SELECT 1 FROM wallets WHERE txn_id = ?').get(txnId)) {
      throw new Error('Wallet not found.');
    }
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'wallet_qr_codes'")
      .get() as { seq: number } | undefined;
    if ((sequence?.seq ?? 0) >= 90000) {
      throw new Error('All five-digit cover IDs have been used. Contact the host before issuing more wallets.');
    }
    const result = db.prepare('INSERT INTO wallet_qr_codes (txn_id) VALUES (?)').run(txnId);
    return String(Number(result.lastInsertRowid) + 9999);
  }).immediate();
}

/** Only use after staff authentication. Public access still requires signed tokens. */
export function resolveWalletQrCode(db: Database.Database, reference: string): string {
  if (!/^[1-9]\d{4}$/.test(reference)) return reference;
  const row = db.prepare('SELECT txn_id FROM wallet_qr_codes WHERE id = ?')
    .get(Number(reference) - 9999) as { txn_id: string } | undefined;
  return row?.txn_id ?? reference;
}
