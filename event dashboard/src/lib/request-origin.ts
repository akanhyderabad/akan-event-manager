import { NextRequest } from 'next/server';

export function resolveRequestOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}`.replace(/\/+$/, '');
}