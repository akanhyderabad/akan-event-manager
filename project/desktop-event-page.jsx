// Desktop event page layout. Uses THEMES + BgScene from event-page.jsx.
// All sections re-flowed for a wider canvas.

function DesktopPage({tweaks, onCTA, tablesLeft, target, theme}) {
  const T = window.AkanThemes[theme] || window.AkanThemes.dark;
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto', position: 'relative',
      background: T.bg, color: T.cream, fontFamily: 'Inter, system-ui, sans-serif',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* fixed bg behind everything */}
      <div style={{position: 'sticky', top: 0, height: 0, zIndex: 0}}>
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '100vh', pointerEvents: 'none'}}>
          <BgScene theme={theme}/>
        </div>
      </div>

      <div style={{position: 'relative', zIndex: 1}}>
        <DesktopNav T={T} theme={theme} onCTA={onCTA}/>
        <DesktopHero T={T} onCTA={onCTA} tablesLeft={tablesLeft} target={target}/>
        <DesktopAbout T={T}/>
        <DesktopScarcity T={T} tablesLeft={tablesLeft}/>
        <DesktopReviews T={T}/>
        <DesktopVenue T={T}/>
        <DesktopFAQ T={T}/>
        <DesktopFooter T={T}/>
      </div>
    </div>
  );
}

function DMono({children, style}) {
  return <span style={{fontFamily: 'Geist Mono, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', ...style}}>{children}</span>;
}

function DesktopNav({T, theme, onCTA}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      padding: '20px 56px',
      background: T.isDark ? 'rgba(26,13,8,0.6)' : 'rgba(248,243,236,0.7)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${T.hairline}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
        <div style={{fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 24, color: T.cream}}>akan</div>
        <div style={{display: 'flex', gap: 28, fontSize: 13, color: T.creamDim}}>
          {['Events', 'Menu', 'Gallery', 'About'].map(x => (
            <a key={x} href="#" style={{color: 'inherit', textDecoration: 'none', position: 'relative'}}>{x}</a>
          ))}
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('akan-toggle-theme'))} title="Toggle theme" style={{
          width: 36, height: 36, borderRadius: 999, border: `1px solid ${T.hairline}`,
          background: T.softTint, color: T.cream, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <button onClick={onCTA} style={{
          padding: '10px 18px', borderRadius: 10, background: T.terra, color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter',
          boxShadow: `0 6px 16px -6px ${T.terra}80`,
          whiteSpace: 'nowrap',
        }}>Reserve a table</button>
      </div>
    </div>
  );
}

