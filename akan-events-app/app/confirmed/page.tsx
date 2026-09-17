'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { trackReservationSuccess } from '@/lib/marketing';
import { BgScene } from '@/components/BgScene';

/**
 * /confirmed — the post-booking confirmation page.
 *
 * The booking modal redirects here on a successful reservation instead of
 * showing an in-modal confirmation. Landing on this dedicated URL is what makes
 * conversion tracking robust: the base Meta Pixel fires PageView for
 * `/confirmed` on load, and we additionally fire the reservation-success Lead.
 *
 * The URL carries only the reservation id (`rid`, for pixel + dedup) and the
 * non-guessable QR token (`t`). All display fields are fetched server-side by
 * token — no PII in the URL. The disco scene animates in the background; the
 * ticket sits on a solid card above it and is fully responsive on mobile.
 */

interface Ticket {
  reservationId: string;
  displayCode: string;
  guestName: string;
  pax: number;
  status: string;
  event: {
    slug: string | null;
    title: string | null;
    date: string | null;
    time: string | null;
    image: string | null;
  };
}

const BG = '#0c0805';
const CREAM = '#f1e6d3';
const CREAM_DIM = 'rgba(241,230,211,0.72)';
const MUTED = 'rgba(241,230,211,0.5)';
const TERRA = '#c96c4a';
const HAIRLINE = 'rgba(241,230,211,0.14)';
const CARD = 'rgba(14,9,6,0.74)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

