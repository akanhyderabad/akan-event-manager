// Akan Events — main App + Tweaks panel.

const { useState: useS4, useEffect: useE4, useMemo: useM4 } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#c96c4a", "#b15a3b"],
  "accentName": "Terracotta"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  { name: 'Terracotta', solid: '#c96c4a', deep: '#b15a3b' },
  { name: 'Sapphire',   solid: '#3a6da3', deep: '#2a4f7a' },
  { name: 'Olive',      solid: '#7b8649', deep: '#5d6736' },
  { name: 'Plum',       solid: '#8a4264', deep: '#6c3450' },
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [modalEvent, setModalEvent] = useS4(null);
  const [mode, setMode] = useS4('day'); // mode the header should adapt to

  // Apply accent color to CSS variables on the root.
  useE4(() => {
    const sel = ACCENT_OPTIONS.find((o) => o.name === t.accentName) || ACCENT_OPTIONS[0];
    document.documentElement.style.setProperty('--ak-accent', sel.solid);
    document.documentElement.style.setProperty('--ak-accent-deep', sel.deep);
  }, [t.accentName]);

  // Watch which section is in view so the header tints accordingly.
  useE4(() => {
    const dayEl = document.getElementById('by-day');
    const nightEl = document.getElementById('by-night');
    if (!dayEl || !nightEl) return;
    const onScroll = () => {
      const nightTop = nightEl.getBoundingClientRect().top;
      // Switch to night when the night section's top crosses 30% of the viewport.
      setMode(nightTop < window.innerHeight * 0.3 ? 'night' : 'day');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const jumpDay = () => document.getElementById('by-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const jumpNight = () => document.getElementById('by-night')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const accentSelected = t.accentName || 'Terracotta';

  return (
    <div className={`ak-app ak-mode-${mode}`}>
      <AkanHeader mode={mode} />
      <main className="ak-main" id="events">
        <Hero onJumpDay={jumpDay} onJumpNight={jumpNight} />
        <DaySection onOpen={setModalEvent} />
        <GoldenHour />
        <NightSection onOpen={setModalEvent} />
        <SeasonalStrip />
      </main>
      <AkanFooter />
      <EventModal event={modalEvent} onClose={() => setModalEvent(null)} />

      <TweaksPanel>
        <TweakSection label="Accent" />
        <div className="ak-tweak-row">
          {ACCENT_OPTIONS.map((o) => (
            <button
              key={o.name}
              className={`ak-tweak-swatch ${accentSelected === o.name ? 'is-on' : ''}`}
              style={{ background: o.solid }}
              onClick={() => setTweak({ accentName: o.name })}
              title={o.name}
              aria-label={o.name}
            >
              <span style={{ background: o.deep }} />
            </button>
          ))}
        </div>
        <div className="ak-tweak-name">{accentSelected}</div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
