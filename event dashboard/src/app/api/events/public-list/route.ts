import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { projectPublicEventLifecycle } from '@/lib/public-event-lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublicEventListItem {
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
}

type Row = {
  id: string;
  slug: string | null;
  name: string;
  event_date: string;
  start_time: string | null;
  recurrence_mode: 'none' | 'weekly' | null;
  recurrence_until: string | null;
  genre: string | null;
  card_image: string | null;
  image_data: string | null;
  one_line_summary: string | null;
  venue_id: string | null;
  venue_name: string | null;
  category_slot: 'day' | 'night' | null;
  category_label: string | null;
  tags: string | null;
};

function isYmd(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fromParam = (url.searchParams.get('from') || '').trim();
  const toParam = (url.searchParams.get('to') || '').trim();
  const genreParam = (url.searchParams.get('genre') || '').trim();
  const qParam = (url.searchParams.get('q') || '').trim();
  const limitParam = Number(url.searchParams.get('limit') || '24');

  const from = fromParam && isYmd(fromParam) ? fromParam : null;
  const to = toParam && isYmd(toParam) ? toParam : null;
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitParam) ? Math.floor(limitParam) : 24));

  const where: string[] = ["e.status = 'live'", 'e.is_public = 1'];
  const params: unknown[] = [];

  if (genreParam) {
    where.push('e.genre = ?');
    params.push(genreParam);
  }
  if (qParam) {
    where.push('(LOWER(e.name) LIKE ? OR LOWER(IFNULL(e.one_line_summary, \'\')) LIKE ?)');
    const needle = `%${qParam.toLowerCase()}%`;
    params.push(needle, needle);
  }

  const db = getDb();
  const sql = `
    SELECT
      e.id, e.slug, e.name, e.event_date, e.start_time, e.recurrence_mode, e.recurrence_until, e.genre,
      e.card_image, e.image_data, e.one_line_summary, e.venue_id, e.category_slot, e.category_label, e.tags,
      v.name AS venue_name
    FROM events e
    LEFT JOIN venues v ON v.id = e.venue_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.event_date ASC, e.start_time ASC, e.created_at ASC
  `;
  const rows = db.prepare(sql).all(...params) as Row[];

  const events: PublicEventListItem[] = rows
    .map((row) => {
      const tags = parseTags(row.tags);
      const lifecycle = projectPublicEventLifecycle({
        name: row.name,
        eventDate: row.event_date,
        startTime: row.start_time,
        recurrenceMode: row.recurrence_mode,
        recurrenceUntil: row.recurrence_until,
        categorySlot: row.category_slot,
        categoryLabel: row.category_label,
        genre: row.genre,
        tags,
        status: 'live',
      });
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        eventDate: lifecycle.effectiveEventDate,
        startTime: lifecycle.effectiveStartTime,
        genre: row.genre,
        cardImage: row.card_image || row.image_data || null,
        oneLineSummary: row.one_line_summary,
        venueId: row.venue_id,
        venueName: row.venue_name,
        categorySlot: row.category_slot,
        categoryLabel: row.category_label,
        tags,
        bookingOpen: lifecycle.bookingOpen,
        bookingStatusLabel: lifecycle.bookingStatusLabel,
        isRecurring: lifecycle.isRecurring,
        listingVisible: lifecycle.listingVisible,
      };
    })
    .filter((event) => event.listingVisible)
    .filter((event) => (!from || event.eventDate >= from) && (!to || event.eventDate <= to))
    .sort((a, b) => {
      const dateCompare = a.eventDate.localeCompare(b.eventDate);
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '').localeCompare(b.startTime || '');
    })
    .slice(0, limit)
    .map(({ listingVisible: _listingVisible, ...event }) => event);

  const res = NextResponse.json({ ok: true, events, total: events.length });
  res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  return res;
}
