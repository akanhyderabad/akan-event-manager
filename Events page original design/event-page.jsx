// Akan event page — mobile, scrollable inside the iOS frame
const THEMES = {
  dark: {
    bg: '#1a0d08',
    surface: '#221510',
    surface2: '#2a1a13',
    terra: '#c9512e',
    terraDark: '#a13d1f',
    cream: '#f6efe6',
    creamDim: '#d8cdbf',
    muted: '#8a7f72',
    hairline: 'rgba(246, 239, 230, 0.08)',
    softTint: 'rgba(255,255,255,0.04)',
    softTint2: 'rgba(255,255,255,0.03)',
    accentTint: 'rgba(201,81,46,0.08)',
    accentBorder: 'rgba(201,81,46,0.2)',
    progressTrack: 'rgba(246,239,230,0.08)',
    isDark: true,
  },
  light: {
    bg: '#f8f3ec',
    surface: '#ffffff',
    surface2: '#f1eadf',
    terra: '#b8451f',
    terraDark: '#923616',
    cream: '#1a0d08',
    creamDim: '#52443a',
    muted: '#8a7f72',
    hairline: 'rgba(26, 13, 8, 0.10)',
    softTint: 'rgba(26,13,8,0.04)',
    softTint2: 'rgba(26,13,8,0.025)',
    accentTint: 'rgba(184,69,31,0.08)',
    accentBorder: 'rgba(184,69,31,0.22)',
    progressTrack: 'rgba(26,13,8,0.08)',
    isDark: false,
  },
};

let C = THEMES.dark;

function Mono({children, style}) {
  return <span style={{fontFamily: 'Geist Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', ...style}}>{children}</span>;
}

function Divider({label}) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', margin: '36px 0 20px'}}>
      <div style={{flex: 1, height: 1, background: C.hairline}}/>
      {label && <Mono style={{fontSize: 10, color: C.muted}}>{label}</Mono>}
      <div style={{flex: 1, height: 1, background: C.hairline}}/>
    </div>
  );
}

function Countdown({target}) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms % 86400000 / 3600000);
  const m = Math.floor(ms % 3600000 / 60000);
  const s = Math.floor(ms % 60000 / 1000);
  const cell = (n, label) => (
    <div style={{textAlign: 'center', minWidth: 56}}>
      <div style={{fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 32, color: C.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
        {String(n).padStart(2, '0')}
      </div>
      <Mono style={{fontSize: 9, color: C.muted, marginTop: 6, display: 'block'}}>{label}</Mono>
    </div>
  );
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', padding: '0 24px', gap: 8}}>
      {cell(d, 'days')}
      <div style={{color: C.muted, fontFamily: 'Fraunces, serif', fontSize: 28, opacity: 0.4}}>:</div>
      {cell(h, 'hrs')}
      <div style={{color: C.muted, fontFamily: 'Fraunces, serif', fontSize: 28, opacity: 0.4}}>:</div>
      {cell(m, 'min')}
      <div style={{color: C.muted, fontFamily: 'Fraunces, serif', fontSize: 28, opacity: 0.4}}>:</div>
      {cell(s, 'sec')}
    </div>
  );
}

