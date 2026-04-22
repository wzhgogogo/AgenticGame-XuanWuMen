const PHASE_COLORS = [
  'rgba(20, 30, 60, 0.3)',
  'rgba(60, 40, 15, 0.25)',
  'rgba(80, 20, 10, 0.2)',
];

interface SceneBackgroundProps {
  phaseIndex?: number;
}

export default function SceneBackground({ phaseIndex = 0 }: SceneBackgroundProps) {
  const phaseColor = PHASE_COLORS[phaseIndex] || PHASE_COLORS[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Layer 1: Base gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 40%, #1a1520 0%, #0a0a0f 60%, #050508 100%)',
        }}
      />

      {/* Layer 2: Phase color overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: phaseColor,
          mixBlendMode: 'overlay',
          transition: 'background-color 3s ease',
        }}
      />

      {/* Layer 3: Directional candlelight (asymmetric) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 10% 60%, rgba(201, 168, 76, 0.12) 0%, transparent 40%)',
          animation: 'candleBreath 5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'conic-gradient(from 200deg at 5% 80%, rgba(201, 168, 76, 0.06) 0deg, transparent 30deg)',
          animation: 'candleBreath 7s ease-in-out 2s infinite',
        }}
      />

      {/* Layer 4: Paper-grain noise (SVG filter) */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="scene-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'url(#scene-noise)',
          opacity: 0.06,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Layer 5: Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 150px 60px rgba(0,0,0,0.7)',
        }}
      />

      {/* Layer 6: Diagonal light beam */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(215deg, transparent 40%, rgba(201, 168, 76, 0.03) 50%, transparent 60%)',
          animation: 'lightShift 12s ease-in-out infinite',
        }}
      />

      {/* Layer 7: Desk surface edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(40, 30, 20, 0.4) 0%, transparent 15%)',
        }}
      />
    </div>
  );
}
