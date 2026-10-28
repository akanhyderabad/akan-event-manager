/**
 * Wallet-pass and PDF voucher WhatsApp sender.
 *
 * Glues together: (a) wallet lookup, (b) signed public URL for the PNG,
 * (c) Interakt template send with image header.
 *
 * Existing IMAGE templates remain the default. PDF uses a separately approved
 * DOCUMENT template (WALLET_VOUCHER_TEMPLATE). Akan's approved cover_issued
 * template takes guest, cover amount, QR/transaction ID and expiry. Other
 * document templates use guest, venue, cover amount, cover ID, wallet-view URL.
 * Manual sends select format=pdf; automatic sends use WALLET_PASS_FORMAT.
 *
 * Template the venue must approve in Interakt + Meta:
 *   Name (default):  akan_cover_pass
 *   Language:        en
 *   Header:          IMAGE
 *   Body:            "Hi {{1}}, your cover pass for {{2}} is ready.
 *                    View balance: {{3}}"
 *   No buttons.
 *
 * The 3rd body variable ({{3}} = wallet-view URL) is gated by the
 * WALLET_PASS_TEMPLATE_INCLUDE_LINK config flag — when '0' we omit it so
 * older 2-variable templates that were approved before the wallet-view
 * page existed still send successfully.
 *
 * Provider failures return {ok:false}. Callers also catch unexpected storage
 * errors; the wallet issue flow must NOT block on WhatsApp.
 */

import { getConfig } from '@/lib/db';
import { lookupWallet, getWalletQrCode } from '@/lib/wallet';
import { getEvent } from '@/lib/events';
import { signWalletPassToken, signWalletViewToken, signWalletVoucherToken } from '@/lib/signed-url';
import { sendInteraktTemplate, splitPhone, isInteraktConfigured } from '@/lib/providers/whatsapp/interakt';
import { logAudit } from '@/lib/audit';

export interface SendPassResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** The public URL that was sent to Interakt — useful for debug + audit. */
  passUrl?: string;
  /** Set when WhatsApp send was deliberately skipped (toggle off, etc.). */
  skipped?: 'auto_send_off' | 'interakt_not_configured' | 'no_phone' | 'wallet_voided';
}

export interface SendPassInput {
  /** Wallet txn_id. */
  txnId: string;
  /** Origin base URL (e.g. "https://wallet.akanhyd.com"). Required since we
   *  can't introspect from a fire-and-forget helper. */
  origin: string;
  /** Legacy caller field; displayed references are always resolved from storage. */
  qrCodeId?: string;
  /** Who triggered this (for audit). Default: 'system'. */
  actor?: string;
  /** Force-send even if AUTO_SEND_WHATSAPP_PASS is off. Used by the manual
   *  "Resend" button on the admin UI. */
  force?: boolean;
  /** Manual PDF delivery; automatic sends use WALLET_PASS_FORMAT. */
  format?: 'image' | 'pdf';
}

function publicHttpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password
      || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i.test(url.hostname)
      || url.hostname.endsWith('.local') || !url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function sendWalletPassWhatsApp(input: SendPassInput): Promise<SendPassResult> {
  const actor = input.actor || 'system';

  if (!input.force) {
    const auto = getConfig('AUTO_SEND_WHATSAPP_PASS', '0').trim();
    if (auto !== '1' && auto.toLowerCase() !== 'true') {
      return { ok: false, skipped: 'auto_send_off' };
    }
  }

  if (!isInteraktConfigured()) {
    return { ok: false, skipped: 'interakt_not_configured', error: 'WhatsApp is not connected. Ask the host to configure Settings → WhatsApp.' };
  }

  const format = input.format ?? (getConfig('WALLET_PASS_FORMAT', 'image') === 'pdf' ? 'pdf' : 'image');
  const pdfTemplate = getConfig('WALLET_VOUCHER_TEMPLATE', '').trim();
  const isCoverIssuedTemplate = format === 'pdf' && pdfTemplate === 'cover_issued';
  if (format === 'pdf' && !pdfTemplate) {
    return { ok: false, error: 'PDF vouchers need an approved document template. Ask the host to add it in Settings → WhatsApp.' };
  }

  const wallet = lookupWallet(input.txnId);
  if (!wallet) {
    return { ok: false, error: 'Wallet not found.' };
  }
  if (wallet.status !== 'active' || (wallet.expires_at && wallet.expires_at <= Date.now())) {
    return { ok: false, skipped: 'wallet_voided', error: 'This wallet is no longer active. A voucher cannot be sent.' };
  }
  if (!wallet.phone) {
    return { ok: false, skipped: 'no_phone', error: 'This wallet has no customer phone number.' };
  }
  // The approved cover_issued message promises an explicit expiry. Do not
  // invent one for legacy wallets whose expiry is missing or invalid.
  if (isCoverIssuedTemplate && (!wallet.expires_at || !Number.isFinite(wallet.expires_at))) {
    return { ok: false, error: 'This wallet has no valid expiry date for the cover_issued template.' };
  }

  // Resolve event name for the body
  let eventName = 'tonight';
  const walletEventId = (wallet as unknown as { event_id?: string | null }).event_id;
  if (walletEventId) {
    try {
      const ev = getEvent(walletEventId);
      if (ev?.name) eventName = ev.name;
    } catch { /* ignore */ }
  } else {
    const cfg = getConfig('EVENT_NAME', '').trim();
    if (cfg) eventName = cfg;
  }

  // A media-only preview can expose signed PDF downloads while the admin and
  // customer wallet pages remain local. Never put that origin into wallet links.
  const configuredOrigin = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || input.origin;
  const mediaOrigin = publicHttpsOrigin(process.env.WHATSAPP_MEDIA_BASE_URL?.trim() || configuredOrigin);
  if (!mediaOrigin) {
    return { ok: false, error: 'WhatsApp needs a public HTTPS link to download the voucher. Enable a temporary voucher preview link for local testing, or send from the live website.' };
  }

  const includeLinkRaw = getConfig('WALLET_PASS_TEMPLATE_INCLUDE_LINK', '1').trim().toLowerCase();
  const includeLink = format === 'pdf' ? !isCoverIssuedTemplate : includeLinkRaw === '1' || includeLinkRaw === 'true';
  const walletOrigin = includeLink ? publicHttpsOrigin(configuredOrigin) : null;
  if (includeLink && !walletOrigin) {
    return { ok: false, error: 'This template includes a wallet link and needs a public HTTPS website. For local PDF testing, use the approved cover_issued template.' };
  }

  const qrCodeId = getWalletQrCode(wallet.txn_id);
  const token = format === 'pdf'
    ? signWalletVoucherToken({ txnId: input.txnId })
    : signWalletPassToken({ txnId: input.txnId, qrCodeId });
  const passUrl = `${mediaOrigin}/api/public/${format === 'pdf' ? 'wallet-voucher' : 'wallet-pass'}/${token}`;

  // Optionally mint a wallet-view URL for the 3rd body variable. Feature
  // flag because not every venue's already-approved WhatsApp template has
  // a 3-variable body — flipping the config to '0' restores back-compat.
  let walletUrl: string | undefined;
  let viewTokenTtlDays: number | undefined;
  if (includeLink) {
    const ttlDaysRaw = parseInt(getConfig('WALLET_VIEW_TOKEN_TTL_DAYS', '90').trim(), 10);
    viewTokenTtlDays = Number.isFinite(ttlDaysRaw) && ttlDaysRaw > 0 ? ttlDaysRaw : 90;
    const viewToken = signWalletViewToken({
      txnId: input.txnId,
      ttlSeconds: viewTokenTtlDays * 24 * 60 * 60,
    });
    walletUrl = `${walletOrigin}/w/${viewToken}`;
  }

  const { countryCode, phoneNumber } = splitPhone(wallet.phone);
  const templateName = format === 'pdf' ? pdfTemplate : getConfig('WALLET_PASS_TEMPLATE', 'akan_cover_pass').trim() || 'akan_cover_pass';
  const languageCode = getConfig(format === 'pdf' ? 'WALLET_VOUCHER_TEMPLATE_LANG' : 'WALLET_PASS_TEMPLATE_LANG', 'en').trim() || 'en';

  // Same permanent reference as the PDF caption; QR payloads retain the canonical ID.
  const bodyValues = isCoverIssuedTemplate
    ? [wallet.name || 'Guest',
      wallet.cover_issued.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      qrCodeId,
      `${new Date(wallet.expires_at!).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })} IST`]
    : format === 'pdf'
    ? [wallet.name || 'Guest', getConfig('VENUE_NAME', 'Akan Hyderabad'),
      wallet.cover_issued.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      qrCodeId, walletUrl!]
    : walletUrl
    ? [wallet.name || 'Guest', eventName, walletUrl]
    : [wallet.name || 'Guest', eventName];

  const result = await sendInteraktTemplate({
    countryCode,
    phoneNumber,
    templateName,
    languageCode,
    headerValues: [passUrl],
    ...(format === 'pdf' ? { fileName: 'Cover Voucher Issue.pdf' } : {}),
    bodyValues,
    callbackData: `wallet_pass:${input.txnId}`,
  });

  logAudit({
    actor,
    action: result.ok ? 'wallet_pass_whatsapp_sent' : 'wallet_pass_whatsapp_failed',
    entityType: 'wallet',
    entityId: input.txnId,
    details: {
      template: templateName,
      format,
      to: `${countryCode}${phoneNumber.slice(-4).padStart(phoneNumber.length, '*')}`,
      message_id: result.messageId ?? null,
      error: result.error ?? null,
      status: result.status ?? null,
      pass_url_host: new URL(passUrl).host,
      wallet_url_host: walletUrl ? new URL(walletUrl).host : null,
      view_url_minted: Boolean(walletUrl),
      view_token_ttl_days: viewTokenTtlDays ?? null,
    },
  });

  return {
    ok: result.ok,
    messageId: result.messageId,
    error: result.error,
    passUrl,
  };
}