function Header({theme, onToggleTheme}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px 16px', position: 'relative', zIndex: 5, marginTop: 4,
    }}>
      <button style={{
        width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.hairline}`,
        background: C.softTint, color: C.cream, fontSize: 18, cursor: 'pointer',
      }}>‹</button>
      <div style={{
        fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontWeight: 400,
        fontSize: 20, color: C.cream, letterSpacing: '0.02em',
      }}>akan</div>
      <div style={{display: 'flex', gap: 8}}>
        <button onClick={onToggleTheme} title="Toggle theme" style={{
          width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.hairline}`,
          background: C.softTint, color: C.cream, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <button style={{
          width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.hairline}`,
          background: C.softTint, color: C.cream, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>
    </div>
  );
}

function HeroPoster({tweaks, onCTA, tablesLeft}) {
  return (
    <div style={{padding: '0 20px'}}>
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <Poster scale={1} palette={{bg: '#2a1810', terra: C.terra, cream: C.cream, dark: C.bg}}/>
        {/* play badge */}
        <button style={{
          position: 'absolute', top: 16, right: 16, padding: '7px 12px 7px 9px',
          borderRadius: 999, background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.18)', color: C.cream,
          display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontFamily: 'Geist Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4z"/></svg>
          Watch
        </button>
        {/* tables badge */}
        <div style={{
          position: 'absolute', top: 16, left: 16, padding: '6px 10px',
          borderRadius: 999, background: 'rgba(201, 81, 46, 0.92)',
          color: C.cream, fontFamily: 'Geist Mono, monospace',
          fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: C.cream,
            animation: 'pulse 1.6s ease-in-out infinite',
          }}/>
          Only {tablesLeft} tables left
        </div>
      </div>
    </div>
  );
}

function TitleBlock() {
  return (
    <div style={{padding: '24px 24px 0'}}>
      <Mono style={{fontSize: 10, color: C.terra}}>Live Music · Vol. 07</Mono>
      <h1 style={{
        margin: '10px 0 0',
        fontFamily: 'Fraunces, serif', fontWeight: 400,
        fontSize: 38, lineHeight: 0.98, letterSpacing: '-0.025em',
        color: C.cream, textWrap: 'balance',
      }}>
        The Infusion <em style={{fontWeight: 300, color: C.terra}}>homecoming</em> show
      </h1>
      <p style={{
        margin: '14px 0 0', color: C.creamDim, fontSize: 14, lineHeight: 1.55,
        fontFamily: 'Inter', textWrap: 'pretty',
      }}>
        Eight-piece live band, three vocalists, one unforgettable Saturday night at Akan.
      </p>
    </div>
  );
}

function FactRow({icon, label, value, sub}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 0',
      borderBottom: `1px solid ${C.hairline}`,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: 'rgba(201,81,46,0.12)',
        border: `1px solid ${C.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.terra, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <Mono style={{fontSize: 9, color: C.muted, display: 'block'}}>{label}</Mono>
        <div style={{fontFamily: 'Inter', fontWeight: 500, color: C.cream, fontSize: 15, marginTop: 2}}>
          {value}
        </div>
        {sub && <div style={{fontSize: 12, color: C.muted, marginTop: 1}}>{sub}</div>}
      </div>
    </div>
  );
}

function FactsBlock() {
  return (
    <div style={{padding: '0 24px', marginTop: 28}}>
      <FactRow
        label="Date"
        value="Saturday, 02 May"
        sub="2026"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
      />
      <FactRow
        label="Doors / Showtime"
        value="9:00 PM onwards"
        sub="Last entry 11:30 PM"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
      />
      <FactRow
        label="Venue"
        value="Akan, Madhapur"
        sub="Opp. Durgam Cheruvu"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
      />
      <FactRow
        label="Cover"
        value="₹1,500 redeemable"
        sub="On food & beverage · Per person"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
      />
    </div>
  );
}

function CountdownBlock({target}) {
  return (
    <div style={{margin: '32px 0 0'}}>
      <Divider label="Doors open in"/>
      <Countdown target={target}/>
    </div>
  );
}

function AboutBand() {
  return (
    <div style={{padding: '0 24px', marginTop: 36}}>
      <Mono style={{fontSize: 10, color: C.terra}}>The Band</Mono>
      <h2 style={{
        margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400,
        fontSize: 26, color: C.cream, lineHeight: 1.05, letterSpacing: '-0.02em',
      }}>
        Eight musicians.<br/>
        <em style={{fontWeight: 300, color: C.creamDim}}>One reunion show.</em>
      </h2>
      <p style={{color: C.creamDim, fontSize: 14, lineHeight: 1.6, margin: 0, fontFamily: 'Inter', textWrap: 'pretty'}}>
        Infusion last played Hyderabad in 2022. They're coming home for one Saturday night — a setlist that
        moves from Bollywood retro to indie originals to a horn-heavy second half you'll be talking about
        for weeks.
      </p>
    </div>
  );
}

function Setlist() {
  const items = [
    ['09:00 pm', 'Doors open · Welcome drinks'],
    ['09:45 pm', 'Set I — Bollywood retro'],
    ['10:45 pm', 'Set II — Indie originals'],
    ['11:30 pm', 'Set III — Horn section finale'],
  ];
  return (
    <div style={{padding: '0 24px', marginTop: 36}}>
      <Mono style={{fontSize: 10, color: C.terra}}>The Night</Mono>
      <h2 style={{margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: C.cream, letterSpacing: '-0.02em'}}>
        How the night runs
      </h2>
      <div>
        {items.map(([time, label], i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, padding: '14px 0',
            borderBottom: i < items.length-1 ? `1px solid ${C.hairline}` : 'none',
          }}>
            <Mono style={{fontSize: 10, color: C.muted, width: 70, flexShrink: 0, paddingTop: 2}}>{time}</Mono>
            <div style={{fontFamily: 'Inter', color: C.cream, fontSize: 14, fontWeight: 500}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scarcity({tablesLeft}) {
  const total = 24;
  const taken = total - tablesLeft;
  const pct = (taken / total) * 100;
  return (
    <div style={{padding: '0 24px', marginTop: 36}}>
      <div style={{
        background: C.surface, border: `1px solid ${C.hairline}`,
        borderRadius: 14, padding: 20,
      }}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14}}>
          <Mono style={{fontSize: 10, color: C.terra}}>Filling Fast</Mono>
          <Mono style={{fontSize: 10, color: C.muted}}>{taken}/{total} booked</Mono>
        </div>
        <div style={{
          height: 6, borderRadius: 999, background: 'rgba(246,239,230,0.08)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${C.terra}, #e76a3d)`,
            borderRadius: 999,
          }}/>
        </div>
        <div style={{marginTop: 14, fontSize: 13, color: C.creamDim, lineHeight: 1.5}}>
          <strong style={{color: C.cream, fontWeight: 600}}>{tablesLeft} tables remaining.</strong>{' '}
          Past three Akan live shows sold out 5+ days before the event.
        </div>
      </div>
    </div>
  );
}

function Reviews() {
  const r = [
    {q: 'Best live music night in Hyderabad. Period.', a: 'Tanvi M.', e: 'Vol. 06 attendee'},
    {q: 'Sound, food, vibe — Akan nailed every part of it.', a: 'Rohan S.', e: 'Vol. 05 attendee'},
    {q: 'Booked again before the encore ended.', a: 'Mira K.', e: 'Vol. 06 attendee'},
  ];
  return (
    <div style={{marginTop: 36}}>
      <div style={{padding: '0 24px'}}>
        <Mono style={{fontSize: 10, color: C.terra}}>Past Shows</Mono>
        <h2 style={{margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: C.cream, letterSpacing: '-0.02em'}}>
          What guests are saying
        </h2>
      </div>
      <div style={{display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 24px 4px', scrollbarWidth: 'none'}}>
        {r.map((x, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 250, background: C.surface,
            border: `1px solid ${C.hairline}`, borderRadius: 14, padding: 18,
          }}>
            <div style={{fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', color: C.cream, lineHeight: 1.3, fontWeight: 300}}>
              "{x.q}"
            </div>
            <div style={{marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.hairline}`}}>
              <div style={{fontSize: 12, color: C.cream, fontWeight: 500}}>{x.a}</div>
              <Mono style={{fontSize: 9, color: C.muted, display: 'block', marginTop: 2}}>{x.e}</Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Venue() {
  return (
    <div style={{padding: '0 24px', marginTop: 36}}>
      <Mono style={{fontSize: 10, color: C.terra}}>The Venue</Mono>
      <h2 style={{margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: C.cream, letterSpacing: '-0.02em'}}>
        Akan, Madhapur
      </h2>
      {/* map placeholder */}
      <div style={{
        height: 140, borderRadius: 14, position: 'relative', overflow: 'hidden',
        background: `repeating-linear-gradient(45deg, ${C.surface} 0 10px, ${C.surface2} 10px 20px)`,
        border: `1px solid ${C.hairline}`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 60% 50%, ${C.terra}33 0%, transparent 40%)`,
        }}/>
        <div style={{
          position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%, -50%)',
          width: 18, height: 18, borderRadius: 999, background: C.terra,
          boxShadow: '0 0 0 6px rgba(201,81,46,0.25), 0 0 0 14px rgba(201,81,46,0.12)',
        }}/>
        <Mono style={{
          position: 'absolute', top: 12, left: 14, fontSize: 9, color: C.muted,
        }}>Map preview</Mono>
      </div>
      <div style={{marginTop: 14, fontSize: 14, color: C.creamDim, lineHeight: 1.5}}>
        Opp. Durgam Cheruvu, Madhapur, Hyderabad
      </div>
      <div style={{display: 'flex', gap: 8, marginTop: 14}}>
        <a href="#" style={{
          flex: 1, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.hairline}`,
          color: C.cream, textDecoration: 'none', textAlign: 'center',
          fontSize: 13, fontWeight: 500,
        }}>Open in Maps</a>
        <a href="tel:9649652222" style={{
          flex: 1, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.hairline}`,
          color: C.cream, textDecoration: 'none', textAlign: 'center',
          fontSize: 13, fontWeight: 500,
        }}>Call ‧ +91 96496 52222</a>
      </div>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = React.useState(0);
  const items = [
    ['Is the cover charge per person?', 'Yes. ₹1,500 per person, fully redeemable on food and beverage at your table.'],
    ['Can I book a smaller table?', 'Tables seat 2, 4, 6, or 8. Tell us your party size on the next screen and we\'ll arrange the right table.'],
    ['Is there a dress code?', 'Smart casual. No shorts or slippers after 8 PM.'],
    ['Cancellation policy?', 'Free cancellation up to 24 hrs before the event.'],
  ];
  return (
    <div style={{padding: '0 24px', marginTop: 36}}>
      <Mono style={{fontSize: 10, color: C.terra}}>Good to know</Mono>
      <h2 style={{margin: '10px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 26, color: C.cream, letterSpacing: '-0.02em'}}>
        Questions, answered
      </h2>
      <div>
        {items.map(([q, a], i) => (
          <div key={i} style={{borderBottom: `1px solid ${C.hairline}`}}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                width: '100%', padding: '16px 0', background: 'transparent', border: 'none',
                color: C.cream, fontSize: 14, fontFamily: 'Inter', fontWeight: 500,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span>{q}</span>
              <span style={{
                color: C.terra, fontSize: 18, transition: 'transform 0.2s',
                transform: open === i ? 'rotate(45deg)' : 'rotate(0)',
              }}>+</span>
            </button>
            {open === i && (
              <div style={{paddingBottom: 16, color: C.creamDim, fontSize: 13, lineHeight: 1.55}}>
                {a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{padding: '40px 24px 120px', textAlign: 'center'}}>
      <div style={{fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 22, color: C.cream}}>akan</div>
      <Mono style={{fontSize: 9, color: C.muted, marginTop: 8, display: 'block'}}>
        Madhapur · Hyderabad · est. 2024
      </Mono>
      <div style={{marginTop: 16, display: 'flex', gap: 14, justifyContent: 'center', fontSize: 11, color: C.muted}}>
        <a href="#" style={{color: 'inherit'}}>Instagram</a>
        <a href="#" style={{color: 'inherit'}}>Menu</a>
        <a href="#" style={{color: 'inherit'}}>Privacy</a>
      </div>
    </div>
  );
}

function StickyBar({onCTA, tablesLeft, theme}) {
  const T = THEMES[theme] || THEMES.dark;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
      padding: '14px 16px 28px',
      background: T.isDark
        ? 'linear-gradient(180deg, rgba(26,13,8,0) 0%, rgba(26,13,8,0.95) 30%, rgba(26,13,8,1) 100%)'
        : 'linear-gradient(180deg, rgba(248,243,236,0) 0%, rgba(248,243,236,0.95) 30%, rgba(248,243,236,1) 100%)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontSize: 13, fontFamily: 'Inter', color: T.cream, fontWeight: 600, lineHeight: 1.2}}>
            ₹1,500 <span style={{color: T.muted, fontWeight: 400, fontSize: 11}}>redeemable / pp</span>
          </div>
          <Mono style={{fontSize: 9, color: T.terra, marginTop: 3, display: 'block'}}>
            ● {tablesLeft} tables left
          </Mono>
        </div>
        <button
          onClick={onCTA}
          style={{
            flex: 1.4, padding: '14px 18px', borderRadius: 12, border: 'none',
            background: T.terra, color: '#f6efe6', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, fontFamily: 'Inter',
            boxShadow: `0 8px 20px -6px ${T.terra}80`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Reserve a table
          <span style={{fontSize: 16}}>→</span>
        </button>
      </div>
    </div>
  );
}

function EventPage({tweaks, onCTA, tablesLeft, target, theme}) {
  C = THEMES[theme] || THEMES.dark;
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto', position: 'relative',
      background: C.bg, color: C.cream,
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Sticky background covers full viewport, sits behind scrolling content */}
      <div style={{position: 'sticky', top: 0, height: 0, zIndex: 0}}>
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '100vh', pointerEvents: 'none'}}>
          <BgScene theme={theme}/>
        </div>
      </div>
      <div style={{position: 'relative', zIndex: 1}}>
      <Header theme={theme} onToggleTheme={() => window.dispatchEvent(new CustomEvent('akan-toggle-theme'))}/>
      <HeroPoster tweaks={tweaks} onCTA={onCTA} tablesLeft={tablesLeft}/>
      <TitleBlock/>
      <FactsBlock/>
      <CountdownBlock target={target}/>
      <AboutBand/>
      <Scarcity tablesLeft={tablesLeft}/>
      <Reviews/>
      <Venue/>
      <FAQ/>
      <Footer/>
      </div>
    </div>
  );
}

window.AkanThemes = THEMES;
window.EventPage = EventPage;
window.AkanColors = C;
window.AkanStickyBar = StickyBar;
