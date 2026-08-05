// Club lighting + central disco ball / sharpy moving-head fixture
function BgScene({theme}) {
  const dark = theme !== 'light';
  const beamA = dark ? 'rgba(201, 81, 46, 0.32)'  : 'rgba(184, 69, 31, 0.18)';
  const beamB = dark ? 'rgba(70, 140, 220, 0.22)' : 'rgba(70, 140, 220, 0.10)';
  const beamC = dark ? 'rgba(220, 70, 130, 0.22)' : 'rgba(180, 50, 110, 0.10)';

  // Build disco-ball facets — small mirrored squares on a sphere
  const facets = [];
  const rows = 8, cols = 14;
  for (let r = 0; r < rows; r++) {
    const phi = (r / (rows - 1)) * Math.PI; // 0..π
    const ringRadius = Math.sin(phi);
    const y = -Math.cos(phi);
    for (let c = 0; c < cols; c++) {
      const theta = (c / cols) * Math.PI * 2;
      const x = Math.cos(theta) * ringRadius;
      const z = Math.sin(theta) * ringRadius;
      facets.push({x, y, z, r, c});
    }
  }
  const ballSize = 90;
  const radius = ballSize / 2;

  // Sharpy beams emanating from the disco ball — many narrow rays
  const sharpyCount = 12;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      zIndex: 0,
    }}>
      {/* sweeping conic beams (kept) */}
      <div style={{
        position: 'absolute', top: '-30%', left: '-20%',
        width: '160%', height: '140%',
        background: `conic-gradient(from 200deg at 20% 0%, transparent 0deg, ${beamA} 8deg, transparent 18deg)`,
        filter: 'blur(2px)',
        animation: 'beamSweepA 7s ease-in-out infinite',
        transformOrigin: '20% 0%',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>
      <div style={{
        position: 'absolute', top: '-30%', right: '-20%',
        width: '160%', height: '140%',
        background: `conic-gradient(from 130deg at 80% 0%, transparent 0deg, ${beamB} 7deg, transparent 16deg)`,
        filter: 'blur(2px)',
        animation: 'beamSweepB 9s ease-in-out infinite',
        transformOrigin: '80% 0%',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>

      {/* Disco ball cluster — top center */}
      <div style={{
        position: 'absolute', top: '14%', left: '50%',
        transform: 'translateX(-50%)',
        width: ballSize, height: ballSize,
        animation: 'ballSwing 6s ease-in-out infinite',
        transformOrigin: 'top center',
      }}>
        {/* hanging cord */}
        <div style={{
          position: 'absolute', top: -50, left: '50%', width: 1, height: 50,
          background: dark ? 'rgba(246,239,230,0.25)' : 'rgba(26,13,8,0.25)',
          transform: 'translateX(-50%)',
        }}/>

        {/* glowing halo behind ball */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          animation: 'ballHalo 3s ease-in-out infinite',
        }}/>

        {/* the ball */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: dark
            ? 'radial-gradient(circle at 35% 30%, #4a3d35 0%, #1a1410 70%, #0a0805 100%)'
            : 'radial-gradient(circle at 35% 30%, #d8cdbf 0%, #8a7f72 70%, #52443a 100%)',
          boxShadow: dark
            ? `0 0 30px ${beamA}, inset -10px -10px 20px rgba(0,0,0,0.6)`
            : `0 0 20px ${beamA}, inset -8px -8px 16px rgba(26,13,8,0.4)`,
          overflow: 'hidden',
          animation: 'ballSpin 8s linear infinite',
          transformStyle: 'preserve-3d',
        }}>
          {/* mirror facets */}
          {facets.map((f, i) => {
            const cx = 50 + f.x * 50;
            const cy = 50 + f.y * 50;
            const visibility = (f.z + 1) / 2; // 0..1, front facets are brighter
            const facetSize = 100 / cols * 0.95;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${cx}%`, top: `${cy}%`,
                width: `${facetSize}%`, height: `${100/rows*0.95}%`,
                transform: 'translate(-50%, -50%)',
                background: dark
                  ? `rgba(246,239,230,${0.15 + visibility * 0.5})`
                  : `rgba(255,255,255,${0.2 + visibility * 0.5})`,
                border: dark ? '0.5px solid rgba(0,0,0,0.3)' : '0.5px solid rgba(26,13,8,0.2)',
                animation: `facetTwinkle ${1 + (i % 5) * 0.3}s ease-in-out ${(i * 0.07) % 2}s infinite`,
                pointerEvents: 'none',
              }}/>
            );
          })}
        </div>
      </div>

      {/* Sharpy beams radiating outward from the ball */}
      <div style={{
        position: 'absolute', top: 'calc(14% + 45px)', left: '50%',
        width: 0, height: 0,
        animation: 'sharpyRotate 16s linear infinite',
        transformOrigin: 'center',
      }}>
        {Array.from({length: sharpyCount}).map((_, i) => {
          const angle = (i / sharpyCount) * 360;
          const color = [beamA, beamB, beamC][i % 3];
          return (
            <div key={i} style={{
              position: 'absolute', top: 0, left: 0,
              width: 4, height: 600,
              background: `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
              transformOrigin: 'top center',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              filter: 'blur(3px)',
              opacity: 0.85,
              mixBlendMode: dark ? 'screen' : 'multiply',
              animation: `sharpyPulse ${2 + (i % 4) * 0.4}s ease-in-out ${i * 0.15}s infinite`,
            }}/>
          );
        })}
      </div>

      {/* Floor pools */}
      <div style={{
        position: 'absolute', bottom: '-20%', left: '10%',
        width: 220, height: 220, borderRadius: '50%',
        background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
        filter: 'blur(20px)',
        animation: 'floorPoolA 8s ease-in-out infinite',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>
      <div style={{
        position: 'absolute', bottom: '-25%', right: '5%',
        width: 280, height: 280, borderRadius: '50%',
        background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`,
        filter: 'blur(24px)',
        animation: 'floorPoolB 10s ease-in-out infinite',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>

      {/* Subtle strobe */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#fff',
        opacity: 0,
        animation: 'strobe 6s steps(1, end) infinite',
        mixBlendMode: 'overlay',
      }}/>

      {/* Dust particles drifting up */}
      {Array.from({length: 14}).map((_, i) => {
        const left = (i * 53) % 100;
        const dur = 8 + (i % 5) * 1.5;
        const delay = (i * 0.4) % dur;
        const size = 1 + (i % 3);
        return (
          <div key={i} style={{
            position: 'absolute', bottom: -10, left: `${left}%`,
            width: size, height: size, borderRadius: 999,
            background: dark ? 'rgba(246,239,230,0.5)' : 'rgba(26,13,8,0.35)',
            animation: `dust ${dur}s linear ${delay}s infinite`,
            opacity: 0,
          }}/>
        );
      })}
    </div>
  );
}

window.BgScene = BgScene;
