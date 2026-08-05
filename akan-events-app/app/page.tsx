'use client';

import { eventsData } from '@/lib/constants';
import { fetchDashboardEventList } from '@/lib/dashboard-events';
import { THEMES } from '@/lib/theme';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

// Filter Pills Component
function FilterPills({ 
  filter, 
  setFilter, 
  options, 
  isDark 
}: { 
  filter: string;
  setFilter: (id: string) => void;
  options: Array<{ id: string; label: string; count: number }>;
  isDark: boolean;
}) {
  return (
    <div className="filter-row" style={{ marginTop: '28px' }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => setFilter(o.id)}
          style={{
            appearance: 'none',
            border: `1px solid ${isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
            background: filter === o.id ? (isDark ? '#c96c4a' : '#1c130d') : 'transparent',
            color: filter === o.id ? '#fff' : (isDark ? '#f1e6d3' : '#1c130d'),
            padding: '9px 16px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.01em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'Manrope, system-ui, sans-serif',
          }}
          onMouseEnter={(e) => {
            if (filter !== o.id) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#f1e6d3' : '#1c130d';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)';
          }}
        >
          {o.label}
          <span style={{
            fontSize: '11px',
            color: filter === o.id ? 'rgba(255, 255, 255, 0.7)' : (isDark ? 'rgba(241, 230, 211, 0.38)' : 'rgba(28, 19, 13, 0.42)'),
            fontWeight: 500,
          }}>
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function EmptyEventState({
  title,
  body,
  isDark,
}: {
  title: string;
  body: string;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        minHeight: '280px',
        borderRadius: '18px',
        border: `1px solid ${isDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
        background: isDark
          ? 'linear-gradient(135deg, rgba(201, 108, 74, 0.12), rgba(255,255,255,0.02))'
          : 'linear-gradient(135deg, rgba(201, 108, 74, 0.08), rgba(255,255,255,0.6))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '520px' }}>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: isDark ? '#c96c4a' : '#9f4e31',
            marginBottom: '14px',
          }}
        >
          Nothing live yet
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 'clamp(28px, 3vw, 38px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            color: isDark ? '#f1e6d3' : '#1c130d',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '14px',
            lineHeight: 1.6,
            color: isDark ? 'rgba(241, 230, 211, 0.68)' : 'rgba(28, 19, 13, 0.68)',
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerIsDark, setHeaderIsDark] = useState(false);
  const [dayFilter, setDayFilter] = useState('all');
  const [nightFilter, setNightFilter] = useState('all');
  const [seasonalFilter, setSeasonalFilter] = useState('all');
  const [dashboardEvents, setDashboardEvents] = useState<any[] | null>(null);
  const [dashboardError, setDashboardError] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const dayRef = useRef<HTMLDivElement>(null);
  const nightRef = useRef<HTMLDivElement>(null);
  const T = THEMES[theme];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intersection Observer for header color change
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.id === 'by-day') {
              setHeaderIsDark(false);
            } else if (entry.target.id === 'by-night' || entry.target.id === 'seasonal') {
              setHeaderIsDark(true);
            }
          }
        });
      },
      { threshold: 0.05 }
    );

    if (dayRef.current) observer.observe(dayRef.current);
    if (nightRef.current) observer.observe(nightRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardEventList(60)
      .then((events) => {
        if (!cancelled) {
          setDashboardEvents(events);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDashboardError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const useFallbackEvents = dashboardError;
  const dayEvents = dashboardEvents
    ? dashboardEvents.filter((event) => event.categorySlot === 'day')
    : useFallbackEvents
      ? eventsData.day
      : [];
  const nightEvents = dashboardEvents
    ? dashboardEvents.filter((event) => event.categorySlot === 'night')
    : useFallbackEvents
      ? eventsData.night
      : [];
  const seasonalEvents = dashboardEvents
    ? dashboardEvents.filter((event) => event.categorySlot !== 'day' && event.categorySlot !== 'night')
    : useFallbackEvents
      ? eventsData.seasonal || []
      : [];

  const scrollToSection = (selector: string) => {
    const element = document.getElementById(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  // Filter options
  const dayFilterOptions = [
    { id: 'all', label: 'All', count: dayEvents.length },
    { id: 'Sunday Brunch', label: 'Sunday Brunch', count: dayEvents.filter((e) => e.kind === 'Sunday Brunch').length },
    { id: 'Workshop', label: 'Workshops', count: dayEvents.filter((e) => e.kind === 'Workshop').length },
  ];

  const nightFilterOptions = [
    { id: 'all', label: 'All', count: nightEvents.length },
    { id: 'Live Band', label: 'Live Bands', count: nightEvents.filter((e) => e.kind === 'Live Band' || e.kind === 'Live Music').length },
    { id: 'DJ Night', label: 'DJ Nights', count: nightEvents.filter((e) => e.kind === 'DJ Night').length },
  ];

  const seasonalFilterOptions = [
    { id: 'all', label: 'All', count: seasonalEvents.length },
    { id: 'Festival', label: 'Festivals', count: seasonalEvents.filter((e) => e.kind === 'Festival').length },
  ];

  // Filtered events
  const filteredDay = dayFilter === 'all' 
    ? dayEvents
    : dayEvents.filter((e) => e.kind === dayFilter);

  const filteredNight = nightFilter === 'all'
    ? nightEvents
    : nightFilter === 'Live Band'
    ? nightEvents.filter((e) => e.kind === 'Live Band' || e.kind === 'Live Music')
    : nightEvents.filter((e) => e.kind === nightFilter);

  const filteredSeasonal = seasonalFilter === 'all'
    ? seasonalEvents
    : seasonalEvents.filter((e) => e.kind === seasonalFilter);

  const showSeasonalSection = seasonalEvents.length > 0;
  const bookingCtaLabel = (event: { booking_open?: boolean; booking_status_label?: string }) =>
    event.booking_open === false ? (event.booking_status_label || 'Bookings closed') : 'Reserve →';

  return (
    <div
      style={{
        backgroundColor: T.bg,
        color: T.cream,
        fontFamily: 'Manrope, system-ui, sans-serif',
        minHeight: '100vh',
        overflow: 'visible',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: '70px',
          background: headerIsDark 
            ? (scrolled ? 'rgba(12, 8, 5, 0.8)' : 'rgba(12, 8, 5, 0.7)')
            : (scrolled ? 'rgba(243, 234, 217, 0.88)' : 'rgba(243, 234, 217, 1)'),
          backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
          borderBottom: scrolled ? `1px solid ${headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}` : 'none',
          transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease',
          overflow: 'visible',
          color: headerIsDark ? '#f1e6d3' : '#1c130d',
          width: '100%',
        }}
      >
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0 clamp(16px, 5vw, 32px)',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
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
              height: 'clamp(72px, 14vw, 100px)',
              width: 'auto',
            }}
          />

          {/* Desktop Nav */}
          <nav className="site-nav" style={{ fontSize: '14px', fontWeight: 500, color: 'inherit', height: '70px' }}>
            <a href="https://akanhyd.com/explore/" style={{ color: 'inherit', textDecoration: 'none' }}>Explore</a>
            <a href="https://akanhyd.com/menu/" style={{ color: 'inherit', textDecoration: 'none' }}>Menu</a>
            <a href="#events" style={{ color: headerIsDark ? '#c96c4a' : '#c96c4a', textDecoration: 'none' }}>Events</a>
            <a href="https://akanhyd.com/" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
          </nav>

          {/* Header Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '70px' }}>
          <a href="https://widget.reservego.co/reserveOutlets/659bd2c91a33ffb38833af30?source=4" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'inherit',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 14px',
            border: `1px solid ${headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
            borderRadius: '999px',
            background: headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
            whiteSpace: 'nowrap',
          }}>
            Reserve →
          </a>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            style={{
              background: headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
              border: `1px solid ${headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
              color: 'inherit',
              padding: '8px 12px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="site-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            style={{
              width: 38,
              height: 38,
              borderRadius: '999px',
              border: `1px solid ${headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
              background: headerIsDark ? 'rgba(241, 230, 211, 0.08)' : 'rgba(28, 19, 13, 0.04)',
              color: 'inherit',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {menuOpen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 'clamp(16px, 5vw, 32px)',
              marginTop: 8,
              zIndex: 2,
              minWidth: 180,
              background: headerIsDark ? 'rgba(18,11,7,0.97)' : 'rgba(243,234,217,0.98)',
              border: `1px solid ${headerIsDark ? 'rgba(241, 230, 211, 0.14)' : 'rgba(28, 19, 13, 0.12)'}`,
              borderRadius: 14,
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {[
                { label: 'Explore', href: 'https://akanhyd.com/explore/', ext: true },
                { label: 'Menu', href: 'https://akanhyd.com/menu/', ext: true },
                { label: 'Events', href: '#events', ext: false },
                { label: 'About', href: 'https://akanhyd.com/', ext: true },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...(link.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={() => setMenuOpen(false)}
                  style={{ padding: '11px 14px', borderRadius: 9, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </>
        )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="top"
        style={{
          backgroundColor: '#f3ead9',
          color: '#1c130d',
          width: '100%',
        }}
      >
        <div style={{
          padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 32px)',
          textAlign: 'center',
          maxWidth: '1320px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          fontWeight: 600,
          padding: '7px 14px',
          background: 'rgba(243, 234, 217, 0.5)',
          border: '1px solid rgba(28, 19, 13, 0.12)',
          borderRadius: '999px',
          color: '#1c130d',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          boxShadow: '0 8px 24px -10px rgba(28, 19, 13, 0.2)',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#c96c4a',
          }}/>
          Events at Akan · Summer 2026
        </div>
        <h1
          style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 'clamp(48px, 7vw, 88px)',
            fontWeight: 400,
            margin: '18px 0 0',
            letterSpacing: '-0.022em',
            lineHeight: 0.98,
            maxWidth: '900px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textWrap: 'balance',
          }}
        >
          Embrace{' '}
          <span style={{ color: '#c96c4a', fontStyle: 'italic' }}>the delightful</span>
          <span style={{ color: '#1c130d' }}>,</span>
          <br />
          morning{' '}
          <span style={{ fontSize: '0.85em', fontStyle: 'italic', color: 'rgba(28, 19, 13, 0.68)' }}>&</span>
          {' '}midnight.
        </h1>
        <p style={{ fontSize: 'clamp(16px, 1.1vw, 18px)', color: 'rgba(28, 19, 13, 0.68)', maxWidth: '640px', margin: '24px auto', lineHeight: 1.55 }}>
          Slow brunches and hands-on workshops by day. Live bands and DJ sets by night.
        </p>

        {/* CTA Buttons - Glass Effect */}
        <div className="daynight-toggle" style={{ padding: '6px', background: 'rgba(243, 234, 217, 0.5)', border: '1px solid rgba(28, 19, 13, 0.12)', backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)', boxShadow: '0 12px 30px -20px rgba(28, 19, 13, 0.3)', marginTop: '28px' }}>
          <button
            onClick={() => scrollToSection('by-day')}
            style={{
              padding: '12px 22px 12px 18px',
              background: 'transparent',
              color: '#1c130d',
              border: 'none',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(243, 234, 217, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffeacb 0%, #f0a86a 60%, #c66a3e 100%)', flexShrink: 0 }}/>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '19px', letterSpacing: '-0.005em', lineHeight: 1 }}>By Day</div>
              <div style={{ fontSize: '12px', color: 'rgba(28, 19, 13, 0.68)', letterSpacing: '0.005em' }}>Brunch & workshops</div>
            </div>
          </button>
          <div className="daynight-divider" style={{ width: '1px', height: '28px', background: 'rgba(28, 19, 13, 0.12)', flexShrink: 0 }}/>
          <button
            onClick={() => scrollToSection('by-night')}
            style={{
              padding: '12px 22px 12px 18px',
              background: 'transparent',
              color: '#1c130d',
              border: 'none',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(243, 234, 217, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(201, 108, 74, 0.9) 0%, #c96c4a 50%, #0c0805 100%)', boxShadow: '0 0 8px rgba(201, 108, 74, 0.4)', flexShrink: 0 }}/>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '19px', letterSpacing: '-0.005em', lineHeight: 1 }}>By Night</div>
              <div style={{ fontSize: '12px', color: 'rgba(28, 19, 13, 0.68)', letterSpacing: '0.005em' }}>Live music & late nights</div>
            </div>
          </button>
        </div>
        </div>
      </section>

      {/* Day Events Section */}
      <section 
        id="by-day"
        ref={dayRef}
        style={{ 
          backgroundColor: '#f3ead9',
          color: '#1c130d',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '1320px', margin: '0 auto', padding: 'clamp(48px, 5.5vw, 80px) clamp(16px, 5vw, 32px)' }}>
        <div style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(28, 19, 13, 0.68)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px', fontWeight: 700 }}>
            ☀️ DAY EVENTS
          </div>
          <h2
            style={{
              fontFamily: 'Instrument Serif, Georgia, serif',
              fontSize: 'clamp(34px, 4.5vw, 58px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.02,
              color: '#1c130d',
            }}
          >
            Brunches <em style={{ color: '#c96c4a', fontStyle: 'italic' }}>& Workshops</em>
          </h2>
          <FilterPills 
            filter={dayFilter} 
            setFilter={setDayFilter} 
            options={dayFilterOptions} 
            isDark={false}
          />
        </div>
        <div className="events-grid">
          {filteredDay.length > 0 ? filteredDay.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <div
                style={{
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Image - Instagram post size (4:5 aspect ratio) */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    backgroundImage: `url(${event.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    marginBottom: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {event.note && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        background: '#faf5ea',
                        color: '#1c130d',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                      }}
                    >
                      {event.note}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '0 4px' }}>
                  <div style={{ fontSize: '11px', color: '#c96c4a', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                    {event.kind}
                  </div>
                  <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', margin: '6px 0 4px', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#1c130d' }}>
                    {event.title}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'rgba(28, 19, 13, 0.68)', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {event.tagline}
                  </p>
                  <div style={{ fontSize: '12.5px', color: 'rgba(28, 19, 13, 0.42)', display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <span>{event.date}</span>
                    <span style={{ color: 'rgba(28, 19, 13, 0.42)', opacity: 0.6 }}>·</span>
                    <span>{event.time}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(28, 19, 13, 0.12)',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'rgba(28, 19, 13, 0.42)', fontWeight: 600 }}>{event.price}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: event.booking_open === false ? 'rgba(28, 19, 13, 0.42)' : '#c96c4a' }}>{bookingCtaLabel(event)}</span>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <EmptyEventState
              title="No day events are live right now"
              body="Brunches, workshops, and daytime formats will appear here as soon as they are published. Check back shortly for the next drop."
              isDark={false}
            />
          )}
        </div>
        </div>
      </section>

      {/* Golden Hour Divider */}
      <div
        style={{
          width: '100%',
          height: '84px',
          background: 'linear-gradient(180deg, #f3ead9 0%, #f0c688 22%, #d8814f 45%, #803a23 70%, #1a0e08 92%, #0c0805 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10.5px',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: '#f1e6d3',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ marginRight: '14px' }}>17:42</span>
        <span style={{ width: '24px', height: '1px', background: '#f1e6d3', opacity: 0.5, margin: '0 14px' }} />
        <span style={{ margin: '0 14px', fontSize: '10.5px' }}>as the light goes soft</span>
        <span style={{ width: '24px', height: '1px', background: '#f1e6d3', opacity: 0.5, margin: '0 14px' }} />
        <span style={{ marginLeft: '14px' }}>19:08</span>
      </div>

      {/* Night Events Section */}
      <section 
        id="by-night"
        ref={nightRef}
        style={{ 
          padding: 'clamp(48px, 5.5vw, 80px) clamp(16px, 5vw, 32px)', 
          backgroundColor: '#0c0805',
          backgroundImage: 'radial-gradient(ellipse 800px at 50% 0%, rgba(201, 108, 74, 0.35) 0%, transparent 60%), radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '100% auto, 3px 3px',
          backgroundAttachment: 'fixed',
          borderBottom: '1px solid rgba(241, 230, 211, 0.14)',
          maxWidth: '100%',
          margin: '0 auto',
          color: '#f1e6d3',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
            <div style={{ fontSize: '11px', color: 'rgba(241, 230, 211, 0.62)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px', fontWeight: 700 }}>
              🌙 NIGHT EVENTS
            </div>
            <h2
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 'clamp(34px, 4.5vw, 58px)',
                fontWeight: 400,
                margin: 0,
                letterSpacing: '-0.018em',
                lineHeight: 1.02,
                color: '#f1e6d3',
              }}
            >
              Live Music <em style={{ color: '#c96c4a', fontStyle: 'italic' }}>& DJ Nights</em>
            </h2>
            <FilterPills 
              filter={nightFilter} 
              setFilter={setNightFilter} 
              options={nightFilterOptions} 
              isDark={true}
            />
          </div>
          <div className="events-grid">
          {filteredNight.length > 0 ? filteredNight.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <div
                style={{
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Image - Instagram post size (4:5 aspect ratio) */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    backgroundImage: `url(${event.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    marginBottom: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {event.note && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        background: '#c96c4a',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                      }}
                    >
                      {event.note}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '0 4px' }}>
                  <div style={{ fontSize: '11px', color: '#c96c4a', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                    {event.kind}
                  </div>
                  <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', margin: '6px 0 4px', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#f1e6d3' }}>
                    {event.title}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'rgba(241, 230, 211, 0.62)', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {event.tagline}
                  </p>
                  <div style={{ fontSize: '12.5px', color: 'rgba(241, 230, 211, 0.38)', display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <span>{event.date}</span>
                    <span style={{ color: 'rgba(241, 230, 211, 0.38)', opacity: 0.6 }}>·</span>
                    <span>{event.time}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: `1px solid ${T.hairline}`,
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'rgba(241, 230, 211, 0.38)', fontWeight: 600 }}>{event.price}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: event.booking_open === false ? 'rgba(241, 230, 211, 0.38)' : '#c96c4a' }}>{bookingCtaLabel(event)}</span>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <EmptyEventState
              title="No night events are live right now"
              body="Live sets, DJ nights, and after-dark lineups will land here once the next event is published."
              isDark={true}
            />
          )}
          </div>
        </div>
      </section>

      {/* Seasonal Events Section */}
      {showSeasonalSection && <section id="seasonal" style={{ backgroundColor: T.bg, width: '100%', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto', padding: 'clamp(44px, 6vw, 64px) clamp(16px, 5vw, 32px)' }}>
        <div style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px', fontWeight: 700 }}>
            🎭 SEASONAL SPECIALS
          </div>
          <h2
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 'clamp(34px, 4.5vw, 58px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.02,
            }}
          >
            Limited Time <em style={{ color: T.terra, fontStyle: 'italic' }}>Experiences</em>
          </h2>
          <FilterPills 
            filter={seasonalFilter} 
            setFilter={setSeasonalFilter} 
            options={seasonalFilterOptions} 
            isDark={T.isDark}
          />
        </div>
        <div className="events-grid">
          {filteredSeasonal.length > 0 ? filteredSeasonal.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <div
                style={{
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Image - Instagram post size (4:5 aspect ratio) */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    backgroundImage: `url(${event.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    marginBottom: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {event.note && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        background: T.terra,
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                      }}
                    >
                      {event.note}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '0 4px' }}>
                  <div style={{ fontSize: '11px', color: T.terra, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                    {event.kind}
                  </div>
                  <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', margin: '6px 0 4px', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                    {event.title}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: T.creamDim, margin: '0 0 10px', lineHeight: 1.4 }}>
                    {event.tagline}
                  </p>
                  <div style={{ fontSize: '12.5px', color: T.muted, display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <span>{event.date}</span>
                    <span style={{ color: T.muted, opacity: 0.6 }}>·</span>
                    <span>{event.time}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: `1px solid ${T.hairline}`,
                    }}
                  >
                    <span style={{ fontSize: '12px', color: T.muted, fontWeight: 600 }}>{event.price}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: event.booking_open === false ? T.muted : T.terra }}>{bookingCtaLabel(event)}</span>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <EmptyEventState
              title="No seasonal specials match this filter"
              body="Seasonal specials are only shown when those limited-run events are actually posted."
              isDark={T.isDark}
            />
          )}
        </div>
        </div>
      </section>}

      {/* Footer */}
      <footer
        id="reserve"
        style={{
          background: T.surface,
          padding: 'clamp(40px, 8vw, 72px) clamp(16px, 5vw, 32px)',
          borderTop: `1px solid ${T.hairline}`,
        }}
      >
        {/* Reservation Section */}
        <div
          style={{
            maxWidth: '1320px',
            margin: '0 auto',
            paddingBottom: 'clamp(40px, 6vw, 60px)',
            borderBottom: `1px solid ${T.hairline}`,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(32px, 5vw, 60px)', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px', fontWeight: 700 }}>
                Reservations
              </div>
              <h2
                style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  fontWeight: 400,
                  margin: '0 0 20px',
                  letterSpacing: '-0.018em',
                  lineHeight: 1.1,
                }}
              >
                Come for the <span style={{ fontStyle: 'italic', color: T.terra }}>brunch</span>.{' '}
                <br />
                Stay for the <span style={{ fontStyle: 'italic', color: T.terra }}>band</span>.
              </h2>
              <a
                href="https://widget.reservego.co/reserveOutlets/659bd2c91a33ffb38833af30?source=4"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 28px',
                  background: T.terra,
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginTop: '24px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = T.terraDark;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = T.terra;
                }}
              >
                Reserve a table →
              </a>
              <div style={{ fontSize: '13px', color: T.creamDim, marginTop: '16px' }}>
                or call <strong style={{ color: T.cream }}>+91 9649 65 2222</strong>
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px 32px', fontSize: '13px', lineHeight: 1.8 }}>
              <div>
                <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 700 }}>
                  Find us
                </div>
                <div style={{ color: T.creamDim }}>
                  Opp. Durgam Cheruvu<br />
                  Madhapur, Hyderabad — 500081
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 700 }}>
                  Hours
                </div>
                <div style={{ color: T.creamDim }}>
                  Sun — Thu &nbsp; 12:00 — 24:00<br />
                  Fri — Sat &nbsp; 12:00 — 01:00
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 700 }}>
                  Enquiries
                </div>
                <div style={{ color: T.creamDim }}>
                  <a href="mailto:sales@akanhyd.com" style={{ color: T.terra, textDecoration: 'none' }}>sales@akanhyd.com</a><br />
                  Private events & corporate
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: T.terra, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 700 }}>
                  Follow
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a href="https://instagram.com/akan.hyd" target="_blank" rel="noopener noreferrer" style={{ color: T.terra, textDecoration: 'none', fontWeight: 500 }}>Instagram</a>
                  <a href="https://facebook.com/akanhyd" target="_blank" rel="noopener noreferrer" style={{ color: T.terra, textDecoration: 'none', fontWeight: 500 }}>Facebook</a>
                  <a href="https://youtube.com/@akanhyderabad" target="_blank" rel="noopener noreferrer" style={{ color: T.terra, textDecoration: 'none', fontWeight: 500 }}>YouTube</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Base */}
        <div
          style={{
            maxWidth: '1320px',
            margin: '0 auto',
            paddingTop: 'clamp(24px, 3vw, 32px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '12px',
            color: T.muted,
          }}
        >
          <span>© 2026 NVR Hotels & Caterers Pvt Ltd</span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="https://akanhyd.com/terms-of-service/" target="_blank" rel="noopener noreferrer" style={{ color: T.creamDim, textDecoration: 'none' }}>Terms</a>
            <a href="https://akanhyd.com/privacy-statement/" target="_blank" rel="noopener noreferrer" style={{ color: T.creamDim, textDecoration: 'none' }}>Privacy</a>
            <a href="https://akanhyd.com/refund-policy/" target="_blank" rel="noopener noreferrer" style={{ color: T.creamDim, textDecoration: 'none' }}>Refunds</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
