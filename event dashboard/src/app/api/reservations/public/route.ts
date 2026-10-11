import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { normalizePhone } from '@/lib/users';
import type { EventRow } from '@/lib/events';
import { findInviteeByPhone, markInviteeUsed } from '@/lib/invitees';
import { checkSlotCapacity, listSlots } from '@/lib/event-slots';
import { parseRsvpFields, validateRsvpAnswers } from '@/lib/rsvp-fields';
import { getZone } from '@/lib/seating-layout';
import {
  getEffectivePixelId,
  getCapiAccessToken,
  getTestEventCode,
  hashSha256Lowercase,
  normalizePhoneForCapi,
  sendCapiEvent,
} from '@/lib/meta-pixel';
import { sendBookingAlertWhatsApp, sendReservationEmails, sendReservationForwardWebhook, sendReservegoReservation } from '@/lib/notifications';
import { signReservationQrToken } from '@/lib/signed-url';
import { projectPublicEventLifecycle } from '@/lib/public-event-lifecycle';
import { resolveRequestOrigin } from '@/lib/request-origin';
import { markAbandonedLeadConverted } from '@/lib/abandoned-bookings';
import { getReservationSummary } from '@/lib/reservation-ledger';
import { generateReservationPassPdf } from '@/lib/pdf/reservation-pass';

// ─── Constant-time invite secret compare ───────────────────────────────────
// Length-mismatch short-circuit is fine — leaking the length of a
// nanoid(20) doesn't help an attacker. The byte-by-byte compare uses
// crypto.timingSafeEqual to avoid a timing oracle on equal-length inputs.
function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── In-memory rate limit ──────────────────────────────────────────────────
// Simple sliding window: max 5 requests per IP per 10 minutes. The Map is
// process-local — fine for single-instance Next.js, would need Redis if
// we ever horizontally scale. Periodically purged to prevent unbounded
// growth from one-off IPs that never come back.

const RATE_WINDOW_MS = 10 * 60 * 1000;  // 10 minutes
const RATE_MAX = 5;
const ipHits = new Map<string, number[]>();
let lastCleanupAt = 0;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns true if the request should be allowed; false if rate-limited.
 * Also performs a lazy housekeeping pass: every ~minute we walk the map
 * and drop entries with no recent hits so it can't grow forever.
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup — once per minute, prune IPs whose newest hit is
  // already past the window. Keeps the Map size bounded by recent traffic.
  if (now - lastCleanupAt > 60_000) {
    lastCleanupAt = now;
    for (const [key, hits] of ipHits) {
      const filtered = hits.filter((t) => now - t < RATE_WINDOW_MS);
      if (filtered.length === 0) {
        ipHits.delete(key);
      } else if (filtered.length !== hits.length) {
        ipHits.set(key, filtered);
      }
    }
  }

  const existing = ipHits.get(ip) || [];
  const fresh = existing.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    ipHits.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  ipHits.set(ip, fresh);
  return true;
}

// ─── Handler ───────────────────────────────────────────────────────────────

