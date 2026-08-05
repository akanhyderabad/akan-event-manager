const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

function usage() {
  console.error('Usage: node scripts/upsert-superadmin.js <db-path> <name> <phone> <email> <password> [pin]');
  process.exit(1);
}

const [, , dbPath, name, phone, email, password, pinArg] = process.argv;
if (!dbPath || !name || !phone || !email || !password) usage();

const pin = pinArg || '456789';
if (!/^\d{4,6}$/.test(pin)) {
  console.error('PIN must be 4-6 digits.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();
const db = new Database(dbPath);

const userCols = db.prepare('PRAGMA table_info(users)').all();
if (!userCols.some((col) => col.name === 'password_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
}

const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(normalizedEmail);
const pinHash = bcrypt.hashSync(pin, 10);
const passwordHash = bcrypt.hashSync(password, 10);
const now = Date.now();

if (existing) {
  db.prepare(`
    UPDATE users
    SET name = ?, phone = ?, email = ?, role = 'host', pin_hash = ?, password_hash = ?, active = 1
    WHERE id = ?
  `).run(name.trim(), phone.trim(), normalizedEmail, pinHash, passwordHash, existing.id);
  console.log(`Updated host account ${normalizedEmail} (${existing.id})`);
} else {
  const id = nanoid();
  db.prepare(`
    INSERT INTO users (id, name, phone, email, role, pin_hash, password_hash, active, created_at, created_by)
    VALUES (?, ?, ?, ?, 'host', ?, ?, 1, ?, 'system')
  `).run(id, name.trim(), phone.trim(), normalizedEmail, pinHash, passwordHash, now);
  console.log(`Created host account ${normalizedEmail} (${id})`);
}