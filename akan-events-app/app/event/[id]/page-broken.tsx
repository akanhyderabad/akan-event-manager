'use client';

import { getEventById } from '@/lib/constants';
import { THEMES } from '@/lib/theme';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

// Disco light animation background
function DiscoLights({ dark }: { dark: boolean }) {
  const beamA = dark ? 'rgba(201, 81, 46, 0.32)' : 'rgba(184, 69, 31, 0.18)';
  const beamB = dark ? 'rgba(70, 140, 220, 0.22)' : 'rgba(70, 140, 220, 0.10)';
  const beamC = dark ? 'rgba(220, 70, 130, 0.22)' : 'rgba(180, 50, 110, 0.10)';

  return (
    <>
      <style>{`
        @keyframes beamSweepA { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(20deg); } }
        @keyframes beamSweepB { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-15deg); } }
        @keyframes floorPoolA { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.2) translateY(-20px); } }
        @keyframes floorPoolB { 0%, 100% { transform: scale(1) translateX(0); } 50% { transform: scale(1.1) translateX(20px); } }
        @keyframes strobe { 0%, 90% { opacity: 0; } 95% { opacity: 0.1; } 100% { opacity: 0; } }
        @keyframes dust { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) translateX(50px); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
      
      <div style={{ position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '140%', background: `conic-gradient(from 200deg at 20% 0%, transparent 0deg, ${beamA} 8deg, transparent 18deg)`, filter: 'blur(2px)', animation: 'beamSweepA 7s ease-in-out infinite', transformOrigin: '20% 0%', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '160%', height: '140%', background: `conic-gradient(from 130deg at 80% 0%, transparent 0deg, ${beamB} 7deg, transparent 16deg)`, filter: 'blur(2px)', animation: 'beamSweepB 9s ease-in-out infinite', transformOrigin: '80% 0%', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: '220px', height: '220px', borderRadius: '50%', background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`, filter: 'blur(20px)', animation: 'floorPoolA 8s ease-in-out infinite', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-25%', right: '5%', width: '280px', height: '280px', borderRadius: '50%', background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`, filter: 'blur(24px)', animation: 'floorPoolB 10s ease-in-out infinite', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, animation: 'strobe 6s steps(1, end) infinite', mixBlendMode: 'overlay', pointerEvents: 'none' }} />
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 53) % 100;
        const dur = 8 + ((i % 5) * 1.5);
        const delay = ((i * 0.4) % dur);
        const size = 1 + (i % 3);
        return (
          <div key={i} style={{ position: 'absolute', bottom: '-10px', left: `${left}%`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: dark ? 'rgba(246,239,230,0.5)' : 'rgba(26,13,8,0.35)', animation: `dust ${dur}s linear ${delay}s infinite`, pointerEvents: 'none' }} />
        );
      })}
    </>
  );
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
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

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start' }}>
      {[
        { value: countdown.days, label: 'Days' },
        { value: countdown.hours, label: 'Hrs' },
        { value: countdown.minutes, label: 'Min' },
        { value: countdown.seconds, label: 'Sec' },
      ].map(({ value, label }, index) => (
        <div key={index} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: '42px', color: 'inherit', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {String(value).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'inherit', opacity: 0.7, fontWeight: 700 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Booking Modal Component
function BookingModal({ open, onClose, event, tablesLeft, theme }: { open: boolean; onClose: () => void; event: any; tablesLeft: number; theme: 'dark' | 'light' }) {
  const T = THEMES[theme];
  const [step, setStep] = useState(0);
  const [pax, setPax] = useState('2');
  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', paymentMethod: 'hold' });

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(0);
        setPax('2');
        setFormData({ name: '', email: '', mobile: '', paymentMethod: 'hold' });
      }, 300);
    }
  }, [open]);

  const earlyBird = 50;
  const price = event?.price ? parseInt(event.price.replace(/[^\d]/g, '')) : 1500;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: open ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: open ? 'blur(6px)' : 'none',
        WebkitBackdropFilter: open ? 'blur(6px)' : 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          background: T.surface,
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '88vh',
          overflow: 'auto',
          paddingBottom: '28px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '38px', height: '4px', borderRadius: '999px', background: 'rgba(246,239,230,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Step {Math.min(step + 1, 3)} of 3
            </div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', fontWeight: 400, margin: 0 }}>
              {step === 0 && 'How many in your party?'}
              {step === 1 && 'Your Details'}
              {step === 2 && `Lock in for ₹${earlyBird}/head`}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.softTint,
              border: `1px solid ${T.hairline}`,
              color: T.text,
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0 24px' }}>
          {step === 0 && (
            <div>
              <div style={{ fontSize: '13px', color: T.creamDim, marginBottom: '24px' }}>
                Select your party size. We'll match you to the perfect spot.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
                {[1, 2, 4, 6].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPax(count.toString())}
                    style={{
                      padding: '14px 8px',
                      border: `1px solid ${pax === count.toString() ? T.terra : T.hairline}`,
                      background: pax === count.toString() ? T.accentTint : T.surface2,
                      color: T.text,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'Instrument Serif, serif',
                      transition: 'all 0.2s',
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: T.terra,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Next Step →
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    padding: '12px 14px',
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '14px',
                    fontFamily: 'Manrope, system-ui, sans-serif',
                  }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    padding: '12px 14px',
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '14px',
                    fontFamily: 'Manrope, system-ui, sans-serif',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  style={{
                    padding: '12px 14px',
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '14px',
                    fontFamily: 'Manrope, system-ui, sans-serif',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setStep(0)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: T.softTint,
                    border: `1px solid ${T.hairline}`,
                    color: T.text,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: T.terra,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ background: T.accentTint, border: `1px solid ${T.accentBorder}`, borderRadius: '4px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: T.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Booking Summary
                </div>
                <div style={{ fontSize: '13px', color: T.text, marginBottom: '6px' }}>
                  <strong>Guests:</strong> {pax} {pax === '1' ? 'person' : 'people'}
                </div>
                <div style={{ fontSize: '13px', color: T.text, marginBottom: '6px' }}>
                  <strong>Name:</strong> {formData.name}
                </div>
                <div style={{ fontSize: '13px', color: T.text, borderTop: `1px solid ${T.hairline}`, paddingTop: '12px', marginTop: '12px' }}>
                  <strong>Early Bird Cover:</strong> ₹{earlyBird}/head = ₹{earlyBird * parseInt(pax)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: T.softTint,
                    border: `1px solid ${T.hairline}`,
                    color: T.text,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    // Handle booking
                    onClose();
                  }}
                  style={{
                    flex: 1.5,
                    padding: '14px',
                    background: T.terra,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Confirm Booking
                </button>
              </div>
              <button
                onClick={() => {
                  // Handle hold only
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: T.softTint,
                  border: `1px solid ${T.hairline}`,
                  color: T.text,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Hold without paying
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sticky Bottom Bar
function StickyBar({ onReserveClick, tablesLeft, price, theme }: { onReserveClick: () => void; tablesLeft: number; price: string; theme: 'dark' | 'light' }) {
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
          ? 'linear-gradient(180deg, rgba(12, 8, 5, 0) 0%, rgba(12, 8, 5, 0.95) 30%, rgba(12, 8, 5, 1) 100%)'
          : 'linear-gradient(180deg, rgba(243, 234, 217, 0) 0%, rgba(243, 234, 217, 0.95) 30%, rgba(243, 234, 217, 1) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${T.hairline}`,
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.2 }}>
            {price} <span style={{ color: T.muted, fontWeight: 400, fontSize: '11px' }}>/ pp</span>
          </div>
          <div style={{ fontSize: '9px', color: T.terra, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            ● {tablesLeft} tables left
          </div>
        </div>
        <button
          onClick={onReserveClick}
          style={{
            flex: 1.4,
            padding: '14px 18px',
            borderRadius: '12px',
            border: 'none',
            background: T.terra,
            color: '#f6efe6',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Manrope, system-ui, sans-serif',
            boxShadow: `0 8px 20px -6px ${T.terra}80`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          Reserve a table
          <span style={{ fontSize: '16px' }}>→</span>
        </button>
      </div>
    </div>
  );
}

export default function EventPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const event = eventId ? getEventById(eventId) : null;

  const isDayEvent = event?.kind === 'Sunday Brunch' || event?.kind === 'Workshop';
  const initialTheme = isDayEvent ? 'light' : 'dark';

  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const T = THEMES[theme];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!event) {
    return (
      <div style={{ backgroundColor: T.bg, color: T.text, padding: '40px', textAlign: 'center' }}>
        <p>Event not found</p>
      </div>
    );
  }

  const eventDate = new Date('2026-05-23T15:00:00');

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
      <style>{`
        @media (max-width: 1200px) {
          nav[data-desktop-nav] {
            display: none !important;
          }
          div[data-mobile-bottom-bar] {
            display: block !important;
          }
          div[data-content-grid] {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            padding: 24px 20px 200px !important;
          }
        }
        @media (min-width: 1201px) {
          div[data-mobile-bottom-bar] {
            display: none !important;
          }
          nav[data-desktop-nav] {
            display: flex !important;
          }
          div[data-content-grid] {
            display: grid !important;
          }
        }
      `}</style>

      {/* Disco light background animation */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DiscoLights dark={T.isDark} />
      </div>

      {/* Content wrapper */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Desktop Navigation Header */}
        <nav
          data-desktop-nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            padding: '20px 56px',
            background: T.isDark 
              ? (scrolled ? 'rgba(26,13,8,0.6)' : 'rgba(12, 8, 5, 0)')
              : (scrolled ? 'rgba(248,243,236,0.7)' : 'rgba(243, 234, 217, 0)'),
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
            borderBottom: scrolled ? `1px solid ${T.hairline}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: '24px', color: T.cream, fontWeight: 400 }}>akan</div>
            <div style={{ display: 'flex', gap: '28px', fontSize: '13px', color: T.creamDim }}>
              {['Events', 'Menu', 'Gallery', 'About'].map((x) => (
                <a key={x} href="#" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>
                  {x}
                </a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                border: `1px solid ${T.hairline}`,
                background: T.softTint,
                color: T.cream,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.2s',
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: T.terra,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'Manrope, system-ui, sans-serif',
                boxShadow: `0 6px 16px -6px ${T.terra}80`,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              Reserve a table
            </button>
          </div>
        </nav>

        {/* Main Content - Desktop 2-column, Mobile 1-column */}
        <div
          data-content-grid
          style={{
            padding: '56px 56px 80px',
            display: 'grid',
            gridTemplateColumns: '560px 1fr',
            gap: '56px',
            alignItems: 'start',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Left: Hero Image */}
          <div style={{
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            position: 'sticky',
            top: '100px',
          }}>
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

          {/* Right: Event Content */}
          <div>
            {/* Eyebrow + Title */}
            <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '16px', fontWeight: 700 }}>
              {event.kind} · Vol. 07 · Akan presents
            </div>
            <h1 style={{
              margin: '16px 0 0',
              fontFamily: 'Fraunces, serif',
              fontWeight: 400,
              fontSize: '76px',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: T.cream,
              textWrap: 'balance',
            }}>
              {event.title.split(' ').slice(0, -1).join(' ')}
              <br />
              <em style={{ fontWeight: 300, color: T.terra }}>{event.title.split(' ').pop()}</em>
            </h1>

            {/* Description */}
            <p style={{
              margin: '22px 0 0',
              color: T.creamDim,
              fontSize: '17px',
              lineHeight: 1.55,
              maxWidth: '520px',
              textWrap: 'pretty',
            }}>
              {event.tagline}
            </p>

            {/* Facts Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
              marginTop: '36px',
              paddingTop: '24px',
              borderTop: `1px solid ${T.hairline}`,
            }}>
              {[
                { label: 'Date', value: event.date },
                { label: 'Doors open', value: event.time.split('—')[0]?.trim() || event.time },
                { label: 'Venue', value: 'Akan · Madhapur' },
              ].map((f, i) => (
                <div key={i} style={{ borderLeft: i > 0 ? `1px solid ${T.hairline}` : 'none', paddingLeft: i > 0 ? '24px' : 0 }}>
                  <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px', fontWeight: 700 }}>
                    {f.label}
                  </div>
                  <div style={{ fontFamily: 'Manrope, system-ui, sans-serif', fontWeight: 500, color: T.cream, fontSize: '16px' }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown */}
            <div style={{ marginTop: '32px', paddingTop: '20px', paddingBottom: '20px', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                Doors open in
              </div>
              <CountdownTimer targetDate={eventDate} />
            </div>

            {/* CTA + Scarcity */}
            <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  padding: '18px 32px',
                  borderRadius: '12px',
                  background: T.terra,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'Manrope, system-ui, sans-serif',
                  boxShadow: `0 12px 28px -8px ${T.terra}99`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                }}
              >
                Reserve a table
                <span style={{ fontSize: '18px' }}>→</span>
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Manrope, system-ui, sans-serif', fontSize: '10px', color: T.terra, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: T.terra, animation: 'pulse 1.6s ease-in-out infinite' }} />
                  Only 24 tables left
                </div>
                <div style={{ fontSize: '12px', color: T.muted, marginTop: '6px' }}>Pay just ₹50/head to lock it in →</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        tablesLeft={24}
        theme={theme}
      />

      {/* Mobile Bottom Bar */}
      <div data-mobile-bottom-bar>
        <StickyBar
          onReserveClick={() => setModalOpen(true)}
          tablesLeft={24}
          price={event.price}
          theme={theme}
        />
      </div>
    </div>
  );
}
