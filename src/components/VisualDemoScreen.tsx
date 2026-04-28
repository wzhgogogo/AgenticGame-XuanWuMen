/**
 * 视觉原型 Demo —— 纯 CSS/SVG 占位，无真实美术资源。
 * 访问方式：在 URL 追加 ?demo=visual 即可进入。
 * 目的：验证布局、比例、配色、信息密度是否贴近参考图。
 */
import { useState } from 'react';

type Mode = 'desk' | 'dialogue';
type TimeSlot = 'morning' | 'noon' | 'night';

const TIME_LIGHTING: Record<TimeSlot, { glowColor: string; glowOpacity: number; vignetteStrength: number; overlayColor: string }> = {
  morning: { glowColor: '200,210,220', glowOpacity: 0.06, vignetteStrength: 0.5, overlayColor: 'rgba(180,200,220,0.06)' },
  noon:    { glowColor: '220,180,80',  glowOpacity: 0.10, vignetteStrength: 0.7, overlayColor: 'rgba(220,180,80,0.04)' },
  night:   { glowColor: '220,150,60',  glowOpacity: 0.18, vignetteStrength: 0.95, overlayColor: 'rgba(10,6,3,0.35)' },
};

export default function VisualDemoScreen() {
  const [mode, setMode] = useState<Mode>('desk');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0706' }}>
      {/* 切换栏 */}
      <div
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 100,
          display: 'flex',
          gap: 6,
          padding: 6,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 4,
        }}
      >
        <DemoToggle label="日常案台" active={mode === 'desk'} onClick={() => setMode('desk')} />
        <DemoToggle label="对话场景" active={mode === 'dialogue'} onClick={() => setMode('dialogue')} />
      </div>

      {mode === 'desk' ? <DeskScreen /> : <DialogueScreen />}
    </div>
  );
}

function DemoToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        fontSize: 12,
        background: active ? 'rgba(201,168,76,0.2)' : 'transparent',
        color: active ? '#e8e0d0' : '#8a8070',
        border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 3,
        cursor: 'pointer',
        fontFamily: 'Noto Serif SC, serif',
      }}
    >
      {label}
    </button>
  );
}

/* ================================================================
 * 日常案台（参考图上半屏）
 * ================================================================ */
function DeskScreen() {
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('noon');
  const lighting = TIME_LIGHTING[timeSlot];
  const timeLabel = { morning: '晨时', noon: '午时', night: '夜时' }[timeSlot];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: `url('/images/desk.png') center/cover no-repeat` }}>
      <VignetteLayer strength={lighting.vignetteStrength} />
      <CandleGlow position="left" glowColor={lighting.glowColor} glowOpacity={lighting.glowOpacity} />
      <div style={{ position: 'absolute', inset: 0, background: lighting.overlayColor, pointerEvents: 'none' }} />

      {/* 左侧活动面板 */}
      <div style={{ position: 'absolute', top: 40, left: 40, width: 260 }}>
        <ActivityPanel timeLabel={timeLabel} />
      </div>

      {/* 中央长安城坊图 */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 340,
          right: 360,
          bottom: 220,
        }}
      >
        <ChangAnMap />
      </div>

      {/* 右上奏折堆 */}
      <div style={{ position: 'absolute', top: 40, right: 40, width: 300 }}>
        <MemorialStack />
      </div>

      {/* 右下当前局势 */}
      <div style={{ position: 'absolute', bottom: 40, right: 40, width: 300 }}>
        <PressurePanel />
      </div>

      {/* 底部时段切换 */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 340,
          right: 360,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <TimeSlotTablet label="晨时" active={timeSlot === 'morning'} onClick={() => setTimeSlot('morning')} />
        <TimeSlotTablet label="午时" active={timeSlot === 'noon'} onClick={() => setTimeSlot('noon')} />
        <TimeSlotTablet label="夜时" active={timeSlot === 'night'} onClick={() => setTimeSlot('night')} />
      </div>
    </div>
  );
}

function VignetteLayer({ strength = 0.85 }: { strength?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
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
        animation: 'candleBreath 5s ease-in-out infinite',
      }}
    />
  );
}


/* ---------- 左栏：活动面板 ---------- */

const ACTIVITIES = [
  ['治政', '📜', 0], ['军务', '⚔', 1], ['情报', '👁', 1],
  ['社交', '◉', 0], ['个人', '人', 0], ['巡查', '馬', 1],
  ['招募', '兵', 1], ['训练', '⚔', 1], ['屯田', '禾', 0],
  ['工务', '工', 0], ['外事', '信', 0], ['祭祀', '鼎', 0],
] as const;

