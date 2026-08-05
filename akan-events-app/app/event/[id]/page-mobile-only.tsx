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
      `}</style>
      
      {/* Sweeping beams */}
      <div style={{ position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '140%', background: `conic-gradient(from 200deg at 20% 0%, transparent 0deg, ${beamA} 8deg, transparent 18deg)`, filter: 'blur(2px)', animation: 'beamSweepA 7s ease-in-out infinite', transformOrigin: '20% 0%', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '160%', height: '140%', background: `conic-gradient(from 130deg at 80% 0%, transparent 0deg, ${beamB} 7deg, transparent 16deg)`, filter: 'blur(2px)', animation: 'beamSweepB 9s ease-in-out infinite', transformOrigin: '80% 0%', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />

      {/* Floor pools */}
      <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: '220px', height: '220px', borderRadius: '50%', background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`, filter: 'blur(20px)', animation: 'floorPoolA 8s ease-in-out infinite', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-25%', right: '5%', width: '280px', height: '280px', borderRadius: '50%', background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`, filter: 'blur(24px)', animation: 'floorPoolB 10s ease-in-out infinite', mixBlendMode: dark ? 'screen' : 'multiply', pointerEvents: 'none' }} />

      {/* Strobe effect */}
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, animation: 'strobe 6s steps(1, end) infinite', mixBlendMode: 'overlay', pointerEvents: 'none' }} />

      {/* Dust particles */}
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
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
      {[
        { value: countdown.days, label: 'Days' },
        { value: countdown.hours, label: 'Hrs' },
        { value: countdown.minutes, label: 'Min' },
        { value: countdown.seconds, label: 'Sec' },
      ].map(({ value, label }, index) => (
        <div key={index} style={{ textAlign: 'center', minWidth: '56px' }}>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 500, fontSize: '32px', color: 'inherit', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: '6px' }}>
            {String(value).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'inherit', opacity: 0.7 }}>
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
      setScrolled(window.scrollY > 0);
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
        @media (max-width: 768px) {
          div[data-content-grid] {
            grid-template-columns: 1fr !important;
          }
          div[data-booking-sidebar] {
            position: static !important;
            top: auto !important;
            margin-top: 32px !important;
          }
        }
      `}</style>

      {/* Disco light background animation */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DiscoLights dark={T.isDark} />
      </div>

      {/* Content wrapper with position relative to appear above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header - matching landing page style */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            height: '70px',
            background: T.isDark 
              ? (scrolled ? 'rgba(12, 8, 5, 0.8)' : 'rgba(12, 8, 5, 0.7)')
              : (scrolled ? 'rgba(243, 234, 217, 0.88)' : 'rgba(243, 234, 217, 1)'),
            backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
            borderBottom: scrolled ? `1px solid ${T.isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}` : 'none',
            transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease',
            overflow: 'visible',
            color: T.text,
            width: '100%',
          }}
        >
          <div style={{
            maxWidth: '1320px',
            margin: '0 auto',
            padding: '0 32px',
            height: '70px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <Image 
              src="/assets/Akan logo.svg" 
              alt="Akan"
              width={80}
              height={120}
              priority
              style={{
                display: 'block',
                margin: 0,
                padding: 0,
                flexShrink: 0,
                marginTop: '0px',
              }}
            />

            {/* Desktop Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', fontWeight: 500, color: 'inherit', height: '70px' }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Explore</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Menu</a>
              <a href="#events" style={{ color: T.terra, textDecoration: 'none' }}>Events</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
            </nav>

            {/* Header Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '70px' }}>
            <a href="#reserve" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'inherit', 
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              border: `1px solid ${T.isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
              borderRadius: '999px',
              background: T.isDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
            }}>
              Reserve →
            </a>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                background: T.isDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
                border: `1px solid ${T.isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
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

        {/* Main Content */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(24px, 5vw, 48px)', paddingBottom: '180px' }}>
          {/* Hero Image */}
          <div style={{ marginBottom: '48px' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '4/5',
                backgroundImage: `url(${event.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '18px',
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            />
          </div>

          {/* Event Header */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '12px', fontWeight: 700 }}>
              {event.kind}
            </div>
            <h1
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 'clamp(34px, 4.5vw, 58px)',
                fontWeight: 400,
                margin: '0 0 16px',
                letterSpacing: '-0.018em',
                lineHeight: 1.02,
              }}
            >
              {event.title}
            </h1>
            <p style={{ fontSize: '18px', color: T.creamDim, margin: '0 0 24px', lineHeight: 1.5 }}>
              {event.tagline}
            </p>

            {/* Key Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
                padding: '28px 24px',
                background: T.surface,
                borderRadius: '4px',
                border: `1px solid ${T.hairline}`,
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '6px', fontWeight: 700 }}>
                  Date
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500 }}>{event.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '6px', fontWeight: 700 }}>
                  Time
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500 }}>{event.time}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '6px', fontWeight: 700 }}>
                  Price Per Person
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: T.terra }}>{event.price}</div>
              </div>
            </div>
          </div>

          {/* Countdown Section */}
          <div style={{ padding: '28px 24px', background: `linear-gradient(135deg, ${T.terra}0d, ${T.terra}0a)`, border: `1px solid ${T.terra}44`, borderRadius: '4px', marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '18px', fontWeight: 700 }}>
              ⏱ Doors Open In
            </div>
            <CountdownTimer targetDate={eventDate} />
          </div>

          {/* Event Description */}
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '24px', fontWeight: 400, margin: '0 0 16px', letterSpacing: '-0.01em' }}>About This Event</h2>
            <p style={{ fontSize: '16px', color: T.creamDim, lineHeight: 1.6, margin: 0 }}>
              {event.body}
            </p>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '24px', fontWeight: 400, margin: '0 0 16px', letterSpacing: '-0.01em' }}>What's Included</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {event.tags.map((tag) => (
                  <div
                    key={tag}
                    style={{
                      padding: '9px 16px',
                      background: T.accentTint,
                      border: `1px solid ${T.accentBorder}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    ✓ {tag}
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Sticky Bottom Bar */}
      <StickyBar
        onReserveClick={() => setModalOpen(true)}
        tablesLeft={24}
        price={event.price}
        theme={theme}
      />
    </div>
  );
}
