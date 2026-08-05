import { NextRequest } from 'next/server';
import { jsonBody, proxyJson } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyJson(req, '/api/payments/order', {
    method: 'POST',
    body: await jsonBody(req),
  });
}
