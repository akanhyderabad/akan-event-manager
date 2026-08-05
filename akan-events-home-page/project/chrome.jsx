// Akan Events — Header, Hero, Golden Hour divider, Footer.

const { useState, useEffect, useRef } = React;

// ─── Header ──────────────────────────────────────────────────────────────────

function AkanHeader({ mode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);
  const dark = mode === 'night';
  const closeAnd = (action) => () => { setMenuOpen(false); action && action(); };
  return (
    <>
      <header className={`ak-hdr ${scrolled ? 'is-scrolled' : ''} ${dark ? 'is-dark' : ''}`}>
        <div className="ak-hdr-inner">
          <a className="ak-mark" href="#top" aria-label="Akan home">
            <span className="ak-mark-word">Akan</span>
            <span className="ak-mark-dot" aria-hidden="true">·</span>
            <span className="ak-mark-sub">Hyderabad</span>
          </a>
          <nav className="ak-nav" aria-label="Primary">
            <a href="#" className="ak-nav-a">Explore</a>
            <a href="#" className="ak-nav-a">Menu</a>
            <a href="#events" className="ak-nav-a is-active">Events</a>
            <a href="#" className="ak-nav-a">About</a>
          </nav>
          <div className="ak-hdr-right">
            <a className="ak-cta" href="#reserve">
              <span>Reserve</span>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 5h7M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <button
              className={`ak-burger ${menuOpen ? 'is-open' : ''}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`ak-drawer-scrim ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`ak-drawer ${menuOpen ? 'is-open' : ''} ${dark ? 'is-dark' : ''}`} aria-hidden={!menuOpen}>
        <div className="ak-drawer-head">
          <span className="ak-drawer-mark">
            <span className="ak-mark-word">Akan</span>
            <span className="ak-mark-dot" aria-hidden="true">·</span>
            <span className="ak-mark-sub">Hyderabad</span>
          </span>
          <button className="ak-drawer-x" aria-label="Close" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <nav className="ak-drawer-nav" aria-label="Mobile">
          <a href="#" onClick={closeAnd()}>Explore</a>
          <a href="#" onClick={closeAnd()}>Menu</a>
          <a href="#events" onClick={closeAnd()}>Events</a>
          <a href="#" onClick={closeAnd()}>About</a>
        </nav>
        <div className="ak-drawer-sub">
          <a href="#by-day" onClick={closeAnd()} className="ak-drawer-sub-a">
            <span className="ak-drawer-sub-eye">By Day</span>
            <span className="ak-drawer-sub-t">Brunch &amp; workshops</span>
          </a>
          <a href="#by-night" onClick={closeAnd()} className="ak-drawer-sub-a">
            <span className="ak-drawer-sub-eye">By Night</span>
            <span className="ak-drawer-sub-t">Live music &amp; DJs</span>
          </a>
        </div>
        <div className="ak-drawer-foot">
          <a className="ak-drawer-call" href="tel:+919649652222">
            <span>Call to reserve</span>
            <strong>+91 9649 65 2222</strong>
          </a>
        </div>
      </aside>
    </>
  );
}

// ─── Hero — dual vibe at a glance ────────────────────────────────────────────

function Hero({ onJumpDay, onJumpNight }) {
  return (
    <section className="ak-hero" id="top">
      <div className="ak-hero-tag">
        <span className="ak-dot ak-dot-day" /> Events at Akan · Summer 2026
      </div>
      <h1 className="ak-hero-h1">
        Embrace
        <span className="ak-hero-italic"> the delightful</span>
        <span className="ak-hero-mark">,</span>
        {' '}morning <span className="ak-hero-amp">&amp;</span> midnight.
      </h1>
      <p className="ak-hero-sub">
        Slow brunches and hands-on workshops by day. Live bands and DJ sets by night.
      </p>

      <div className="ak-hero-jumps">
        <button className="ak-jump ak-jump-day" onClick={onJumpDay}>
          <span className="ak-jump-dot ak-jump-dot-day" aria-hidden="true" />
          <span className="ak-jump-label">By Day</span>
          <span className="ak-jump-sub">Brunch &amp; workshops</span>
        </button>
        <span className="ak-jump-sep" aria-hidden="true" />
        <button className="ak-jump ak-jump-night" onClick={onJumpNight}>
          <span className="ak-jump-dot ak-jump-dot-night" aria-hidden="true" />
          <span className="ak-jump-label">By Night</span>
          <span className="ak-jump-sub">Live music &amp; late nights</span>
        </button>
      </div>
    </section>
  );
}

// ─── Golden Hour transition ──────────────────────────────────────────────────

function GoldenHour() {
  return (
    <div className="ak-golden" aria-hidden="true">
      <div className="ak-golden-strip" />
      <div className="ak-golden-line">
        <span className="ak-golden-time">17:42</span>
        <span className="ak-golden-tick" />
        <span className="ak-golden-label">as the light goes soft</span>
        <span className="ak-golden-tick" />
        <span className="ak-golden-time">19:08</span>
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function AkanFooter() {
  return (
    <footer className="ak-foot" id="reserve">
      <div className="ak-foot-top">
        <div className="ak-foot-pitch">
          <span className="ak-foot-eyebrow">Reservations</span>
          <h2 className="ak-foot-h">
            Come for the <em>brunch</em>. Stay for the <em>band</em>.
          </h2>
          <a className="ak-foot-btn" href="tel:+919649652222">
            <span>Reserve a table</span>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 7h9M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <div className="ak-foot-tel">or call +91 9649 65 2222</div>
        </div>
        <div className="ak-foot-cols">
          <div className="ak-foot-col">
            <span className="ak-foot-col-h">Find us</span>
            <p>
              Opp. Durgam Cheruvu<br />
              Madhapur, Hyderabad — 500081
            </p>
          </div>
          <div className="ak-foot-col">
            <span className="ak-foot-col-h">Hours</span>
            <p>
              Sun — Thu &nbsp; 12:00 — 24:00<br />
              Fri — Sat &nbsp; 12:00 — 01:00
            </p>
          </div>
          <div className="ak-foot-col">
            <span className="ak-foot-col-h">Enquiries</span>
            <p>
              <a href="mailto:sales@akanhyd.com">sales@akanhyd.com</a><br />
              Private events &amp; corporate
            </p>
          </div>
          <div className="ak-foot-col">
            <span className="ak-foot-col-h">Follow</span>
            <p>
              <a href="#">Instagram</a><br />
              <a href="#">Facebook</a><br />
              <a href="#">YouTube</a>
            </p>
          </div>
        </div>
      </div>
      <div className="ak-foot-base">
        <span>© 2026 NVR Hotels &amp; Caterers Pvt Ltd</span>
        <span className="ak-foot-base-links">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Refunds</a>
        </span>
      </div>
    </footer>
  );
}

Object.assign(window, { AkanHeader, Hero, GoldenHour, AkanFooter });
