import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletVoucherToken } from '@/lib/signed-url';
import { lookupWallet, getWalletQrCode } from '@/lib/wallet';
import { getConfig } from '@/lib/db';
import { getEvent } from '@/lib/events';
import { generatePassPdf } from '@/lib/pdf/pass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Media fetch for Interakt. A purpose-specific, expiring token replaces login. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const payload = verifyWalletVoucherToken(token);
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
  if (!payload) return NextResponse.json({ ok: false, message: 'Invalid or expired voucher link.' }, { status: 401, headers });
  const wallet = lookupWallet(payload.txnId);
  if (!wallet) return NextResponse.json({ ok: false, message: 'Wallet not found.' }, { status: 404, headers });
  if (wallet.status !== 'active' || (wallet.expires_at && wallet.expires_at <= Date.now())) {
    return NextResponse.json({ ok: false, message: 'This voucher is no longer active.' }, { status: 410, headers });
  }
  const eventId = (wallet as typeof wallet & { event_id?: string | null }).event_id;
  const event = eventId ? getEvent(eventId) : null;
  const pdf = await generatePassPdf({
    txnId: wallet.txn_id,
    qrCodeId: getWalletQrCode(wallet.txn_id),
    guestName: wallet.name || 'Guest',
    coverAmount: wallet.cover_issued,
    eventName: event?.name || getConfig('EVENT_NAME', ''),
    venueName: getConfig('VENUE_NAME', 'AKAN Hyderabad'),
    venueLogo: getConfig('VENUE_LOGO', '') || undefined,
    expiresAt: wallet.expires_at,
  });
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Length': String(pdf.length),
      'Content-Disposition': 'inline; filename="Cover Voucher Issue.pdf"', 'X-Content-Type-Options': 'nosniff' },
  });
}
