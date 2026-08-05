// Akan Events — Event cards + Reservation modal.

const { useState: useS2, useEffect: useE2 } = React;

// ─── Day card (poster + warm bottom) ─────────────────────────────────────────

function DayCard({ event, featured, onOpen, tilt }) {
  return (
    <article
      className={`ak-card ak-card-day ${featured ? 'is-featured' : ''}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : null}
      onClick={() => onOpen(event)}
    >
      <div className={`ak-card-img ak-hue-${event.hue}`}>
        {event.image ? (
          <img src={event.image} alt="" loading="lazy" />
        ) : (
          <div className="ak-card-img-placeholder">
            <svg viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="14" fill="currentColor" opacity=".35"/>
              <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" opacity=".25"/>
            </svg>
          </div>
        )}
        {event.note && <span className="ak-card-note">{event.note}</span>}
      </div>
      <div className="ak-card-body">
        <span className="ak-card-kind">{event.kind}</span>
        <h3 className="ak-card-title">{event.title}</h3>
        <p className="ak-card-tagline">{event.tagline}</p>
        <div className="ak-card-meta">
          <span>{event.date}</span>
          <span className="ak-meta-dot">·</span>
          <span>{event.time}</span>
        </div>
        <div className="ak-card-foot">
          <span className="ak-card-price">{event.price}</span>
          <span className="ak-card-link">Reserve →</span>
        </div>
      </div>
    </article>
  );
}

// ─── Featured day card (wide editorial) ──────────────────────────────────────

function DayFeature({ event, onOpen }) {
  return (
    <article className="ak-feature ak-feature-day" onClick={() => onOpen(event)}>
      <div className={`ak-feature-img ak-hue-${event.hue}`}>
        {event.image && <img src={event.image} alt="" />}
        <span className="ak-feature-badge">Featured · {event.kind}</span>
      </div>
      <div className="ak-feature-body">
        <span className="ak-feature-eyebrow">{event.date} · {event.time}</span>
        <h3 className="ak-feature-title">
          {event.title.split(' ').slice(0, 2).join(' ')}
          <em>{' ' + event.title.split(' ').slice(2).join(' ')}</em>
        </h3>
        <p className="ak-feature-body-p">{event.body}</p>
        <div className="ak-feature-tags">
          {event.tags.map((t) => <span key={t} className="ak-feature-tag">{t}</span>)}
        </div>
        <div className="ak-feature-foot">
          <span className="ak-feature-price">{event.price}</span>
          <span className="ak-feature-cta">Reserve a seat →</span>
        </div>
      </div>
    </article>
  );
}

// ─── Night card (poster on dark, glow) ───────────────────────────────────────

function NightCard({ event, onOpen }) {
  return (
    <article className="ak-card ak-card-night" onClick={() => onOpen(event)}>
      <div className={`ak-card-img ak-hue-${event.hue}`}>
        {event.image ? (
          <img src={event.image} alt="" loading="lazy" />
        ) : (
          <div className="ak-card-img-placeholder ak-card-img-dark">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <rect x="14" y="20" width="52" height="40" rx="2" fill="none" stroke="currentColor" opacity=".4"/>
              <circle cx="40" cy="40" r="10" fill="currentColor" opacity=".5"/>
            </svg>
          </div>
        )}
        {event.note && <span className="ak-card-note ak-card-note-night">{event.note}</span>}
        <div className="ak-card-img-veil" />
      </div>
      <div className="ak-card-body">
        <span className="ak-card-kind ak-card-kind-night">{event.kind}</span>
        <h3 className="ak-card-title">{event.title}</h3>
        <p className="ak-card-tagline">{event.tagline}</p>
        <div className="ak-card-meta">
          <span>{event.date}</span>
          <span className="ak-meta-dot">·</span>
          <span>{event.time}</span>
        </div>
        <div className="ak-card-foot">
          <span className="ak-card-price">{event.price}</span>
          <span className="ak-card-link">Reserve →</span>
        </div>
      </div>
    </article>
  );
}

// ─── Night feature (cinema-style) ────────────────────────────────────────────

function NightFeature({ event, onOpen }) {
  return (
    <article className="ak-feature ak-feature-night" onClick={() => onOpen(event)}>
      <div className={`ak-feature-img ak-hue-${event.hue}`}>
        {event.image && <img src={event.image} alt="" />}
        <div className="ak-feature-night-veil" />
        <span className="ak-feature-badge ak-feature-badge-night">Tonight\u2019s headliner</span>
      </div>
      <div className="ak-feature-body">
        <span className="ak-feature-eyebrow">{event.date} · {event.time}</span>
        <h3 className="ak-feature-title">
          {event.title}
        </h3>
        <p className="ak-feature-body-p">{event.body}</p>
        <div className="ak-feature-tags">
          {event.tags.map((t) => <span key={t} className="ak-feature-tag ak-feature-tag-night">{t}</span>)}
        </div>
        <div className="ak-feature-foot">
          <span className="ak-feature-price">{event.price}</span>
          <span className="ak-feature-cta">Reserve a booth →</span>
        </div>
      </div>
    </article>
  );
}

// ─── Seasonal card (small) ───────────────────────────────────────────────────

function SeasonalCard({ event }) {
  return (
    <article className={`ak-season ak-hue-${event.hue}`}>
      <div className="ak-season-stamp">
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="24" fill="currentColor" opacity=".22"/>
          <circle cx="30" cy="30" r="14" fill="currentColor" opacity=".4"/>
        </svg>
      </div>
      <div className="ak-season-body">
        <span className="ak-season-window">{event.window}</span>
        <h4 className="ak-season-title">{event.title}</h4>
        <p className="ak-season-blurb">{event.blurb}</p>
      </div>
    </article>
  );
}

// ─── Reservation modal ───────────────────────────────────────────────────────

function EventModal({ event, onClose }) {
  const [state, setState] = useS2('form'); // form | success
  const [form, setForm] = useS2({ name: '', phone: '', date: '', pax: 2, time: '' });
  useE2(() => {
    if (!event) return;
    setState('form');
    setForm({ name: '', phone: '', date: '', pax: 2, time: '' });
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [event]);
  if (!event) return null;

  const dark = ['Live Band', 'Live Music', 'DJ Night'].includes(event.kind);

  const onSubmit = (e) => {
    e.preventDefault();
    setState('success');
  };

  return (
    <div className={`ak-modal-scrim ${dark ? 'is-dark' : ''}`} onClick={onClose}>
      <div className={`ak-modal ${dark ? 'is-dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="ak-modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className={`ak-modal-img ak-hue-${event.hue}`}>
          {event.image && <img src={event.image} alt="" />}
        </div>
        <div className="ak-modal-body">
          {state === 'form' && (
            <>
              <span className="ak-modal-kind">{event.kind}</span>
              <h3 className="ak-modal-title">{event.title}</h3>
              <p className="ak-modal-tagline">{event.tagline}</p>
              <div className="ak-modal-grid">
                <div className="ak-modal-fact">
                  <span>When</span>
                  <strong>{event.date}<br/>{event.time}</strong>
                </div>
                <div className="ak-modal-fact">
                  <span>Price</span>
                  <strong>{event.price}</strong>
                </div>
              </div>
              <p className="ak-modal-body-p">{event.body}</p>
              <form className="ak-form" onSubmit={onSubmit}>
                <div className="ak-form-row">
                  <label className="ak-form-field">
                    <span>Name</span>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </label>
                  <label className="ak-form-field">
                    <span>Phone</span>
                    <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
                  </label>
                </div>
                <div className="ak-form-row">
                  <label className="ak-form-field">
                    <span>Guests</span>
                    <input type="number" min="1" max="20" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} />
                  </label>
                  <label className="ak-form-field">
                    <span>Time</span>
                    <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required>
                      <option value="">Pick a slot</option>
                      {(dark ? ['9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'] : ['11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM']).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className="ak-form-submit">Reserve {form.pax || ''} {form.pax == 1 ? 'seat' : 'seats'} →</button>
                <span className="ak-form-fine">A confirmation will be sent to your phone. Free cancellation up to 24h before.</span>
              </form>
            </>
          )}
          {state === 'success' && (
            <div className="ak-modal-success">
              <div className="ak-modal-success-mark">
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="17" fill="none" stroke="currentColor" strokeWidth="1"/>
                  <path d="M11 18l5 5 9-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="ak-modal-title">You\u2019re in.</h3>
              <p className="ak-modal-body-p">
                {form.pax} {form.pax == 1 ? 'seat' : 'seats'} held for <strong>{event.title}</strong> at <strong>{form.time}</strong>.
                We\u2019ve sent a confirmation to {form.phone || 'your phone'}.
              </p>
              <button className="ak-form-submit" onClick={onClose}>Back to events</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DayCard, DayFeature, NightCard, NightFeature, SeasonalCard, EventModal });
