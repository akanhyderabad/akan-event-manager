import { getDb } from './db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { logAudit } from './audit';
import { ALL_ROLES, ROLE_LABEL, type UserRole, type PublicUser } from './roles';
import { normalizePermissions } from './permissions';

export { ALL_ROLES, ROLE_LABEL };
export type { UserRole, PublicUser };

export interface UserRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  pin_hash: string;
  password_hash: string | null;
  active: number;
  /** JSON string[] of page ids, or NULL = inherit role defaults. */
  permissions: string | null;
  created_at: number;
  created_by: string | null;
  /** ms epoch of last successful sign-in. NULL = invited, never logged in. */
  last_login_at: number | null;
}

/** Parse the stored permissions JSON into a clean id array (or null). */
export function parsePermissions(raw: string | null | undefined): string[] | null {
  if (raw == null || raw === '') return null;
  try {
    return normalizePermissions(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Serialize an allow-list for storage. null / empty-after-normalize → NULL. */
function serializePermissions(value: string[] | null | undefined): string | null {
  if (value == null) return null;
  const norm = normalizePermissions(value);
  return norm == null ? null : JSON.stringify(norm);
}

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id, name: row.name, phone: row.phone, email: row.email,
    role: row.role, active: !!row.active,
    permissions: parsePermissions(row.permissions),
    created_at: row.created_at, created_by: row.created_by,
    last_login_at: row.last_login_at ?? null,
  };
}

/**
 * Stamp the user's last_login_at to "now" — called from any sign-in path
 * that successfully verifies an identity (OTP, PIN). Best-effort: silently
 * swallows DB errors so a transient write failure can't block a login.
 */
export function touchLastLogin(userId: string, at: number = Date.now()): void {
  try {
    const db = getDb();
    db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(at, userId);
  } catch {
    /* swallow — login must not be gated on bookkeeping */
  }
}

export function listUsers(): PublicUser[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM users ORDER BY role, name`).all() as UserRow[];
  return rows.map(toPublic);
}

export function getUser(id: string): PublicUser | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  return row ? toPublic(row) : null;
}

export function getUserByPhone(phone: string): UserRow | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(normalizePhone(phone)) as UserRow | undefined;
  return row ?? null;
}

export function getUserByEmail(email: string): UserRow | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email.trim()) as UserRow | undefined;
  return row ?? null;
}

/**
 * Resolve a user by either phone or email. Caller passes the raw input + type.
 * Used by OTP request flow.
 */
export function getUserByIdentifier(identifier: string, type: 'email' | 'phone'): UserRow | null {
  if (type === 'email') return getUserByEmail(identifier);
  return getUserByPhone(identifier);
}

/**
 * Canonicalise an Indian / international mobile number to E.164 format
 * ("+917207666333"). Accepts a wide range of pasted formats — what humans
 * actually type — and rejects garbage. Returns the original (trimmed) string
 * unchanged if it can't be canonicalised, so callers downstream (validation,
 * lookup) can decide how to handle the bad input.
 *
 * Recognised inputs (all produce "+917207666333"):
 *   "7207666333"                10 digits, default to India
 *   "917207666333"              with country code, no +
 *   "+917207666333"             already E.164
 *   "+91 7207 666 333"          with spaces / hyphens
 *   "(+91) 72076-66333"         with formatting punctuation
 *
 * Non-Indian numbers pass through if they already have a leading +:
 *   "+15551234567" → "+15551234567"
 */
export function normalizePhone(input: string): string {
  if (!input) return '';
  // Strip everything except digits and a leading +
  let cleaned = String(input).trim().replace(/[^\d+]/g, '');
  // Drop any + that isn't the leading char
  cleaned = cleaned.replace(/(?!^)\+/g, '');

  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;

  // No + prefix — best-effort guesses for Indian numbers
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return `+91${cleaned.slice(1)}`;

  // Unknown shape — return as-is so caller can fail validation explicitly
  return cleaned;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizeIdentifier(identifier: string, type: 'email' | 'phone'): string {
  return type === 'email' ? normalizeEmail(identifier) : normalizePhone(identifier);
}

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  pin: string;
  password?: string;
  /** Custom page-access allow-list. Omit / null → inherit role defaults. */
  permissions?: string[] | null;
  createdBy: string;
}

export function createUser(input: CreateUserInput): PublicUser {
  if (!ALL_ROLES.includes(input.role)) throw new Error(`Invalid role: ${input.role}`);
  if (!/^\d{4,6}$/.test(input.pin)) throw new Error('PIN must be 4–6 digits');
  if (!input.name.trim()) throw new Error('Name is required');
  if (!input.phone.trim()) throw new Error('Phone is required');

  const db = getDb();
  const existing = getUserByPhone(input.phone);
  if (existing) throw new Error(`A user with phone ${input.phone} already exists`);

  const id = nanoid();
  const hash = bcrypt.hashSync(input.pin, 10);
  const passwordHash = input.password ? bcrypt.hashSync(input.password, 10) : null;
  const permissions = serializePermissions(input.permissions);
  db.prepare(`
    INSERT INTO users (id, name, phone, email, role, pin_hash, password_hash, permissions, active, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, input.name.trim(), input.phone.trim(), input.email?.trim() || null, input.role, hash, passwordHash, permissions, Date.now(), input.createdBy);

  logAudit({
    actor: input.createdBy, action: 'user_create', entityType: 'user', entityId: id,
    details: { name: input.name, role: input.role, phone: input.phone },
  });
  return getUser(id)!;
}

export function updateUser(
  id: string,
  patch: Partial<Pick<CreateUserInput, 'name' | 'phone' | 'email' | 'role' | 'pin' | 'password' | 'permissions'>> & { active?: boolean },
  actor: string,
): PublicUser | null {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name != null) { fields.push('name = ?'); values.push(patch.name.trim()); }
  if (patch.phone != null) { fields.push('phone = ?'); values.push(patch.phone.trim()); }
  if ('email' in patch) { fields.push('email = ?'); values.push(patch.email?.trim() || null); }
  if (patch.role != null) {
    if (!ALL_ROLES.includes(patch.role)) throw new Error(`Invalid role: ${patch.role}`);
    fields.push('role = ?'); values.push(patch.role);
  }
  if (patch.pin != null) {
    if (!/^\d{4,6}$/.test(patch.pin)) throw new Error('PIN must be 4–6 digits');
    fields.push('pin_hash = ?'); values.push(bcrypt.hashSync(patch.pin, 10));
  }
  if (patch.password != null) {
    if (patch.password.length < 8) throw new Error('Password must be at least 8 characters');
    fields.push('password_hash = ?'); values.push(bcrypt.hashSync(patch.password, 10));
  }
  if ('permissions' in patch) {
    fields.push('permissions = ?'); values.push(serializePermissions(patch.permissions));
  }
  if (patch.active !== undefined) { fields.push('active = ?'); values.push(patch.active ? 1 : 0); }

  if (fields.length === 0) return toPublic(existing);
  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  logAudit({
    actor, action: 'user_update', entityType: 'user', entityId: id,
    details: Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, k === 'pin' ? '***' : v])),
  });
  return getUser(id);
}

