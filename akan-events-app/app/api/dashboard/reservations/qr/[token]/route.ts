import { NextRequest, NextResponse } from 'next/server';
import { dashboardBaseUrl, dashboardProxyHeaders } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const target = `${dashboardBaseUrl()}/api/reservations/qr-png/${encodeURIComponent(token)}`;
  const response = await fetch(target, {
    cache: 'no-store',
    headers: dashboardProxyHeaders(req),
  });
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/png';
  const cacheControl = response.headers.get('cache-control') || 'public, max-age=86400';

  return new NextResponse(bytes, {
    status: response.status,
    headers: {
      'content-type': contentType,
      'cache-control': cacheControl,
    },
  });
}