function ActivityPanel({ timeLabel }: { timeLabel: string }) {
  return (
    <div
      style={{
        padding: '14px 14px 16px',
        background: 'linear-gradient(180deg, rgba(22,14,8,0.92) 0%, rgba(14,8,4,0.95) 100%)',
        border: '1px solid rgba(139,100,50,0.25)',
        borderTop: '2px solid rgba(180,130,70,0.3)',
        borderRadius: 4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,224,208,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#d4b878', letterSpacing: '0.1em' }}>
          选择今日活动（{timeLabel}）
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#8a7050', marginBottom: 12 }}>剩余行动点：2/3</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {ACTIVITIES.map(([name, glyph, badge]) => (
          <ActivityIcon key={name} name={name} glyph={glyph} badge={badge as number} />
        ))}
      </div>
    </div>
  );
}

function ActivityIcon({ name, glyph, badge }: { name: string; glyph: string; badge: number }) {
  return (
    <button
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 2px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* 圆形浮雕 */}
      <div
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 35% 30%, #6b5030 0%, #3d2818 50%, #1a0f08 100%)
          `,
          border: '1.5px solid rgba(139,100,50,0.4)',
          boxShadow: `
            inset 0 2px 4px rgba(232,200,150,0.15),
            inset 0 -2px 4px rgba(0,0,0,0.6),
            0 2px 6px rgba(0,0,0,0.5)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#c9a84c',
          fontSize: 18,
          fontFamily: 'Ma Shan Zheng, STKaiti, serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
        }}
      >
        {glyph}
        {badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#c73e3a',
              color: '#fff',
              fontSize: 9,
              fontFamily: 'sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0,0,0,0.4)',
              boxShadow: '0 0 4px rgba(199,62,58,0.6)',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#c0a878', fontFamily: 'Noto Serif SC, serif' }}>{name}</span>
    </button>
  );
}

/* ---------- 中央：长安城坊图 ---------- */

function ChangAnMap() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `url('/images/map.png') center/cover no-repeat`,
        border: '1px solid rgba(139,100,50,0.4)',
        borderRadius: 2,
        boxShadow: '0 10px 30px rgba(0,0,0,0.7), inset 0 0 60px rgba(139,100,50,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* 印章（可拖动）*/}
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

      {/* 底部提示 */}
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          color: '#8a7050',
          fontFamily: 'Noto Serif SC, serif',
          letterSpacing: '0.1em',
        }}
      >
        拖动印章至地图地点以执行行动
      </div>
    </div>
  );
}

/* ---------- 右上：奏折堆 ---------- */

const MEMORIALS = [
  { tag: '紧急', tagColor: '#c73e3a', title: '边境军情急报', desc: '河西方面军需支援' },
  { tag: '密报', tagColor: '#8a4820', title: '太子党活动情报', desc: '东宫近臣密会频繁' },
  { tag: '奏报', tagColor: '#6a5030', title: '工部水利进度', desc: '渭水渠修缮工程延误' },
  { tag: '密信', tagColor: '#6a5030', title: '来自长孙无忌的密信', desc: '请大王速回一见' },
];

function MemorialStack() {
  return (
    <div>
      <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#d4b878', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center' }}>
        情报与密信
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MEMORIALS.map((m, i) => (
          <MemorialCard key={i} {...m} rotate={(i % 2 === 0 ? -0.8 : 1.2)} />
        ))}
      </div>
    </div>
  );
}

function MemorialCard({ tag, tagColor, title, desc, rotate }: {
  tag: string; tagColor: string; title: string; desc: string; rotate: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '12px 16px 12px 50px',
        background: `
          repeating-linear-gradient(0deg, transparent, rgba(80,50,20,0.04) 1px, transparent 3px),
          linear-gradient(170deg, #e8dcc0 0%, #d4c098 100%)
        `,
        border: '1px solid rgba(139,100,50,0.35)',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        transform: `rotate(${rotate}deg)`,
        cursor: 'pointer',
      }}
    >
      {/* 左侧标签 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 36,
          background: `linear-gradient(90deg, ${tagColor} 0%, ${tagColor}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ fontFamily: 'Ma Shan Zheng, serif', fontSize: 13, color: '#f0e0c0', writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>
          {tag}
        </span>
      </div>
      {/* 内容 */}
      <div>
        <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#3a2010', fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 10, color: '#6a4820' }}>{desc}</div>
      </div>
      {/* 右侧小印章 */}
      <div
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          width: 20,
          height: 20,
          background: 'rgba(199,62,58,0.5)',
          border: '1px solid rgba(106,40,16,0.6)',
          transform: 'rotate(6deg)',
          fontSize: 9,
          color: '#f0e0c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Ma Shan Zheng, serif',
        }}
      >
        印
      </div>
    </div>
  );
}

