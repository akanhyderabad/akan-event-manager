import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { sendWalletPassWhatsApp, type SendPassResult } from '@/lib/whatsapp/wallet-pass-send';
import { resolveRequestOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/wallet-pass/[txnId]
 *
 * Admin "Resend pass via WhatsApp" trigger. Used by the issue result screen
 * when the auto-send failed (Interakt down, customer typo'd phone, etc.) or
 * when staff want to push it again as a reminder.
 *
 * Force-sends regardless of AUTO_SEND_WHATSAPP_PASS toggle — the operator
 * making this call IS the decision.
 *
 * Body (optional): { format?: 'image' | 'pdf', qrCodeId?: string }.
 * PDF uses the wallet's stored recipient and never embeds its PIN.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ txnId: string }> }) {
  const session = await requireRole(['host', 'manager', 'entry']);
  if ('forbidden' in session) {
    return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
  }

  const { txnId } = await ctx.params;
  const body = await req.json().catch(() => ({})) as { qrCodeId?: string; format?: 'image' | 'pdf' } | null;
  if (!body || (body.format !== undefined && body.format !== 'image' && body.format !== 'pdf')) {
    return NextResponse.json({ ok: false, message: 'Invalid voucher format.' }, { status: 400 });
  }

  const origin = resolveRequestOrigin(req);
  const result = await sendWalletPassWhatsApp({
    txnId,
    origin,
    qrCodeId: body.qrCodeId,
    actor: session.name,
    force: true,
    format: body.format,
  }).catch((): SendPassResult => ({ ok: false, error: 'WhatsApp could not be confirmed. Check Interakt before retrying.' }));

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.error || 'WhatsApp send failed.' },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    message: 'Accepted by WhatsApp provider. Delivery is not yet confirmed.',
  });
}
