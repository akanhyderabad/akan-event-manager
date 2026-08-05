import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_DASHBOARD_API_BASE = 'http://localhost:3001';

export function dashboardBaseUrl(): string {
  return (process.env.DASHBOARD_API_BASE || process.env.NEXT_PUBLIC_DASHBOARD_API_BASE || DEFAULT_DASHBOARD_API_BASE).replace(/\/$/, '');
}

export function dashboardProxyHeaders(req: NextRequest, initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;

  headers.set('x-forwarded-proto', proto);
  headers.set('x-forwarded-host', host);
  headers.set('origin', `${proto}://${host}`);

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  return headers;
}

export async function proxyJson(req: NextRequest, path: string, init?: RequestInit): Promise<NextResponse> {
  const target = `${dashboardBaseUrl()}${path}`;
  const headers = dashboardProxyHeaders(req, init?.headers);
  headers.set('content-type', 'application/json');

  const response = await fetch(target, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': contentType,
    },
  });
}

export async function jsonBody(req: NextRequest): Promise<string> {
  const payload = await req.json().catch(() => ({}));
  return JSON.stringify(payload);
}