/* ---------- 右下：当前局势压力面板 ---------- */

const PRESSURES = [
  { name: '太子敌意', value: 90, label: '极高', color: '#e24b4a' },
  { name: '朝臣风向', value: 65, label: '偏持', color: '#d4924b' },
  { name: '军事准备度', value: 35, label: '偏低', color: '#b8a060' },
  { name: '民心支持度', value: 50, label: '中等', color: '#8a8070' },
  { name: '长孙无忌立场', value: 45, label: '中立', color: '#8a8070' },
  { name: '李渊信任度', value: 55, label: '中等', color: '#b8a060' },
  { name: '自身声望', value: 48, label: '中等', color: '#8a8070' },
];

function PressurePanel() {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'linear-gradient(180deg, rgba(22,14,8,0.92) 0%, rgba(14,8,4,0.95) 100%)',
        border: '1px solid rgba(139,100,50,0.25)',
        borderTop: '2px solid rgba(180,130,70,0.3)',
        borderRadius: 4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#d4b878', letterSpacing: '0.1em' }}>
          当前局势
        </span>
        <span style={{ fontSize: 10, color: '#8a7050', cursor: 'pointer' }}>详情 ›</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PRESSURES.map((p) => (
          <PressureRow key={p.name} {...p} />
        ))}
      </div>
    </div>
  );
}

