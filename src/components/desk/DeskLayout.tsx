import type { ReactNode } from 'react';

type TimeSlot = 'morning' | 'afternoon' | 'evening';

const TIME_LIGHTING: Record<TimeSlot, { glowColor: string; glowOpacity: number; vignetteStrength: number; overlayColor: string }> = {
  morning:   { glowColor: '180,200,220', glowOpacity: 0.06, vignetteStrength: 0.45, overlayColor: 'rgba(180,200,220,0.06)' },
  afternoon: { glowColor: '220,180,80',  glowOpacity: 0.10, vignetteStrength: 0.6,  overlayColor: 'rgba(220,180,80,0.04)' },
  evening:   { glowColor: '220,150,60',  glowOpacity: 0.18, vignetteStrength: 0.9,  overlayColor: 'rgba(10,6,3,0.35)' },
};

/* ---- Exported layout container ---- */

interface DeskLayoutProps {
  timeSlot: TimeSlot;
  activityPanel: ReactNode;
  centerContent: ReactNode;
  timeSlotBar: ReactNode;
  endDayButton: ReactNode;
  hudSlot: ReactNode;
}

export default function DeskLayout({
  timeSlot,
  activityPanel,
  centerContent,
  timeSlotBar,
  endDayButton,
  hudSlot,
}: DeskLayoutProps) {
  const lighting = TIME_LIGHTING[timeSlot];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: `url('/images/desk.png') center/cover no-repeat` }}>
      <VignetteLayer strength={lighting.vignetteStrength} />
      <CandleGlow position="left" glowColor={lighting.glowColor} glowOpacity={lighting.glowOpacity} />
      <div style={{ position: 'absolute', inset: 0, background: lighting.overlayColor, pointerEvents: 'none', zIndex: 1 }} />

      {/* HUD */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {hudSlot}
      </div>

      {/* Left: Activity panel */}
      <div style={{ position: 'absolute', top: 50, left: 40, width: 260, zIndex: 10 }}>
        {activityPanel}
      </div>

      {/* Center: Map + DeskObjects */}
      <div style={{ position: 'absolute', top: 50, left: 340, right: 360, bottom: 140, zIndex: 5 }}>
        {centerContent}
      </div>

      {/* Right top: Memorial stack (placeholder) */}

      {/* Bottom center: Time slot buttons */}
      <div style={{ position: 'absolute', bottom: 30, left: 340, right: 360, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 10 }}>
        {timeSlotBar}
      </div>

      {/* End day button */}
      <div style={{ position: 'absolute', bottom: 80, left: 340, right: 360, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        {endDayButton}
      </div>
    </div>
  );
}

/* ---- Visual sub-components ---- */

function VignetteLayer({ strength = 0.85 }: { strength?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        boxShadow: `inset 0 0 200px 80px rgba(0,0,0,${strength})`,
      }}
    />
  );
}

function CandleGlow({ position, glowColor = '220,150,60', glowOpacity = 0.14 }: { position: 'left' | 'right'; glowColor?: string; glowOpacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        [position]: 0,
        bottom: 0,
        width: '35%',
        height: '60%',
        background: `radial-gradient(ellipse at ${position === 'left' ? '10%' : '90%'} 80%, rgba(${glowColor},${glowOpacity}) 0%, transparent 55%)`,
        pointerEvents: 'none',
        zIndex: 2,
        animation: 'candleBreath 5s ease-in-out infinite',
      }}
    />
  );
}

export function ChangAnMap() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `url('/images/map3.png') center/cover no-repeat`,
        border: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-6deg)',
          width: 56,
          height: 56,
          background: 'linear-gradient(145deg, #e8d4a8 0%, #c9a874 50%, #8a6420 100%)',
          border: '2px solid #3a2010',
          borderRadius: 3,
          boxShadow: '0 6px 14px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,240,200,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
        }}
      >
        <span style={{ fontFamily: 'Ma Shan Zheng, serif', fontSize: 22, color: '#6a1410', textShadow: '0 1px 0 rgba(232,200,150,0.4)' }}>秦王</span>
      </div>
    </div>
  );
}

export function TimeSlotTablet({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 28px',
        background: active
          ? 'linear-gradient(180deg, #3a2818 0%, #1a0f08 100%)'
          : 'transparent',
        border: `1px solid ${active ? 'rgba(201,168,76,0.6)' : 'rgba(139,100,50,0.2)'}`,
        borderRadius: 2,
        color: active ? '#e8d4a8' : '#8a7050',
        fontFamily: 'Noto Serif SC, serif',
        fontSize: 14,
        letterSpacing: '0.2em',
        cursor: 'pointer',
        boxShadow: active ? '0 0 16px rgba(201,168,76,0.2), inset 0 1px 0 rgba(232,200,150,0.1)' : 'none',
      }}
    >
      {label}
    </button>
  );
}
