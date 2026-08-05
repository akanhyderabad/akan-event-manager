/**
 * Server-side auth helpers for page server components and API routes.
 * These use next/headers (Node runtime only — do not import from middleware).
 */
import { cookies, headers } from 'next/headers';
import { getConfig } from './db';
import { verifySession, SESSION_COOKIE, type SessionPayload } from './session';
import { getUser, type UserRole } from './users';
import { apiPageIds, effectivePageIds } from './permissions';

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = getConfig('SESSION_SECRET');
  if (!secret) return null;
  return verifySession(token, secret);
}

/**
 * Additive grant-beyond-role check. When a user's base role can't satisfy a
 * route but the host granted them a page that legitimately backs this endpoint,
 * allow it. This ONLY ever widens access — it never denies a user the role
 * check already permitted — so users on the default (null) permission set are
 * completely unaffected. Best-effort: any failure falls back to "no grant".
 */
async function grantsRouteAccess(userId: string): Promise<boolean> {
  try {
    const h = await headers();
    const path = h.get('x-ec-path');
    if (!path) return false;
    const pages = apiPageIds(path);
    if (pages.length === 0) return false;
    const user = getUser(userId);
    if (!user || !user.active || user.permissions == null) return false;
    const allowed = effectivePageIds(user.role, user.permissions);
    return pages.some((p) => allowed.has(p));
  } catch {
    return false;
  }
}

export async function requireRole(allowed: UserRole[]): Promise<SessionPayload | { forbidden: true; status: number; message: string }> {
  const session = await getSession();
  if (!session) return { forbidden: true, status: 401, message: 'Not authenticated' };
  if (allowed.includes(session.role)) return session;
  // Base role fails — honour any explicit per-page grant the host gave them.
  if (await grantsRouteAccess(session.sub)) return session;
  return { forbidden: true, status: 403, message: `Requires role: ${allowed.join(' / ')}` };
}

export function isAllowed(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}
