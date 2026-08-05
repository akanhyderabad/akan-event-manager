import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

type PublicEventListItem = {
  id: string;
  slug: string | null;
  name: string;
  eventDate: string;
  startTime: string | null;
  genre: string | null;
  cardImage: string | null;
  oneLineSummary: string | null;
  venueId: string | null;
  venueName: string | null;
  categorySlot: 'day' | 'night' | null;
  categoryLabel: string | null;
  tags: string[];
  bookingOpen: boolean;
  bookingStatusLabel: string;
  isRecurring: boolean;
};

type PublicEventListResponse = {
  ok: boolean;
  events?: PublicEventListItem[];
};

async function getPublicEvents(): Promise<PublicEventListItem[]> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'http';
  if (!host) return [];

  try {
    const res = await fetch(`${proto}://${host}/api/events/public-list?limit=48`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as PublicEventListResponse;
    return json.ok && Array.isArray(json.events) ? json.events : [];
  } catch {
    return [];
  }
}

function formatDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(time: string | null): string {
  if (!time) return 'Time TBA';
  const [hourRaw, minuteRaw = '00'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function splitEvents(events: PublicEventListItem[]) {
  return {
    day: events.filter((event) => event.categorySlot === 'day'),
    night: events.filter((event) => event.categorySlot === 'night'),
    featured: events.filter((event) => event.categorySlot !== 'day' && event.categorySlot !== 'night'),
  };
}

function sectionTitle(kind: 'day' | 'night' | 'featured'): string {
  if (kind === 'day') return 'Day Experiences';
  if (kind === 'night') return 'Night Events';
  return 'Featured Drops';
}

function sectionBody(kind: 'day' | 'night' | 'featured'): string {
  if (kind === 'day') return 'Brunches, workshops, and daylight formats currently live.';
  if (kind === 'night') return 'Live sets, club nights, and after-dark reservations open now.';
  return 'Special formats that do not sit neatly inside the day or night lanes.';
}

function EventCard({ event }: { event: PublicEventListItem }) {
  const href = event.slug ? `/event/${encodeURIComponent(event.slug)}` : null;
  const image = event.cardImage || '';
  const card = (
    <div
      style={{
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(241, 230, 211, 0.08)',
        background: 'rgba(24, 17, 11, 0.92)',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.22)',
        minHeight: '100%',
      }}
    >
      <div
        style={{
          aspectRatio: '1.18 / 1',
          background: image
            ? `linear-gradient(180deg, rgba(12, 8, 5, 0.06), rgba(12, 8, 5, 0.62)), url(${image}) center/cover`
            : 'linear-gradient(135deg, rgba(201, 108, 74, 0.24), rgba(55, 40, 28, 0.92))',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '999px',
            background: event.bookingOpen ? 'rgba(10, 104, 69, 0.82)' : 'rgba(92, 55, 37, 0.86)',
            color: '#fff',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          <span>{event.bookingStatusLabel}</span>
          {event.isRecurring ? <span style={{ opacity: 0.78 }}>Weekly</span> : null}
        </div>
      </div>

      <div style={{ padding: '20px 20px 22px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(241, 230, 211, 0.56)', fontWeight: 700 }}>
          {event.categoryLabel || event.genre || 'Akan Event'}
        </div>
        <h3
          style={{
            margin: '10px 0 0',
            color: '#f6ead8',
            fontSize: '28px',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontFamily: 'Georgia, serif',
          }}
        >
          {event.name}
        </h3>
        <p style={{ margin: '12px 0 0', color: 'rgba(241, 230, 211, 0.72)', fontSize: '15px', lineHeight: 1.6 }}>
          {event.oneLineSummary || event.genre || 'Reservations are open for this Akan experience.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
          <InfoPill label="Date" value={formatDate(event.eventDate)} />
          <InfoPill label="Time" value={formatTime(event.startTime)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          <div style={{ color: 'rgba(241, 230, 211, 0.56)', fontSize: '13px' }}>
            {event.venueName || 'Akan Hyderabad'}
          </div>
          <div style={{ color: '#d88a68', fontSize: '14px', fontWeight: 700 }}>
            {href ? (event.bookingOpen ? 'View event →' : 'View details →') : 'Slug missing'}
          </div>
        </div>
      </div>
    </div>
  );

  if (!href) return card;
  return <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(241, 230, 211, 0.08)',
        background: 'rgba(241, 230, 211, 0.04)',
        padding: '12px 14px',
      }}
    >
      <div style={{ color: 'rgba(241, 230, 211, 0.48)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ color: '#f6ead8', fontSize: '14px', marginTop: '6px', lineHeight: 1.4 }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        borderRadius: '24px',
        border: '1px solid rgba(241, 230, 211, 0.08)',
        background: 'rgba(24, 17, 11, 0.72)',
        padding: '36px 28px',
        color: 'rgba(241, 230, 211, 0.78)',
      }}
    >
      <div style={{ color: '#f6ead8', fontSize: '24px', lineHeight: 1.1, fontFamily: 'Georgia, serif' }}>{title}</div>
      <p style={{ margin: '10px 0 0', fontSize: '15px', lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

export default async function RootPage() {
  const events = await getPublicEvents();
  const { day, night, featured } = splitEvents(events);
  const sections: Array<{ kind: 'day' | 'night' | 'featured'; events: PublicEventListItem[] }> = [
    { kind: 'day', events: day },
    { kind: 'night', events: night },
    { kind: 'featured', events: featured },
  ];

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(201, 108, 74, 0.24), transparent 30%), linear-gradient(180deg, #100b07 0%, #17100b 40%, #0d0906 100%)',
        color: '#f6ead8',
      }}
    >
      <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '24px 20px 80px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 0 20px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(241, 230, 211, 0.58)', fontWeight: 700 }}>
              Akan Hyderabad
            </div>
            <div style={{ fontSize: '18px', marginTop: '6px', color: '#f6ead8', fontWeight: 600 }}>
              Events and reservations
            </div>
          </div>
          <Link
            href="/admin"
            style={{
              textDecoration: 'none',
              color: '#1c130d',
              background: '#f1e6d3',
              padding: '12px 18px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Admin dashboard
          </Link>
        </header>

        <section style={{ padding: '40px 0 30px' }}>
          <div style={{ maxWidth: '760px' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d88a68', fontWeight: 700 }}>
              Live calendar
            </div>
            <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(44px, 7vw, 84px)', lineHeight: 0.96, letterSpacing: '-0.05em', fontFamily: 'Georgia, serif' }}>
              Reserve the next Akan experience.
            </h1>
            <p style={{ margin: '18px 0 0', fontSize: '18px', lineHeight: 1.7, color: 'rgba(241, 230, 211, 0.72)' }}>
              Browse live day events, night events, and special drops. Every card below is served from the production event catalog, including booking-open state and weekly recurrence projection.
            </p>
          </div>
        </section>

        {events.length === 0 ? (
          <EmptyState
            title="No live events right now"
            body="The root landing is active, but there are no public live events in the catalog at the moment. As soon as events are published, they will appear here automatically."
          />
        ) : (
          <div style={{ display: 'grid', gap: '48px' }}>
            {sections.map((section) => (
              section.events.length > 0 ? (
                <section key={section.kind}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d88a68', fontWeight: 700 }}>
                      {sectionTitle(section.kind)}
                    </div>
                    <p style={{ margin: '10px 0 0', color: 'rgba(241, 230, 211, 0.68)', fontSize: '15px', lineHeight: 1.6 }}>
                      {sectionBody(section.kind)}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '22px',
                    }}
                  >
                    {section.events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ) : null
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
