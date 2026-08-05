import { NextRequest } from 'next/server';
import { jsonBody, proxyJson } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyJson(req, '/api/abandoned-booking-capture', {
    method: 'POST',
    body: await jsonBody(req),
  });
}