/**
 * Per-page access control — the single source of truth for which admin pages
 * exist, what their default role gating is, and how a user's custom access
 * override is resolved.
 *
 * Client-safe: imports ONLY the role enums (no DB / server code). Used by the
 * sidebar (AdminShell), the Team "Edit access" editor, the admin layout guard,
 * and the server-side access check in lib/auth.
 *
 * Model
 * -----
 * Every user has a base `role`. On top of that, the host can store a per-user
 * `permissions` value:
 *   - `null`  → inherit the role's default page set (today's behaviour, no
 *               regression for any existing user).
 *   - `string[]` → an explicit allow-list of page ids. This can both *restrict*
 *               a user below their role and *grant* pages beyond it.
 *
 * The `host` role always has full access and cannot be restricted.
 */
import type { UserRole } from './roles';

const ROLES_ALL: UserRole[] = ['host', 'manager', 'cashier', 'captain', 'entry'];
const ROLES_MGMT: UserRole[] = ['host', 'manager'];
const ROLES_CASHIER: UserRole[] = ['host', 'manager', 'cashier'];

export interface AdminPage {
  /** Stable id — persisted in each user's permission list. Never rename. */
  id: string;
  label: string;
  href: string;
  section: string;
  /** Default roles that can see this page when no custom override is set. */
  roles: UserRole[];
  /**
   * Extra path prefixes that belong to this page for the layout guard
   * (e.g. the events wizard lives under /admin/events but the nav item is
   * /admin). Optional.
   */
  extraPrefixes?: string[];
}

/** Section render order for the sidebar + the access editor. */
export const SECTION_ORDER = [
  'Events',
  'Reservego',
  'Overview',
  'Schedule',
  'Operations',
  'Growth',
  'Configuration',
] as const;

/**
 * The admin page registry. Mirrors the sidebar in AdminShell — keep the two in
 * sync (AdminShell derives its nav from this list).
 */
export const ADMIN_PAGES: AdminPage[] = [
  { id: 'events',             label: 'Events',                href: '/admin',                    section: 'Events',        roles: ROLES_MGMT, extraPrefixes: ['/admin/events'] },
  { id: 'bookings',           label: 'Bookings',              href: '/admin/bookings',           section: 'Events',        roles: ROLES_MGMT },
  { id: 'abandoned-bookings', label: 'Abandoned Bookings',    href: '/admin/abandoned-bookings', section: 'Events',        roles: ROLES_MGMT },
  { id: 'event-analytics',    label: 'Event Analytics',       href: '/admin/event-analytics',    section: 'Events',        roles: ROLES_MGMT },

  { id: 'reservations',       label: 'Reservego',             href: '/admin/reservations',       section: 'Reservego',     roles: ROLES_MGMT },
  { id: 'tables',             label: 'Tables',                href: '/admin/tables',             section: 'Reservego',     roles: ROLES_MGMT },

  { id: 'analytics',          label: 'Analytics',             href: '/admin/analytics',          section: 'Overview',      roles: ROLES_CASHIER },

  { id: 'venues',             label: 'Venues',                href: '/admin/venues',             section: 'Schedule',      roles: ROLES_MGMT },
  { id: 'artists',            label: 'Artists / Event Hosts', href: '/admin/artists',            section: 'Schedule',      roles: ROLES_MGMT },

  { id: 'tickets',            label: 'Offline Ticketing',      href: '/admin/tickets',           section: 'Operations',    roles: ROLES_MGMT },
  { id: 'tickets-status',     label: 'Offline Tickets Status', href: '/admin/tickets-status',    section: 'Operations',    roles: ROLES_MGMT },
  { id: 'cashier',            label: 'Cashier',                href: '/admin/cashier',           section: 'Operations',    roles: ROLES_CASHIER },
  { id: 'issue',              label: 'Issue Cover',            href: '/admin/issue',             section: 'Operations',    roles: ['host', 'manager', 'entry'] },
  { id: 'scan',               label: 'Scan',                   href: '/admin/scan',              section: 'Operations',    roles: ['host', 'manager', 'captain', 'entry', 'cashier'] },
  { id: 'redeem',             label: 'Redeem Cover',           href: '/admin/redeem',            section: 'Operations',    roles: ['host', 'manager', 'captain'] },
  { id: 'history',            label: 'History',                href: '/admin/history',           section: 'Operations',    roles: ROLES_CASHIER },
  { id: 'cover',              label: 'Cover',                  href: '/admin/cover',             section: 'Operations',    roles: ROLES_MGMT },
  { id: 'people',             label: 'People',                 href: '/admin/people',            section: 'Operations',    roles: ROLES_MGMT },

  { id: 'affiliates',         label: 'Affiliates',            href: '/admin/affiliates',         section: 'Growth',        roles: ROLES_MGMT },
  { id: 'payouts',            label: 'Affiliate Payouts',     href: '/admin/payouts',            section: 'Growth',        roles: ROLES_MGMT },

  { id: 'staff',              label: 'Staff',                 href: '/admin/staff',              section: 'Configuration', roles: ROLES_ALL },
  { id: 'settings',           label: 'Settings',              href: '/admin/settings',           section: 'Configuration', roles: ROLES_MGMT },
  { id: 'tnc',                label: 'Terms',                 href: '/admin/tnc',                section: 'Configuration', roles: ROLES_MGMT },
];

