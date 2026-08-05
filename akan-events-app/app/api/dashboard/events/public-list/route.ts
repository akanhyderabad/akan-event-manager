import { NextRequest } from 'next/server';
import { proxyJson } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search;
  return proxyJson(req, `/api/events/public-list${search}`);
}
