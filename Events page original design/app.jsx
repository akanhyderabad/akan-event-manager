// App: iOS frame + event page + sticky bar + booking modal + tweaks
const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "accent": "#c9512e",
  "tablesLeft": 6,
  "showCountdown": true,
  "showScarcity": true,
  "ctaCopy": "Reserve a table",
  "theme": "dark"
}/*EDITMODE-END*/;

function TweaksUI({tweaks, setTweak}) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Appearance">
        <TweakRadio
          label="Theme"
          value={tweaks.theme}
          options={[{label: 'Dark', value: 'dark'}, {label: 'Light', value: 'light'}]}
          onChange={v => setTweak('theme', v)}
        />
      </TweakSection>
      <TweakSection label="Brand">
        <TweakColor
          label="Accent"
          value={tweaks.accent}
          options={['#c9512e', '#7a4a2c', '#1f4d4a', '#0e0e0e']}
          onChange={v => setTweak('accent', v)}
        />
      </TweakSection>
      <TweakSection label="Conversion">
        <TweakSlider label="Tables remaining" value={tweaks.tablesLeft} min={1} max={20} step={1} onChange={v => setTweak('tablesLeft', v)}/>
        <TweakText label="CTA copy" value={tweaks.ctaCopy} onChange={v => setTweak('ctaCopy', v)}/>
        <TweakToggle label="Countdown" value={tweaks.showCountdown} onChange={v => setTweak('showCountdown', v)}/>
        <TweakToggle label="Scarcity bar" value={tweaks.showScarcity} onChange={v => setTweak('showScarcity', v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRoot/>);

function AppRoot() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULS);
  React.useEffect(() => {
    window.AkanColors.terra = tweaks.accent;
    window.AkanThemes.dark.terra = tweaks.accent;
  }, [tweaks.accent]);

  // Header toggle dispatches event; we listen and flip theme tweak
  React.useEffect(() => {
    function handler() { setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark'); }
    window.addEventListener('akan-toggle-theme', handler);
    return () => window.removeEventListener('akan-toggle-theme', handler);
  }, [tweaks.theme]);

  return (
    <>
      <AppWithTweaks tweaks={tweaks}/>
      <TweaksUI tweaks={tweaks} setTweak={setTweak}/>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.4); } }
        ::-webkit-scrollbar { display: none; }

      /* Sweeping conic spotlight beams */
      @keyframes beamSweepA {
        0%, 100% { transform: rotate(-12deg); opacity: 0.85; }
        45% { transform: rotate(18deg); opacity: 1; }
        50% { transform: rotate(20deg); opacity: 0.4; }
        55% { transform: rotate(18deg); opacity: 1; }
      }
      @keyframes beamSweepB {
        0%, 100% { transform: rotate(10deg); opacity: 0.7; }
        50% { transform: rotate(-15deg); opacity: 1; }
      }
      @keyframes beamSweepC {
        0%, 100% { transform: rotate(-8deg); opacity: 0.5; }
        30% { transform: rotate(8deg); opacity: 0.9; }
        60% { transform: rotate(-4deg); opacity: 1; }
      }

      /* Color wash pulses */
      @keyframes washA {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes washB {
        0%, 100% { opacity: 0.5; }
        40% { opacity: 1; }
      }

      /* Quick strobe flash a few times per cycle */
      @keyframes strobe {
        0%, 100% { opacity: 0; }
        12%, 12.4% { opacity: 0; }
        12.5% { opacity: 0.18; }
        12.7% { opacity: 0; }
        13% { opacity: 0.14; }
        13.2% { opacity: 0; }
        62% { opacity: 0; }
        62.2% { opacity: 0.18; }
        62.4% { opacity: 0; }
        62.6% { opacity: 0.12; }
        62.8% { opacity: 0; }
      }

      /* Floor pool drift */
      @keyframes floorPoolA {
        0%, 100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(60px,-20px) scale(1.2); }
      }
      @keyframes floorPoolB {
        0%, 100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(-50px,-30px) scale(1.15); }
      }

      /* Dust particles drifting up */
      @keyframes dust {
        0% { transform: translateY(0); opacity: 0; }
        15% { opacity: 0.8; }
        85% { opacity: 0.6; }
        100% { transform: translateY(-100vh); opacity: 0; }
      }

      /* Disco ball */
      @keyframes ballSwing {
        0%, 100% { transform: translateX(-50%) rotate(-3deg); }
        50% { transform: translateX(-50%) rotate(3deg); }
      }
      @keyframes ballSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes ballHalo {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes facetTwinkle {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      /* Sharpy beams rotating + pulsing */
      @keyframes sharpyRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes sharpyPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      `}</style>
    </>
  );
}

function AppWithTweaks({tweaks}) {
  const [open, setOpen] = React.useState(false);
  const target = React.useMemo(() => Date.now() + 3 * 86400000 + 6 * 3600000 + 12 * 60000, []);
  const theme = tweaks.theme || 'dark';
  const bg = theme === 'dark' ? '#1a0d08' : '#f8f3ec';
  return (
    <div className="stage">
      <div>
        <div className="label">Akan · Mobile event page ({theme})</div>
        <IOSDevice width={402} height={874} dark={theme === 'dark'}>
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: bg}}>
            <EventPage tweaks={tweaks} onCTA={() => setOpen(true)} tablesLeft={tweaks.tablesLeft} target={target} theme={theme}/>
            <AkanStickyBar onCTA={() => setOpen(true)} tablesLeft={tweaks.tablesLeft} ctaCopy={tweaks.ctaCopy} theme={theme}/>
            <BookingModal open={open} onClose={() => setOpen(false)} tablesLeft={tweaks.tablesLeft} theme={theme}/>
          </div>
        </IOSDevice>
      </div>
      <div>
        <div className="label">Booking flow — details step</div>
        <IOSDevice width={402} height={874} dark={theme === 'dark'}>
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: bg}}>
            <EventPage tweaks={tweaks} onCTA={() => {}} tablesLeft={tweaks.tablesLeft} target={target} theme={theme}/>
            <AkanStickyBar onCTA={() => {}} tablesLeft={tweaks.tablesLeft} ctaCopy={tweaks.ctaCopy} theme={theme}/>
            <BookingModal open={true} onClose={() => {}} tablesLeft={tweaks.tablesLeft} initialStep={1} initialName={"Priya"} initialMobile={"9876543210"} initialPax={4} theme={theme}/>
          </div>
        </IOSDevice>
      </div>
    </div>
  );
}
