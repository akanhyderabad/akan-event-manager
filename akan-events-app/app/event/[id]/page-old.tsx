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
        @keyframes ballSwing { 0%, 100% { transform: translateX(-50%) rotateZ(-8deg); } 50% { transform: translateX(-50%) rotateZ(8deg); } }
        @keyframes ballSpin { 0% { transform: rotateY(0deg) rotateX(0deg); } 100% { transform: rotateY(360deg) rotateX(10deg); } }
        @keyframes facetTwinkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes sharpyRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes sharpyPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes floorPoolA { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.2) translateY(-20px); } }
        @keyframes floorPoolB { 0%, 100% { transform: scale(1) translateX(0); } 50% { transform: scale(1.1) translateX(20px); } }
        @keyframes strobe { 0%, 90% { opacity: 0; } 95% { opacity: 0.1; } 100% { opacity: 0; } }
        @keyframes dust { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) translateX(50px); opacity: 0; } }
      `}</style>
      
      {/* Sweeping beams */}
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
          mixBlendMode: dark ? 'screen' : 'multiply',
          pointerEvents: 'none',
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
          mixBlendMode: dark ? 'screen' : 'multiply',
          pointerEvents: 'none',
        }}
      />

      {/* Floor pools */}
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '10%',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          animation: 'floorPoolA 8s ease-in-out infinite',
          mixBlendMode: dark ? 'screen' : 'multiply',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          right: '5%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`,
          filter: 'blur(24px)',
          animation: 'floorPoolB 10s ease-in-out infinite',
          mixBlendMode: dark ? 'screen' : 'multiply',
          pointerEvents: 'none',
        }}
      />

      {/* Strobe effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          opacity: 0,
          animation: 'strobe 6s steps(1, end) infinite',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* Dust particles */}
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 53) % 100;
        const dur = 8 + ((i % 5) * 1.5);
        const delay = ((i * 0.4) % dur);
        const size = 1 + (i % 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: '-10px',
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: dark ? 'rgba(246,239,230,0.5)' : 'rgba(26,13,8,0.35)',
              animation: `dust ${dur}s linear ${delay}s infinite`,
              pointerEvents: 'none',
            }}
          />
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
      <div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', fontWeight: 500 }}>
          {String(countdown.days).padStart(2, '0')}
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', opacity: 0.7 }}>Days</div>
      </div>
      <div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', fontWeight: 500 }}>
          {String(countdown.hours).padStart(2, '0')}
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', opacity: 0.7 }}>Hrs</div>
      </div>
      <div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', fontWeight: 500 }}>
          {String(countdown.minutes).padStart(2, '0')}
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', opacity: 0.7 }}>Min</div>
      </div>
      <div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', fontWeight: 500 }}>
          {String(countdown.seconds).padStart(2, '0')}
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', opacity: 0.7 }}>Sec</div>
      </div>
    </div>
  );
}

