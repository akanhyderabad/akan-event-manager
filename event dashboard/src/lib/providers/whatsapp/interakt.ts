/**
 * Interakt — WhatsApp Business Solution Provider.
 *
 * Sends pre-approved template messages over the Interakt Public API. Used by:
 *   • WhatsApp OTP login (template: akan_login_otp)
 *   • Reservation confirmation (template: reservation_confirmed)
 *   • Ticket confirmation (template: ticket_confirmed)
 *
 * Credentials live in the config table (host-only sub-page in Settings):
 *   INTERAKT_API_SECRET       — Basic Auth secret from Interakt dashboard
 *   INTERAKT_BUSINESS_PHONE   — your verified WhatsApp Business number (display)
 *
 * Provider rate limits are returned to the caller; requests are not retried
 * automatically because acceptance may be uncertain after a network timeout.
 */
import { getConfig } from '@/lib/db';

const INTERAKT_ENDPOINT = 'https://api.interakt.ai/v1/public/message/';

export interface InteraktSendInput {
  /** Country code with leading +, e.g. "+91". */
  countryCode: string;
  /** Phone number WITHOUT country code, digits only, e.g. "9876543210". */
  phoneNumber: string;
  /** Approved template slug (case-sensitive). */
  templateName: string;
  /** Language code as approved by Meta (e.g. "en"). */
  languageCode: string;
  /** Values for {{1}}, {{2}}, ... in template body order. */
  bodyValues?: string[];
  /** Values for header variables, if the header has any. */
  headerValues?: string[];
  /** Attachment filename for an approved DOCUMENT-header template. */
  fileName?: string;
  /**
   * Values for buttons that take variables (e.g. Authentication templates'
   * Copy Code button must receive the OTP code as a parameter).
   * Format: { "<button index>": [value1, value2, ...] }
   * For OTP: { "0": ["1234"] }
   */
  buttonValues?: Record<string, string[]>;
  /** Free-form ref string Interakt echoes back on webhooks (good for matching). */
  callbackData?: string;
}

export interface InteraktSendResult {
  ok: boolean;
  /** Interakt's message id on success. */
  messageId?: string;
  /** Human-readable error reason on failure. */
  error?: string;
  /** Raw upstream status for callers that want to react (429, 401, etc.). */
  status?: number;
}

export function isInteraktConfigured(): boolean {
  return !!getConfig('INTERAKT_API_SECRET', '').trim();
}

function authHeader(): string {
  // Interakt's "API Secret" in their dashboard is already the base64-encoded
  // token. We just prefix with `Basic `. Don't re-encode — that produces a
  // double-encoded token and Interakt rejects with "Invalid token provided".
  // Tolerate two paste variants:
  //   1. raw secret  → "Basic <raw>"
  //   2. full header → "Basic XXXX..." (left as-is)
  const raw = getConfig('INTERAKT_API_SECRET', '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().startsWith('basic ')) return raw;
  return `Basic ${raw}`;
}

/** Normalise an Indian-format phone into { countryCode, phoneNumber } digits. */
export function splitPhone(input: string): { countryCode: string; phoneNumber: string } {
  const cleaned = String(input || '').replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) return { countryCode: '+91', phoneNumber: cleaned.slice(3) };
  // Match the international countries offered by PhoneInput, longest first.
  const dialCode = ['+971', '+966', '+44', '+65', '+61', '+1'].find((code) => cleaned.startsWith(code));
  if (dialCode) return { countryCode: dialCode, phoneNumber: cleaned.slice(dialCode.length) };
  if (cleaned.startsWith('91') && cleaned.length === 12) return { countryCode: '+91', phoneNumber: cleaned.slice(2) };
  if (cleaned.length === 10) return { countryCode: '+91', phoneNumber: cleaned };
  // Generic E.164 — try to split at the +
  if (cleaned.startsWith('+')) {
    // Treat first 1-3 digits after + as country code (best effort)
    const m = cleaned.match(/^\+(\d{1,3})(\d+)$/);
    if (m) return { countryCode: `+${m[1]}`, phoneNumber: m[2] };
  }
  return { countryCode: '+91', phoneNumber: cleaned };
}

/**
 * Send a pre-approved template message via Interakt.
 *
 * Returns a normalised result — never throws. Caller decides whether to retry.
 */
export async function sendInteraktTemplate(input: InteraktSendInput): Promise<InteraktSendResult> {
  if (!isInteraktConfigured()) {
    return { ok: false, error: 'Interakt not configured. Add API secret in Settings → WhatsApp.' };
  }

  const auth = authHeader();
  const body: Record<string, unknown> = {
    countryCode: input.countryCode,
    phoneNumber: input.phoneNumber,
    callbackData: input.callbackData ?? '',
    type: 'Template',
    template: {
      name: input.templateName,
      languageCode: input.languageCode,
      headerValues: input.headerValues ?? [],
      bodyValues: input.bodyValues ?? [],
      ...(input.fileName ? { fileName: input.fileName } : {}),
      ...(input.buttonValues ? { buttonValues: input.buttonValues } : {}),
    },
  };

  // Never log credentials, customer numbers, OTPs or signed attachment URLs.

  let res: Response;
  try {
    res = await fetch(INTERAKT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: 'WhatsApp request could not be confirmed. Check Interakt before retrying.' };
  }

  const status = res.status;
  let payload: Record<string, unknown> = {};
  let rawText = '';
  try {
    rawText = await res.text();
    const parsed: unknown = rawText ? JSON.parse(rawText) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch { /* not all errors return JSON */ }

  if (!res.ok || payload.result === false) {
    const message =
      (typeof payload.message === 'string' && payload.message.replace(/https?:\/\/\S+/g, '[link omitted]')) ||
      `Interakt API ${status}`;
    return { ok: false, error: message, status };
  }

  // Interakt success envelope varies by version — pull a message id where we can find it.
  const nestedId = (payload.data as { id?: unknown } | undefined)?.id;
  const messageId = typeof payload.id === 'string' ? payload.id
    : typeof nestedId === 'string' ? nestedId : undefined;

  if (!messageId) return { ok: false, error: 'WhatsApp acceptance could not be confirmed. Check Interakt before retrying.', status };

  return { ok: true, messageId, status };
}
