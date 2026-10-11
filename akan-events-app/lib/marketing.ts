/**
 * Marketing / conversion tracking — GA4 (+ Google Ads) via gtag, and Meta Pixel
 * via fbq. The base tags are loaded once in app/layout.tsx; these helpers just
 * fire events. All calls are guarded + best-effort — they never throw into the
 * booking flow if a tag is blocked (ad-blockers, consent, etc.).
 *
 * IDs (see layout.tsx): GA4 G-XM8PHQL4GD · Google Ads AW-18268406488 · Meta Pixel 1042947530519538
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type EventTrackingInput = {
  eventId?: string;
  eventName?: string;
  pax?: number;
};

const META_CUSTOM_EVENTS = {
  reservationClick: 'EventReservationClick',
  guestCountSelected: 'EventGuestCountSelected',
  reservationSubmitted: 'EventReservationSubmitted',
  reservationConfirmed: 'EventReservationConfirmed',
} as const;

/** Public event page view — Meta `ViewContent` plus a custom reserve funnel marker. */
export function trackEventPageView(input: EventTrackingInput): void {
  if (typeof window === 'undefined') return;
  const { eventId, eventName, pax } = input;
  try {
    window.fbq?.('track', 'ViewContent', {
      content_ids: eventId ? [eventId] : undefined,
      content_name: eventName,
      content_type: 'event',
      currency: 'INR',
      value: 0,
      num_items: pax,
    });
  } catch { /* ignore */ }
}

/** Reserve CTA click / modal open — Meta `InitiateCheckout` plus a custom event. */
export function trackReserveClick(input: EventTrackingInput): void {
  if (typeof window === 'undefined') return;
  const { eventId, eventName, pax } = input;
  try {
    window.fbq?.('trackCustom', META_CUSTOM_EVENTS.reservationClick, {
      event_id: eventId,
      event_name: eventName,
      pax,
    });
  } catch { /* ignore */ }
  try {
    window.fbq?.('track', 'InitiateCheckout', {
      content_ids: eventId ? [eventId] : undefined,
      content_name: eventName,
      content_type: 'event',
      currency: 'INR',
      value: 0,
      num_items: pax,
    });
  } catch { /* ignore */ }
}

/** Modal progression / form actions that are useful in Events Manager. */
export function trackReservationAction(action: string, input: EventTrackingInput): void {
  if (typeof window === 'undefined') return;
  const { eventId, eventName, pax } = input;
  try {
    window.fbq?.('trackCustom', action, {
      event_id: eventId,
      event_name: eventName,
      pax,
    });
  } catch { /* ignore */ }
}

/**
 * Fire a successful-reservation conversion.
 * - GA4: `generate_lead` (recommended event — import this into Google Ads as a
 *   conversion). The reservation id is passed so it can be deduped.
 * - Meta Pixel: `CompleteRegistration` (the "successful registration" standard
 *   event to map the confirmation-page conversion on) AND `Lead` (kept for
 *   backward-compat). Both use `eventID` = reservation id so they dedupe against
 *   any server-side CAPI event for the same booking.
 */
export function trackReservationSuccess(input: { reservationId: string; eventName?: string; pax?: number }): void {
  if (typeof window === 'undefined') return;
  const { reservationId, eventName, pax } = input;

  // The gtag/fbq tags load "afterInteractive", so on a fresh page load (e.g. the
  // /reservation-success landing page) this can run before window.gtag / fbq
  // exist. Retry every 250ms for up to ~8s, firing each tag once it's ready so
  // the conversion is never silently dropped.
  let gaDone = false;
  let fbDone = false;
  let tries = 0;
  const attempt = () => {
    if (!gaDone && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'generate_lead', {
          currency: 'INR',
          value: 0,
          method: 'event_reservation',
          event_name: eventName,
          pax,
          transaction_id: reservationId,
        });
      } catch { /* ignore */ }
      gaDone = true;
    }
    if (!fbDone && typeof window.fbq === 'function') {
      try {
        // Meta standard events, both keyed by reservation id (eventID) so they
        // dedupe against any server-side CAPI event for the same booking.
        //   - CompleteRegistration: the "successful registration" conversion a
        //     marketer maps on the confirmation page. This is what was missing.
        //   - Lead: kept for backward-compat with any existing Lead-based setup.
        // Dedup is per-event-name, so sharing the same eventID across the two
        // does NOT collapse them into one.
        window.fbq('trackCustom', META_CUSTOM_EVENTS.reservationConfirmed, {
          reservation_id: reservationId,
          content_name: eventName,
          currency: 'INR',
          value: 0,
          pax,
        });
        window.fbq('track', 'CompleteRegistration', { content_name: eventName, currency: 'INR', value: 0, status: true }, { eventID: reservationId });
        window.fbq('track', 'Lead', { content_name: eventName, currency: 'INR', value: 0 }, { eventID: reservationId });
      } catch { /* ignore */ }
      fbDone = true;
    }
    if ((gaDone && fbDone) || tries >= 32) return;
    tries += 1;
    window.setTimeout(attempt, 250);
  };
  attempt();
}

export { META_CUSTOM_EVENTS };

/** Phone-number click (tel:) — GA4 `phone_click` + Meta `Contact`. */
export function trackPhoneClick(): void {
  if (typeof window === 'undefined') return;
  try { window.gtag?.('event', 'phone_click', { method: 'tel' }); } catch { /* ignore */ }
  try { window.fbq?.('track', 'Contact', { method: 'phone' }); } catch { /* ignore */ }
}

/** WhatsApp click — GA4 `whatsapp_click` + Meta `Contact` (for future WA links). */
export function trackWhatsAppClick(): void {
  if (typeof window === 'undefined') return;
  try { window.gtag?.('event', 'whatsapp_click', { method: 'whatsapp' }); } catch { /* ignore */ }
  try { window.fbq?.('track', 'Contact', { method: 'whatsapp' }); } catch { /* ignore */ }
}