export default function EventPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const event = eventId ? getEventById(eventId) : null;
  
  // Determine theme based on event kind
  const isDayEvent = event?.kind === 'Sunday Brunch' || event?.kind === 'Workshop';
  const initialTheme = isDayEvent ? 'light' : 'dark';
  
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);
  const [scrolled, setScrolled] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    pax: '2',
    name: '',
    email: '',
    mobile: '',
    paymentMethod: 'hold',
  });

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

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(24px, 5vw, 48px)', display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 5vw, 48px)' }}>
        {/* Wrapper for desktop layout */}
        <div data-content-grid style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 'clamp(24px, 5vw, 48px)', alignItems: 'start' }}>
          {/* Main Content */}
          <div>
          {/* Hero Image - Instagram post size (4:5) */}
          <div
            style={{
              padding: '0 20px',
              marginBottom: '48px',
            }}
          >
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
          <div
            style={{
              padding: '28px 24px',
              background: `linear-gradient(135deg, ${T.terra}0d, ${T.terra}0a)`,
              border: `1px solid ${T.terra}44`,
              borderRadius: '4px',
              marginBottom: '48px',
            }}
          >
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

        {/* Booking Sidebar */}
        <div data-booking-sidebar style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.hairline}`,
              borderRadius: '4px',
              padding: '28px 24px',
            }}
          >
            {/* Step Indicator */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      height: '3px',
                      background: bookingStep >= step ? T.terra : T.progressTrack,
                      borderRadius: '999px',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                Step {bookingStep} of 4
              </div>
            </div>

            {/* Step Content */}
            {bookingStep === 1 && (
              <div>
                <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                  No. of Pax?
                </h3>
                <div style={{ fontSize: '13px', color: T.creamDim, marginBottom: '18px', lineHeight: 1.5 }}>
                  Select your party size. We'll match you to the perfect spot.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
                  {[1, 2, 4, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setFormData({ ...formData, pax: count.toString() })}
                      style={{
                        padding: '14px 8px',
                        border: `1px solid ${formData.pax === count.toString() ? T.terra : T.hairline}`,
                        background: formData.pax === count.toString() ? T.accentTint : T.surface2,
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
                  onClick={() => setBookingStep(2)}
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
                    transition: 'background 0.2s',
                  }}
                >
                  Next Step →
                </button>
              </div>
            )}

            {bookingStep === 2 && (
              <div>
                <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                  Your Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      padding: '12px 14px',
                      background: T.surface2,
                      border: `1px solid ${T.hairline}`,
                      color: T.text,
                      borderRadius: '4px',
                      fontSize: '13px',
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
                      color: T.text,
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'Manrope, system-ui, sans-serif',
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Mobile +91"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    style={{
                      padding: '12px 14px',
                      background: T.surface2,
                      border: `1px solid ${T.hairline}`,
                      color: T.text,
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'Manrope, system-ui, sans-serif',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button
                    onClick={() => setBookingStep(1)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: T.softTint,
                      border: `1px solid ${T.hairline}`,
                      color: T.text,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setBookingStep(3)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: T.terra,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div>
                <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                  Payment Method
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  {[
                    { value: 'hold', label: 'Hold (No payment)', desc: 'Reserve now, pay at entry' },
                    { value: 'upi', label: 'UPI', desc: 'Instant payment via UPI' },
                    { value: 'card', label: 'Card', desc: 'Credit/Debit card' },
                  ].map((method) => (
                    <label
                      key={method.value}
                      style={{
                        padding: '12px 14px',
                        border: `1px solid ${formData.paymentMethod === method.value ? T.terra : T.hairline}`,
                        background: formData.paymentMethod === method.value ? T.accentTint : T.surface2,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === method.value}
                        onChange={() => setFormData({ ...formData, paymentMethod: method.value })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1 }}>{method.label}</div>
                        <div style={{ fontSize: '11px', color: T.creamDim, marginTop: '2px' }}>{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setBookingStep(2)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: T.softTint,
                      border: `1px solid ${T.hairline}`,
                      color: T.cream,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setBookingStep(4)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: T.terra,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Review →
                  </button>
                </div>
              </div>
            )}

            {bookingStep === 4 && (
              <div>
                <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                  Confirm Booking
                </h3>
                <div style={{ fontSize: '13px', color: T.creamDim, marginBottom: '24px', lineHeight: 1.7 }}>
                  <p style={{ margin: '6px 0' }}><strong>Guests:</strong> {formData.pax} {formData.pax === '1' ? 'person' : 'people'}</p>
                  <p style={{ margin: '6px 0' }}><strong>Name:</strong> {formData.name}</p>
                  <p style={{ margin: '6px 0' }}><strong>Email:</strong> {formData.email}</p>
                  <p style={{ margin: '6px 0' }}><strong>Mobile:</strong> {formData.mobile}</p>
                  <p style={{ margin: '6px 0' }}><strong>Payment:</strong> {formData.paymentMethod}</p>
                </div>
                <button
                  onClick={async () => {
                    const response = await fetch('/api/bookings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event_id: event.id,
                        ...formData,
                        pax: parseInt(formData.pax),
                      }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      window.location.href = `/event/${event.id}/confirmation?booking_id=${data.booking_id}`;
                    }
                  }}
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
                    marginBottom: '10px',
                    transition: 'background 0.2s',
                  }}
                >
                  Complete Booking
                </button>
                <button
                  onClick={() => setBookingStep(3)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: T.softTint,
                    border: `1px solid ${T.hairline}`,
                    color: T.cream,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* End of grid wrapper */}
      </div>

      {/* Bottom Back Button - Mobile Optimized */}
      <div
        style={{
          padding: '20px 32px 40px',
          background: T.isDark
            ? 'linear-gradient(180deg, rgba(12, 8, 5, 0) 0%, rgba(12, 8, 5, 0.7) 40%, rgba(12, 8, 5, 1) 100%)'
            : 'linear-gradient(180deg, rgba(243, 234, 217, 0) 0%, rgba(243, 234, 217, 0.7) 40%, rgba(243, 234, 217, 1) 100%)',
          borderTop: `1px solid ${T.hairline}`,
          marginTop: '48px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            background: T.softTint,
            border: `1px solid ${T.hairline}`,
            color: T.text,
            padding: '12px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.isDark ? 'rgba(241, 230, 211, 0.12)' : 'rgba(28, 19, 13, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = T.softTint}
        >
          ← Back to Events
        </button>
      </div>
    </div>
    </div>
  );
}
