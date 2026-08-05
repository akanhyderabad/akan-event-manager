import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

function resolvePublicOrigin(req: NextRequest): string {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  return req.nextUrl.origin;
}

/**
 * Gate /admin/* routes behind a session cookie.
 *
 * We only check cookie *presence* here — middleware runs on the Edge and can't access
 * the DB to read the signing secret. Real verification happens inside pages/APIs via
 * `getSession()` from lib/auth. An invalid cookie lets the user through middleware
 * but the server component / API will redirect to /login or return 401.
 *
 * This is defense-in-depth — the edge gate keeps unauthenticated users from even seeing
 * the admin shell, while the node-side check is authoritative.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Stamp the resolved request path onto a header so Node-side handlers can
  // recover it (route handlers don't otherwise know their own path). Used by
  // requireRole() for additive per-page grant-beyond-role checks. Edge-safe —
  // no DB / secret access here.
  const withPathHeader = () => {
    const headers = new Headers(req.headers);
    headers.set('x-ec-path', pathname);
    return NextResponse.next({ request: { headers } });
  };

  if (!pathname.startsWith('/admin')) return withPathHeader();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) return withPathHeader();

  const loginUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, resolvePublicOrigin(req));
  loginUrl.pathname = '/login';
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match app routes broadly so server components can read x-ec-path for
  // per-route behavior such as excluding admin pages from GTM injection.
  // Static assets and file requests are skipped.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
