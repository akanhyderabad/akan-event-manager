import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/db';
import { signSession, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/session';
import { getDb } from '@/lib/db';
import { touchLastLogin } from '@/lib/users';
import { logAudit } from '@/lib/audit';
import type { UserRole } from '@/lib/roles';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: UserRole;
    active: number;
    password_hash: string | null;
  } | undefined;
  const passwordOk = !!(user && user.active && user.password_hash && bcrypt.compareSync(password, user.password_hash));
  if (!passwordOk || !user) {
    logAudit({ actor: email.toLowerCase(), action: 'login_fail', details: { method: 'password' } });
    return NextResponse.json({ ok: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  const secret = getConfig('SESSION_SECRET');
  if (!secret) {
    return NextResponse.json({ ok: false, message: 'Server misconfigured (no SESSION_SECRET).' }, { status: 500 });
  }

  const token = await signSession(
    { sub: user.id, name: user.name, role: user.role as UserRole },
    secret,
  );

  touchLastLogin(user.id);
  logAudit({ actor: user.name, action: 'login', entityType: 'user', entityId: user.id, details: { method: 'password' } });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}