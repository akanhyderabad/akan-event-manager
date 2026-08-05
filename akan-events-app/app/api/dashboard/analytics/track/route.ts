import { NextRequest, NextResponse } from 'next/server';
import { dashboardBaseUrl, dashboardProxyHeaders, jsonBody } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

// The dashboard's /api/analytics/track always replies 204 No Content. A 204
// cannot carry a body, so we don't use the generic proxyJson helper here —
// we forward the event (best-effort) and always return our own 204.
export async function POST(req: NextRequest) {
  const body = await jsonBody(req);
  const headers = dashboardProxyHeaders(req);
  headers.set('content-type', 'application/json');
  try {
    await fetch(`${dashboardBaseUrl()}/api/analytics/track`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
  } catch {
    // Analytics is best-effort — never surface an error to the public page.
  }
  return new NextResponse(null, { status: 204 });
}