export function deleteUser(id: string, actor: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  if (result.changes > 0) {
    logAudit({ actor, action: 'user_delete', entityType: 'user', entityId: id });
    return true;
  }
  return false;
}

export function verifyUserPin(phone: string, pin: string): UserRow | null {
  const user = getUserByPhone(phone);
  if (!user || !user.active) return null;
  if (!bcrypt.compareSync(pin, user.pin_hash)) return null;
  return user;
}

export function verifyUserPassword(email: string, password: string): UserRow | null {
  const user = getUserByEmail(email);
  if (!user || !user.active || !user.password_hash) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

export interface UpsertPasswordUserInput {
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  pin: string;
  password: string;
  active?: boolean;
  actor: string;
}

export function upsertPasswordUser(input: UpsertPasswordUserInput): PublicUser {
  if (!input.name.trim()) throw new Error('Name is required');
  if (!input.phone.trim()) throw new Error('Phone is required');
  if (!input.email.trim()) throw new Error('Email is required');
  if (!ALL_ROLES.includes(input.role)) throw new Error(`Invalid role: ${input.role}`);
  if (!/^\d{4,6}$/.test(input.pin)) throw new Error('PIN must be 4–6 digits');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters');

  const db = getDb();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = getUserByEmail(normalizedEmail);
  const pinHash = bcrypt.hashSync(input.pin, 10);
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const now = Date.now();

  if (existing) {
    db.prepare(`
      UPDATE users
      SET name = ?, phone = ?, email = ?, role = ?, pin_hash = ?, password_hash = ?, active = ?
      WHERE id = ?
    `).run(
      input.name.trim(),
      input.phone.trim(),
      normalizedEmail,
      input.role,
      pinHash,
      passwordHash,
      input.active === false ? 0 : 1,
      existing.id,
    );

    logAudit({
      actor: input.actor,
      action: 'user_update',
      entityType: 'user',
      entityId: existing.id,
      details: { name: input.name, role: input.role, phone: input.phone, email: normalizedEmail, password: '***', pin: '***' },
    });

    return getUser(existing.id)!;
  }

  const phoneConflict = getUserByPhone(input.phone);
  if (phoneConflict) throw new Error(`A user with phone ${input.phone} already exists`);

  const id = nanoid();
  db.prepare(`
    INSERT INTO users (id, name, phone, email, role, pin_hash, password_hash, active, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name.trim(),
    input.phone.trim(),
    normalizedEmail,
    input.role,
    pinHash,
    passwordHash,
    input.active === false ? 0 : 1,
    now,
    input.actor,
  );

  logAudit({
    actor: input.actor,
    action: 'user_create',
    entityType: 'user',
    entityId: id,
    details: { name: input.name, role: input.role, phone: input.phone, email: normalizedEmail, password: '***', pin: '***' },
  });

  return getUser(id)!;
}

export function countUsers(): number {
  const db = getDb();
  return (db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }).c;
}
