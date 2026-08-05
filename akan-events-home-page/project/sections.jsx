// Akan Events — Day / Night / Seasonal sections.

const { useState: useS3, useMemo: useM3, useRef: useR3 } = React;

// ─── Filter pills ────────────────────────────────────────────────────────────

function FilterPills({ filter, setFilter, options, theme }) {
  return (
    <div className={`ak-filter ak-filter-${theme}`}>
      {options.map((o) => (
        <button
          key={o.id}
          className={`ak-pill ${filter === o.id ? 'is-on' : ''}`}
          onClick={() => setFilter(o.id)}
        >
          {o.label}
          {o.count != null && <span className="ak-pill-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Day section ─────────────────────────────────────────────────────────────

function DaySection({ onOpen }) {
  const all = window.AKAN_EVENTS.day;
  const [filter, setFilter] = useS3('all');

  const opts = useM3(() => ([
    { id: 'all', label: 'All', count: all.length },
    { id: 'Sunday Brunch', label: 'Sunday Brunch', count: all.filter((e) => e.kind === 'Sunday Brunch').length },
    { id: 'Workshop', label: 'Workshops', count: all.filter((e) => e.kind === 'Workshop').length },
  ]), [all]);

  const shown = filter === 'all' ? all : all.filter((e) => e.kind === filter);

  return (
    <section className="ak-sec ak-day" id="by-day">
      <div className="ak-sec-head">
        <div className="ak-sec-eyebrow">
          <span className="ak-sun-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>
            </g></svg>
          </span>
          <span>By Day · Brunch &amp; Workshops</span>
        </div>
        <h2 className="ak-sec-h">Sunlit mornings, <em>slow afternoons.</em></h2>
        <FilterPills filter={filter} setFilter={setFilter} options={opts} theme="day" />
      </div>

      <div className="ak-day-grid-cards">
        {shown.map((e) => (
          <DayCard key={e.id} event={e} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

// ─── Night section ───────────────────────────────────────────────────────────

function NightSection({ onOpen }) {
  const all = window.AKAN_EVENTS.night;
  const [filter, setFilter] = useS3('all');

  const opts = useM3(() => ([
    { id: 'all', label: 'All', count: all.length },
    { id: 'Live Band', label: 'Live Bands', count: all.filter((e) => e.kind === 'Live Band' || e.kind === 'Live Music').length },
    { id: 'DJ Night', label: 'DJ Nights', count: all.filter((e) => e.kind === 'DJ Night').length },
  ]), [all]);

  const matches = (e, f) => {
    if (f === 'all') return true;
    if (f === 'Live Band') return e.kind === 'Live Band' || e.kind === 'Live Music';
    return e.kind === f;
  };
  const shown = all.filter((e) => matches(e, filter));

  return (
    <section className="ak-sec ak-night" id="by-night">
      <div className="ak-night-bg" aria-hidden="true">
        <div className="ak-night-glow" />
        <div className="ak-night-grain" />
      </div>
      <div className="ak-sec-head">
        <div className="ak-sec-eyebrow ak-sec-eyebrow-night">
          <span className="ak-moon-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M21 13.5A8.5 8.5 0 1 1 10.5 3a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/></svg>
          </span>
          <span>By Night · Live Music &amp; Late Nights</span>
        </div>
        <h2 className="ak-sec-h">Live bands, <em>late nights.</em></h2>
        <FilterPills filter={filter} setFilter={setFilter} options={opts} theme="night" />
      </div>

      <div className="ak-night-grid-cards">
        {shown.map((e) => (
          <NightCard key={e.id} event={e} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

// ─── Seasonal strip ──────────────────────────────────────────────────────────

function SeasonalStrip() {
  const list = window.AKAN_EVENTS.seasonal;
  return (
    <section className="ak-sec ak-season-sec" id="seasonal">
      <div className="ak-season-head">
        <span className="ak-season-eyebrow">Save the date</span>
        <h2 className="ak-season-h">
          Coming up on the calendar
        </h2>
      </div>
      <div className="ak-season-row">
        {list.map((e) => <SeasonalCard key={e.id} event={e} />)}
      </div>
    </section>
  );
}

Object.assign(window, { DaySection, NightSection, SeasonalStrip });