function ConfirmedInner() {
  const params = useSearchParams();
  const rid = params.get('rid') || params.get('reservationId') || '';
  const token = params.get('t') || params.get('token') || '';
  const isMobile = useIsMobile();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Fire the conversion once per reservation (deduped in sessionStorage so a
  // refresh doesn't double-count). Manual visits with no rid always fire.
  useEffect(() => {
    let fire = true;
    if (rid) {
      try {
        const key = `rsvp_success_${rid}`;
        if (window.sessionStorage.getItem(key) === '1') fire = false;
        else window.sessionStorage.setItem(key, '1');
      } catch {
        /* storage blocked — fire anyway */
      }
    }
    if (fire) {
      // No synthetic fallback id: without the real rid, Meta events are skipped
      // inside trackReservationSuccess (the server CAPI Lead already counted
      // the booking) while GA still fires with its own synthetic id.
      trackReservationSuccess({ reservationId: rid || undefined, eventName: 'Reservation' });
    }
  }, [rid]);

  // Fetch the ticket by token (best-effort — the conversion fires regardless).
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let alive = true;
    fetch(`/api/dashboard/reservations/ticket/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.ok) setTicket(d.ticket as Ticket); })
      .catch(() => { /* show minimal confirmation */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const qrUrl = token ? `/api/dashboard/reservations/qr/${encodeURIComponent(token)}` : '';
  const bookingLabel = ticket?.displayCode || rid || '';

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: BG,
        color: CREAM,
        fontFamily: 'Manrope, system-ui, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '28px 14px' : '48px 20px',
      }}
    >
      {/* Disco scene animates in the background */}
      <BgScene theme="dark" />
      {/* Readability scrim between the scene and the content */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(12,8,5,0.35) 0%, rgba(12,8,5,0.72) 70%, rgba(12,8,5,0.9) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: isMobile ? 460 : 600 }}>
        {/* Success mark + heading */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 26 }}>
          <div
            style={{
              width: isMobile ? 56 : 64, height: isMobile ? 56 : 64, borderRadius: 999, margin: '0 auto 16px',
              background: 'radial-gradient(circle, #c96c4a 0%, #803a23 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 30px -8px rgba(201,108,74,0.6)',
            }}
          >
            <svg width={isMobile ? 26 : 30} height={isMobile ? 26 : 30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: isMobile ? 28 : 36, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Reservation confirmed
          </h1>
          <p style={{ fontSize: isMobile ? 13.5 : 14.5, lineHeight: 1.6, color: CREAM_DIM, margin: '0 auto', maxWidth: 420 }}>
            Thank you{ticket?.guestName ? `, ${ticket.guestName.split(' ')[0]}` : ''} — your table request is in.
            Show the booking ID{qrUrl ? ' or QR' : ''} at the entry desk and our team will check you in.
          </p>
        </div>

        {/* Ticket card — solid over the animated scene for legibility */}
        <div
          style={{
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 18,
            background: CARD,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)',
          }}
        >
          {/* Notch holes */}
          <div style={{ position: 'absolute', left: -11, top: '46%', width: 22, height: 22, borderRadius: 999, background: BG, zIndex: 2 }} />
          <div style={{ position: 'absolute', right: -11, top: '46%', width: 22, height: 22, borderRadius: 999, background: BG, zIndex: 2 }} />

          {loading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
              Loading your confirmation…
            </div>
          ) : (
            <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: qrUrl ? 'minmax(0,1fr) 190px' : 'minmax(0,1fr)' }}>
              {/* Info */}
              <div style={{ padding: isMobile ? '18px 16px' : '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 9, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>Akan Event Ticket</div>
                  {bookingLabel && (
                    <div style={{ padding: '4px 10px', borderRadius: 999, border: `1px solid ${TERRA}80`, background: `${TERRA}1f`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, color: CREAM_DIM, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Booking ID</span>
                      <span style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 11, color: TERRA, fontWeight: 700 }}>{bookingLabel}</span>
                    </div>
                  )}
                </div>

                {ticket?.event?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ticket.event.image}
                    alt={ticket.event.title || 'Event'}
                    style={{ width: '100%', maxHeight: isMobile ? 150 : 180, objectFit: 'cover', borderRadius: 12, marginBottom: 14, display: 'block' }}
                  />
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Event</div>
                  <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: isMobile ? 21 : 24, lineHeight: 1.05 }}>
                    {ticket?.event?.title || 'Your reservation'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {ticket?.event?.date && <Field label="Date" value={ticket.event.date} />}
                  {ticket?.event?.time && <Field label="Time" value={ticket.event.time} />}
                  {ticket?.guestName && <Field label="Guest" value={ticket.guestName} />}
                  {typeof ticket?.pax === 'number' && <Field label="Guests" value={`${ticket.pax} guest${ticket.pax === 1 ? '' : 's'}`} />}
                </div>

                <div style={{ borderTop: `1px dashed ${HAIRLINE}`, paddingTop: 12, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                  A confirmation will be shared with you shortly. Show this booking ID at the entry desk.
                </div>
              </div>

              {/* QR — right column on desktop, stacked below on mobile */}
              {qrUrl && (
                <div
                  style={{
                    padding: isMobile ? '4px 16px 20px' : '20px 20px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                    borderLeft: isMobile ? 'none' : `1px dashed ${HAIRLINE}`,
                    borderTop: isMobile ? `1px dashed ${HAIRLINE}` : 'none',
                    marginTop: isMobile ? 4 : 0,
                  }}
                >
                  <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginTop: isMobile ? 14 : 0 }}>Booking QR</div>
                  <div style={{ width: isMobile ? 168 : 150, height: isMobile ? 168 : 150, borderRadius: 14, background: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt={`QR for booking ${bookingLabel}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.45, textAlign: 'center' }}>
                    Staff can scan this at the entry desk.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          <Link
            href={ticket?.event?.slug ? `/event/${ticket.event.slug}` : '/'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999,
              background: TERRA, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}
          >
            {ticket?.event?.slug ? 'Back to event →' : 'Back to events →'}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 12.5, color: CREAM, fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

export default function ConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', background: BG, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Manrope, system-ui, sans-serif' }}>
          Loading…
        </main>
      }
    >
      <ConfirmedInner />
    </Suspense>
  );
}
