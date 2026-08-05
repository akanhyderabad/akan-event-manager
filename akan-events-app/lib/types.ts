// Types for Akan Events Application

export interface Event {
  id: string;
  dashboard_event_id?: string;
  slug?: string;
  categorySlot?: 'day' | 'night' | null;
  kind: string;
  title: string;
  tagline: string;
  date: string;
  time: string;
  event_date?: string;
  start_time?: string;
  price: string;
  image?: string;
  hue: string;
  featured?: boolean;
  body: string;
  tags: string[];
  artist_profile?: {
    name: string;
    description: string;
    vocalists: number;
    members: number;
    set_minutes: number;
    image?: string;
    social_url?: string;
  };
  artists?: Array<{
    id: string;
    name: string;
    about: string | null;
    social_url: string | null;
    image_data: string | null;
  }>;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    google_maps_url: string | null;
  };
  terms?: string;
  faqs?: string;
  refund_policy?: string;
  /** pax sizes available for table selection, e.g. [2, 4, 6] */
  ticket_options?: number[];
  table_types?: Array<{
    id: string;
    name: string;
    capacity: number;
    entry_fee: number;
    info?: string;
    visibility?: 'none' | 'hidden' | 'fast_filling' | 'sold_out';
    external_link?: string | null;
    contact_cta_enabled?: boolean;
  }>;
  /** Entry fee per pax for each ticket option, keyed by pax count */
  entry_fee?: Record<number, number>;
  /** Cover charge per male pax (at venue) */
  cover_charge_male?: number;
  /** Cover charge per female pax (at venue) */
  cover_charge_female?: number;
  cover_charge_couple?: number;
  entry_enabled?: boolean;
  cover_enabled?: boolean;
  payment_mode?: 'none' | 'deposit' | 'full_cover';
  entry_payment_mandatory?: boolean;
  access_mode?: 'public' | 'invite_link' | 'phone_list';
  invite_message?: string;
  /** Whether online payment is enabled for this event */
  payment_enabled?: boolean;
  note?: string;
  capacity?: number;
  booked?: number;
  status?: 'active' | 'archived' | 'sold-out';
  booking_open?: boolean;
  booking_status_label?: string;
  is_recurring?: boolean;
}

export interface EventsData {
  day: Event[];
  night: Event[];
  seasonal?: Event[];
}

export interface BookingFormData {
  event_id: string;
  name: string;
  email: string;
  mobile: string;
  pax: number;
  payment_method: 'hold' | 'upi' | 'card';
}

export interface BookingResponse {
  success: boolean;
  booking_id?: string;
  reference_id?: string;
  confirmation_url?: string;
  error?: string;
}

export interface AbandonedForm {
  event_id: string;
  session_id: string;
  step_completed: number;
  form_data: Partial<BookingFormData>;
}

export interface Theme {
  bg: string;
  text: string;
  surface: string;
  surface2: string;
  terra: string;
  terraDark: string;
  cream: string;
  creamDim: string;
  muted: string;
  hairline: string;
  softTint: string;
  softTint2: string;
  accentTint: string;
  accentBorder: string;
  progressTrack: string;
  isDark: boolean;
}
