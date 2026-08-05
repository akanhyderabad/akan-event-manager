const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface PublicEventLifecycleInput {
  name: string;
  eventDate: string;
  startTime: string | null;
  recurrenceMode?: 'none' | 'weekly' | null;
  recurrenceUntil?: string | null;
  categorySlot?: 'day' | 'night' | null;
  categoryLabel?: string | null;
  genre?: string | null;
  tags?: string[];
  status?: string | null;
}

export interface PublicEventLifecycle {
  effectiveEventDate: string;
  effectiveStartTime: string | null;
  eventStartMs: number | null;
  bookingOpen: boolean;
  bookingStatusLabel: string;
  listingVisible: boolean;
  isRecurring: boolean;
}

export function projectPublicEventLifecycle(
  input: PublicEventLifecycleInput,
  now = Date.now(),
): PublicEventLifecycle {
  const originalStartMs = eventStartIstMs(input.eventDate, input.startTime);
  const isRecurring = isRecurringWeekly(input);

  if (isRecurring && originalStartMs != null) {
    const nextStartMs = nextWeeklyOccurrence(originalStartMs, now);
    const nextDate = ymdFromIstMs(nextStartMs);
    const allowedThrough = input.recurrenceUntil && isYmd(input.recurrenceUntil) ? input.recurrenceUntil : null;
    const withinWindow = !allowedThrough || nextDate <= allowedThrough;
    return {
      effectiveEventDate: nextDate,
      effectiveStartTime: input.startTime,
      eventStartMs: nextStartMs,
      bookingOpen: input.status !== 'closed' && withinWindow && nextStartMs > now,
      bookingStatusLabel: input.status === 'closed' || !withinWindow ? 'Bookings closed' : 'Bookings open',
      listingVisible: input.status !== 'closed' && withinWindow,
      isRecurring: true,
    };
  }

  const bookingOpen = input.status !== 'closed' && !!(originalStartMs && originalStartMs > now);
  return {
    effectiveEventDate: input.eventDate,
    effectiveStartTime: input.startTime,
    eventStartMs: originalStartMs,
    bookingOpen,
    bookingStatusLabel: bookingOpen ? 'Bookings open' : 'Bookings closed',
    listingVisible: input.status !== 'closed' && isVisibleUntilFollowingMonday(input.eventDate, now),
    isRecurring: false,
  };
}

export function eventStartIstMs(eventDate: string, startTime: string | null): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate || '');
  if (!dateMatch) return null;
  const [, y, m, d] = dateMatch;
  let hh = 0;
  let mm = 0;
  if (startTime) {
    const tm = /^(\d{2}):(\d{2})/.exec(startTime);
    if (tm) {
      hh = Number(tm[1]);
      mm = Number(tm[2]);
    }
  }
  const asIfUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), hh, mm, 0);
  return asIfUtc - IST_OFFSET_MS;
}

function nextWeeklyOccurrence(startMs: number, now: number): number {
  if (startMs > now) return startMs;
  const weeksElapsed = Math.floor((now - startMs) / WEEK_MS) + 1;
  return startMs + weeksElapsed * WEEK_MS;
}

function isVisibleUntilFollowingMonday(eventDate: string, now: number): boolean {
  const hideAtMs = followingMondayStartIstMs(eventDate);
  return hideAtMs == null ? false : now < hideAtMs;
}

function followingMondayStartIstMs(eventDate: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate || '');
  if (!dateMatch) return null;
  const [, y, m, d] = dateMatch;
  const weekday = weekdayFromYmd(eventDate);
  if (weekday == null) return null;
  const daysUntilMonday = ((8 - weekday) % 7) || 7;
  const asIfUtc = Date.UTC(Number(y), Number(m) - 1, Number(d) + daysUntilMonday, 0, 0, 0);
  return asIfUtc - IST_OFFSET_MS;
}

function weekdayFromYmd(eventDate: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate || '');
  if (!dateMatch) return null;
  const [, y, m, d] = dateMatch;
  const weekday = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function ymdFromIstMs(ms: number): string {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function isRecurringWeekly(input: PublicEventLifecycleInput): boolean {
  if (input.recurrenceMode === 'weekly') return true;
  if (input.recurrenceMode && input.recurrenceMode !== 'none') return false;
  if (input.categorySlot !== 'day') return false;
  const haystack = [input.name, input.categoryLabel, input.genre, ...(input.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /(weekly|recurring|repeat|every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|sunday\s+brunch)/.test(haystack);
}

function isYmd(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}