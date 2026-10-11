/**
 * Settings V2 — host notifications.
 *
 * Two fire-and-forget side effects:
 *   1. sendBookingAlertWhatsApp() — when WHATSAPP_BOOKING_ALERTS_ENABLED='1'
 *      and HOST_PHONE is set, ping the host with a WhatsApp template message
 *      naming the guest, event, and amount.
 *   2. sendSaleWebhook() — when SALE_WEBHOOK_URL is set, POST the full sale
 *      transaction JSON to it with a 5s timeout. No retries.
 *
 * Both helpers swallow errors silently — they're called from hot booking /
 * payment paths and must NEVER block the customer's response.
 */
import { getConfig } from './db';
import { logAudit } from './audit';
import {
  sendInteraktTemplate,
  splitPhone,
  isInteraktConfigured,
} from './providers/whatsapp/interakt';

const HOST_BOOKING_ALERT_TEMPLATE = 'akan_host_booking_alert';
const HOST_BOOKING_ALERT_LANG = 'en';
const SALE_WEBHOOK_TIMEOUT_MS = 5000;

interface SmtpCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

function readSmtpCreds(): SmtpCreds | null {
  const user = process.env.SMTP_USER ?? getConfig('SMTP_USER', '');
  const pass = process.env.SMTP_PASS ?? getConfig('SMTP_PASS', '');
  const fromEmail = process.env.SMTP_FROM ?? getConfig('SMTP_FROM', '');
  if (!user || !pass || !fromEmail) return null;

  const host = process.env.SMTP_HOST ?? getConfig('SMTP_HOST', 'smtp.gmail.com');
  const portRaw = process.env.SMTP_PORT ?? getConfig('SMTP_PORT', '465');
  const port = Number(portRaw) || 465;
  const secureRaw = process.env.SMTP_SECURE ?? getConfig('SMTP_SECURE', port === 465 ? 'true' : 'false');
  const secure = secureRaw === 'true';
  const fromName = process.env.SMTP_FROM_NAME ?? getConfig('SMTP_FROM_NAME', 'Akan Hyderabad');

  return { host, port, secure, user, pass, fromEmail, fromName };
}

