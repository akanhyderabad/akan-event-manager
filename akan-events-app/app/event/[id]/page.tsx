'use client';

import { getEventById } from '@/lib/constants';
import { fetchDashboardEvent } from '@/lib/dashboard-events';
import { collectFingerprint } from '@/lib/fingerprint';
import {
  META_CUSTOM_EVENTS,
  trackEventPageView,
  trackPhoneClick,
  trackReservationAction,
  trackReserveClick,
} from '@/lib/marketing';
import { THEMES } from '@/lib/theme';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ============================================================================
// ANALYTICS — fire-and-forget funnel events to the dashboard
// (page_view → book_click → ticket_selected → checkout_started → checkout_success)
// `eventId` MUST be the dashboard event id (event.dashboard_event_id), not the slug.
// ============================================================================
type TrackKind = 'page_view' | 'book_click' | 'ticket_selected' | 'checkout_started' | 'checkout_success' | 'checkout_failed';

function trackEvent(eventId: string | undefined, kind: TrackKind, metadata?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !eventId) return;
  try {
    let sid = window.sessionStorage.getItem('evt_session_id');
    if (!sid || sid.length < 8) {
      sid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem('evt_session_id', sid);
    }
    const body = JSON.stringify({ eventId, sessionId: sid, kind, metadata });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/dashboard/analytics/track', blob)) return;
    }
    void fetch('/api/dashboard/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* analytics is best-effort */ });
  } catch { /* never let analytics throw into the page */ }
}

// Parse the event's FAQ text ("Q: …" / "A: …" pairs) into [question, answer]
// tuples for the accordion. Returns [] when there are no parseable FAQs, so the
// caller can fall back to the generic default set.
function parseFaqs(raw?: string | null): [string, string][] {
  if (!raw || typeof raw !== 'string') return [];
  const pairs: [string, string][] = [];
  let q = '';
  let a = '';
  let mode: 'q' | 'a' | null = null;
  const flush = () => {
    if (q.trim() && a.trim()) pairs.push([q.trim(), a.trim()]);
    q = ''; a = ''; mode = null;
  };
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    const qm = line.match(/^Q\s*[:.)\-]\s*(.+)$/i);
    const am = line.match(/^A\s*[:.)\-]\s*(.+)$/i);
    if (qm) {
      if (q && a) flush();
      q = qm[1]; mode = 'q';
    } else if (am) {
      a = am[1]; mode = 'a';
    } else if (line) {
      if (mode === 'a') a += (a ? ' ' : '') + line;
      else if (mode === 'q') q += (q ? ' ' : '') + line;
    } else if (q && a) {
      flush();
    }
  }
  if (q && a) flush();
  return pairs;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const BG_SCENE_KEYFRAMES = `
  @keyframes beamSweepA { 0%, 100% { transform: rotate(-12deg); opacity: 0.85; } 45% { transform: rotate(18deg); opacity: 1; } 50% { transform: rotate(20deg); opacity: 0.4; } 55% { transform: rotate(18deg); opacity: 1; } }
  @keyframes beamSweepB { 0%, 100% { transform: rotate(10deg); opacity: 0.7; } 50% { transform: rotate(-15deg); opacity: 1; } }
  @keyframes ballSwing { 0%, 100% { transform: translateX(-50%) rotate(-3deg); } 50% { transform: translateX(-50%) rotate(3deg); } }
  @keyframes ballSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes facetTwinkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes sharpyRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes sharpyPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes ballHalo { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
  @keyframes floorPoolA { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-20px) scale(1.2); } }
  @keyframes floorPoolB { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,-30px) scale(1.15); } }
  @keyframes strobe { 0%, 100% { opacity: 0; } 12%, 12.4% { opacity: 0; } 12.5% { opacity: 0.16; } 12.7% { opacity: 0; } 13% { opacity: 0.12; } 13.2% { opacity: 0; } 62% { opacity: 0; } 62.2% { opacity: 0.16; } 62.4% { opacity: 0; } 62.6% { opacity: 0.1; } 62.8% { opacity: 0; } }
  @keyframes dust { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.8; } 85% { opacity: 0.6; } 100% { transform: translateY(-100vh); opacity: 0; } }
`;

const BG_SCENE_FACETS: Array<{ x: number; y: number; z: number; r: number; c: number }> = [];
const BG_SCENE_ROWS = 8;
const BG_SCENE_COLS = 14;
for (let r = 0; r < BG_SCENE_ROWS; r++) {
  const phi = (r / (BG_SCENE_ROWS - 1)) * Math.PI;
  const ringRadius = Math.sin(phi);
  const y = -Math.cos(phi);
  for (let c = 0; c < BG_SCENE_COLS; c++) {
    const theta = (c / BG_SCENE_COLS) * Math.PI * 2;
    const x = Math.cos(theta) * ringRadius;
    const z = Math.sin(theta) * ringRadius;
    BG_SCENE_FACETS.push({ x, y, z, r, c });
  }
}

const BG_SCENE_DUST = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 53) % 100,
  dur: 8 + (i % 5) * 1.5,
  delay: ((i * 0.4) % (8 + (i % 5) * 1.5)),
  size: 1 + (i % 3),
}));

