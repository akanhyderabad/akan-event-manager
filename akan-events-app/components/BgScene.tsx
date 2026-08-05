'use client';

import { memo } from 'react';

/**
 * Disco-scene animated background — mirror-ball, moving beams, sharpy fan,
 * floor light pools, strobe and drifting dust. Extracted so pages beyond the
 * event page (e.g. /confirmed) can render the same ambience behind their
 * content. Purely decorative + pointer-events:none, positioned absolute to
 * fill its nearest positioned ancestor.
 */

const BG_SCENE_KEYFRAMES = `
  @keyframes beamSweepA { 0%, 100% { transform: rotate(-12deg); opacity: 0.85; } 45% { transform: rotate(18deg); opacity: 1; } 50% { transform: rotate(20deg); opacity: 0.4; } 55% { transform: rotate(18deg); opacity: 1; } }
  @keyframes beamSweepB { 0%, 100% { transform: rotate(10deg); opacity: 0.7; } 50% { transform: rotate(-15deg); opacity: 1; } }
  @keyframes ballSwing { 0%, 100% { transform: translateX(-50%) rotate(-3deg); } 50% { transform: translateX(-50%) rotate(3deg); } }
  @keyframes ballSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes facetTwinkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes sharpyRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes sharpyPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes ballHalo { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
  @keyframes floorPoolA { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-20px) scale(1.2); } }
  @keyframes floorPoolB { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,-30px) scale(1.15); } }
  @keyframes strobe { 0%, 100% { opacity: 0; } 12%, 12.4% { opacity: 0; } 12.5% { opacity: 0.16; } 12.7% { opacity: 0; } 13% { opacity: 0.12; } 13.2% { opacity: 0; } 62% { opacity: 0; } 62.2% { opacity: 0.16; } 62.4% { opacity: 0; } 62.6% { opacity: 0.1; } 62.8% { opacity: 0; } }
  @keyframes dust { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.8; } 85% { opacity: 0.6; } 100% { transform: translateY(-100vh); opacity: 0; } }
`;

const BG_SCENE_FACETS: Array<{ x: number; y: number; z: number; r: number; c: number }> = [];
const BG_SCENE_ROWS = 8;
const BG_SCENE_COLS = 14;
for (let r = 0; r < BG_SCENE_ROWS; r++) {
  const phi = (r / (BG_SCENE_ROWS - 1)) * Math.PI;
  const ringRadius = Math.sin(phi);
  const y = -Math.cos(phi);
  for (let c = 0; c < BG_SCENE_COLS; c++) {
    const theta = (c / BG_SCENE_COLS) * Math.PI * 2;
    const x = Math.cos(theta) * ringRadius;
    const z = Math.sin(theta) * ringRadius;
    BG_SCENE_FACETS.push({ x, y, z, r, c });
  }
}

const BG_SCENE_DUST = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 53) % 100,
  dur: 8 + (i % 5) * 1.5,
  delay: ((i * 0.4) % (8 + (i % 5) * 1.5)),
  size: 1 + (i % 3),
}));

