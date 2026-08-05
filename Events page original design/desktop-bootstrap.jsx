// Desktop app entry
const DESKTOP_TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "#c9512e",
  "tablesLeft": 6,
  "ctaCopy": "Reserve a table",
  "theme": "dark"
}/*EDITMODE-END*/;

function DesktopTweaksUI({tweaks, setTweak}) {
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
      </TweakSection>
    </TweaksPanel>
  );
}

function DesktopAppRoot() {
  const [tweaks, setTweak] = useTweaks(DESKTOP_TWEAKS);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    window.AkanColors.terra = tweaks.accent;
    window.AkanThemes.dark.terra = tweaks.accent;
    window.AkanThemes.light.terra = tweaks.accent;
  }, [tweaks.accent]);

  React.useEffect(() => {
    function handler() { setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark'); }
    window.addEventListener('akan-toggle-theme', handler);
    return () => window.removeEventListener('akan-toggle-theme', handler);
  }, [tweaks.theme]);

  const target = React.useMemo(() => Date.now() + 3 * 86400000 + 6 * 3600000 + 12 * 60000, []);
  const theme = tweaks.theme || 'dark';

  return (
    <>
      <ChromeWindow
        width={1400}
        height={840}
        tabs={[{title: 'Akan · Infusion Homecoming'}]}
        url="akanhyd.com/event/band-infusion-homecoming-show"
      >
        <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: theme === 'dark' ? '#1a0d08' : '#f8f3ec'}}>
          <DesktopPage
            tweaks={tweaks}
            onCTA={() => setOpen(true)}
            tablesLeft={tweaks.tablesLeft}
            target={target}
            theme={theme}
          />
          <BookingModal
            open={open}
            onClose={() => setOpen(false)}
            tablesLeft={tweaks.tablesLeft}
            theme={theme}
            variant="dialog"
          />
        </div>
      </ChromeWindow>

      <DesktopTweaksUI tweaks={tweaks} setTweak={setTweak}/>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.4); } }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes beamSweepA { 0%, 100% { transform: rotate(-12deg); opacity: 0.85; } 45% { transform: rotate(18deg); opacity: 1; } 50% { transform: rotate(20deg); opacity: 0.4; } 55% { transform: rotate(18deg); opacity: 1; } }
        @keyframes beamSweepB { 0%, 100% { transform: rotate(10deg); opacity: 0.7; } 50% { transform: rotate(-15deg); opacity: 1; } }
        @keyframes beamSweepC { 0%, 100% { transform: rotate(-8deg); opacity: 0.5; } 30% { transform: rotate(8deg); opacity: 0.9; } 60% { transform: rotate(-4deg); opacity: 1; } }
        @keyframes washA { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes washB { 0%, 100% { opacity: 0.5; } 40% { opacity: 1; } }
        @keyframes strobe { 0%, 100% { opacity: 0; } 12%, 12.4% { opacity: 0; } 12.5% { opacity: 0.16; } 12.7% { opacity: 0; } 13% { opacity: 0.12; } 13.2% { opacity: 0; } 62% { opacity: 0; } 62.2% { opacity: 0.16; } 62.4% { opacity: 0; } 62.6% { opacity: 0.1; } 62.8% { opacity: 0; } }
        @keyframes floorPoolA { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-20px) scale(1.2); } }
        @keyframes floorPoolB { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,-30px) scale(1.15); } }
        @keyframes dust { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.8; } 85% { opacity: 0.6; } 100% { transform: translateY(-100vh); opacity: 0; } }
        @keyframes ballSwing { 0%, 100% { transform: translateX(-50%) rotate(-3deg); } 50% { transform: translateX(-50%) rotate(3deg); } }
        @keyframes ballSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ballHalo { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes facetTwinkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes sharpyRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sharpyPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DesktopAppRoot/>);