const BgScene = memo(function BgScene({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme !== 'light';
  const beamA = isDark ? 'rgba(201, 81, 46, 0.32)' : 'rgba(184, 69, 31, 0.18)';
  const beamB = isDark ? 'rgba(70, 140, 220, 0.22)' : 'rgba(70, 140, 220, 0.10)';
  const beamC = isDark ? 'rgba(220, 70, 130, 0.22)' : 'rgba(180, 50, 110, 0.10)';
  const ballSize = 90;
  const sharpyCount = 12;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <style>{BG_SCENE_KEYFRAMES}</style>

      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '160%',
          height: '140%',
          background: `conic-gradient(from 200deg at 20% 0%, transparent 0deg, ${beamA} 8deg, transparent 18deg)`,
          filter: 'blur(2px)',
          animation: 'beamSweepA 7s ease-in-out infinite',
          transformOrigin: '20% 0%',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          right: '-20%',
          width: '160%',
          height: '140%',
          background: `conic-gradient(from 130deg at 80% 0%, transparent 0deg, ${beamB} 7deg, transparent 16deg)`,
          filter: 'blur(2px)',
          animation: 'beamSweepB 9s ease-in-out infinite',
          transformOrigin: '80% 0%',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: ballSize,
          height: ballSize,
          animation: 'ballSwing 6s ease-in-out infinite',
          transformOrigin: 'top center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            left: '50%',
            width: 1,
            height: 50,
            background: isDark ? 'rgba(246,239,230,0.25)' : 'rgba(26,13,8,0.25)',
            transform: 'translateX(-50%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
            filter: 'blur(8px)',
            animation: 'ballHalo 3s ease-in-out infinite',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle at 35% 30%, #4a3d35 0%, #1a1410 70%, #0a0805 100%)'
              : 'radial-gradient(circle at 35% 30%, #d8cdbf 0%, #8a7f72 70%, #52443a 100%)',
            boxShadow: isDark
              ? `0 0 30px ${beamA}, inset -10px -10px 20px rgba(0,0,0,0.6)`
              : `0 0 20px ${beamA}, inset -8px -8px 16px rgba(26,13,8,0.4)`,
            overflow: 'hidden',
            animation: 'ballSpin 8s linear infinite',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {BG_SCENE_FACETS.map((f, i) => {
            const cx = 50 + f.x * 50;
            const cy = 50 + f.y * 50;
            const visibility = (f.z + 1) / 2;
            const facetSize = (100 / BG_SCENE_COLS) * 0.95;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${cx}%`,
                  top: `${cy}%`,
                  width: `${facetSize}%`,
                  height: `${(100 / BG_SCENE_ROWS) * 0.95}%`,
                  transform: 'translate(-50%, -50%)',
                  background: isDark
                    ? `rgba(246,239,230,${0.15 + visibility * 0.5})`
                    : `rgba(255,255,255,${0.2 + visibility * 0.5})`,
                  border: isDark ? '0.5px solid rgba(0,0,0,0.3)' : '0.5px solid rgba(26,13,8,0.2)',
                  animation: `facetTwinkle ${1 + (i % 5) * 0.3}s ease-in-out ${(i * 0.07) % 2}s infinite`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 'calc(14% + 45px)',
          left: '50%',
          width: 0,
          height: 0,
          animation: 'sharpyRotate 16s linear infinite',
          transformOrigin: 'center',
        }}
      >
        {Array.from({ length: sharpyCount }).map((_, i) => {
          const angle = (i / sharpyCount) * 360;
          const color = [beamA, beamB, beamC][i % 3];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: 600,
                background: `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
                transformOrigin: 'top center',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                filter: 'blur(3px)',
                opacity: 0.85,
                mixBlendMode: isDark ? 'screen' : 'multiply',
                animation: `sharpyPulse ${2 + (i % 4) * 0.4}s ease-in-out ${i * 0.15}s infinite`,
                willChange: 'opacity',
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '10%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          animation: 'floorPoolA 8s ease-in-out infinite',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          right: '5%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`,
          filter: 'blur(24px)',
          animation: 'floorPoolB 10s ease-in-out infinite',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />

      {/* Subtle strobe */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          opacity: 0,
          animation: 'strobe 6s steps(1, end) infinite',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Dust particles drifting up */}
      {BG_SCENE_DUST.map((particle, i) => {
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: -10,
              left: `${particle.left}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: 999,
              background: isDark ? 'rgba(246,239,230,0.5)' : 'rgba(26,13,8,0.35)',
              animation: `dust ${particle.dur}s linear ${particle.delay}s infinite`,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </div>
  );
});

function CountdownTimer({ targetDate, theme }: { targetDate: Date; theme: 'dark' | 'light' }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const T = THEMES[theme];

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
      {[
        { value: countdown.days, label: 'days' },
        { value: countdown.hours, label: 'hrs' },
        { value: countdown.minutes, label: 'min' },
        { value: countdown.seconds, label: 'sec' },
      ].map(({ value, label }, index) => (
        <div key={index} style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 500,
              fontSize: '42px',
              color: T.cream,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            {String(value).padStart(2, '0')}
          </div>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.muted,
              opacity: 0.7,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// BOOKING MODAL (Both Mobile and Desktop)
// ============================================================================

function BookingModal({
  open,
  onClose,
  event,
  tablesLeft,
  theme,
  isMobile,
  allowPayment,
  ticketOptions,
}: {
  open: boolean;
  onClose: () => void;
  event: any;
  tablesLeft: number;
  theme: 'dark' | 'light';
  isMobile: boolean;
  allowPayment: boolean;
  ticketOptions: number[];
}) {
  const T = THEMES[theme];

  // Event-driven config
  const entryFeeMap: Record<number, number> = event.entry_fee || {};
  const normalizedTicketOptions = [...new Set((ticketOptions ?? []).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
  const fallbackTable = normalizedTicketOptions[0] || 2;
  const entryPaymentMandatory = false;

  const buildInitialTableSelection = (requiredPax: number): Record<number, number> => {
    if (normalizedTicketOptions.length === 0) return { [fallbackTable]: 1 };
    const singleFit = normalizedTicketOptions.find((option) => option >= requiredPax);
    if (singleFit) return { [singleFit]: 1 };
    const largestOption = normalizedTicketOptions[normalizedTicketOptions.length - 1] || fallbackTable;
    return { [largestOption]: Math.max(1, Math.ceil(requiredPax / largestOption)) };
  };

  // STEP MAP:
  // 0 = Pax split
  // 1 = Contact details
  // 2 = Entry charges (table booking + pay online/pay venue depending on mandatory)
  // 3 = Cover charges (optional online or venue)
  // 4 = Total + final action
  // 5 = Confirmation (with booking ID and payment status)
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState(2);
  const [selectedTables, setSelectedTables] = useState<Record<number, number>>(() => buildInitialTableSelection(2));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [bookingQrUrl, setBookingQrUrl] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const abandonedLeadIdRef = useRef<string>('');
  // Per-event key for the locally-saved draft so an unfinished booking survives
  // closing the modal, navigating away, or closing the tab.
  const draftStorageKey = `akan_booking_draft_${event.id}`;
  const draftHydratedRef = useRef(false);
  // Set synchronously the instant a booking succeeds — read by the abandoned-
  // lead capture guard so the redirect to /confirmed (which fires `pagehide`)
  // can't be mistaken for an abandonment. A state flag would be stale in the
  // pagehide listener's closure at navigation time; a ref is read live.
  const confirmedRef = useRef(false);

  const totalPax = guests;
  const selectedTableRows = normalizedTicketOptions
    .map((capacity) => ({
      capacity,
      quantity: selectedTables[capacity] || 0,
      fee: entryFeeMap[capacity] ?? 0,
      tableType: Array.isArray(event.table_types)
        ? event.table_types.find((table: { capacity: number }) => Number(table.capacity) === capacity) || null
        : null,
    }))
    .filter((row) => row.quantity > 0);
  const selectedSeatCapacity = selectedTableRows.reduce((sum, row) => sum + (row.capacity * row.quantity), 0);
  const selectedTablePayload = selectedTableRows.map((row) => ({
    capacity: row.capacity,
    quantity: row.quantity,
    tableTypeId: row.tableType?.id || null,
    label: row.tableType?.name || (row.capacity === 1 ? 'Single entry' : `Table of ${row.capacity}`),
  }));
  const singleSelectedTable = selectedTableRows.length === 1 && selectedTableRows[0].quantity === 1
    ? selectedTableRows[0]
    : null;

  useEffect(() => {
    if (!open) {
      const wasConfirmed = confirmed;
      const t = setTimeout(() => {
        // Always clear transient UI state.
        setStep(0);
        setErrors({});
        setSubmitting(false);
        setSubmissionError('');
        if (wasConfirmed) {
          // Booking finished — start fresh next time and drop the saved draft.
          setGuests(2);
          setSelectedTables(buildInitialTableSelection(2));
          setName('');
          setEmail('');
          setMobile('');
          setConfirmed(false);
          setBookingId('');
          setBookingQrUrl('');
          abandonedLeadIdRef.current = '';
          confirmedRef.current = false;
          if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem(draftStorageKey); } catch { /* ignore */ }
          }
        }
        // If NOT confirmed we intentionally keep name / phone / email / headcount
        // (and the lead id) so the form is pre-filled when the guest reopens it.
      }, 320);
      return () => clearTimeout(t);
    }
  }, [open, confirmed, fallbackTable, entryPaymentMandatory, draftStorageKey]);

  // Conversion tracking moved to the dedicated /confirmed page — firing on a
  // real page load is more reliable for Meta/GA than an in-modal effect, and
  // avoids double-counting. See completeFlow() below (redirect) + app/confirmed.

  // Simplified flow: the user no longer picks a table or sees charges. Auto-assign the
  // right table for the current headcount so the reservation payload (entry/cover amounts,
  // table type) stays identical to before and the dashboard record is unchanged.
  useEffect(() => {
    if (confirmed) return;
    setSelectedTables(buildInitialTableSelection(totalPax));
    // buildInitialTableSelection is derived from props each render; intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPax, confirmed]);

  const validateDetails = () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^[6-9]\d{9}$/.test(mobile.replace(/\D/g, ''))) e.mobile = 'Enter a valid 10-digit Indian mobile';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canCaptureAbandonedLead = name.trim().length >= 2 && (mobile.trim().length > 0 || email.trim().length > 0);

  const ensureAbandonedLeadId = useCallback(() => {
    if (abandonedLeadIdRef.current) return abandonedLeadIdRef.current;
    const fresh = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    abandonedLeadIdRef.current = fresh;
    return fresh;
  }, []);

  // Restore an unfinished booking the guest started earlier in this browser —
  // survives modal close, route navigation, and tab/window close. Runs once on
  // mount, client-only, so it never causes an SSR hydration mismatch.
  useEffect(() => {
    if (draftHydratedRef.current || typeof window === 'undefined') return;
    draftHydratedRef.current = true;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        draftId?: string; name?: string; email?: string; mobile?: string;
        guests?: number;
      };
      if (typeof draft.name === 'string') setName(draft.name);
      if (typeof draft.email === 'string') setEmail(draft.email);
      if (typeof draft.mobile === 'string') setMobile(draft.mobile);
      if (typeof draft.guests === 'number') setGuests(draft.guests);
      if (typeof draft.draftId === 'string' && draft.draftId) abandonedLeadIdRef.current = draft.draftId;
    } catch { /* ignore a malformed draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the in-progress booking on every change so it can be restored later.
  // Cleared once the booking is confirmed (see completeFlow / close handler).
  useEffect(() => {
    if (typeof window === 'undefined' || confirmed) return;
    const hasData = name.trim().length > 0 || email.trim().length > 0 || mobile.trim().length > 0
      || guests !== 2;
    try {
      if (hasData) {
        window.localStorage.setItem(draftStorageKey, JSON.stringify({
          draftId: abandonedLeadIdRef.current || ensureAbandonedLeadId(),
          name, email, mobile, guests,
        }));
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
    } catch { /* ignore quota / serialization errors */ }
  }, [name, email, mobile, guests, confirmed, draftStorageKey, ensureAbandonedLeadId]);

  const postAbandonedLeadCapture = useCallback((preferBeacon: boolean) => {
    if (!open || confirmed || confirmedRef.current || !canCaptureAbandonedLead) return;

    const payload = {
      draftId: ensureAbandonedLeadId(),
      eventId: event.dashboard_event_id || event.id,
      name: name.trim(),
      phone: mobile.trim(),
      email: email.trim(),
      pax: totalPax,
    };

    if (preferBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/dashboard/abandoned-booking-capture', blob);
      return;
    }

    void fetch('/api/dashboard/abandoned-booking-capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: preferBeacon,
    }).catch(() => { /* best-effort lead capture */ });
  }, [open, confirmed, canCaptureAbandonedLead, ensureAbandonedLeadId, event.id, name, mobile, email, totalPax]);

  useEffect(() => {
    if (!open || confirmed || !canCaptureAbandonedLead) return;
    const t = window.setTimeout(() => {
      postAbandonedLeadCapture(false);
    }, 900);
    return () => window.clearTimeout(t);
  }, [open, confirmed, canCaptureAbandonedLead, postAbandonedLeadCapture, step]);

  useEffect(() => {
    if (!open) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') postAbandonedLeadCapture(true);
    };
    const handlePageHide = () => {
      postAbandonedLeadCapture(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [open, postAbandonedLeadCapture]);

  const handleCloseModal = useCallback(() => {
    if (!confirmed) postAbandonedLeadCapture(true);
    onClose();
  }, [confirmed, onClose, postAbandonedLeadCapture]);

  const selectedTableLabel = selectedTableRows.length === 0
    ? 'No table selected'
    : selectedTableRows.map((row) => {
        const baseLabel = row.tableType?.name || (row.capacity === 1 ? 'Single entry' : `Table of ${row.capacity}`);
        return row.quantity > 1 ? `${row.quantity} x ${baseLabel}` : baseLabel;
      }).join(', ');

  const completeFlow = async () => {
    setSubmitting(true);
    setSubmissionError('');
    try {
      if (selectedSeatCapacity < totalPax) {
        setSubmissionError('Could not assign a table for your party size. Please try again.');
        setSubmitting(false);
        return;
      }

      const tableLabel = selectedTableLabel;
      const reservationResponse = await fetch('/api/dashboard/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventSlug: event.slug || event.id,
          abandonedLeadId: abandonedLeadIdRef.current || undefined,
          name,
          phone: mobile,
          email: email.trim() || undefined,
          pax: totalPax,
          tableTypeId: singleSelectedTable?.tableType?.id,
          tableTypeLabel: tableLabel,
          selectedTables: selectedTablePayload,
          notes: `Reservation for ${event.title || event.name || ''}`.trim(),
        }),
      });
      const reservationPayload = await reservationResponse.json();
      if (!reservationResponse.ok || !reservationPayload.ok) {
        throw new Error(reservationPayload.message || 'Could not create reservation.');
      }

      setBookingId(reservationPayload.reservationId);
      if (typeof reservationPayload.qrToken === 'string' && reservationPayload.qrToken) {
        setBookingQrUrl(`/api/dashboard/reservations/qr/${encodeURIComponent(reservationPayload.qrToken)}`);
      } else {
        setBookingQrUrl(typeof reservationPayload.qrUrl === 'string' ? reservationPayload.qrUrl : '');
      }
      confirmedRef.current = true;
      setConfirmed(true);
      trackEvent(event?.dashboard_event_id, 'checkout_success', { pax: totalPax });
      abandonedLeadIdRef.current = '';
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(draftStorageKey); } catch { /* ignore */ }
      }

      // Hand off to the dedicated confirmation page. Landing on /confirmed via a
      // full navigation is what fires the reservation-success conversion on a
      // real page load (base pixel PageView + our Lead event — see app/confirmed).
      // URL carries only the reservation id (pixel + dedup) and the QR token
      // (used to fetch the ticket + render the QR) — no PII in the URL.
      const qrToken = typeof reservationPayload.qrToken === 'string' ? reservationPayload.qrToken : '';
      const confirmUrl = `/confirmed?rid=${encodeURIComponent(reservationPayload.reservationId)}${qrToken ? `&t=${encodeURIComponent(qrToken)}` : ''}`;
      if (typeof window !== 'undefined') {
        window.location.assign(confirmUrl);
        return;
      }
      setStep(5);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<number, string> = {
    0: 'How many guests?',
    1: 'Your details',
    5: 'Confirmation',
  };

  const stepTitle = stepTitles[step] ?? 'Booking';
  const stepLabel = step === 5 ? 'Confirmed' : `Step ${step + 1} of 2`;
  const progressFill = step === 5 ? 2 : Math.min(step, 1);

  // ── Shared styles ──
  const inputStyle = (hasErr?: string): React.CSSProperties => ({
    width: '100%',
    padding: '14px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasErr ? '#e76a3d' : T.hairline}`,
    color: T.cream,
    fontSize: 15,
    fontFamily: 'Inter',
    outline: 'none',
    boxSizing: 'border-box',
  });

  const primaryBtn = (onClick: () => void, label: string, disabled = false): React.ReactElement => (
    <button onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '15px 18px', background: T.terra, color: '#fff', border: 'none', borderRadius: 12, cursor: disabled ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter', boxShadow: `0 8px 20px -6px ${T.terra}80`, opacity: disabled ? 0.75 : 1 }}>
      {label}
    </button>
  );

  const backBtn = (target: number) => (
    <button onClick={() => setStep(target)} style={{ marginTop: 8, width: '100%', padding: 10, background: 'transparent', color: T.muted, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter' }}>
      ← Back
    </button>
  );

  const summaryRow = (label: string, value: string, highlight = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: highlight ? T.cream : T.creamDim, marginBottom: 6, fontWeight: highlight ? 600 : 400 }}>
      <span>{label}</span>
      <span style={{ color: highlight ? T.terra : undefined }}>{value}</span>
    </div>
  );

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    // Keep overlay lightweight: blur over animated backgrounds is expensive in Electron/Chrome.
    background: open ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
    opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 0.2s ease', padding: isMobile ? 0 : '32px',
  };

  const modalStyle: React.CSSProperties = isMobile
    ? { width: '100%', background: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTop: `1px solid ${T.hairline}`, borderRight: `1px solid ${T.hairline}`, borderLeft: `1px solid ${T.hairline}`, borderBottom: 0, transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)', maxHeight: '90vh', overflow: 'auto', paddingBottom: 28, contain: 'layout paint' }
    : { width: step === 5 ? 760 : 560, maxWidth: '96vw', background: T.surface, borderRadius: 20, border: `1px solid ${T.hairline}`, transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)', transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)', maxHeight: '92%', overflow: 'auto', paddingBottom: 28, boxShadow: '0 20px 45px -20px rgba(0,0,0,0.55)', willChange: 'transform', contain: 'layout paint' };

  return (
    <div style={overlayStyle} onClick={handleCloseModal}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        {/* Drag handle (mobile) */}
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}><div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(246,239,230,0.18)' }} /></div>}

        {/* Header */}
        <div style={{ padding: isMobile ? '12px 24px 0' : '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{stepLabel}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: T.cream, marginTop: 2, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{stepTitle}</div>
          </div>
          <button onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.hairline}`, color: T.cream, width: 32, height: 32, borderRadius: 999, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>

        {/* Progress bar */}
        {!confirmed && (
          <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0' }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: progressFill >= i ? T.terra : 'rgba(246,239,230,0.12)', transition: 'background 0.3s' }} />
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '24px 24px 0' }}>

          {/* ── STEP 1: Number of guests ── */}
          {step === 0 && !confirmed && (
            <div>
              <div style={{ fontSize: 13, color: T.creamDim, lineHeight: 1.6, marginBottom: 20 }}>
                How many guests are coming? Pick a number, or set your own below.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGuests(n)}
                    style={{
                      aspectRatio: '1', borderRadius: 12, cursor: 'pointer',
                      background: guests === n ? T.terra : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${guests === n ? T.terra : T.hairline}`,
                      color: T.cream, fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.hairline}`, marginBottom: 20 }}>
                <button onClick={() => setGuests(Math.max(1, guests - 1))} style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.hairline}`, background: 'rgba(255,255,255,0.06)', color: T.cream, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>−</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 30, color: T.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{guests}</div>
                  <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>guest{guests === 1 ? '' : 's'}</div>
                </div>
                <button onClick={() => setGuests(Math.min(20, guests + 1))} style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.hairline}`, background: 'rgba(255,255,255,0.06)', color: T.cream, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>+</button>
              </div>

              {primaryBtn(() => {
                if (guests < 1) return;
                trackEvent(event?.dashboard_event_id, 'ticket_selected', { guests });
                trackReservationAction(META_CUSTOM_EVENTS.guestCountSelected, {
                  eventId: event?.dashboard_event_id,
                  eventName: event?.title || event?.name || 'Akan Event',
                  pax: guests,
                });
                setStep(1);
              }, 'Continue →', guests < 1)}
            </div>
          )}

          {/* ── STEP 2: Contact details ── */}
          {step === 1 && !confirmed && (
            <div>
              <div style={{ fontSize: 13, color: T.creamDim, marginBottom: 18, lineHeight: 1.55 }}>
                We&apos;ll use this to confirm reservation and payment updates. Email is optional.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full name *</label>
                <input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }} placeholder="Your name" style={inputStyle(errors.name)} />
                {errors.name && <div style={{ color: '#e76a3d', fontSize: 11, marginTop: 5 }}>{errors.name}</div>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Mobile number *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '14px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.hairline}`, color: T.creamDim, fontSize: 15, fontFamily: 'Inter', display: 'flex', alignItems: 'center' }}>+91</div>
                  <input value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors((p) => ({ ...p, mobile: undefined })); }} placeholder="98765 43210" inputMode="numeric" style={{ ...inputStyle(errors.mobile), width: 'auto', flex: 1 }} />
                </div>
                {errors.mobile && <div style={{ color: '#e76a3d', fontSize: 11, marginTop: 5 }}>{errors.mobile}</div>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="you@example.com" inputMode="email" style={inputStyle(errors.email)} />
                {errors.email && <div style={{ color: '#e76a3d', fontSize: 11, marginTop: 5 }}>{errors.email}</div>}
              </div>

              <button onClick={() => {
                if (!validateDetails()) return;
                trackEvent(event?.dashboard_event_id, 'checkout_started');
                trackReservationAction(META_CUSTOM_EVENTS.reservationSubmitted, {
                  eventId: event?.dashboard_event_id,
                  eventName: event?.title || event?.name || 'Akan Event',
                  pax: totalPax,
                });
                void completeFlow();
              }} disabled={submitting} style={{ width: '100%', padding: '15px 18px', background: T.terra, color: '#fff', border: 'none', borderRadius: 12, cursor: submitting ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter', boxShadow: `0 8px 20px -6px ${T.terra}80`, opacity: submitting ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? 'Confirming booking...' : 'Confirm booking'}
              </button>
              {submissionError && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(231,106,61,0.45)', background: 'rgba(231,106,61,0.10)', color: '#e76a3d', fontSize: 12, lineHeight: 1.45 }}>
                  {submissionError}
                </div>
              )}
              {backBtn(0)}
            </div>
          )}

          {/* ── STEP 3: Confirmation ── */}
          {step === 5 && confirmed && (
            <div>
              {/* Ticket */}
              <div style={{
                marginTop: 4,
                border: `1px solid ${T.hairline}`,
                borderRadius: 18,
                background: T.surface,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Notch holes */}
                <div style={{ position: 'absolute', left: -11, top: '46%', width: 22, height: 22, borderRadius: 999, background: T.bg, zIndex: 2 }} />
                <div style={{ position: 'absolute', right: -11, top: '46%', width: 22, height: 22, borderRadius: 999, background: T.bg, zIndex: 2 }} />

                {/* Ticket: desktop = image left + info right, mobile = image top + info bottom */}
                <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: bookingQrUrl ? '220px minmax(0, 1fr) 170px' : '220px minmax(0, 1fr)' }}>

                  {/* Event image */}
                  {event.image && (
                    <div style={{
                      width: isMobile ? '100%' : 220,
                      minWidth: isMobile ? undefined : 220,
                      height: isMobile ? 260 : '100%',
                      flexShrink: 0,
                      overflow: 'hidden',
                      position: 'relative',
                      background: 'rgba(0,0,0,0.18)',
                    }}>
                      <div style={{ position: 'absolute', inset: 0, padding: isMobile ? 12 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={event.image}
                          alt={event.title}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info section */}
                  <div style={{ padding: '16px 18px 14px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 9, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>Akan Event Ticket</div>
                      <div style={{ padding: '4px 9px', borderRadius: 999, border: `1px solid ${T.terra}80`, background: `${T.terra}1f`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 9, color: T.creamDim, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Booking ID</span>
                        <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: T.terra, fontWeight: 700 }}>{bookingId}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Event title</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: isMobile ? 19 : 24, lineHeight: 1.05, color: T.cream }}>{event.title}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Date</div>
                        <div style={{ marginTop: 3, fontSize: 12, color: T.cream, fontWeight: 500 }}>{event.date}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Time</div>
                        <div style={{ marginTop: 3, fontSize: 12, color: T.cream, fontWeight: 500 }}>{event.time}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px dashed ${T.hairline}`, paddingTop: 10, marginBottom: 10 }}>
                      {summaryRow('Guest', name || 'Guest')}
                      {summaryRow('Guests', `${totalPax} guest${totalPax === 1 ? '' : 's'}`)}
                      {mobile && summaryRow('Phone', `+91 ${mobile}`)}
                      {email.trim() && summaryRow('Email', email.trim())}
                    </div>

                    <div style={{ borderTop: `1px dashed ${T.hairline}`, paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>
                        Show this booking ID at the entry desk and our team will complete your check-in.
                      </div>
                    </div>
                  </div>

                  {bookingQrUrl && (
                    <div style={{ padding: isMobile ? '0 18px 18px' : '18px 18px 14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Booking QR</div>
                      <div style={{ width: isMobile ? 150 : 138, height: isMobile ? 150 : 138, borderRadius: 14, background: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={bookingQrUrl} alt={`QR for booking ${bookingId}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45, textAlign: 'center' }}>
                        Staff can scan this QR directly at the entry desk.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={handleCloseModal} style={{ width: '100%', marginTop: 16, padding: '14px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter', background: T.terra, color: '#fff', boxShadow: `0 8px 20px -6px ${T.terra}80` }}>Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ArtistDetailsModal({
  open,
  onClose,
  theme,
  artist,
  imageUrl,
  isMobile = false,
}: {
  open: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  artist: { name: string; description: string; vocalists: number; members: number; set_minutes: number };
  imageUrl?: string;
  isMobile?: boolean;
}) {
  const T = THEMES[theme];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: open ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: open ? 'blur(6px)' : 'none',
        WebkitBackdropFilter: open ? 'blur(6px)' : 'none',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : 'min(900px, 100%)',
          maxHeight: isMobile ? '92vh' : '90vh',
          overflowY: 'auto',
          background: T.surface,
          border: `1px solid ${T.hairline}`,
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          padding: '0',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
          transform: open ? 'translateY(0) scale(1)' : (isMobile ? 'translateY(100%)' : 'translateY(18px) scale(0.98)'),
          transition: 'transform 0.25s ease',
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(246,239,230,0.18)' }} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 340px) 1fr' }}>
          <div style={{ position: 'relative', minHeight: isMobile ? 220 : 420, background: T.softTint }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={artist.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Artist image
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.12) 100%)' }} />
            <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
              <div style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <span style={{ fontSize: 10, color: '#f6efe6', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                  {artist.members} artists performing
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 10 }}>
                  Know about the artist/band
                </div>
                <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: isMobile ? 26 : 36, lineHeight: 1.05, color: T.cream, letterSpacing: '-0.02em', fontWeight: 400 }}>
                  {artist.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: `1px solid ${T.hairline}`,
                  background: T.softTint,
                  color: T.cream,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: '16px 0 0', color: T.creamDim, fontSize: 15, lineHeight: 1.65, maxWidth: 680 }}>
              {artist.description}
            </p>

            <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.hairline}`, background: T.softTint }}>
              <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4 }}>Artists count</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: T.terra, lineHeight: 1 }}>{artist.members}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, marginTop: 18 }}>
              {[
                { value: artist.vocalists, label: 'Vocalists' },
                { value: artist.members, label: 'Members' },
                { value: artist.set_minutes, label: 'Minute set' },
              ].map((item, idx) => (
                <div key={idx} style={{ background: T.softTint, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: '16px 14px' }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, color: T.terra, lineHeight: 1, fontWeight: 500 }}>
                    {item.value}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE COMPONENTS
// ============================================================================

function MobileHeader({
  theme,
  onToggleTheme,
  onReserveClick,
  canReserve,
  reserveLabel,
  scrolled,
  headerIsDark,
}: {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onReserveClick: () => void;
  canReserve: boolean;
  reserveLabel: string;
  scrolled: boolean;
  headerIsDark: boolean;
}) {
  const borderColor = headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)';
  const bg = headerIsDark
    ? (scrolled ? 'rgba(12, 8, 5, 0.8)' : 'rgba(12, 8, 5, 0.7)')
    : (scrolled ? 'rgba(243, 234, 217, 0.88)' : 'rgba(243, 234, 217, 1)');
  const textColor = headerIsDark ? '#f1e6d3' : '#1c130d';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelBg = headerIsDark ? 'rgba(18,11,7,0.97)' : 'rgba(243,234,217,0.98)';
  const navLinks: Array<{ label: string; href: string; ext: boolean }> = [
    { label: 'Explore', href: 'https://akanhyd.com/explore/', ext: true },
    { label: 'Menu', href: 'https://akanhyd.com/menu/', ext: true },
    { label: 'Events', href: '/', ext: false },
    { label: 'About', href: 'https://akanhyd.com/', ext: true },
  ];

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        minHeight: 70,
        background: bg,
        color: textColor,
        backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: scrolled ? `1px solid ${borderColor}` : 'none',
        transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease',
      }}
    >
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        <Image
          src="/assets/Akan logo.svg"
          alt="Akan"
          width={64}
          height={96}
          priority
          style={{ display: 'block', flexShrink: 0 }}
        />
      </Link>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onReserveClick}
          disabled={!canReserve}
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            border: `1px solid ${borderColor}`,
            background: canReserve ? (headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)') : 'rgba(128,128,128,0.16)',
            color: canReserve ? textColor : (headerIsDark ? 'rgba(241, 230, 211, 0.6)' : 'rgba(28, 19, 13, 0.45)'),
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Manrope, system-ui, sans-serif',
            cursor: canReserve ? 'pointer' : 'not-allowed',
          }}
        >
          {reserveLabel}
        </button>
        <button
          onClick={onToggleTheme}
          title="Toggle theme"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: `1px solid ${borderColor}`,
            background: headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
            color: textColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: `1px solid ${borderColor}`,
            background: menuOpen
              ? (headerIsDark ? 'rgba(241, 230, 211, 0.16)' : 'rgba(28, 19, 13, 0.10)')
              : (headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)'),
            color: textColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {menuOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1 }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 12,
              marginTop: 8,
              zIndex: 2,
              minWidth: 180,
              background: menuPanelBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 14,
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '11px 14px',
                  borderRadius: 9,
                  color: textColor,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'Manrope, system-ui, sans-serif',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MobileStickyBar({ onReserveClick, tablesLeft, event, theme, canReserve, reserveLabel }: { onReserveClick: () => void; tablesLeft: number; event: any; theme: 'dark' | 'light'; canReserve: boolean; reserveLabel: string }) {
  const T = THEMES[theme];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '14px 16px 28px',
        background: T.isDark
          ? 'linear-gradient(180deg, rgba(26,13,8,0) 0%, rgba(26,13,8,0.95) 30%, rgba(26,13,8,1) 100%)'
          : 'linear-gradient(180deg, rgba(248,243,236,0) 0%, rgba(248,243,236,0.95) 30%, rgba(248,243,236,1) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontFamily: 'Inter', color: T.cream, fontWeight: 600, lineHeight: 1.2 }}>
            {event.price}
          </div>
        </div>
        <button
          onClick={onReserveClick}
          disabled={!canReserve}
          style={{
            flex: 1.4,
            padding: '14px 18px',
            borderRadius: 12,
            border: 'none',
            background: canReserve ? T.terra : 'rgba(128,128,128,0.28)',
            color: canReserve ? '#f6efe6' : T.creamDim,
            cursor: canReserve ? 'pointer' : 'not-allowed',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter',
            boxShadow: canReserve ? `0 8px 20px -6px ${T.terra}80` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {canReserve ? <>Reserve a table <span style={{ fontSize: 16 }}>→</span></> : reserveLabel}
        </button>
      </div>
    </div>
  );
}

// Placeholder mobile components (keeping structure simple for mobile)
function MobileContent({ event, theme, eventDate, tablesLeft, totalTables, onKnowArtist, isDayEvent }: { event: any; theme: 'dark' | 'light'; eventDate: Date; tablesLeft: number; totalTables: number; onKnowArtist: () => void; isDayEvent: boolean }) {
  const T = THEMES[theme];
  const reviewItems = isDayEvent
    ? [
        { q: 'Unhurried brunch with perfect live acoustic energy.', a: 'Niharika R.', e: 'Sunday brunch guest' },
        { q: 'Food spread and service were both top-tier.', a: 'Aditya P.', e: 'Weekend brunch guest' },
        { q: 'Great for families, and the ambiance is beautiful in daylight.', a: 'Meera J.', e: 'Brunch regular' },
      ]
    : [
        { q: 'Best live music night in Hyderabad. Period.', a: 'Tanvi M.', e: 'Vol. 06 attendee' },
        { q: 'Sound, food, vibe — Akan nailed it all.', a: 'Rohan S.', e: 'Vol. 05 attendee' },
        { q: 'Booked again before the encore ended.', a: 'Mira K.', e: 'Vol. 06 attendee' },
      ];
  const customFaqs = parseFaqs(event.faqs);
  const faqItems = customFaqs.length ? customFaqs : isDayEvent
    ? [
        ['Is this brunch family-friendly?', 'Yes. Day events are family-friendly and suitable for all age groups.'],
        ['Do we need to prepay for brunch?', 'Not mandatory for day events. You can reserve and pay at venue unless online payment is explicitly enabled.'],
        ['Can dietary preferences be accommodated?', 'Yes. Please mention preferences while booking and the team will assist at the venue.'],
        ['How long can we keep the table?', 'Your brunch table is held for the event slot and coordinated by the host team on arrival.'],
      ]
    : [
        ['Is the cover charge per person?', 'Yes. ₹1,500 per person, fully redeemable on food and beverage at your table.'],
        ['Can I book a smaller table?', 'Tables seat 2, 4, 6, or 8. Tell us your party size and we\'ll arrange the right table.'],
        ['Is there a dress code?', 'Smart casual. No shorts or slippers after 8 PM.'],
        ['Cancellation policy?', 'Free cancellation up to 24 hrs before the event.'],
      ];

  return (
    <div style={{ padding: '20px 24px 120px' }}>
      {/* Hero Poster */}
      <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 28, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '4/5',
            backgroundImage: `url(${event.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Title Block */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12, fontWeight: 700 }}>
          {event.kind}
        </div>
        <h1 style={{ margin: '10px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 38, lineHeight: 0.98, letterSpacing: '-0.025em', color: T.cream, textWrap: 'balance' }}>
          {event.title}
        </h1>
        <p style={{ margin: '14px 0 0', color: T.creamDim, fontSize: 14, lineHeight: 1.55, textWrap: 'pretty' }}>
          {event.tagline}
        </p>
      </div>

      {/* Facts */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${T.hairline}` }}>
        {[
          {
            label: 'Date',
            value: event.date,
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          },
          {
            label: 'Doors / Showtime',
            value: event.time,
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
          {
            label: 'Venue',
            value: event.venue ? `${event.venue.name}, ${event.venue.city}` : 'Akan, Madhapur',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
          },
          {
            label: 'Cover',
            value: event.price,
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
          },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 3 ? `1px solid ${T.hairline}` : 'none' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(201,81,46,0.12)',
                border: `1px solid ${T.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.terra,
                flexShrink: 0,
              }}
            >
              {f.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.cream }}>
                {f.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Countdown */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16 }}>
          Doors open in
        </div>
        <CountdownTimer targetDate={eventDate} theme={theme} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
          About this event
        </div>
        <h2 style={{ margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: T.cream, letterSpacing: '-0.02em' }}>
          Event Details
        </h2>
        <div className="event-body" style={{ color: T.creamDim, fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: event.body || '' }} />
        {!isDayEvent && (
          <button
            onClick={onKnowArtist}
            style={{
              marginTop: 16,
              padding: '11px 14px',
              borderRadius: 10,
              border: `1px solid ${T.hairline}`,
              background: T.softTint,
              color: T.cream,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'Inter',
              cursor: 'pointer',
            }}
          >
            Know about the artist/band
          </button>
        )}
      </div>


      {/* Reviews */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
          {isDayEvent ? 'Past Brunches' : 'Past Shows'}
        </div>
        <h2 style={{ margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: T.cream }}>
          {isDayEvent ? 'What brunch guests are saying' : 'What guests are saying'}
        </h2>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {reviewItems.map((x, i) => (
            <div key={i} style={{ flexShrink: 0, width: 250, background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', color: T.cream, lineHeight: 1.3, fontWeight: 300 }}>
                "{x.q}"
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.hairline}` }}>
                <div style={{ fontSize: 12, color: T.cream, fontWeight: 500 }}>
                  {x.a}
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  {x.e}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
          Good to know
        </div>
        <h2 style={{ margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: T.cream }}>
          {isDayEvent ? 'Brunch questions, answered' : 'Questions, answered'}
        </h2>
        <div style={{ background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 14, overflow: 'hidden' }}>
          {faqItems.map(([q, a], i) => (
            <div key={i} style={{ padding: '12px 14px', borderBottom: i < faqItems.length - 1 ? `1px solid ${T.hairline}` : 'none' }}>
              <div style={{ fontSize: 13, color: T.cream, fontWeight: 600, marginBottom: 6 }}>{q}</div>
              <div style={{ fontSize: 12, color: T.creamDim, lineHeight: 1.5 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
          The Venue
        </div>
        <h2 style={{ margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: T.cream }}>
          {event.venue ? `${event.venue.name}, ${event.venue.city}` : 'Akan, Madhapur'}
        </h2>
        <div style={{ height: 160, borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.hairline}`, marginBottom: 14, position: 'relative' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.5655271896266!2d78.36384!3d17.4447!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb939cd5555555%3A0x1234567890!2sAkan%20Madhapur!5e0!3m2!1sen!2sin!4v1234567890"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.95)', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 14, fontStyle: 'italic', fontFamily: 'Fraunces, serif', color: '#1a0d08', fontWeight: 500 }}>
            akan
          </div>
        </div>
        <p style={{ fontSize: 14, color: T.creamDim, marginBottom: 14 }}>
          Opp. Durgam Cheruvu, Madhapur
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://maps.app.goo.gl/E4wxxMTCTMoEbR5N8" target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.hairline}`, color: T.text, textDecoration: 'none', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
            Open in Maps
          </a>
          <a href="tel:+919649652222" onClick={trackPhoneClick} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.hairline}`, color: T.text, textDecoration: 'none', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
            Call
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 22, color: T.cream }}>
          akan
        </div>
        <div style={{ fontSize: 9, color: T.muted, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          Madhapur · Hyderabad · est. 2024
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DESKTOP COMPONENTS
// ============================================================================

function DesktopNav({
  theme,
  onToggleTheme,
  onReserveClick,
  canReserve,
  reserveLabel,
  scrolled,
  headerIsDark,
}: {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onReserveClick: () => void;
  canReserve: boolean;
  reserveLabel: string;
  scrolled: boolean;
  headerIsDark: boolean;
}) {
  const borderColor = headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)';
  const bg = headerIsDark
    ? (scrolled ? 'rgba(12, 8, 5, 0.8)' : 'rgba(12, 8, 5, 0.7)')
    : (scrolled ? 'rgba(243, 234, 217, 0.88)' : 'rgba(243, 234, 217, 1)');
  const textColor = headerIsDark ? '#f1e6d3' : '#1c130d';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '70px',
        background: bg,
        backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: scrolled ? `1px solid ${borderColor}` : 'none',
        transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease',
        color: textColor,
        width: '100%',
      }}
    >
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 32px', height: '70px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image
            src="/assets/Akan logo.svg"
            alt="Akan"
            width={80}
            height={120}
            priority
            style={{ display: 'block', margin: 0, padding: 0, flexShrink: 0, marginTop: '0px' }}
          />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', fontWeight: 500, color: 'inherit', height: '70px' }}>
          <a href="https://akanhyd.com/explore/" style={{ color: 'inherit', textDecoration: 'none' }}>Explore</a>
          <a href="https://akanhyd.com/menu/" style={{ color: 'inherit', textDecoration: 'none' }}>Menu</a>
          <Link href="/" style={{ color: '#c96c4a', textDecoration: 'none' }}>Events</Link>
          <a href="https://akanhyd.com/" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '70px' }}>
          <button
            onClick={onReserveClick}
            disabled={!canReserve}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: canReserve ? 'inherit' : (headerIsDark ? 'rgba(241, 230, 211, 0.6)' : 'rgba(28, 19, 13, 0.45)'),
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              border: `1px solid ${borderColor}`,
              borderRadius: '999px',
              background: canReserve ? (headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)') : 'rgba(128,128,128,0.16)',
              cursor: canReserve ? 'pointer' : 'not-allowed',
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}
          >
            {canReserve ? 'Reserve →' : reserveLabel}
          </button>
          <button
            onClick={onToggleTheme}
            style={{
              background: headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
              border: `1px solid ${borderColor}`,
              color: 'inherit',
              padding: '8px 14px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}

function DesktopContent({ event, theme, eventDate, tablesLeft, totalTables, onReserveClick, onKnowArtist, allowPayment, isDayEvent, canReserve, reserveLabel }: { event: any; theme: 'dark' | 'light'; eventDate: Date; tablesLeft: number; totalTables: number; onReserveClick: () => void; onKnowArtist: () => void; allowPayment: boolean; isDayEvent: boolean; canReserve: boolean; reserveLabel: string }) {
  const T = THEMES[theme];
  const [openFaq, setOpenFaq] = useState(-1);
  const reviewItems = isDayEvent
    ? [
        { q: 'Unhurried brunch with perfect live acoustic energy.', a: 'Niharika R.', e: 'Sunday brunch guest' },
        { q: 'Food spread and service were both top-tier.', a: 'Aditya P.', e: 'Weekend brunch guest' },
        { q: 'Great for families, and the ambiance is beautiful in daylight.', a: 'Meera J.', e: 'Brunch regular' },
      ]
    : [
        { q: 'Best live music night in Hyderabad. Period.', a: 'Tanvi M.', e: 'Vol. 06 attendee' },
        { q: 'Sound, food, vibe — Akan nailed every part of it.', a: 'Rohan S.', e: 'Vol. 05 attendee' },
        { q: 'Booked again before the encore ended.', a: 'Mira K.', e: 'Vol. 06 attendee' },
      ];
  const customFaqs = parseFaqs(event.faqs);
  const faqItems = customFaqs.length ? customFaqs : isDayEvent
    ? [
        ['Is this brunch family-friendly?', 'Yes. Day events are family-friendly and suitable for all age groups.'],
        ['Do we need to prepay for brunch?', 'Not mandatory for day events. You can reserve and pay at venue unless online payment is explicitly enabled.'],
        ['Can dietary preferences be accommodated?', 'Yes. Please mention preferences while booking and the team will assist at the venue.'],
        ['How long can we keep the table?', 'Your brunch table is held for the event slot and coordinated by the host team on arrival.'],
      ]
    : [
        ['Is the cover charge per person?', 'Yes. ₹1,500 per person, fully redeemable on food and beverage at your table.'],
        ['Can I book a smaller table?', 'Tables seat 2, 4, 6, or 8. Tell us your party size and we\'ll arrange the right table.'],
        ['Is there a dress code?', 'Smart casual. No shorts or slippers after 8 PM.'],
        ['Cancellation policy?', 'Free cancellation up to 24 hrs before the event.'],
      ];

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero */}
      <div style={{ padding: '56px 56px 80px', display: 'grid', gridTemplateColumns: '560px 1fr', gap: 56, alignItems: 'center' }}>
        {/* Poster */}
        <div style={{ borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '100%', aspectRatio: '4/5', backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>

        {/* Content */}
        <div>
          <div style={{ fontSize: 11, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 16 }}>
            {event.kind}
          </div>
          <h1 style={{ margin: '16px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 76, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.cream, textWrap: 'balance' }}>
            {event.title}
          </h1>
          <p style={{ margin: '22px 0 0', color: T.creamDim, fontSize: 17, lineHeight: 1.55, maxWidth: 520, textWrap: 'pretty' }}>
            {event.tagline}
          </p>

          {/* Facts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 36, paddingTop: 24, borderTop: `1px solid ${T.hairline}` }}>
            {[
              { label: 'Date', value: event.date },
              { label: 'Doors open', value: event.time.split('—')[0]?.trim() || event.time },
              { label: 'Venue', value: event.venue ? `${event.venue.name} · ${event.venue.city}` : 'Akan · Madhapur' },
            ].map((f, i) => (
              <div key={i} style={{ borderLeft: i > 0 ? `1px solid ${T.hairline}` : 'none', paddingLeft: i > 0 ? 24 : 0 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6, fontWeight: 700 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: T.cream }}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ marginTop: 32, padding: '20px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
              Doors open in
            </div>
            <CountdownTimer targetDate={eventDate} theme={theme} />
          </div>

          {/* CTA */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={onReserveClick}
              disabled={!canReserve}
              style={{
                padding: '18px 32px',
                borderRadius: 12,
                background: canReserve ? T.terra : 'rgba(128,128,128,0.28)',
                color: canReserve ? '#fff' : T.creamDim,
                border: 'none',
                cursor: canReserve ? 'pointer' : 'not-allowed',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'Inter',
                boxShadow: canReserve ? `0 12px 28px -8px ${T.terra}99` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {canReserve ? <>Reserve a table<span style={{ fontSize: 18 }}>→</span></> : reserveLabel}
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: T.terra, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: T.terra, animation: 'pulse 1.6s ease-in-out infinite' }} />
                {canReserve ? 'Reserve a table' : reserveLabel}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
                {canReserve ? (allowPayment ? 'Pay just ₹50/head to lock it in →' : 'No online payment needed for reservation') : 'This event has already started, so online reservations are disabled.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '80px 56px', borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 14 }}>
              About this event
            </div>
            <h2 style={{ margin: '14px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 52, color: T.cream, lineHeight: 1, letterSpacing: '-0.025em' }}>
              Event Details<br /><em style={{ fontWeight: 300, color: T.creamDim }}>A curated experience.</em>
            </h2>
          </div>
          <div>
            <div className="event-body" style={{ color: T.creamDim, fontSize: 17, lineHeight: 1.6, maxWidth: 580 }} dangerouslySetInnerHTML={{ __html: event.body || '' }} />
            {!isDayEvent && (
              <button
                onClick={onKnowArtist}
                style={{
                  marginTop: 20,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `1px solid ${T.hairline}`,
                  background: T.softTint,
                  color: T.cream,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                }}
              >
                Know about the artist/band
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Reviews */}
      <div style={{ padding: '60px 56px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 12 }}>
              {isDayEvent ? 'Past Brunches' : 'Past Shows'}
            </div>
            <h2 style={{ margin: '12px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em' }}>
              {isDayEvent ? 'What brunch guests are saying' : 'What guests are saying'}
            </h2>
          </div>
          <a href="#" style={{ color: T.creamDim, fontSize: 13, textDecoration: 'none', borderBottom: `1px solid ${T.hairline}`, paddingBottom: 2 }}>
            See gallery →
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {reviewItems.map((x, i) => (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 16, padding: '32px 28px' }}>
              <div style={{ color: T.terra, fontFamily: 'Fraunces, serif', fontSize: 48, lineHeight: 0.5, marginBottom: 12 }}>
                "
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', color: T.cream, lineHeight: 1.3, fontWeight: 300, textWrap: 'pretty' }}>
                {x.q}
              </div>
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${T.hairline}` }}>
                <div style={{ fontSize: 14, color: T.cream, fontWeight: 500 }}>
                  {x.a}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                  {x.e}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue */}
      <div style={{ padding: '60px 56px', borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 14 }}>
              The Venue
            </div>
            <h2 style={{ margin: '14px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em' }}>
              {event.venue ? `${event.venue.name}, ${event.venue.city}` : 'Akan, Madhapur'}
            </h2>
            <p style={{ color: T.creamDim, fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 440 }}>
              Opp. Durgam Cheruvu. Valet parking on-site. Smart casual — no shorts or slippers after 8 PM.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <a href="https://maps.app.goo.gl/E4wxxMTCTMoEbR5N8" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 18px', borderRadius: 10, background: T.softTint, border: `1px solid ${T.hairline}`, color: T.text, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Open in Maps
              </a>
              <a href="tel:+919649652222" onClick={trackPhoneClick} style={{ padding: '12px 18px', borderRadius: 10, background: T.softTint, border: `1px solid ${T.hairline}`, color: T.text, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Call
              </a>
            </div>
          </div>
          <div style={{ height: 340, borderRadius: 18, overflow: 'hidden', border: `1px solid ${T.hairline}`, position: 'relative' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.5655271896266!2d78.36384!3d17.4447!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb939cd5555555%3A0x1234567890!2sAkan%20Madhapur!5e0!3m2!1sen!2sin!4v1234567890"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(255,255,255,0.95)', padding: '12px 16px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 18, fontStyle: 'italic', fontFamily: 'Fraunces, serif', color: '#1a0d08', fontWeight: 500 }}>
              akan
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '60px 56px', borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 56, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 10, color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 14 }}>
              Good to know
            </div>
            <h2 style={{ margin: '14px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em' }}>
              {isDayEvent ? 'Brunch questions,' : 'Questions,'}<br /><em style={{ fontWeight: 300, color: T.creamDim }}>answered</em>
            </h2>
          </div>
          <div>
            {faqItems.map(([q, a], i) => (
              <div key={i} style={{ borderBottom: `1px solid ${T.hairline}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  style={{
                    width: '100%',
                    padding: '22px 0',
                    background: 'transparent',
                    border: 'none',
                    color: T.cream,
                    fontSize: 17,
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{q}</span>
                  <span style={{ color: T.terra, fontSize: 22, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: 22, color: T.creamDim, fontSize: 15, lineHeight: 1.6, maxWidth: 620 }}>
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '60px 56px 48px', borderTop: `1px solid ${T.hairline}`, marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 36, color: T.cream }}>
              akan
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
              Madhapur · Hyderabad · est. 2024
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28, fontSize: 13, color: T.muted }}>
            {[
              { label: 'Instagram', href: 'https://instagram.com/akan.hyd', ext: true },
              { label: 'Menu', href: 'https://akanhyd.com/menu/', ext: true },
              { label: 'Gallery', href: 'https://akanhyd.com/', ext: true },
              { label: 'Past Events', href: '/', ext: false },
              { label: 'Privacy', href: 'https://akanhyd.com/privacy-statement/', ext: true },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                {...(item.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EVENT PAGE - Routes to Mobile or Desktop
// ============================================================================

export default function EventPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const fallbackEvent = eventId ? getEventById(eventId) : null;
  const [dashboardEvent, setDashboardEvent] = useState<any | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const event = dashboardEvent || fallbackEvent;

  const isDayEvent = event?.kind === 'Sunday Brunch' || event?.kind === 'Workshop';
  const initialTheme = isDayEvent ? 'light' : 'dark';

  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);
  const [modalOpen, setModalOpen] = useState(false);
  const [artistModalOpen, setArtistModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const totalTables = 24;
  const [tablesLeft, setTablesLeft] = useState(18);
  const showDiscoScene = theme === 'dark';
  const headerIsDark = !isDayEvent;

  const T = THEMES[theme];

  useEffect(() => {
    let cancelled = false;
    setLoadingEvent(true);
    if (!eventId) {
      setLoadingEvent(false);
      return;
    }
    fetchDashboardEvent(eventId)
      .then((nextEvent) => {
        if (!cancelled && nextEvent) setDashboardEvent(nextEvent);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    setTheme(event.kind === 'Sunday Brunch' || event.kind === 'Workshop' || event.hue === 'sunny' ? 'light' : 'dark');
  }, [event?.id, event?.kind, event?.hue]);

  // Funnel: page_view — once per session per event.
  useEffect(() => {
    const id = event?.dashboard_event_id;
    if (!id) return;
    try {
      const flag = `evt_pv_${id}`;
      if (window.sessionStorage.getItem(flag) === '1') return;
      window.sessionStorage.setItem(flag, '1');
    } catch { /* storage disabled — fire anyway */ }
    trackEvent(id, 'page_view');
    trackEventPageView({
      eventId: id,
      eventName: event?.title || event?.name || 'Akan Event',
    });
  }, [event?.dashboard_event_id]);

  // Visitor identity: classify new vs returning (cookie → fingerprint →
  // weighted similarity). Runs once per session, deferred to idle so it never
  // blocks first paint or the booking flow. Powers the first-time rate metric.
  useEffect(() => {
    const id = event?.dashboard_event_id;
    if (!id || typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem('evt_visitor_done') === '1') return;
    } catch { /* storage disabled — proceed */ }

    let cancelled = false;
    const run = async () => {
      try {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)evt_visitor=([^;]+)/);
        const cookieId = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        const components = await collectFingerprint();
        if (cancelled) return;
        const res = await fetch('/api/dashboard/visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: id, cookieId, components }),
          keepalive: true,
        });
        const data = await res.json().catch(() => null);
        if (data && data.ok && typeof data.visitorId === 'string') {
          const maxAge = 365 * 24 * 60 * 60; // 1 year
          document.cookie = `evt_visitor=${encodeURIComponent(data.visitorId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
          try { window.sessionStorage.setItem('evt_visitor_done', '1'); } catch { /* ignore */ }
        }
      } catch { /* visitor identity is best-effort */ }
    };

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    let handle: number;
    if (typeof w.requestIdleCallback === 'function') {
      handle = w.requestIdleCallback(() => { void run(); }, { timeout: 3000 });
    } else {
      handle = window.setTimeout(() => { void run(); }, 1200);
    }
    return () => {
      cancelled = true;
      if (typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [event?.dashboard_event_id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  if (!event) {
    return (
      <div style={{ backgroundColor: T.bg, color: T.text, padding: '40px', textAlign: 'center' }}>
        <p>{loadingEvent ? 'Loading event...' : 'Event not found'}</p>
      </div>
    );
  }

  const eventDate = event.event_date
    ? new Date(`${event.event_date}T${event.start_time || '12:00'}:00`)
    : new Date('2026-05-23T15:00:00');
  const ticketOptions = Array.isArray(event.ticket_options) && event.ticket_options.length > 0 ? event.ticket_options : [2, 4, 6];
  const allowPayment = event.payment_enabled !== false;
  const artistProfile = event.artist_profile || {
    name: event.title,
    description: 'Artist and band details will be linked from the dashboard once event-artist mapping is finalized.',
    vocalists: 3,
    members: 8,
    set_minutes: 90,
  };
  const canReserve = event.booking_open !== false;
  const reserveLabel = event.booking_status_label || (canReserve ? 'Reserve' : 'Bookings closed');
  const openBookingModal = () => {
    if (canReserve) {
      trackEvent(event?.dashboard_event_id, 'book_click');
      trackReserveClick({
        eventId: event?.dashboard_event_id,
        eventName: event?.title || event?.name || 'Akan Event',
      });
      setModalOpen(true);
    }
  };

  // ========== MOBILE VIEW ==========
  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: T.bg,
          color: T.text,
          fontFamily: 'Manrope, system-ui, sans-serif',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Background — fixed to the viewport so the disco scene stays in view
            and animates while scrolling (mobile parity with the desktop sticky bg). */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {showDiscoScene && <BgScene theme={theme} />}
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <MobileHeader
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            onReserveClick={openBookingModal}
            canReserve={canReserve}
            reserveLabel={reserveLabel}
            scrolled={scrolled}
            headerIsDark={headerIsDark}
          />
          <MobileContent event={event} theme={theme} eventDate={eventDate} tablesLeft={tablesLeft} totalTables={totalTables} onKnowArtist={() => setArtistModalOpen(true)} isDayEvent={isDayEvent} />
        </div>

        {/* Modals */}
        <BookingModal open={modalOpen && canReserve} onClose={() => setModalOpen(false)} event={event} tablesLeft={tablesLeft} theme={theme} isMobile={true} allowPayment={allowPayment} ticketOptions={ticketOptions} />
        <ArtistDetailsModal open={artistModalOpen} onClose={() => setArtistModalOpen(false)} theme={theme} artist={artistProfile} imageUrl={(artistProfile as { image?: string }).image || event.image} isMobile={isMobile} />
        <MobileStickyBar onReserveClick={openBookingModal} tablesLeft={tablesLeft} event={event} theme={theme} canReserve={canReserve} reserveLabel={reserveLabel} />
      </div>
    );
  }

  // ========== DESKTOP VIEW ==========
  return (
    <div
      style={{
        backgroundColor: T.bg,
        color: T.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'auto',
      }}
    >
      {/* Sticky Background */}
      <div style={{ position: 'sticky', top: 0, height: 0, zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100vh', pointerEvents: 'none' }}>
          {showDiscoScene && <BgScene theme={theme} />}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <DesktopNav
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onReserveClick={openBookingModal}
          canReserve={canReserve}
          reserveLabel={reserveLabel}
          scrolled={scrolled}
          headerIsDark={headerIsDark}
        />
        <DesktopContent
          event={event}
          theme={theme}
          eventDate={eventDate}
          tablesLeft={tablesLeft}
          totalTables={totalTables}
          onReserveClick={openBookingModal}
          onKnowArtist={() => setArtistModalOpen(true)}
          allowPayment={allowPayment}
          isDayEvent={isDayEvent}
          canReserve={canReserve}
          reserveLabel={reserveLabel}
        />
      </div>

      {/* Booking Modal */}
      <BookingModal open={modalOpen && canReserve} onClose={() => setModalOpen(false)} event={event} tablesLeft={tablesLeft} theme={theme} isMobile={false} allowPayment={allowPayment} ticketOptions={ticketOptions} />
      <ArtistDetailsModal open={artistModalOpen} onClose={() => setArtistModalOpen(false)} theme={theme} artist={artistProfile} imageUrl={(artistProfile as { image?: string }).image || event.image} isMobile={isMobile} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