export const BgScene = memo(function BgScene({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme !== 'light';
  const beamA = isDark ? 'rgba(201, 81, 46, 0.32)' : 'rgba(184, 69, 31, 0.18)';
  const beamB = isDark ? 'rgba(70, 140, 220, 0.22)' : 'rgba(70, 140, 220, 0.10)';
  const beamC = isDark ? 'rgba(220, 70, 130, 0.22)' : 'rgba(180, 50, 110, 0.10)';
  const ballSize = 90;
  const sharpyCount = 12;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <style>{BG_SCENE_KEYFRAMES}</style>

      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '160%',
          height: '140%',
          background: `conic-gradient(from 200deg at 20% 0%, transparent 0deg, ${beamA} 8deg, transparent 18deg)`,
          filter: 'blur(2px)',
          animation: 'beamSweepA 7s ease-in-out infinite',
          transformOrigin: '20% 0%',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          right: '-20%',
          width: '160%',
          height: '140%',
          background: `conic-gradient(from 130deg at 80% 0%, transparent 0deg, ${beamB} 7deg, transparent 16deg)`,
          filter: 'blur(2px)',
          animation: 'beamSweepB 9s ease-in-out infinite',
          transformOrigin: '80% 0%',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: ballSize,
          height: ballSize,
          animation: 'ballSwing 6s ease-in-out infinite',
          transformOrigin: 'top center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            left: '50%',
            width: 1,
            height: 50,
            background: isDark ? 'rgba(246,239,230,0.25)' : 'rgba(26,13,8,0.25)',
            transform: 'translateX(-50%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
            filter: 'blur(8px)',
            animation: 'ballHalo 3s ease-in-out infinite',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle at 35% 30%, #4a3d35 0%, #1a1410 70%, #0a0805 100%)'
              : 'radial-gradient(circle at 35% 30%, #d8cdbf 0%, #8a7f72 70%, #52443a 100%)',
            boxShadow: isDark
              ? `0 0 30px ${beamA}, inset -10px -10px 20px rgba(0,0,0,0.6)`
              : `0 0 20px ${beamA}, inset -8px -8px 16px rgba(26,13,8,0.4)`,
            overflow: 'hidden',
            animation: 'ballSpin 8s linear infinite',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {BG_SCENE_FACETS.map((f, i) => {
            const cx = 50 + f.x * 50;
            const cy = 50 + f.y * 50;
            const visibility = (f.z + 1) / 2;
            const facetSize = (100 / BG_SCENE_COLS) * 0.95;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${cx}%`,
                  top: `${cy}%`,
                  width: `${facetSize}%`,
                  height: `${(100 / BG_SCENE_ROWS) * 0.95}%`,
                  transform: 'translate(-50%, -50%)',
                  background: isDark
                    ? `rgba(246,239,230,${0.15 + visibility * 0.5})`
                    : `rgba(255,255,255,${0.2 + visibility * 0.5})`,
                  border: isDark ? '0.5px solid rgba(0,0,0,0.3)' : '0.5px solid rgba(26,13,8,0.2)',
                  animation: `facetTwinkle ${1 + (i % 5) * 0.3}s ease-in-out ${(i * 0.07) % 2}s infinite`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 'calc(14% + 45px)',
          left: '50%',
          width: 0,
          height: 0,
          animation: 'sharpyRotate 16s linear infinite',
          transformOrigin: 'center',
        }}
      >
        {Array.from({ length: sharpyCount }).map((_, i) => {
          const angle = (i / sharpyCount) * 360;
          const color = [beamA, beamB, beamC][i % 3];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: 600,
                background: `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
                transformOrigin: 'top center',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                filter: 'blur(3px)',
                opacity: 0.85,
                mixBlendMode: isDark ? 'screen' : 'multiply',
                animation: `sharpyPulse ${2 + (i % 4) * 0.4}s ease-in-out ${i * 0.15}s infinite`,
                willChange: 'opacity',
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '10%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamA} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          animation: 'floorPoolA 8s ease-in-out infinite',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          right: '5%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${beamC} 0%, transparent 70%)`,
          filter: 'blur(24px)',
          animation: 'floorPoolB 10s ease-in-out infinite',
          mixBlendMode: isDark ? 'screen' : 'multiply',
          willChange: 'transform',
        }}
      />

      {/* Subtle strobe */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          opacity: 0,
          animation: 'strobe 6s steps(1, end) infinite',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Dust particles drifting up */}
      {BG_SCENE_DUST.map((particle, i) => {
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: -10,
              left: `${particle.left}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: 999,
              background: isDark ? 'rgba(246,239,230,0.5)' : 'rgba(26,13,8,0.35)',
              animation: `dust ${particle.dur}s linear ${particle.delay}s infinite`,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </div>
  );
});