function CountdownLarge({target, T}) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms % 86400000 / 3600000);
  const m = Math.floor(ms % 3600000 / 60000);
  const s = Math.floor(ms % 60000 / 1000);
  const cell = (n, label) => (
    <div style={{textAlign: 'center'}}>
      <div style={{fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 42, color: T.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'}}>
        {String(n).padStart(2, '0')}
      </div>
      <DMono style={{fontSize: 10, color: T.muted, marginTop: 8, display: 'block'}}>{label}</DMono>
    </div>
  );
  const sep = <div style={{color: T.muted, fontFamily: 'Fraunces, serif', fontSize: 36, opacity: 0.3, alignSelf: 'flex-start', lineHeight: 1}}>:</div>;
  return (
    <div style={{display: 'flex', gap: 18, alignItems: 'flex-start'}}>
      {cell(d, 'days')}{sep}{cell(h, 'hrs')}{sep}{cell(m, 'min')}{sep}{cell(s, 'sec')}
    </div>
  );
}

function DesktopHero({T, onCTA, tablesLeft, target}) {
  return (
    <div style={{padding: '56px 56px 80px', display: 'grid', gridTemplateColumns: '560px 1fr', gap: 56, alignItems: 'center'}}>
      {/* left: poster */}
      <div style={{
        borderRadius: 22, overflow: 'hidden', position: 'relative',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <Poster scale={1.4} palette={{bg: '#2a1810', terra: T.terra, cream: '#f6efe6', dark: '#1a0d08'}}/>
        <button style={{
          position: 'absolute', bottom: 18, right: 18, padding: '9px 14px 9px 11px',
          borderRadius: 999, background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.18)', color: '#f6efe6',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontFamily: 'Geist Mono, monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4z"/></svg>
          Watch trailer
        </button>
      </div>

      {/* right: content */}
      <div>
        <DMono style={{fontSize: 11, color: T.terra}}>Live Music · Vol. 07 · Akan presents</DMono>
        <h1 style={{
          margin: '16px 0 0',
          fontFamily: 'Fraunces, serif', fontWeight: 400,
          fontSize: 76, lineHeight: 0.95, letterSpacing: '-0.03em',
          color: T.cream, textWrap: 'balance',
        }}>
          The Infusion<br/>
          <em style={{fontWeight: 300, color: T.terra}}>homecoming</em> show
        </h1>
        <p style={{
          margin: '22px 0 0', color: T.creamDim, fontSize: 17, lineHeight: 1.55,
          maxWidth: 520, textWrap: 'pretty',
        }}>
          Eight-piece live band, three vocalists, one unforgettable Saturday night at Akan. The band is back home after three years.
        </p>

        {/* facts row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
          marginTop: 36, paddingTop: 24, borderTop: `1px solid ${T.hairline}`,
        }}>
          {[
            {label: 'Date', value: 'Sat, 02 May 2026'},
            {label: 'Doors open', value: '9:00 PM onwards'},
            {label: 'Venue', value: 'Akan · Madhapur'},
          ].map((f, i) => (
            <div key={i} style={{borderLeft: i > 0 ? `1px solid ${T.hairline}` : 'none', paddingLeft: i > 0 ? 24 : 0}}>
              <DMono style={{fontSize: 10, color: T.muted, display: 'block'}}>{f.label}</DMono>
              <div style={{fontFamily: 'Inter', fontWeight: 500, color: T.cream, fontSize: 16, marginTop: 6}}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* countdown */}
        <div style={{marginTop: 32, padding: '20px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <DMono style={{fontSize: 10, color: T.muted}}>Doors open in</DMono>
          <CountdownLarge target={target} T={T}/>
        </div>

        {/* CTA + scarcity */}
        <div style={{marginTop: 28, display: 'flex', alignItems: 'center', gap: 16}}>
          <button onClick={onCTA} style={{
            padding: '18px 32px', borderRadius: 12, background: T.terra, color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: 'Inter',
            boxShadow: `0 12px 28px -8px ${T.terra}99`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Reserve a table
            <span style={{fontSize: 18}}>→</span>
          </button>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: T.terra, letterSpacing: '0.15em', textTransform: 'uppercase'}}>
              <span style={{width: 7, height: 7, borderRadius: 999, background: T.terra, animation: 'pulse 1.6s ease-in-out infinite'}}/>
              Only {tablesLeft} tables left
            </div>
            <div style={{fontSize: 12, color: T.muted, marginTop: 6}}>Pay just ₹50/head to lock it in →</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopAbout({T}) {
  return (
    <div style={{padding: '80px 56px', borderTop: `1px solid ${T.hairline}`}}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start'}}>
        <div>
          <DMono style={{fontSize: 10, color: T.terra}}>The Band</DMono>
          <h2 style={{
            margin: '14px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400,
            fontSize: 52, color: T.cream, lineHeight: 1, letterSpacing: '-0.025em',
          }}>
            Eight musicians.<br/>
            <em style={{fontWeight: 300, color: T.creamDim}}>One reunion show.</em>
          </h2>
        </div>
        <div>
          <p style={{color: T.creamDim, fontSize: 17, lineHeight: 1.6, margin: 0, maxWidth: 580, textWrap: 'pretty'}}>
            Infusion last played Hyderabad in 2022. They're coming home for one Saturday night —
            a setlist that moves from Bollywood retro to indie originals to a horn-heavy second half
            you'll be talking about for weeks.
          </p>
          <div style={{display: 'flex', gap: 40, marginTop: 32}}>
            {[
              {n: '3', l: 'Vocalists'},
              {n: '8', l: 'Members'},
              {n: '90', l: 'Minute set'},
              {n: '07', l: 'Vol. of Akan Live'},
            ].map((s, i) => (
              <div key={i}>
                <div style={{fontFamily: 'Fraunces, serif', fontSize: 48, color: T.terra, lineHeight: 1, fontWeight: 500}}>
                  {s.n}
                </div>
                <DMono style={{fontSize: 10, color: T.muted, marginTop: 8, display: 'block'}}>{s.l}</DMono>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopScarcity({T, tablesLeft}) {
  const total = 24;
  const taken = total - tablesLeft;
  const pct = (taken / total) * 100;
  return (
    <div style={{padding: '40px 56px'}}>
      <div style={{
        background: T.surface, border: `1px solid ${T.hairline}`,
        borderRadius: 18, padding: '28px 32px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center',
      }}>
        <div>
          <DMono style={{fontSize: 10, color: T.terra}}>Filling Fast</DMono>
          <div style={{marginTop: 10, fontFamily: 'Fraunces, serif', fontSize: 28, color: T.cream, letterSpacing: '-0.02em'}}>
            <strong style={{fontWeight: 500}}>{tablesLeft} tables remaining</strong>
            <span style={{color: T.muted, fontWeight: 300, fontStyle: 'italic'}}> · past three sold out 5+ days early</span>
          </div>
        </div>
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
            <DMono style={{fontSize: 10, color: T.muted}}>{taken} booked</DMono>
            <DMono style={{fontSize: 10, color: T.muted}}>{total} total</DMono>
          </div>
          <div style={{height: 8, borderRadius: 999, background: T.progressTrack, overflow: 'hidden'}}>
            <div style={{width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${T.terra}, #e76a3d)`, borderRadius: 999}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopReviews({T}) {
  const r = [
    {q: 'Best live music night in Hyderabad. Period.', a: 'Tanvi M.', e: 'Vol. 06 attendee'},
    {q: 'Sound, food, vibe — Akan nailed every part of it.', a: 'Rohan S.', e: 'Vol. 05 attendee'},
    {q: 'Booked again before the encore ended.', a: 'Mira K.', e: 'Vol. 06 attendee'},
  ];
  return (
    <div style={{padding: '60px 56px 80px'}}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36}}>
        <div>
          <DMono style={{fontSize: 10, color: T.terra}}>Past Shows</DMono>
          <h2 style={{margin: '12px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em'}}>
            What guests are saying
          </h2>
        </div>
        <a href="#" style={{color: T.creamDim, fontSize: 13, textDecoration: 'none', borderBottom: `1px solid ${T.hairline}`, paddingBottom: 2}}>See gallery →</a>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20}}>
        {r.map((x, i) => (
          <div key={i} style={{
            background: T.surface, border: `1px solid ${T.hairline}`,
            borderRadius: 16, padding: '32px 28px',
          }}>
            <div style={{color: T.terra, fontFamily: 'Fraunces, serif', fontSize: 48, lineHeight: 0.5, marginBottom: 12}}>"</div>
            <div style={{fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', color: T.cream, lineHeight: 1.3, fontWeight: 300, textWrap: 'pretty'}}>
              {x.q}
            </div>
            <div style={{marginTop: 24, paddingTop: 18, borderTop: `1px solid ${T.hairline}`}}>
              <div style={{fontSize: 14, color: T.cream, fontWeight: 500}}>{x.a}</div>
              <DMono style={{fontSize: 10, color: T.muted, display: 'block', marginTop: 3}}>{x.e}</DMono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopVenue({T}) {
  return (
    <div style={{padding: '60px 56px', borderTop: `1px solid ${T.hairline}`}}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 56, alignItems: 'center'}}>
        <div>
          <DMono style={{fontSize: 10, color: T.terra}}>The Venue</DMono>
          <h2 style={{margin: '14px 0 16px', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em'}}>
            Akan, Madhapur
          </h2>
          <p style={{color: T.creamDim, fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 440}}>
            Opp. Durgam Cheruvu. Valet parking on-site. Smart casual — no shorts or slippers after 8 PM.
          </p>
          <div style={{display: 'flex', gap: 12, marginTop: 28}}>
            <a href="#" style={{padding: '12px 18px', borderRadius: 10, background: T.softTint, border: `1px solid ${T.hairline}`, color: T.cream, textDecoration: 'none', fontSize: 13, fontWeight: 500}}>Open in Maps</a>
            <a href="tel:9649652222" style={{padding: '12px 18px', borderRadius: 10, background: T.softTint, border: `1px solid ${T.hairline}`, color: T.cream, textDecoration: 'none', fontSize: 13, fontWeight: 500}}>Call · +91 96496 52222</a>
          </div>
        </div>
        <div style={{
          height: 280, borderRadius: 18, position: 'relative', overflow: 'hidden',
          background: `repeating-linear-gradient(45deg, ${T.surface} 0 12px, ${T.surface2} 12px 24px)`,
          border: `1px solid ${T.hairline}`,
        }}>
          <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 60% 50%, ${T.terra}33 0%, transparent 40%)`}}/>
          <div style={{
            position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%, -50%)',
            width: 22, height: 22, borderRadius: 999, background: T.terra,
            boxShadow: `0 0 0 8px ${T.terra}40, 0 0 0 18px ${T.terra}1f`,
          }}/>
          <DMono style={{position: 'absolute', top: 16, left: 18, fontSize: 10, color: T.muted}}>Map preview</DMono>
        </div>
      </div>
    </div>
  );
}

function DesktopFAQ({T}) {
  const [open, setOpen] = React.useState(0);
  const items = [
    ['Is the cover charge per person?', 'Yes. ₹1,500 per person, fully redeemable on food and beverage at your table. The early-bird ₹50/head is a discounted booking fee, also redeemable.'],
    ['Can I book a smaller table?', 'Tables seat 2, 4, 6, or 8. Tell us your party size and we\'ll arrange the right table.'],
    ['Is there a dress code?', 'Smart casual. No shorts or slippers after 8 PM.'],
    ['Cancellation policy?', 'Free cancellation up to 24 hrs before the event. Refunds processed within 5 business days.'],
    ['Do you have a parking facility?', 'Yes — valet parking on-site, complimentary for table bookings.'],
  ];
  return (
    <div style={{padding: '60px 56px', borderTop: `1px solid ${T.hairline}`}}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 56, alignItems: 'start'}}>
        <div>
          <DMono style={{fontSize: 10, color: T.terra}}>Good to know</DMono>
          <h2 style={{margin: '14px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 44, color: T.cream, letterSpacing: '-0.025em'}}>
            Questions,<br/>
            <em style={{fontWeight: 300, color: T.creamDim}}>answered</em>
          </h2>
        </div>
        <div>
          {items.map(([q, a], i) => (
            <div key={i} style={{borderBottom: `1px solid ${T.hairline}`}}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{
                width: '100%', padding: '22px 0', background: 'transparent', border: 'none',
                color: T.cream, fontSize: 17, fontFamily: 'Inter', fontWeight: 500,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span>{q}</span>
                <span style={{color: T.terra, fontSize: 22, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'rotate(0)'}}>+</span>
              </button>
              {open === i && (
                <div style={{paddingBottom: 22, color: T.creamDim, fontSize: 15, lineHeight: 1.6, maxWidth: 620}}>{a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopFooter({T}) {
  return (
    <div style={{padding: '60px 56px 48px', borderTop: `1px solid ${T.hairline}`, marginTop: 40}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <div>
          <div style={{fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 36, color: T.cream}}>akan</div>
          <DMono style={{fontSize: 10, color: T.muted, marginTop: 10, display: 'block'}}>Madhapur · Hyderabad · est. 2024</DMono>
        </div>
        <div style={{display: 'flex', gap: 28, fontSize: 13, color: T.muted}}>
          {['Instagram', 'Menu', 'Gallery', 'Past Events', 'Privacy'].map(x => (
            <a key={x} href="#" style={{color: 'inherit', textDecoration: 'none'}}>{x}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

window.DesktopPage = DesktopPage;
