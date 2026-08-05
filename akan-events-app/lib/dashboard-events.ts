import type { Event } from '@/lib/types';

export type DashboardTableType = {
  id: string;
  name: string;
  capacity: number;
  entry_fee: number;
  info?: string;
  visibility?: 'none' | 'hidden' | 'fast_filling' | 'sold_out';
  external_link?: string | null;
  contact_cta_enabled?: boolean;
};

export type DashboardPublicEvent = {
  id: string;
  slug: string | null;
  name: string;
  event_date: string;
  start_time: string | null;
  description: string | null;
  image_data: string | null;
  card_image?: string | null;
  one_line_summary?: string | null;
  genre: string | null;
  tags?: string[];
  category_slot?: 'day' | 'night' | null;
  category_label?: string | null;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    google_maps_url: string | null;
  } | null;
  artists?: Array<{
    id: string;
    name: string;
    about: string | null;
    social_url: string | null;
    image_data: string | null;
  }>;
  terms?: string | null;
  faqs?: string | null;
  refund_policy?: string | null;
  entry_enabled?: boolean;
  cover_enabled?: boolean;
  table_types?: DashboardTableType[];
  occupancy_rule?: 'exact' | 'min';
  access_mode?: 'public' | 'invite_link' | 'phone_list';
  invite_message?: string | null;
  status?: 'active' | 'archived' | 'sold-out';
  booking_open?: boolean;
  booking_status_label?: string;
  is_recurring?: boolean;
};

export type DashboardPublicEventResponse = {
  ok: boolean;
  event?: DashboardPublicEvent;
  paymentMode?: 'none' | 'deposit' | 'full_cover';
  paymentAmount?: number | null;
  coverRates?: {
    male_stag: number;
    female_stag: number;
    couple: number;
  };
  entryFeePerPerson?: number;
  venuePhone?: string;
  message?: string;
};

