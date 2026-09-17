'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { trackReservationSuccess } from '@/lib/marketing';

/**
 * Reservation success / thank-you page.
 *
 * Purpose: a conversion landing page that fires the reservation-success event
 * (GA4 `generate_lead` + Meta `Lead` + Google Ads) on load. Use this as the
 * post-booking redirect / confirmation URL for the ReserveGo widget, so
 * reservations completed on widget.reservego.co (a different domain, where our
 * tag can't run) still register a conversion when the guest lands back here.
 *
 * Also reached after our own event-page booking flow already fires the event —
 * so we de-dupe per booking ref (or per session when no ref is provided) to
 * avoid double-counting on refresh.
 */
export default function ReservationSuccessPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref =
      params.get('ref') ||
      params.get('booking') ||
      params.get('booking_id') ||
      params.get('reservationId') ||
      '';
    // De-dupe real bookings (which carry a ref) so a refresh doesn't double-count.
    // Manual tests (no ref) always fire so the conversion is easy to verify.
    if (ref) {
      try {
        const key = `rsvp_success_${ref}`;
        if (window.sessionStorage.getItem(key) === '1') return;
        window.sessionStorage.setItem(key, '1');
      } catch { /* storage blocked — fire anyway */ }
    }
    // No synthetic fallback id: without the real ref, Meta events are skipped
    // inside trackReservationSuccess (the server CAPI Lead already counted the
    // booking) while GA still fires with its own synthetic transaction id.
    trackReservationSuccess({ reservationId: ref || undefined, eventName: 'Reservation' });
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0c0805',
        color: '#f1e6d3',
        fontFamily: 'Manrope, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            margin: '0 auto 24px',
            background: 'radial-gradient(circle, #c96c4a 0%, #803a23 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px -8px rgba(201,108,74,0.6)',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 40, fontWeight: 400, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Reservation confirmed
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(241,230,211,0.72)', margin: '0 0 28px' }}>
          Thank you — your table request is in. Our team will be in touch to confirm the details.
          We can&apos;t wait to host you at Akan.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '13px 26px',
            borderRadius: 999,
            background: '#c96c4a',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Back to events →
        </Link>
      </div>
    </main>
  );
}