function PressureRow({ name, value, label, color }: { name: string; value: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
      <span style={{ width: 76, color: '#a0907a', fontFamily: 'Noto Serif SC, serif' }}>{name}</span>
      <div style={{ flex: 1, position: 'relative', height: 10, display: 'flex', alignItems: 'center' }}>
        {/* 刻度条 */}
        <div style={{ position: 'absolute', inset: 0, borderBottom: '1px solid rgba(139,100,50,0.2)' }} />
        {/* 填充 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: `${value}%`,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${color} 100%)`,
          }}
        />
        {/* 滑块 */}
        <div
          style={{
            position: 'absolute',
            left: `${value}%`,
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            width: 6,
            height: 6,
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
      <span style={{ width: 32, color: '#c0a878', fontFamily: 'Noto Serif SC, serif', textAlign: 'right' }}>{label}</span>
      <span style={{ width: 24, color, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ---------- 底部时段石碑按钮 ---------- */

function TimeSlotTablet({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

/* ================================================================
 * 对话场景（参考图下半屏）
 * ================================================================ */
function DialogueScreen() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse at 70% 50%, #3a2818 0%, #1a0f08 60%, #0a0604 100%)
        `,
      }}
    >
      {/* 屏风背景 */}
      <ScreenBackdrop />
      {/* 人物剪影 */}
      <Silhouette />
      {/* 烛光 */}
      <CandleGlow position="right" />
      {/* 盆景占位 */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          bottom: 180,
          width: 80,
          height: 60,
          background: 'radial-gradient(ellipse at 50% 80%, rgba(40,60,30,0.6) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 左上场景标题 */}
      <div style={{ position: 'absolute', top: 24, left: 32 }}>
        <div style={{ fontFamily: 'Ma Shan Zheng, serif', fontSize: 22, color: '#e8d4a8', letterSpacing: '0.15em' }}>
          夜时 · 社交
        </div>
        <div style={{ fontSize: 13, color: '#a0907a', marginTop: 6, letterSpacing: '0.1em' }}>
          密会 房玄龄
        </div>
      </div>

      {/* 左侧月相压力 HUD */}
      <div style={{ position: 'absolute', top: 100, left: 32 }}>
        <MoonDotHud />
      </div>

      {/* 底部对话框 */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(780px, 85%)',
        }}
      >
        <DialogueBox />
      </div>

      {/* 右下自动播放 */}
      <div style={{ position: 'absolute', bottom: 16, right: 32, fontSize: 11, color: '#8a7050', fontFamily: 'Noto Serif SC, serif' }}>
        ◇ 自动播放
      </div>
    </div>
  );
}

function ScreenBackdrop() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '5%',
        bottom: '40%',
        background: `
          linear-gradient(180deg, rgba(90,60,30,0.55) 0%, rgba(50,32,18,0.65) 70%, transparent 100%),
          repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(0,0,0,0.35) 80px, rgba(0,0,0,0.35) 82px)
        `,
        boxShadow: 'inset 0 -40px 80px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }}
    >
      {/* 屏风上的写意梅枝 */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <path d="M 30 80 Q 80 60 140 90 T 260 100" stroke="#2a1810" strokeWidth="1.5" fill="none" />
        <path d="M 200 40 Q 240 80 280 60" stroke="#2a1810" strokeWidth="1.2" fill="none" />
        <circle cx="140" cy="90" r="2" fill="rgba(199,62,58,0.6)" />
        <circle cx="180" cy="85" r="2" fill="rgba(199,62,58,0.6)" />
        <circle cx="240" cy="70" r="2" fill="rgba(199,62,58,0.5)" />
      </svg>
    </div>
  );
}

function Silhouette() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '15%',
        top: '12%',
        width: 280,
        height: 380,
        background: `
          radial-gradient(ellipse at 50% 18%, rgba(8,4,2,0.95) 0%, rgba(8,4,2,0.7) 30%, transparent 60%),
          radial-gradient(ellipse at 50% 65%, rgba(10,6,3,0.85) 0%, transparent 65%)
        `,
        clipPath: `polygon(
          40% 0%, 60% 0%, 68% 12%, 70% 22%,
          78% 30%, 82% 42%, 80% 55%, 85% 68%,
          90% 85%, 92% 100%, 8% 100%, 10% 85%,
          15% 68%, 20% 55%, 18% 42%, 22% 30%,
          30% 22%, 32% 12%
        )`,
        filter: 'blur(1.5px)',
      }}
    />
  );
}

function MoonDotHud() {
  const AXES: { name: string; filled: number }[] = [
    { name: '太子敌意', filled: 9 },
    { name: '朝臣风向', filled: 6 },
    { name: '军事准备度', filled: 3 },
    { name: '民心支持度', filled: 5 },
    { name: '长孙无忌立场', filled: 4 },
    { name: '李渊信任度', filled: 5 },
    { name: '自身声望', filled: 4 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {AXES.map((a) => (
        <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10 }}>
          <span style={{ width: 72, color: '#8a7c60', fontFamily: 'Noto Serif SC, serif' }}>{a.name}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i < a.filled
                    ? (a.filled >= 8 ? '#d97032' : '#c9a84c')
                    : 'rgba(139,100,50,0.15)',
                  boxShadow: i < a.filled ? '0 0 3px rgba(201,168,76,0.4)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DialogueBox() {
  return (
    <div
      style={{
        position: 'relative',
        padding: '18px 24px 20px',
        background: `
          linear-gradient(180deg, rgba(22,14,8,0.94) 0%, rgba(10,6,3,0.96) 100%)
        `,
        border: '1px solid rgba(201,168,76,0.3)',
        borderTop: '2px solid rgba(201,168,76,0.5)',
        borderRadius: 3,
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
      }}
    >
      {/* 说话人 */}
      <div style={{ fontFamily: 'Ma Shan Zheng, serif', fontSize: 16, color: '#e8d4a8', marginBottom: 8, letterSpacing: '0.1em' }}>
        房玄龄
      </div>
      {/* 对话 */}
      <p style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#d0c4a8', lineHeight: 1.8, margin: '0 0 16px 0' }}>
        大王近来多有筹划，玄龄虽不敢问其全貌，然时局艰难，万望大王三思而行。
      </p>
      {/* 选项 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { n: '1', label: '试探', text: '你对此局有何看法？' },
          { n: '2', label: '询问', text: '太子近日可有异动？' },
          { n: '3', label: '沉默', text: '（不置一言，静观其意）' },
        ].map((o) => (
          <DialogueChoice key={o.n} {...o} />
        ))}
      </div>
    </div>
  );
}

function DialogueChoice({ n, label, text }: { n: string; label: string; text: string }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        padding: '8px 14px',
        background: 'rgba(35,25,15,0.6)',
        border: '1px solid rgba(139,100,50,0.2)',
        borderLeft: '2px solid rgba(201,168,76,0.4)',
        borderRadius: 2,
        color: '#d0c4a8',
        fontFamily: 'Noto Serif SC, serif',
        fontSize: 12,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(50,35,20,0.75)';
        e.currentTarget.style.borderLeftColor = 'rgba(201,168,76,0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(35,25,15,0.6)';
        e.currentTarget.style.borderLeftColor = 'rgba(201,168,76,0.4)';
      }}
    >
      <span style={{ color: '#8a7050', fontFamily: 'monospace', width: 12 }}>{n}</span>
      <span style={{ color: '#c9a84c', minWidth: 32 }}>{label}</span>
      <span style={{ color: '#a0907a' }}>{text}</span>
    </button>
  );
}
