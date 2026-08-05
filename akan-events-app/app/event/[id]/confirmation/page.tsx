'use client';

import { THEMES } from '@/lib/theme';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get('booking_id');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const T = THEMES[theme];

  return (
    <div
      style={{
        backgroundColor: T.bg,
        color: T.cream,
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px 40px',
          background: T.isDark ? 'rgba(26,13,8,0.6)' : 'rgba(248,243,236,0.7)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${T.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <a href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '24px', fontStyle: 'italic', textDecoration: 'none', color: T.cream }}>
          akan
        </a>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            background: T.softTint,
            border: `1px solid ${T.hairline}`,
            color: T.cream,
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* Content */}
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: T.surface,
          border: `1px solid ${T.hairline}`,
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          marginTop: '80px',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            fontSize: '64px',
            marginBottom: '24px',
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 500,
            margin: '0 0 12px',
            fontFamily: 'Fraunces, serif',
          }}
        >
          Booking Confirmed!
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: T.creamDim,
            margin: '0 0 32px',
            lineHeight: '1.6',
          }}
        >
          Thank you for your reservation. A confirmation email has been sent to your inbox with all the details.
        </p>

        {/* Booking Reference */}
        {bookingId && (
          <div
            style={{
              background: T.softTint,
              border: `1px solid ${T.hairline}`,
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '32px',
            }}
          >
            <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Booking Reference
            </div>
            <div style={{ fontSize: '20px', fontWeight: 500, fontFamily: 'monospace' }}>
              {bookingId}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
          }}
        >
          <a
            href="/"
            style={{
              padding: '12px 24px',
              background: T.terra,
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-block',
            }}
          >
            Back to Home
          </a>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px',
              background: T.softTint,
              border: `1px solid ${T.hairline}`,
              color: T.cream,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );
}
