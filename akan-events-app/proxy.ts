import { NextRequest, NextResponse } from 'next/server';

/**
 * Force HTTPS. OpenLiteSpeed terminates TLS and forwards to this app on a
 * loopback port over plain HTTP, so the external scheme arrives in the
 * `x-forwarded-proto` header. We redirect to HTTPS ONLY when that header is
 * explicitly `http` — never on a missing header — so there is no possibility
 * of a redirect loop if the proxy ever stops sending it.
 *
 * Without this, the public pages (/, /event/*, /confirmed, …) were reachable
 * over http:// and browsers flagged them "Not secure". (/admin already forced
 * https via the dashboard app.)
 *
 * Next.js 16 renamed the `middleware` convention to `proxy` — same behaviour.
 */
export function proxy(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto === 'http') {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
    const url = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `https://${host}`);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internal assets — they're already same-scheme as the document.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
