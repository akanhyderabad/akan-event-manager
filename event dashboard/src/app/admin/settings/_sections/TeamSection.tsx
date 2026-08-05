'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionShell } from './SectionShell';
import { ALL_ROLES, ROLE_LABEL, type PublicUser, type UserRole } from '@/lib/roles';
import {
  ADMIN_PAGES,
  SECTION_ORDER,
  defaultPageIds,
  effectivePageIds,
  collapseToRoleDefault,
} from '@/lib/permissions';

// ─── Role visuals ────────────────────────────────────────────────────────
// Each role gets a pill colour so the list scans at a glance. Host is the
// owner — labelled "Full Access" to match the Growezzy-style copy in the
// spec rather than the internal "host" identifier.
const ROLE_PILL: Record<UserRole, { label: string; cls: string }> = {
  host:    { label: 'Full Access',    cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  manager: { label: 'Manager',        cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  cashier: { label: 'Cashier',        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  captain: { label: 'Captain',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  entry:   { label: 'Entry / Bouncer', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const ABOUT_ROLES: { name: string; blurb: string }[] = [
  {
    name: 'Manager',
    blurb:
      'Full control over events, bookings and reports — everything except billing, integrations and team management. Best for floor managers and senior staff.',
  },
  {
    name: 'Operations',
    blurb:
      'Day-to-day floor operations: issue cover passes, manage reservations, check guests in. No access to settings or financial reports.',
  },
  {
    name: 'Marketing',
    blurb:
      'Manage campaigns, affiliate links and event promotions. Read-only access to sales analytics and customer lists.',
  },
  {
    name: 'Finance',
    blurb:
      'Reconcile payments, manage payouts and pull P&L reports. Read-only access to events and bookings.',
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TeamSection() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [editUser, setEditUser] = useState<PublicUser | null>(null);

  async function refresh() {
    const r = await fetch('/api/users');
    const d = await r.json();
    if (d?.ok) setUsers(d.users || []);
    else setError(d?.message || 'Failed to load team');
    setLoaded(true);
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setIsHost(d.user.role === 'host'); })
      .catch(() => { /* non-blocking */ });
    refresh().catch((e) =>
      setError(e instanceof Error ? e.message : 'Network error'),
    );
  }, []);

  // KPI counters — active = signed in at least once, pending = invited but
  // never logged in. Drives the three cards above the table.
  const { total, activeCount, pendingCount } = useMemo(() => {
    let active = 0;
    let pending = 0;
    for (const u of users) {
      if (!u.active) continue;
      if (u.last_login_at && u.last_login_at > 0) active++;
      else pending++;
    }
    return { total: users.length, activeCount: active, pendingCount: pending };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function handleDelete(u: PublicUser) {
    if (!confirm(`Remove ${u.name} from the team? This can't be undone.`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!d?.ok) {
      alert(d?.message || 'Delete failed');
      return;
    }
    refresh();
  }

  return (
    <SectionShell
      eyebrow="General"
      title="Team"
      description="Manage who has access to the admin dashboard. Invite teammates and assign roles."
    >
      {/* ─── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Total members" value={total} tone="slate" />
        <KpiCard label="Active" value={activeCount} tone="emerald" />
        <KpiCard label="Pending invites" value={pendingCount} tone="amber" />
      </div>

      {/* ─── Search + Invite ───────────────────────────────────────── */}
      <div className="card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 max-w-md">
            <input
              className="input"
              placeholder="Search by name, phone or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              {filtered.length} of {total}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowInvite(true)}
            >
              + Invite Member
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {!loaded ? (
          <div className="text-sm text-slate-400">Loading team…</div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      No matching team members.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const pill = ROLE_PILL[u.role];
                  const isActive = !!u.last_login_at && u.last_login_at > 0;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                            {initials(u.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {u.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {u.phone}
                              {u.email ? ` • ${u.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${pill.cls}`}
                        >
                          {pill.label}
                        </span>
                        {u.role !== 'host' && u.permissions != null && (
                          <div className="mt-1 text-[10px] text-brand-600 font-medium">
                            Custom access · {u.permissions.length} page{u.permissions.length === 1 ? '' : 's'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isActive ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isHost && u.role !== 'host' && (
                          <button
                            onClick={() => setEditUser(u)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 mr-1"
                            title="Edit page access"
                          >
                            Edit access
                          </button>
                        )}
                        {isHost && u.role !== 'host' && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 align-middle"
                            aria-label={`Remove ${u.name}`}
                            title="Remove from team"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── About Roles ───────────────────────────────────────────── */}
      <div className="card space-y-3">
        <div className="text-xs uppercase tracking-widest text-slate-500">
          About Roles
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ABOUT_ROLES.map((r) => (
            <div
              key={r.name}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="text-sm font-semibold text-slate-900">
                {r.name}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {r.blurb}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          onSaved={() => {
            setShowInvite(false);
            refresh();
          }}
        />
      )}

      {editUser && (
        <EditAccessModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            refresh();
          }}
        />
      )}
    </SectionShell>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'emerald' | 'amber';
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : 'text-slate-900';
  return (
    <div className="card !p-4">
      <div className="text-[11px] uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

function InviteMemberModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // 'host' is reserved for the venue owner — never expose it as an
  // invite-time selection. The remaining roles map to staff levels.
  const INVITE_ROLES = ALL_ROLES.filter((r): r is Exclude<UserRole, 'host'> => r !== 'host');
  const [role, setRole] = useState<UserRole>('manager');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !phone.trim()) {
      setErr('Name and phone are required.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setErr('PIN must be 4–6 digits.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          role,
          pin,
        }),
      });
      const d = await r.json();
      if (!d?.ok) {
        setErr(d?.message || 'Failed to invite member.');
        return;
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-5 md:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invite Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              They&apos;ll sign in with this phone + PIN.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>
          <div>
            <label className="label">
              Email <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Initial PIN</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4–6 digits"
            />
            <div className="text-[11px] text-slate-500 mt-1">
              Share this PIN privately. They can change it after first login.
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving}
            >
              {saving ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * EditAccessModal — host-only. Sets a member's base role and their custom
 * page-access override. Toggle "custom access" off to inherit the role's
 * default page set; on to hand-pick exactly which admin pages they can open.
 */
function EditAccessModal({
  user,
  onClose,
  onSaved,
}: {
  user: PublicUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  // 'host' is reserved for the venue owner — not assignable here.
  const ASSIGNABLE_ROLES = ALL_ROLES.filter(
    (r): r is Exclude<UserRole, 'host'> => r !== 'host',
  );

  const [role, setRole] = useState<UserRole>(user.role);
  const [custom, setCustom] = useState<boolean>(user.permissions != null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(effectivePageIds(user.role, user.permissions)),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // What's shown ticked: hand-picked set when custom, else the role's defaults.
  const shown = custom ? selected : new Set(defaultPageIds(role));

  function changeRole(next: UserRole) {
    setRole(next);
    // While inheriting, keep the preview aligned with the new role's defaults.
    if (!custom) setSelected(new Set(defaultPageIds(next)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function enableCustom() {
    // Seed the custom set from whatever is currently shown so the host edits
    // from the role default rather than a blank slate.
    setSelected(new Set(shown));
    setCustom(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const permissions = custom
        ? collapseToRoleDefault(role, Array.from(selected))
        : null;
      const body: { permissions: string[] | null; role?: UserRole } = { permissions };
      if (role !== user.role) body.role = role;
      const r = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d?.ok) { setErr(d?.message || 'Failed to save access.'); return; }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit access</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.name} • {user.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="label">Base role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => changeRole(e.target.value as UserRole)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1">
              The role sets sensible defaults. Turn on custom access below to
              fine-tune exactly which pages this member sees.
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              className="mt-1 accent-brand-500 cursor-pointer"
              checked={custom}
              onChange={(e) => (e.target.checked ? enableCustom() : setCustom(false))}
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">Custom access</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {custom
                  ? 'Pick exactly which pages this member can open.'
                  : `Inherits the ${ROLE_LABEL[role]} default pages.`}
              </div>
            </div>
          </label>

          <div className={custom ? '' : 'opacity-60 pointer-events-none'}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Pages ({shown.size})
              </div>
              {custom && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] text-brand-600 hover:text-brand-700"
                    onClick={() => setSelected(new Set(defaultPageIds(role)))}
                  >
                    Reset to role default
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {SECTION_ORDER.map((section) => {
                const pages = ADMIN_PAGES.filter((p) => p.section === section);
                if (pages.length === 0) return null;
                return (
                  <div key={section}>
                    <div className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">
                      {section}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {pages.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-sm text-slate-700 py-1"
                        >
                          <input
                            type="checkbox"
                            className="accent-brand-500"
                            checked={shown.has(p.id)}
                            disabled={!custom}
                            onChange={() => toggle(p.id)}
                          />
                          <span className="truncate">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
