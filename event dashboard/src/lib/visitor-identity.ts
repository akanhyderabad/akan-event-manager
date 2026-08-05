/**
 * Visitor identity — new-vs-returning classification.
 *
 * Flow (matches the product spec):
 *   cookie exists?  ── yes ─→ returning (fast path)
 *        │ no
 *        ▼
 *   exact composite-hash match? ── yes ─→ returning (cleared-cookie fast path)
 *        │ no
 *        ▼
 *   weighted fingerprint similarity ≥ 90% against recent devices?
 *        ├─ yes → returning
 *        └─ no  → NEW visitor (store fingerprint, mint id)
 *
 * Weighting (sums to 100):
 *   canvas 20 · webgl 20 · fonts 15 · audio 15 · screen 10 · os 10 · browser 10
 *
 * Every classification appends a visitor_visits row (is_new 0/1) which powers
 * the "first-time interaction rate" on the Event Analytics dashboard.
 */
import { randomUUID, createHash } from 'crypto';
import { getDb } from './db';

export interface FingerprintComponents {
  canvas?: string;
  webgl?: string;
  fonts?: string;   // sorted, comma-separated list of detected fonts
  audio?: string;
  screen?: string;
  os?: string;
  browser?: string;
}

const WEIGHTS = { canvas: 20, webgl: 20, fonts: 15, audio: 15, screen: 10, os: 10, browser: 10 } as const;
const SIMILARITY_THRESHOLD = 90;
const SCAN_LIMIT = 20000;
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

interface FpRow {
  id: string;
  canvas: string | null;
  webgl: string | null;
  fonts: string | null;
  audio: string | null;
  screen: string | null;
  os: string | null;
  browser: string | null;
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 1024) : '';
}

function sanitize(c: FingerprintComponents): Required<FingerprintComponents> {
  return {
    canvas: clean(c.canvas),
    webgl: clean(c.webgl),
    fonts: clean(c.fonts),
    audio: clean(c.audio),
    screen: clean(c.screen),
    os: clean(c.os),
    browser: clean(c.browser),
  };
}

function compositeHash(c: Required<FingerprintComponents>): string {
  const s = [c.canvas, c.webgl, c.fonts, c.audio, c.screen, c.os, c.browser].join('|');
  return createHash('sha256').update(s).digest('hex');
}

