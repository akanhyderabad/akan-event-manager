import { NextRequest } from 'next/server';
import { proxyJson } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return proxyJson(req, `/api/events/by-slug/${encodeURIComponent(slug)}/public`);
}
