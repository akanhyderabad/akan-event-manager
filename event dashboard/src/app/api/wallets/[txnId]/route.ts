import { NextRequest, NextResponse } from 'next/server';
import { lookupWallet, voidWallet } from '@/lib/wallet';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ txnId: string }> }) {
  const { txnId } = await ctx.params;
  const wallet = lookupWallet(txnId);
  if (!wallet) {
    return NextResponse.json({ ok: false, message: 'Transaction not found.' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    wallet: {
      txnId: wallet.txn_id,
      guestName: wallet.name,
      guestPhone: wallet.phone,
      balance: wallet.balance,
      status: wallet.status,
      entryFee: wallet.entry_fee,
      coverIssued: wallet.cover_issued,
      paymentMethod: wallet.payment_method,
      issuedAt: wallet.issued_at,
      expiresAt: wallet.expires_at,
    },
  });
}

/** Disable a wallet without issuing or recording a refund. Admin-only. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ txnId: string }> }) {
  const session = await requireRole(['host']);
  if ('forbidden' in session) {
    return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
  }

  const { txnId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;
  if (session.role !== 'host') {
    return NextResponse.json({ ok: false, message: 'Only an admin can void wallets.' }, { status: 403 });
  }
  if (body?.refundAmount != null) {
    return NextResponse.json({ ok: false, message: 'Use Issue Cover → Refunds to record money returned to the guest.' }, { status: 400 });
  }

  const wallet = lookupWallet(txnId);
  if (!wallet) {
    return NextResponse.json({ ok: false, message: 'Transaction not found.' }, { status: 404 });
  }
  if (wallet.status !== 'active') {
    return NextResponse.json(
      { ok: false, message: `Wallet is ${wallet.status}. Only active wallets can be voided.` },
      { status: 409 },
    );
  }

  const changed = voidWallet(txnId, session.name, { reason });
  if (!changed) {
    return NextResponse.json(
      { ok: false, message: 'Wallet could not be voided.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, txnId, status: 'exhausted', balance: 0 });
}