const PAGE_BY_ID = new Map(ADMIN_PAGES.map((p) => [p.id, p]));
export const ALL_PAGE_IDS = ADMIN_PAGES.map((p) => p.id);

/** Page ids a role can see by default (no custom override). */
export function defaultPageIds(role: UserRole): string[] {
  return ADMIN_PAGES.filter((p) => p.roles.includes(role)).map((p) => p.id);
}

/**
 * Parse a stored permissions value into a clean id array, or null.
 * Accepts the raw JSON-parsed value; tolerates junk.
 */
export function normalizePermissions(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const ids = value.filter((v): v is string => typeof v === 'string' && PAGE_BY_ID.has(v));
  // De-dupe while preserving registry order for stable storage/rendering.
  const set = new Set(ids);
  return ALL_PAGE_IDS.filter((id) => set.has(id));
}

/**
 * The effective set of page ids a user can access.
 * - host → everything, always.
 * - permissions null → role defaults.
 * - permissions set → the explicit allow-list.
 */
export function effectivePageIds(role: UserRole, permissions: string[] | null): Set<string> {
  if (role === 'host') return new Set(ALL_PAGE_IDS);
  if (permissions == null) return new Set(defaultPageIds(role));
  return new Set(permissions);
}

export function canAccessPageId(role: UserRole, permissions: string[] | null, pageId: string): boolean {
  return effectivePageIds(role, permissions).has(pageId);
}

/** Does this user have a custom (non-inherited) access set? */
export function hasCustomAccess(permissions: string[] | null): boolean {
  return permissions != null;
}

/**
 * If a proposed allow-list exactly equals the role's defaults, return null so
 * we persist "inherit role" rather than freezing a snapshot — this keeps future
 * role-default changes flowing through and avoids marking untouched users as
 * customised.
 */
export function collapseToRoleDefault(role: UserRole, selected: string[]): string[] | null {
  const norm = normalizePermissions(selected) ?? [];
  const def = defaultPageIds(role);
  if (norm.length === def.length && def.every((id) => norm.includes(id))) return null;
  return norm;
}

/**
 * Resolve a pathname to the page id that governs it, for the layout guard.
 * Returns null for paths not tied to a gated page (e.g. /admin/logout) —
 * callers should treat null as "always allowed".
 */
export function pageIdForPath(pathname: string): string | null {
  if (pathname === '/admin' || pathname === '/admin/') return 'events';

  let best: { id: string; len: number } | null = null;
  for (const p of ADMIN_PAGES) {
    const candidates = [p.href, ...(p.extraPrefixes ?? [])];
    for (const c of candidates) {
      if (c === '/admin') continue; // handled above; never treat as a prefix
      if (pathname === c || pathname.startsWith(c + '/')) {
        if (!best || c.length > best.len) best = { id: p.id, len: c.length };
      }
    }
  }
  return best?.id ?? null;
}

export function pageById(id: string): AdminPage | undefined {
  return PAGE_BY_ID.get(id);
}

/**
 * Map an /api/* request path to the page id(s) whose access should authorize
 * it. Used ONLY for *additive* grant-beyond-role checks on the server: when a
 * user's base role can't reach an endpoint but the host granted them a page
 * that legitimately uses it, the request is allowed.
 *
 * This is deliberately conservative — shared/general endpoints (config,
 * branding, auth, public, dashboard, uploads, …) return [] so they are never
 * affected and always fall through to the normal role check. An empty result
 * means "no page-based grant applies here".
 *
 * By first path segment after /api/.
 */
const API_SEGMENT_TO_PAGES: Record<string, string[]> = {
  analytics: ['analytics'],
  cashier: ['cashier'],
  bookings: ['bookings'],
  'abandoned-bookings': ['abandoned-bookings'],
  reservations: ['reservations'],
  tables: ['tables'],
  venues: ['venues'],
  artists: ['artists'],
  affiliates: ['affiliates'],
  affiliate: ['affiliates'],
  payouts: ['payouts'],
  people: ['people'],
  history: ['history'],
  tickets: ['tickets', 'tickets-status'],
  redemptions: ['redeem', 'scan'],
  events: ['events'],
};

export function apiPageIds(pathname: string): string[] {
  const m = pathname.match(/^\/api\/([^/?]+)/);
  if (!m) return [];
  return API_SEGMENT_TO_PAGES[m[1]] ?? [];
}