/**
 * POST /api/reservations/public — PUBLIC, no auth.
 *
 * Body: { eventSlug, name, phone, pax?, notes?, fbp?, fbc?, fbclid? }
 *
 * Creates a pending reservation linked to the event matching `eventSlug`.
 * On success, fires a Meta CAPI 'Lead' event so the marketing funnel
 * captures the conversion even when the browser Pixel doesn't (Safari ITP,
 * ad blockers). The CAPI call is fire-and-forget — never blocks the
 * customer's response.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, message: 'Too many submissions. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({})) as {
    eventSlug?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    pax?: unknown;
    notes?: unknown;
    tableTypeId?: unknown;
    tableTypeLabel?: unknown;
    selectedTables?: unknown;
    maleCount?: unknown;
    femaleCount?: unknown;
    coupleCount?: unknown;
    entryAmount?: unknown;
    coverAmount?: unknown;
    fbp?: unknown;
    fbc?: unknown;
    fbclid?: unknown;
    // Phase 3
    invite?: unknown;        // ?invite=<secret> for access_mode=invite_link
    slotId?: unknown;        // multi-slot picker
    // Phase 4 — custom RSVP form answers, keyed by FieldDef.id
    rsvpAnswers?: unknown;
    // Seating layout — required when event.seating_layout_enabled. Matches
    // the SVG layer id; the server resolves it to the canonical event_zones
    // row + freezes a price snapshot on the reservation.
    zoneId?: unknown;
    abandonedLeadId?: unknown;
  };

  // ── Validation ──
  const eventSlug = String(body.eventSlug || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const phoneRaw = String(body.phone || '').trim();
  const emailRaw = typeof body.email === 'string' ? body.email.trim().slice(0, 160) : '';
  const paxInput = body.pax == null ? 1 : Number(body.pax);
  const tableTypeId = typeof body.tableTypeId === 'string' ? body.tableTypeId.trim().slice(0, 80) : '';
  const tableTypeLabel = typeof body.tableTypeLabel === 'string' ? body.tableTypeLabel.trim().slice(0, 120) : '';
  const maleCount = Number.isFinite(Number(body.maleCount)) ? Math.max(0, Math.floor(Number(body.maleCount))) : 0;
  const femaleCount = Number.isFinite(Number(body.femaleCount)) ? Math.max(0, Math.floor(Number(body.femaleCount))) : 0;
  const coupleCount = Number.isFinite(Number(body.coupleCount)) ? Math.max(0, Math.floor(Number(body.coupleCount))) : 0;
  const entryAmount = Number.isFinite(Number(body.entryAmount)) ? Math.max(0, Number(body.entryAmount)) : 0;
  const coverAmount = Number.isFinite(Number(body.coverAmount)) ? Math.max(0, Number(body.coverAmount)) : 0;
  const notesPayload: Record<string, unknown> = {};
  const baseNotes = body.notes ? String(body.notes).trim().slice(0, 500) : '';
  if (baseNotes) notesPayload.customer_notes = baseNotes;
  if (tableTypeId) notesPayload.tableTypeId = tableTypeId;
  if (tableTypeLabel) notesPayload.tableTypeLabel = tableTypeLabel;
  if (Array.isArray(body.selectedTables)) {
    const selectedTables = body.selectedTables
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        capacity: Number.isFinite(Number(row.capacity)) ? Math.max(0, Math.floor(Number(row.capacity))) : 0,
        quantity: Number.isFinite(Number(row.quantity)) ? Math.max(0, Math.floor(Number(row.quantity))) : 0,
        tableTypeId: typeof row.tableTypeId === 'string' ? row.tableTypeId.trim().slice(0, 80) : '',
        label: typeof row.label === 'string' ? row.label.trim().slice(0, 120) : '',
      }))
      .filter((row) => row.capacity > 0 && row.quantity > 0);
    if (selectedTables.length > 0) {
      notesPayload.selectedTables = selectedTables;
      notesPayload.tableCount = selectedTables.reduce((sum, row) => sum + row.quantity, 0);
    }
  }
  if (maleCount > 0 || femaleCount > 0 || coupleCount > 0) {
    notesPayload.guestBreakdown = { male: maleCount, female: femaleCount, couple: coupleCount };
  }
  const notes = Object.keys(notesPayload).length > 0 ? JSON.stringify(notesPayload) : null;
  const inviteToken = typeof body.invite === 'string' ? body.invite.trim() : '';
  const abandonedLeadId = typeof body.abandonedLeadId === 'string' ? body.abandonedLeadId.trim().slice(0, 120) : '';
  const slotIdInput = typeof body.slotId === 'string' && body.slotId.trim() ? body.slotId.trim() : null;
  const selectedTableLabels = Array.isArray(notesPayload.selectedTables)
    ? (notesPayload.selectedTables as Array<{ label?: string }>).map((row) => String(row.label || '')).filter(Boolean)
    : [];

  if (!eventSlug) {
    return NextResponse.json({ ok: false, message: 'eventSlug is required.' }, { status: 400 });
  }
  if (name.length < 1 || name.length > 100) {
    return NextResponse.json({ ok: false, message: 'Name must be 1-100 characters.' }, { status: 400 });
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ ok: false, message: 'Valid phone number required.' }, { status: 400 });
  }
  const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
  if (emailRaw && !email) {
    return NextResponse.json({ ok: false, message: 'Email address is not valid.' }, { status: 400 });
  }
  if (!Number.isFinite(paxInput) || paxInput < 1 || paxInput > 20) {
    return NextResponse.json({ ok: false, message: 'PAX must be between 1 and 20.' }, { status: 400 });
  }
  const pax = Math.floor(paxInput);
  if (maleCount + femaleCount + (coupleCount * 2) > 0 && maleCount + femaleCount + (coupleCount * 2) !== pax) {
    return NextResponse.json({ ok: false, message: 'Guest breakdown does not match total PAX.' }, { status: 400 });
  }

  // ── Event lookup ──
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE slug = ? LIMIT 1').get(eventSlug) as EventRow | undefined;
  if (!event) {
    return NextResponse.json({ ok: false, message: 'Event not found.' }, { status: 404 });
  }
  const lifecycle = projectPublicEventLifecycle({
    name: event.name,
    eventDate: event.event_date,
    startTime: event.start_time,
    recurrenceMode: event.recurrence_mode,
    recurrenceUntil: event.recurrence_until,
    categorySlot: event.category_slot,
    categoryLabel: event.category_label,
    genre: event.genre,
    status: event.status,
  });
  if (!lifecycle.bookingOpen) {
    return NextResponse.json({ ok: false, message: 'This event is no longer accepting reservations.' }, { status: 400 });
  }

  // ── Phase 3: access_mode gate ──
  const accessMode = (event.access_mode || 'public') as 'public' | 'invite_link' | 'phone_list';
  let inviteeId: string | null = null;
  if (accessMode === 'invite_link') {
    if (!safeCompare(inviteToken, event.invite_secret)) {
      return NextResponse.json(
        { ok: false, message: 'A valid invite link is required to book this event.' },
        { status: 403 },
      );
    }
  } else if (accessMode === 'phone_list') {
    const invitee = findInviteeByPhone(event.id, phone);
    if (!invitee) {
      return NextResponse.json(
        { ok: false, message: 'This phone number is not on the invite list for this event.' },
        { status: 403 },
      );
    }
    // pax cap: the invitee themself + plus_ones_allowed companions
    if (pax > 1 + invitee.plus_ones_allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: `Your invite allows up to ${1 + invitee.plus_ones_allowed} guest(s). Please reduce PAX.`,
        },
        { status: 400 },
      );
    }
    if (invitee.used) {
      return NextResponse.json(
        { ok: false, message: 'This invitation has already been redeemed.' },
        { status: 403 },
      );
    }
    inviteeId = invitee.id;
  }

  // ── Phase 3: slot validation pre-check ──
  // Resolve the active slot list once so we know whether a slot is required.
  // The real capacity check happens inside the transaction below to stay
  // race-safe; this just rejects obviously-bad inputs early.
  const activeSlots = listSlots(event.id, { activeOnly: true });
  if (activeSlots.length > 0 && !slotIdInput) {
    return NextResponse.json(
      { ok: false, message: 'Please pick a time slot for this event.' },
      { status: 400 },
    );
  }
  if (slotIdInput && activeSlots.length === 0) {
    // The form sent a slotId but the event has no active slots — likely a
    // stale page. Reject so the customer reloads and sees the right UI.
    return NextResponse.json(
      { ok: false, message: 'This event no longer uses time slots. Please refresh and try again.' },
      { status: 400 },
    );
  }
  if (slotIdInput && !activeSlots.some((s) => s.id === slotIdInput)) {
    return NextResponse.json(
      { ok: false, message: 'Selected slot is no longer available.' },
      { status: 400 },
    );
  }

  // ── Seating layout validation ──
  // When the event has seating_layout_enabled, zoneId is REQUIRED. We
  // resolve to the canonical event_zones row, refuse cross-event tampering,
  // and refuse zones that are inactive or out of capacity. The capacity
  // CHECK here is informational — sold_count is only incremented inside
  // the payment-verify transaction, so abandoned carts don't burn seats.
  const seatingEnabled = !!(event as EventRow & { seating_layout_enabled?: number }).seating_layout_enabled;
  const zoneIdInput =
    typeof body.zoneId === 'string' && body.zoneId.trim() ? body.zoneId.trim() : null;
  let resolvedZonePk: string | null = null;
  let resolvedZonePrice: number | null = null;

  if (seatingEnabled) {
    if (!zoneIdInput) {
      return NextResponse.json(
        { ok: false, message: 'Please pick a zone for this event.' },
        { status: 400 },
      );
    }
    // The client sends the event_zones PK nanoid (zone.id) — NOT the SVG
    // layer id. Look up by PK and then assert the row belongs to this
    // event so a stale client can't pick a zone from a different event.
    const zone = getZone(zoneIdInput);
    if (!zone || zone.event_id !== event.id) {
      return NextResponse.json(
        { ok: false, message: 'Selected zone is not valid for this event.' },
        { status: 400 },
      );
    }
    if (!zone.active) {
      return NextResponse.json(
        { ok: false, message: 'That zone is no longer available.' },
        { status: 400 },
      );
    }
    const remaining = zone.capacity - zone.sold_count;
    if (remaining < pax) {
      return NextResponse.json(
        { ok: false, message: `Only ${Math.max(0, remaining)} seats remaining in that zone.` },
        { status: 409 },
      );
    }
    resolvedZonePk = zone.id;
    resolvedZonePrice = zone.price;
  } else if (zoneIdInput) {
    // Stale client sending a zone for an event that doesn't use seating —
    // ignore silently rather than 400 so the customer experience isn't
    // broken if the host flipped the toggle off mid-session.
  }

  // ── Phase 4: validate RSVP answers ──
  // The event's field defs are parsed off the raw column so a host edit takes
  // effect on the very next submit (no caching). Empty array = no custom
  // fields configured; we still call validate() so any stray answers from a
  // stale browser are dropped silently rather than persisted.
  const rsvpFields = parseRsvpFields(
    (event as EventRow & { rsvp_fields_json?: string | null }).rsvp_fields_json ?? null,
  );
  const rawAnswers =
    body.rsvpAnswers && typeof body.rsvpAnswers === 'object'
      ? (body.rsvpAnswers as Record<string, unknown>)
      : {};
  const rsvpValidation = validateRsvpAnswers(rsvpFields, rawAnswers);
  if (!rsvpValidation.ok) {
    // Surface a generic top-level message for the toast + the per-field error
    // map so PublicBookingForm can render inline messages under each input.
    // Use the first field's label in the message so the customer knows which
    // field to fix even on a tiny screen where errors[] isn't visible yet.
    const firstId = Object.keys(rsvpValidation.errors)[0];
    const firstField = rsvpFields.find((f) => f.id === firstId);
    const firstLabel = firstField?.label || 'required';
    return NextResponse.json(
      {
        ok: false,
        message: `Please complete the "${firstLabel}" field.`,
        errors: rsvpValidation.errors,
      },
      { status: 400 },
    );
  }
  const cleanedAnswers = rsvpValidation.cleaned;
  // Hard size cap — defends against a hostile caller stuffing megabytes into
  // a Record<string,string|string[]>. 8KB after validation is more than
  // enough for 30 fields × 1KB answers.
  const cleanedAnswersJson =
    Object.keys(cleanedAnswers).length > 0 ? JSON.stringify(cleanedAnswers) : null;
  if (cleanedAnswersJson && cleanedAnswersJson.length > 8 * 1024) {
    return NextResponse.json(
      { ok: false, message: 'RSVP answers exceed the maximum allowed length.' },
      { status: 400 },
    );
  }

  // ── Persist reservation ──
  // We don't reuse createManualReservation here because (a) we want the
  // provider tagged as 'public-web' for analytics, and (b) we need to stash
  // fbp/fbc/fbclid into the raw JSON for later CAPI matching.
  const reservationId = nanoid();
  const now = Date.now();
  const fbp = body.fbp ? String(body.fbp).slice(0, 200) : null;
  const fbc = body.fbc ? String(body.fbc).slice(0, 200) : null;
  const fbclid = body.fbclid ? String(body.fbclid).slice(0, 200) : null;

  const rawJson = JSON.stringify({
    source: 'public_web',
    ip,
    user_agent: req.headers.get('user-agent') || null,
    fbp,
    fbc,
    fbclid,
  });

  // Race-safe capacity + insert + invitee mark-used in one transaction.
  // better-sqlite3's db.transaction() wraps the body in BEGIN IMMEDIATE,
  // which serializes writers so two concurrent bookings can't both pass
  // the capacity COUNT(*) check.
  let conflictReason: string | null = null;
  const tx = db.transaction(() => {
    if (slotIdInput) {
      const check = checkSlotCapacity(slotIdInput, event.id, pax);
      if (!check.ok) {
        conflictReason = check.reason;
        return;
      }
    }
    db.prepare(`
      INSERT INTO reservations
        (id, event_id, event_date, provider, external_ref, name, phone, email, pax, total_pax,
         arrival_time, notes, status, synced_at, raw, slot_id, rsvp_answers_json,
         zone_id, zone_pax_count, zone_price_snapshot, male_count, female_count, couple_count,
         entry_amount, cover_amount, reservation_status)
      VALUES (?, ?, ?, 'public-web', NULL, ?, ?, ?, ?, ?, NULL, ?, 'pending', ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reservationId, event.id, event.event_date,
      // total_pax: mirror invariant — keep in sync with pax on every write.
      name, phone, email, pax, pax, notes, now, rawJson, slotIdInput, cleanedAnswersJson,
      // Seating layout columns: NULL when feature disabled / no zone chosen.
      // zone_pax_count mirrors pax on insert; release path reads it back to
      // know how many seats to give back if the booking is reversed.
      resolvedZonePk, resolvedZonePk ? pax : 0, resolvedZonePrice,
      maleCount, femaleCount, coupleCount,
      entryAmount, coverAmount, 'pending',
    );
    if (inviteeId) {
      markInviteeUsed(inviteeId, reservationId, now);
    }
  });
  tx();

  if (conflictReason) {
    // 409 — slot filled while the customer was filling the form.
    return NextResponse.json({ ok: false, message: conflictReason }, { status: 409 });
  }

  logAudit({
    actor: 'public',
    action: 'reservation_public_create',
    entityType: 'reservation',
    entityId: reservationId,
    details: {
      event_id: event.id,
      event_slug: eventSlug,
      ip,
      has_fbp: !!fbp,
      has_fbc: !!fbc,
      has_rsvp_answers: !!cleanedAnswersJson,
    },
  });

  // ── Fire CAPI reservation events ──
  const pixelId = getEffectivePixelId(event.meta_pixel_id);
  const accessToken = getCapiAccessToken();
  const testEventCode = getTestEventCode();
  if (pixelId && accessToken) {
    const phoneHash = hashSha256Lowercase(normalizePhoneForCapi(phone));
    const userData = {
      ph: [phoneHash],
      fbp: fbp || undefined,
      fbc: fbc || undefined,
      client_ip_address: ip !== 'unknown' ? ip : undefined,
      client_user_agent: req.headers.get('user-agent') || undefined,
    };
    await Promise.allSettled([
      sendCapiEvent({
        pixelId,
        accessToken,
        eventName: 'Lead',
        eventId: reservationId,
        actionSource: 'website',
        userData,
        customData: {
          content_name: event.name,
          currency: 'INR',
          value: 0,
        },
        testEventCode: testEventCode || undefined,
      }),
      sendCapiEvent({
        pixelId,
        accessToken,
        eventName: 'EventReservationSubmitted',
        eventId: reservationId,
        actionSource: 'website',
        userData,
        customData: {
          content_name: event.name,
          currency: 'INR',
          value: 0,
          guest_count: pax,
        },
        testEventCode: testEventCode || undefined,
      }),
      sendCapiEvent({
        pixelId,
        accessToken,
        eventName: 'EventReservationConfirmed',
        eventId: reservationId,
        actionSource: 'website',
        userData,
        customData: {
          content_name: event.name,
          currency: 'INR',
          value: 0,
          guest_count: pax,
          flow_type: 'free_reservation',
        },
        testEventCode: testEventCode || undefined,
      }),
    ]);
  }

  // ── Fire host WhatsApp booking alert (fire-and-forget) ──
  // The amount here is informational — for public-web bookings we don't
  // know the final paid amount until /api/payments/verify runs (the same
  // helper fires a second alert from there with the real captured amount).
  // We pass the entry-fee × pax estimate so the host sees something
  // sensible immediately. Guarded by WHATSAPP_BOOKING_ALERTS_ENABLED in
  // the helper itself so disabling it has zero overhead.
  const entryFeeForAlert = Number(event.entry_fee_per_person) || 0;
  void sendBookingAlertWhatsApp({
    guestName: name,
    eventName: event.name,
    amount: entryFeeForAlert * pax,
  }).catch(() => { /* never block on host alert */ });

  const qrToken = signReservationQrToken({ reservationId });
  const origin = resolveRequestOrigin(req);
  const qrUrl = `${origin}/api/reservations/qr-png/${encodeURIComponent(qrToken)}`;
  const reservationSummary = getReservationSummary(reservationId);
  const reservationPin = reservationSummary?.display_code || reservationId.slice(-4).toUpperCase();
  const eventStartTime = typeof (event as EventRow & { start_time?: string | null }).start_time === 'string'
    ? (event as EventRow & { start_time?: string | null }).start_time
    : null;
  const reservationPassPdf = await generateReservationPassPdf({
    bookingId: reservationId,
    pin: reservationPin,
    guestName: name,
    eventName: event.name,
    eventDate: event.event_date,
    eventTime: eventStartTime,
    guestCount: pax,
    tableSummary: tableTypeLabel || (selectedTableLabels.length > 0 ? selectedTableLabels.join(', ') : null),
    amountDueAtVenue: entryAmount + coverAmount,
    qrValue: `${origin}/admin/scan?token=${encodeURIComponent(qrToken)}`,
  });

  if (abandonedLeadId) {
    try {
      markAbandonedLeadConverted(abandonedLeadId, reservationId);
    } catch {
      // Best-effort only — never block the customer booking response.
    }
  }

  const bookingTime = eventStartTime
    ? `${event.event_date}T${eventStartTime.length === 5 ? `${eventStartTime}:00` : eventStartTime}+05:30`
    : `${event.event_date}T00:00:00+05:30`;

  void sendReservationForwardWebhook({
    bookingId: reservationId,
    reservation_id: reservationId,
    guestName: name,
    guestPhone: phone,
    guestEmail: email,
    guestCount: pax,
    bookingTime,
    eventDate: event.event_date,
    guestComments: baseNotes || null,
    tableNames: selectedTableLabels.length > 0 ? selectedTableLabels : undefined,
    status: 'pending',
  }).catch(() => { /* never block on outbound reservation webhook */ });

  // ── Push the booking to ReserveGo's reservation API (fire-and-forget) ──
  void sendReservegoReservation({
    bookingId: reservationId,
    guestName: name,
    guestPhone: phone,
    guestCount: pax,
    bookingTime,
    eventName: event.name,
  }).catch(() => { /* never block on ReserveGo */ });

  void sendReservationEmails({
    bookingId: reservationId,
    reservationPin,
    guestName: name,
    guestPhone: phone,
    guestEmail: email,
    guestCount: pax,
    eventName: event.name,
    eventDate: event.event_date,
    eventTime: eventStartTime,
    tableSummary: tableTypeLabel || (selectedTableLabels.length > 0 ? selectedTableLabels.join(', ') : null),
    entryAmount,
    coverAmount,
    amountDueAtVenue: entryAmount + coverAmount,
    qrUrl,
    pdfAttachment: {
      filename: `reservation-${reservationId}.pdf`,
      content: Buffer.from(reservationPassPdf),
    },
  }).catch(() => { /* never block on booking emails */ });

  return NextResponse.json({
    ok: true,
    reservationId,
    eventId: event.id,
    qrToken,
    qrUrl,
    message: 'Reservation received.',
  });
}
