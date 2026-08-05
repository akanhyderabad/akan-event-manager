import { NextRequest } from 'next/server';
import { proxyJson } from '@/app/api/dashboard/_proxy';

export const dynamic = 'force-dynamic';

/**
 * Public confirmation-ticket lookup. Proxies to the dashboard's token-gated
 * ticket endpoint so the /confirmed page can render the guest's ticket + QR
 * without any PII in the URL (the token is the access key).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return proxyJson(req, `/api/reservations/ticket/${encodeURIComponent(token)}`);
}
