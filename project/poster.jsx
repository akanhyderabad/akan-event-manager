// Stylized event poster placeholder (Infusion homecoming)
function Poster({ scale = 1, palette }) {
  const p = palette || { bg: '#2a1810', terra: '#c9512e', cream: '#f6efe6', dark: '#1a0d08' };
  return (
    <div style={{
      width: '100%', aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden',
      background: `radial-gradient(ellipse at 30% 20%, ${p.terra}88 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, ${p.terra}66 0%, transparent 50%), linear-gradient(180deg, ${p.bg} 0%, ${p.dark} 100%)`,
    }}>
      {/* grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22/><feColorMatrix values=%220 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.18 0%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/></svg>")',
        mixBlendMode: 'overlay', opacity: 0.5,
      }}/>
      {/* concentric circles */}
      <svg viewBox="0 0 400 500" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="40%">
            <stop offset="0%" stopColor={p.terra} stopOpacity="0.7"/>
            <stop offset="100%" stopColor={p.terra} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="200" cy="220" r="130" fill="none" stroke={p.cream} strokeOpacity="0.12" strokeWidth="1"/>
        <circle cx="200" cy="220" r="100" fill="none" stroke={p.cream} strokeOpacity="0.18" strokeWidth="1"/>
        <circle cx="200" cy="220" r="70" fill="none" stroke={p.cream} strokeOpacity="0.25" strokeWidth="1"/>
        <circle cx="200" cy="220" r="40" fill="url(#glow)"/>
      </svg>
      {/* type */}
      <div style={{
        position: 'absolute', inset: 0, padding: `${28*scale}px ${24*scale}px`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: p.cream,
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 9*scale, letterSpacing: '0.18em',
            textTransform: 'uppercase', opacity: 0.8, lineHeight: 1.6,
          }}>
            AKAN PRESENTS<br/>LIVE ∙ HOMECOMING<br/>02 ∙ 05 ∙ 26
          </div>
          <div style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 9*scale, letterSpacing: '0.18em',
            textTransform: 'uppercase', opacity: 0.8, textAlign: 'right', lineHeight: 1.6,
          }}>
            VOL. 07<br/>HYDERABAD
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: 'auto'}}>
          <div style={{
            fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic',
            fontSize: 22*scale, lineHeight: 1, opacity: 0.85, marginBottom: 6*scale,
          }}>the</div>
          <div style={{
            fontFamily: 'Fraunces, serif', fontWeight: 700,
            fontSize: 64*scale, lineHeight: 0.92, letterSpacing: '-0.03em',
            color: p.cream,
          }}>
            INFUSION
          </div>
          <div style={{
            fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic',
            fontSize: 28*scale, lineHeight: 1, marginTop: 4*scale, color: p.terra,
          }}>
            homecoming
          </div>
          <div style={{
            marginTop: 18*scale, fontFamily: 'Geist Mono, monospace',
            fontSize: 9*scale, letterSpacing: '0.25em', textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            ───  a live music night  ───
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginTop: 18*scale,
        }}>
          <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9*scale, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.6}}>
            9PM ONWARDS<br/>
            <span style={{opacity: 0.6}}>DURGAM CHERUVU</span>
          </div>
          <div style={{
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontWeight: 300,
            fontSize: 11*scale, opacity: 0.5, textAlign: 'right',
          }}>
            est. mmxxiv
          </div>
        </div>
      </div>
    </div>
  );
}

window.Poster = Poster;