export type DashboardPublicEventListItem = {
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

export type DashboardPublicEventListResponse = {
  ok: boolean;
  events: DashboardPublicEventListItem[];
  total: number;
  message?: string;
};

function mapDashboardListItemToEvent(item: DashboardPublicEventListItem): Event {
  return {
    id: item.slug || item.id,
    dashboard_event_id: item.id,
    slug: item.slug || item.id,
    categorySlot: item.categorySlot,
    kind: item.categoryLabel || item.genre || 'Event',
    title: item.name,
    tagline: item.oneLineSummary || item.genre || 'Akan experience',
    date: formatDate(item.eventDate),
    time: formatTime(item.startTime),
    price: 'Reservation required',
    image: item.cardImage || '',
    hue: item.categorySlot === 'day' ? 'sunny' : item.categorySlot === 'night' ? 'crimson' : 'storm',
    featured: false,
    body: item.oneLineSummary || item.name,
    tags: item.tags || [],
    status: item.bookingOpen ? 'active' : 'archived',
    booking_open: item.bookingOpen,
    booking_status_label: item.bookingStatusLabel,
    is_recurring: item.isRecurring,
  };
}

export async function fetchDashboardEventList(limit = 24): Promise<Event[]> {
  const response = await fetch(`/api/dashboard/events/public-list?limit=${limit}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const payload = await response.json() as DashboardPublicEventListResponse;
  if (!payload.ok) return [];
  return payload.events.map(mapDashboardListItemToEvent);
}

function formatDate(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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

function priceLabel(input: DashboardPublicEventResponse): string {
  const event = input.event;
  const entry = Number(input.entryFeePerPerson || 0);
  const cover = input.coverRates;
  const tableTypes = event?.table_types || [];
  const minTable = tableTypes.reduce<number | null>((min, table) => {
    const value = Number(table.entry_fee || 0);
    if (value <= 0) return min;
    return min == null ? value : Math.min(min, value);
  }, null);

  if (input.paymentMode === 'deposit' && Number(input.paymentAmount || 0) > 0) {
    return `Deposit ₹${Number(input.paymentAmount).toLocaleString('en-IN')}`;
  }
  if (event?.entry_enabled && minTable != null) return `Tables from ₹${minTable.toLocaleString('en-IN')}`;
  if (event?.entry_enabled && entry > 0) return `Entry ₹${entry.toLocaleString('en-IN')}`;
  if (event?.cover_enabled && cover) {
    const male = Number(cover.male_stag || 0);
    const female = Number(cover.female_stag || 0);
    if (male || female) return `Cover ₹${male.toLocaleString('en-IN')} / ₹${female.toLocaleString('en-IN')}`;
  }
  return 'Reservation required';
}

export function mapDashboardEventToEvent(input: DashboardPublicEventResponse): Event | null {
  const event = input.event;
  if (!event) return null;

  const tableTypes = (event.table_types || []).filter((table) => table.visibility !== 'hidden');
  const ticketOptions = tableTypes.length > 0
    ? tableTypes.map((table) => Math.max(1, Number(table.capacity) || 1))
    : [1, 2, 4, 6];
  const entryFee = tableTypes.reduce<Record<number, number>>((acc, table) => {
    acc[Math.max(1, Number(table.capacity) || 1)] = Number(table.entry_fee || 0);
    return acc;
  }, {});
  if (Object.keys(entryFee).length === 0) {
    for (const option of ticketOptions) entryFee[option] = Number(input.entryFeePerPerson || 0) * option;
  }

  const artist = event.artists?.[0];
  const artistProfile = artist
    ? {
        name: artist.name,
        description: artist.about || 'Artist details will be announced soon.',
        vocalists: 1,
        members: event.artists?.length || 1,
        set_minutes: 90,
        image: artist.image_data || undefined,
        social_url: artist.social_url || undefined,
      }
    : undefined;

  return {
    id: event.slug || event.id,
    dashboard_event_id: event.id,
    slug: event.slug || event.id,
    kind: event.category_label || event.genre || (event.category_slot === 'day' ? 'Day Event' : 'Night Event'),
    title: event.name,
    tagline: event.one_line_summary || event.genre || 'Akan event experience',
    date: formatDate(event.event_date),
    time: formatTime(event.start_time),
    event_date: event.event_date,
    start_time: event.start_time || undefined,
    price: priceLabel(input),
    image: event.image_data || event.card_image || '',
    hue: event.category_slot === 'day' ? 'sunny' : 'crimson',
    featured: true,
    body: event.description || event.one_line_summary || 'Event details will be updated soon.',
    tags: event.tags || [],
    artist_profile: artistProfile,
    artists: event.artists || [],
    venue: event.venue || undefined,
    terms: event.terms || undefined,
    faqs: event.faqs || undefined,
    refund_policy: event.refund_policy || undefined,
    ticket_options: ticketOptions,
    table_types: tableTypes,
    entry_fee: entryFee,
    cover_charge_male: Number(input.coverRates?.male_stag || 0),
    cover_charge_female: Number(input.coverRates?.female_stag || 0),
    cover_charge_couple: Number(input.coverRates?.couple || 0),
    entry_enabled: event.entry_enabled !== false,
    cover_enabled: event.cover_enabled !== false,
    payment_mode: input.paymentMode || 'none',
    payment_enabled: input.paymentMode !== 'none',
    entry_payment_mandatory: input.paymentMode === 'deposit' || input.paymentMode === 'full_cover',
    access_mode: event.access_mode || 'public',
    invite_message: event.invite_message || undefined,
    capacity: 120,
    booked: 0,
    status: event.booking_open === false ? 'archived' : event.status || 'active',
    booking_open: event.booking_open !== false,
    booking_status_label: event.booking_status_label || (event.booking_open === false ? 'Bookings closed' : 'Bookings open'),
    is_recurring: event.is_recurring,
  };
}

export async function fetchDashboardEvent(slug: string): Promise<Event | null> {
  const response = await fetch(`/api/dashboard/events/by-slug/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!response.ok) return null;
  const payload = await response.json() as DashboardPublicEventResponse;
  if (!payload.ok) return null;
  return mapDashboardEventToEvent(payload);
}