function fontsJaccard(a: string, b: string): number {
  const sa = new Set(a.split(',').map((x) => x.trim()).filter(Boolean));
  const sb = new Set(b.split(',').map((x) => x.trim()).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Weighted similarity (0–100) of a candidate row against the new fingerprint. */
function similarity(a: Required<FingerprintComponents>, b: FpRow): number {
  let score = 0;
  if (a.canvas && a.canvas === b.canvas) score += WEIGHTS.canvas;
  if (a.webgl && a.webgl === b.webgl) score += WEIGHTS.webgl;
  if (a.audio && a.audio === b.audio) score += WEIGHTS.audio;
  if (a.screen && a.screen === b.screen) score += WEIGHTS.screen;
  if (a.os && a.os === b.os) score += WEIGHTS.os;
  if (a.browser && a.browser === b.browser) score += WEIGHTS.browser;
  if (a.fonts && b.fonts) score += WEIGHTS.fonts * fontsJaccard(a.fonts, b.fonts);
  return score;
}

function recordVisit(visitorId: string, eventId: string | null, isNew: boolean, now: number): void {
  try {
    getDb().prepare(
      'INSERT INTO visitor_visits (id, visitor_id, event_id, is_new, timestamp) VALUES (?, ?, ?, ?, ?)',
    ).run(randomUUID(), visitorId, eventId || null, isNew ? 1 : 0, now);
  } catch {
    // Best-effort — a visit-log failure must never break the classification.
  }
}

export interface ClassifyInput {
  cookieId?: string | null;
  components: FingerprintComponents;
  eventId?: string | null;
}

export interface ClassifyResult {
  visitorId: string;
  isNew: boolean;
  /** How we decided — useful for debugging, harmless to expose. */
  via: 'cookie' | 'composite' | 'similarity' | 'new';
  score?: number;
}

export function classifyVisitor(input: ClassifyInput): ClassifyResult {
  const db = getDb();
  const now = Date.now();
  const comps = sanitize(input.components);
  const eventId = typeof input.eventId === 'string' && input.eventId.trim() ? input.eventId.trim() : null;

  const touch = db.prepare('UPDATE visitor_fingerprints SET visit_count = visit_count + 1, last_seen_at = ? WHERE id = ?');

  // 1) Cookie fast-path.
  const cookieId = typeof input.cookieId === 'string' ? input.cookieId.trim() : '';
  if (cookieId) {
    const row = db.prepare('SELECT id FROM visitor_fingerprints WHERE id = ?').get(cookieId) as { id: string } | undefined;
    if (row) {
      touch.run(now, row.id);
      recordVisit(row.id, eventId, false, now);
      return { visitorId: row.id, isNew: false, via: 'cookie' };
    }
  }

  const composite = compositeHash(comps);
  const hasSignal = !!(comps.canvas || comps.webgl || comps.audio || comps.fonts);

  // 2) Exact composite hash (cleared-cookie / private-window-reuse fast path).
  if (hasSignal) {
    const exact = db.prepare('SELECT id FROM visitor_fingerprints WHERE composite = ? LIMIT 1').get(composite) as { id: string } | undefined;
    if (exact) {
      touch.run(now, exact.id);
      recordVisit(exact.id, eventId, false, now);
      return { visitorId: exact.id, isNew: false, via: 'composite' };
    }
  }

  // 3) Weighted similarity over recent devices.
  if (hasSignal) {
    const cutoff = now - MAX_AGE_MS;
    const candidates = db.prepare(`
      SELECT id, canvas, webgl, fonts, audio, screen, os, browser
      FROM visitor_fingerprints
      WHERE last_seen_at >= ?
      ORDER BY last_seen_at DESC
      LIMIT ?
    `).all(cutoff, SCAN_LIMIT) as FpRow[];

    let best: { id: string; score: number } | null = null;
    for (const cand of candidates) {
      const score = similarity(comps, cand);
      if (!best || score > best.score) best = { id: cand.id, score };
      if (score >= 100) break;
    }
    if (best && best.score >= SIMILARITY_THRESHOLD) {
      db.prepare('UPDATE visitor_fingerprints SET visit_count = visit_count + 1, last_seen_at = ?, composite = COALESCE(composite, ?) WHERE id = ?')
        .run(now, composite, best.id);
      recordVisit(best.id, eventId, false, now);
      return { visitorId: best.id, isNew: false, via: 'similarity', score: best.score };
    }
  }

  // 4) New visitor.
  const id = randomUUID();
  db.prepare(`
    INSERT INTO visitor_fingerprints
      (id, composite, canvas, webgl, fonts, audio, screen, os, browser, visit_count, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, composite, comps.canvas, comps.webgl, comps.fonts, comps.audio, comps.screen, comps.os, comps.browser, now, now);
  recordVisit(id, eventId, true, now);
  return { visitorId: id, isNew: true, via: 'new' };
}

export interface VisitorStats {
  totalVisits: number;
  newVisits: number;
  returningVisits: number;
  firstTimeRate: number; // newVisits / totalVisits × 100
}

/** Aggregate new-vs-returning visits in a window, optionally scoped to one event. */
export function getVisitorStats(fromMs: number, toMs: number, eventId?: string | null): VisitorStats {
  const db = getDb();
  const row = (eventId
    ? db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_new),0) AS news FROM visitor_visits WHERE timestamp >= ? AND timestamp < ? AND event_id = ?').get(fromMs, toMs, eventId)
    : db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_new),0) AS news FROM visitor_visits WHERE timestamp >= ? AND timestamp < ?').get(fromMs, toMs)
  ) as { total: number; news: number };
  const total = Number(row.total) || 0;
  const news = Number(row.news) || 0;
  return {
    totalVisits: total,
    newVisits: news,
    returningVisits: Math.max(0, total - news),
    firstTimeRate: total > 0 ? Math.round((news / total) * 10000) / 100 : 0,
  };
}

/** Per-event visit stats in a window → Map keyed by event_id. */
export function getVisitorStatsByEvent(fromMs: number, toMs: number): Map<string, VisitorStats> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT event_id AS eventId, COUNT(*) AS total, COALESCE(SUM(is_new),0) AS news
    FROM visitor_visits
    WHERE timestamp >= ? AND timestamp < ? AND event_id IS NOT NULL
    GROUP BY event_id
  `).all(fromMs, toMs) as Array<{ eventId: string; total: number; news: number }>;
  const out = new Map<string, VisitorStats>();
  for (const r of rows) {
    const total = Number(r.total) || 0;
    const news = Number(r.news) || 0;
    out.set(r.eventId, {
      totalVisits: total,
      newVisits: news,
      returningVisits: Math.max(0, total - news),
      firstTimeRate: total > 0 ? Math.round((news / total) * 10000) / 100 : 0,
    });
  }
  return out;
}