function formatINR(amount: number): string {
  // Match the style used elsewhere ("₹1,234"). Currency.format with INR
  // locale would also work but pulls in Intl data we don't need here.
  const n = Math.round(Number(amount) || 0);
  const s = n.toString();
  // Indian grouping: last 3 then groups of 2 (1,23,456).
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${grouped},${last3}`;
}

export interface BookingAlertInput {
  guestName: string;
  eventName: string;
  amount: number;
}

/**
 * Fire-and-forget WhatsApp alert to the host phone. Resolves to true if the
 * template was actually sent; false otherwise. Callers should NOT await — use
 * .catch(() => {}) if you want to be explicit about ignoring the result.
 */
export async function sendBookingAlertWhatsApp(
  input: BookingAlertInput,
): Promise<boolean> {
  if (getConfig('WHATSAPP_BOOKING_ALERTS_ENABLED', '0') !== '1') return false;
  if (!isInteraktConfigured()) return false;

  const hostPhone = getConfig('HOST_PHONE', '').trim();
  if (!hostPhone) return false;

  const { countryCode, phoneNumber } = splitPhone(hostPhone);
  if (!phoneNumber) return false;

  const result = await sendInteraktTemplate({
    countryCode,
    phoneNumber,
    templateName: HOST_BOOKING_ALERT_TEMPLATE,
    languageCode: HOST_BOOKING_ALERT_LANG,
    bodyValues: [input.guestName, input.eventName, formatINR(input.amount)],
    callbackData: 'host_booking_alert',
  });

  // Log non-success so the operator can spot misconfigured templates
  // (e.g. template not approved on Interakt) without trawling the API logs.
  if (!result.ok) {
    logAudit({
      actor: 'system',
      action: 'host_booking_alert_failed',
      details: {
        error: result.error,
        status: result.status,
        template: HOST_BOOKING_ALERT_TEMPLATE,
      },
    });
  }
  return result.ok;
}

export interface SaleWebhookPayload {
  paymentId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  eventId: string;
  eventName: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  capturedAt: number;
  // Optional extras — pass-through fields some downstream handlers may want.
  items?: unknown;
  reservationId?: string | null;
  paymentMode?: string | null;
  couponCode?: string | null;
}

export interface ReservationForwardWebhookPayload {
  bookingId: string;
  reservation_id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  guestCount: number;
  bookingTime: string | null;
  eventDate: string;
  guestComments: string | null;
  tableNames?: string[];
  status: string;
}

export interface ReservationEmailPayload {
  bookingId: string;
  reservationPin?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  guestCount: number;
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  tableSummary: string | null;
  entryAmount: number;
  coverAmount: number;
  amountDueAtVenue: number;
  qrUrl: string | null;
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  } | null;
}

/**
 * POST the sale payload to SALE_WEBHOOK_URL with a 5s timeout. Returns true
 * on a 2xx response. Designed to be called WITHOUT await — the .catch
 * suppresses any abort or network error so the caller's hot path is
 * unblocked.
 */
export async function sendSaleWebhook(
  payload: SaleWebhookPayload,
): Promise<boolean> {
  const url = getConfig('SALE_WEBHOOK_URL', '').trim();
  if (!url) return false;

  // Quick URL sanity check — we don't want to issue requests against
  // file:// or javascript: schemes if the config got corrupted somehow.
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  } catch {
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // AbortSignal.timeout is supported in Node 18+ which Next 15 ships on.
      signal: AbortSignal.timeout(SALE_WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      logAudit({
        actor: 'system',
        action: 'sale_webhook_non_2xx',
        details: { url, status: res.status, paymentId: payload.paymentId },
      });
      return false;
    }
    return true;
  } catch (err) {
    logAudit({
      actor: 'system',
      action: 'sale_webhook_failed',
      details: {
        url,
        paymentId: payload.paymentId,
        error: err instanceof Error ? err.message : 'unknown',
      },
    });
    return false;
  }
}

/**
 * Forward a public reservation into an external Reservego-compatible webhook.
 * Disabled unless both URL and token are configured.
 */
export async function sendReservationForwardWebhook(
  payload: ReservationForwardWebhookPayload,
): Promise<boolean> {
  const url = (process.env.PUBLIC_RESERVATION_WEBHOOK_URL || getConfig('PUBLIC_RESERVATION_WEBHOOK_URL', '')).trim();
  const token = (process.env.PUBLIC_RESERVATION_WEBHOOK_TOKEN || getConfig('PUBLIC_RESERVATION_WEBHOOK_TOKEN', '')).trim();
  if (!url || !token) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  } catch {
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SALE_WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      logAudit({
        actor: 'system',
        action: 'reservation_forward_webhook_non_2xx',
        details: { url, status: res.status, bookingId: payload.bookingId },
      });
      return false;
    }
    return true;
  } catch (err) {
    logAudit({
      actor: 'system',
      action: 'reservation_forward_webhook_failed',
      details: {
        url,
        bookingId: payload.bookingId,
        error: err instanceof Error ? err.message : 'unknown',
      },
    });
    return false;
  }
}

// ── ReserveGo: push the booking to ReserveGo's public reservation API ──
// Fire-and-forget, called right after a public reservation is created. Sends
// application/x-www-form-urlencoded as ReserveGo requires. Credentials default
// to the live values but can be overridden via env / config without a redeploy.
const RESERVEGO_CREATE_URL = 'https://api.reservego.co/api/bookings/reservation/create';
const RESERVEGO_TIMEOUT_MS = 8000;

export interface ReservegoReservationInput {
  bookingId: string;   // our reservation id — for audit correlation only
  guestName: string;
  guestPhone: string;  // normalized to 91 + the 10-digit Indian number below
  guestCount: number;
  bookingTime: string; // ISO 8601 (e.g. 2026-05-02T21:30:00+05:30)
  eventName: string;
}

export async function sendReservegoReservation(
  input: ReservegoReservationInput,
): Promise<boolean> {
  const url = (process.env.RESERVEGO_CREATE_URL || getConfig('RESERVEGO_CREATE_URL', RESERVEGO_CREATE_URL)).trim();
  const apiKey = (process.env.RESERVEGO_API_KEY || getConfig('RESERVEGO_API_KEY', '66e04cec998188478d82aac2')).trim();
  const restaurantId = (process.env.RESERVEGO_RESTAURANT_ID || getConfig('RESERVEGO_RESTAURANT_ID', '659bd2c91a33ffb38833af30')).trim();
  const status = (process.env.RESERVEGO_STATUS || getConfig('RESERVEGO_STATUS', '1')).trim();
  const source = (process.env.RESERVEGO_SOURCE || getConfig('RESERVEGO_SOURCE', '9')).trim();
  if (!url || !apiKey || !restaurantId) return false;

  // Send the Indian country code as digits; ReserveGo adds the display '+' itself.
  const digits = (input.guestPhone || '').replace(/\D/g, '');
  const localPhone = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : (digits.length > 10 ? digits.slice(-10) : digits);
  const guestPhone = `91${localPhone}`;

  const form = new URLSearchParams({
    guestName: input.guestName,
    guestPhone,
    guestCount: String(input.guestCount),
    bookingTime: input.bookingTime,
    guestComments: `Reservation for ${input.eventName}`,
    apiKey,
    restaurantId,
    status,
    source,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(RESERVEGO_TIMEOUT_MS),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      logAudit({
        actor: 'system',
        action: 'reservego_create_non_2xx',
        details: { status: res.status, bookingId: input.bookingId, body: bodyText.slice(0, 500) },
      });
      return false;
    }
    logAudit({
      actor: 'system',
      action: 'reservego_create_ok',
      details: { bookingId: input.bookingId, guestCount: input.guestCount },
    });
    return true;
  } catch (err) {
    logAudit({
      actor: 'system',
      action: 'reservego_create_failed',
      details: { bookingId: input.bookingId, error: err instanceof Error ? err.message : 'unknown' },
    });
    return false;
  }
}

export async function sendReservationEmails(
  payload: ReservationEmailPayload,
): Promise<boolean> {
  const creds = readSmtpCreds();
  const adminRecipient = (process.env.ADMIN_BOOKING_EMAIL || getConfig('ADMIN_BOOKING_EMAIL', '')).trim();
  const guestRecipient = payload.guestEmail?.trim() || '';
  if (!creds || (!adminRecipient && !guestRecipient)) return false;

  let nodemailer: {
    createTransport: (opts: unknown) => { sendMail: (msg: unknown) => Promise<{ messageId: string }> };
  };
  try {
    // @ts-expect-error -- nodemailer is intentionally runtime-installed
    nodemailer = await import('nodemailer');
  } catch {
    logAudit({
      actor: 'system',
      action: 'reservation_email_failed',
      details: { reason: 'nodemailer_missing' },
    });
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
  });
  const from = `"${creds.fromName}" <${creds.fromEmail}>`;

  const when = [payload.eventDate, payload.eventTime].filter(Boolean).join(' · ');
  const chargesText = `Entry ${formatINR(payload.entryAmount)} | Cover ${formatINR(payload.coverAmount)} | Pay at venue ${formatINR(payload.amountDueAtVenue)}`;
  const tableText = payload.tableSummary || 'Not specified';
  const pinText = payload.reservationPin?.trim() || 'Not assigned';

  const jobs: Array<Promise<unknown>> = [];

  if (adminRecipient) {
    jobs.push(
      transporter.sendMail({
        from,
        to: adminRecipient,
        subject: `New Booking · ${payload.eventName} · ${payload.bookingId}`,
        text:
          `New booking received\n\n` +
          `Booking ID: ${payload.bookingId}\n` +
          `Guest: ${payload.guestName}\n` +
          `Phone: ${payload.guestPhone}\n` +
          `Email: ${payload.guestEmail || 'Not provided'}\n` +
          `Guests: ${payload.guestCount}\n` +
          `PIN: ${pinText}\n` +
          `Event: ${payload.eventName}\n` +
          `When: ${when}\n` +
          `Tables: ${tableText}\n` +
          `Charges: ${chargesText}\n` +
          (payload.qrUrl ? `QR: ${payload.qrUrl}\n` : ''),
        html:
          `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f7f4ef;">` +
          `<div style="background:#fff;border:1px solid #e7dfd1;border-radius:16px;padding:28px;">` +
          `<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8c7762;margin-bottom:8px;">Akan Hyderabad</div>` +
          `<h1 style="margin:0 0 18px;color:#1c130d;font-size:22px;">New Booking Received</h1>` +
          `<p style="margin:0 0 18px;color:#5a4a3f;font-size:14px;line-height:1.6;">${payload.eventName}<br/>${when}</p>` +
          `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#1c130d;">` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Booking ID</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.bookingId}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Guest</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.guestName}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Phone</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.guestPhone}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Email</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.guestEmail || 'Not provided'}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Guests</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.guestCount}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">PIN</td><td style="padding:6px 0;font-weight:600;text-align:right;">${pinText}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Tables</td><td style="padding:6px 0;font-weight:600;text-align:right;">${tableText}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Entry</td><td style="padding:6px 0;font-weight:600;text-align:right;">${formatINR(payload.entryAmount)}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Cover</td><td style="padding:6px 0;font-weight:600;text-align:right;">${formatINR(payload.coverAmount)}</td></tr>` +
          `<tr><td style="padding:10px 0 0;color:#8c7762;">Payable at venue</td><td style="padding:10px 0 0;font-weight:700;text-align:right;color:#c1551a;">${formatINR(payload.amountDueAtVenue)}</td></tr>` +
          `</table>` +
          (payload.qrUrl ? `<p style="margin:18px 0 0;font-size:12px;color:#5a4a3f;">QR: <a href="${payload.qrUrl}">${payload.qrUrl}</a></p>` : '') +
          `</div></div>`,
        attachments: payload.pdfAttachment ? [payload.pdfAttachment] : [],
      }),
    );
  }

  if (guestRecipient) {
    jobs.push(
      transporter.sendMail({
        from,
        to: guestRecipient,
        subject: `Your Akan booking is confirmed · ${payload.eventName}`,
        text:
          `Hi ${payload.guestName},\n\n` +
          `Your booking has been confirmed.\n\n` +
          `Booking ID: ${payload.bookingId}\n` +
          `PIN: ${pinText}\n` +
          `Event: ${payload.eventName}\n` +
          `When: ${when}\n` +
          `Guests: ${payload.guestCount}\n` +
          `Tables: ${tableText}\n` +
          `Entry: ${formatINR(payload.entryAmount)}\n` +
          `Cover: ${formatINR(payload.coverAmount)}\n` +
          `Payable at venue: ${formatINR(payload.amountDueAtVenue)}\n\n` +
          `Please show your booking ID${payload.qrUrl ? ' and QR' : ''} at the venue entry desk.\n` +
          (payload.qrUrl ? `QR: ${payload.qrUrl}\n` : ''),
        html:
          `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f7f4ef;">` +
          `<div style="background:#fff;border:1px solid #e7dfd1;border-radius:16px;padding:28px;">` +
          `<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8c7762;margin-bottom:8px;">Akan Hyderabad</div>` +
          `<h1 style="margin:0 0 16px;color:#1c130d;font-size:24px;">Booking Confirmed</h1>` +
          `<p style="margin:0 0 18px;color:#5a4a3f;font-size:14px;line-height:1.6;">Hi ${payload.guestName}, your reservation for <strong>${payload.eventName}</strong> is confirmed.</p>` +
          `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#1c130d;">` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Booking ID</td><td style="padding:6px 0;font-weight:700;text-align:right;">${payload.bookingId}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">When</td><td style="padding:6px 0;font-weight:600;text-align:right;">${when}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">PIN</td><td style="padding:6px 0;font-weight:600;text-align:right;">${pinText}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Guests</td><td style="padding:6px 0;font-weight:600;text-align:right;">${payload.guestCount}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Tables</td><td style="padding:6px 0;font-weight:600;text-align:right;">${tableText}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Entry</td><td style="padding:6px 0;font-weight:600;text-align:right;">${formatINR(payload.entryAmount)}</td></tr>` +
          `<tr><td style="padding:6px 0;color:#8c7762;">Cover</td><td style="padding:6px 0;font-weight:600;text-align:right;">${formatINR(payload.coverAmount)}</td></tr>` +
          `<tr><td style="padding:10px 0 0;color:#8c7762;">Payable at venue</td><td style="padding:10px 0 0;font-weight:700;text-align:right;color:#c1551a;">${formatINR(payload.amountDueAtVenue)}</td></tr>` +
          `</table>` +
          `<p style="margin:18px 0 0;color:#5a4a3f;font-size:13px;line-height:1.6;">Please show this booking ID${payload.qrUrl ? ' or the QR below' : ''} at the venue entry desk.</p>` +
          (payload.qrUrl ? `<p style="margin:10px 0 0;font-size:12px;"><a href="${payload.qrUrl}">Open booking QR</a></p>` : '') +
          `</div></div>`,
        attachments: payload.pdfAttachment ? [payload.pdfAttachment] : [],
      }),
    );
  }

  const results = await Promise.allSettled(jobs);
  const success = results.some((result) => result.status === 'fulfilled');
  if (!success) {
    logAudit({
      actor: 'system',
      action: 'reservation_email_failed',
      details: { bookingId: payload.bookingId },
    });
  }
  return success;
}
