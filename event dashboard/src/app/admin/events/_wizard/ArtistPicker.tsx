'use client';

import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import type { Artist } from '@/lib/artists';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Artist / Event Host picker for the event wizard.
 *
 * Lists every artist from /api/artists as selectable chips and lets the host
 * add a brand-new artist inline (same fields as the Artists / Event Hosts page:
 * name, about, social link, image). A newly-created artist is auto-selected.
 */
export function ArtistPicker({ selectedIds, onChange }: Props) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ name: string; about: string; social_url: string; image_data: string | null }>({
    name: '', about: '', social_url: '', image_data: null,
  });

  async function load() {
    try {
      const d = await fetch('/api/artists', { cache: 'no-store' }).then((r) => r.json());
      if (d.ok) setArtists(d.artists || []);
    } catch { /* leave list as-is */ }
  }
  useEffect(() => { void load(); }, []);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function saveNew() {
    if (!form.name.trim()) { setError('Artist name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setError(d.message || 'Could not add artist.'); return; }
      await load();
      const newId = d.artist?.id as string | undefined;
      if (newId && !selectedIds.includes(newId)) onChange([...selectedIds, newId]);
      setForm({ name: '', about: '', social_url: '', image_data: null });
      setAdding(false);
    } catch {
      setError('Network error — could not add artist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label">Artists / Event Hosts</label>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setError(''); }}
            className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
          >
            + Add new
          </button>
        )}
      </div>
      <div className="text-[11px] text-slate-400 mb-2">
        Select the band/artist performing. Their name, bio and photo show on the public event page.
      </div>

      {artists.length === 0 && !adding ? (
        <div className="text-xs text-slate-400 italic">
          No artists yet — click “Add new” to create one.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {artists.map((a) => {
            const selected = selectedIds.includes(a.id);
            return (
              <button
                type="button"
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  selected
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="text-xs font-semibold text-slate-700">New artist / host</div>
          <div className="grid grid-cols-1 sm:grid-cols-[120px,1fr] gap-3 items-start">
            <ImageUpload
              value={form.image_data}
              onChange={(d) => setForm((f) => ({ ...f, image_data: d }))}
              label="Photo"
              helperText="800×800 auto-resize."
            />
            <div className="space-y-2">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Artist / band name *"
                maxLength={150}
              />
              <textarea
                className="input min-h-[70px]"
                value={form.about}
                onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                placeholder="Short bio — shown on the public event page"
                rows={3}
              />
              <input
                className="input text-sm"
                value={form.social_url}
                onChange={(e) => setForm((f) => ({ ...f, social_url: e.target.value }))}
                placeholder="Social / website link (https://…)"
              />
            </div>
          </div>
          {error && <div className="text-xs text-rose-600">{error}</div>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void saveNew()} disabled={saving} className="btn btn-primary text-xs disabled:opacity-50">
              {saving ? 'Saving…' : 'Save & select'}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(''); }} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
