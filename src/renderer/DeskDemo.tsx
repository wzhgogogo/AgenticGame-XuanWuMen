import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';

const OBJECTS = [
  { id: 'scroll', label: '奏章', x: 0.28, y: 0.58, w: 260, h: 320, color: 0xb8956a },
  { id: 'letter', label: '密报', x: 0.72, y: 0.55, w: 240, h: 180, color: 0xd9c4a0 },
  { id: 'seal',   label: '印信', x: 0.52, y: 0.72, w: 120, h: 120, color: 0x8a2a20 },
  { id: 'map',    label: '舆图', x: 0.50, y: 0.40, w: 380, h: 260, color: 0x4a3820 },
  { id: 'candle', label: '烛台', x: 0.88, y: 0.30, w: 80,  h: 160, color: 0x6a4828 },
] as const;

type ObjId = typeof OBJECTS[number]['id'];

function drawObject(
  g: Graphics,
  obj: typeof OBJECTS[number],
  isHovered: boolean,
) {
  g.clear();
  // 阴影
  g.ellipse(0, obj.h / 2 + 6, obj.w * 0.55, 14)
    .fill({ color: 0x000000, alpha: 0.5 });
  // 主体
  g.roundRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h, 6)
    .fill({ color: obj.color, alpha: 0.92 });
  g.roundRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h, 6)
    .stroke({ color: 0x1a0e05, width: 2, alpha: 0.7 });
  // 烛台辉光
  if (obj.id === 'candle') {
    for (let i = 0; i < 6; i++) {
      g.circle(0, -obj.h / 2 - 10, 18 + i * 6)
        .fill({ color: 0xffb060, alpha: 0.18 - i * 0.025 });
    }
  }
  // 聚焦金边
  if (isHovered) {
    g.roundRect(-obj.w / 2 - 8, -obj.h / 2 - 8, obj.w + 16, obj.h + 16, 8)
      .stroke({ color: 0xcfa85e, width: 2, alpha: 0.9 });
  }
}

export function DeskDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ObjId | null>(null);
  const appStateRef = useRef<{
    objectGraphics: Map<ObjId, Graphics>;
    objectContainers: Map<ObjId, Container>;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    let disposed = false;
    let inited = false;
    let resizeHandler: (() => void) | null = null;

    (async () => {
      try {
        const initialW = host.clientWidth || window.innerWidth || 1280;
        const initialH = host.clientHeight || window.innerHeight || 800;
        await app.init({
          width: initialW,
          height: initialH,
          background: 0x2a1810,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
      } catch (e) {
        console.error('[DeskDemo] init failed', e);
        return;
      }

      if (disposed) return;
      inited = true;
      host.appendChild(app.canvas);

      const W = () => app.screen.width;
      const H = () => app.screen.height;

      // 背景
      const bg = new Graphics();
      const drawBg = () => {
        bg.clear();
        bg.rect(0, 0, W(), H()).fill({ color: 0x0b0806 });
        const cx = W() / 2;
        const cy = H() * 0.55;
        const maxR = Math.max(W(), H());
        for (let i = 0; i < 14; i++) {
          const r = maxR * (1 - i * 0.06);
          const a = 0.09 - i * 0.005;
          if (a <= 0) break;
          bg.circle(cx, cy, r).fill({ color: 0x3a2414, alpha: a });
        }
        for (let i = 0; i < 400; i++) {
          const x = Math.random() * W();
          const y = Math.random() * H();
          bg.rect(x, y, 1, 1).fill({ color: 0x6a4a2a, alpha: Math.random() * 0.12 });
        }
      };
      drawBg();
      app.stage.addChild(bg);

      // 光束
      const beam = new Graphics();
      const drawBeam = () => {
        beam.clear();
        beam.poly([
          W() * 0.15, 0,
          W() * 0.55, 0,
          W() * 0.85, H(),
          W() * 0.35, H(),
        ]).fill({ color: 0xffd89a, alpha: 0.08 });
        beam.poly([
          W() * 0.25, 0,
          W() * 0.40, 0,
          W() * 0.65, H(),
          W() * 0.50, H(),
        ]).fill({ color: 0xffe8b8, alpha: 0.05 });
      };
      drawBeam();
      app.stage.addChild(beam);

      // 物件
      const objectsLayer = new Container();
      const objectGraphics = new Map<ObjId, Graphics>();
      const objectContainers = new Map<ObjId, Container>();

      for (const obj of OBJECTS) {
        const c = new Container();
        c.x = W() * obj.x;
        c.y = H() * obj.y;
        c.eventMode = 'static';
        c.cursor = 'pointer';

        const g = new Graphics();
        drawObject(g, obj, false);
        c.addChild(g);

        c.on('pointerover', () => setHovered(obj.id));
        c.on('pointerout', () => setHovered(null));

        objectsLayer.addChild(c);
        objectGraphics.set(obj.id, g);
        objectContainers.set(obj.id, c);
      }
      app.stage.addChild(objectsLayer);

      appStateRef.current = { objectGraphics, objectContainers };

      // 暗角
      const vignette = new Graphics();
      const drawVignette = () => {
        vignette.clear();
        const cx = W() / 2;
        const cy = H() / 2;
        const maxR = Math.max(W(), H());
        for (let i = 0; i < 24; i++) {
          const r = maxR * (1 - i * 0.035);
          vignette.circle(cx, cy, r).fill({ color: 0x000000, alpha: i * 0.022 });
        }
      };
      drawVignette();
      app.stage.addChild(vignette);

      // resize
      resizeHandler = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        drawBg();
        drawBeam();
        drawVignette();
        for (const obj of OBJECTS) {
          const c = objectContainers.get(obj.id)!;
          c.x = W() * obj.x;
          c.y = H() * obj.y;
        }
      };
      window.addEventListener('resize', resizeHandler);

      console.log('[DeskDemo] ready', { w: W(), h: H() });
    })();

    return () => {
      disposed = true;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (inited) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          console.warn('[DeskDemo] destroy error', e);
        }
      }
      appStateRef.current = null;
    };
  }, []);

  // hover 变化 → 重绘物件
  useEffect(() => {
    const state = appStateRef.current;
    if (!state) return;
    for (const obj of OBJECTS) {
      const g = state.objectGraphics.get(obj.id);
      const c = state.objectContainers.get(obj.id);
      if (!g || !c) continue;
      const isHovered = hovered === obj.id;
      const isDimmed = hovered !== null && !isHovered;
      c.scale.set(isHovered ? 1.08 : 1);
      c.alpha = isDimmed ? 0.45 : 1;
      drawObject(g, obj, isHovered);
    }
  }, [hovered]);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#ff00ff' }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0, border: '5px solid yellow' }} />

      <div style={{
        position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center',
        color: '#d9c4a0',
        fontFamily: '"Ma Shan Zheng", "Noto Serif SC", serif',
        fontSize: 32, letterSpacing: 8, pointerEvents: 'none',
        textShadow: '0 2px 12px rgba(0,0,0,0.8)', zIndex: 10,
      }}>
        武德九年 · 正月
      </div>

      {hovered && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20,12,6,0.85)',
          border: '1px solid rgba(207,168,94,0.4)',
          color: '#e8d4a8',
          padding: '16px 32px',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 18, letterSpacing: 4,
          backdropFilter: 'blur(4px)', zIndex: 10,
        }}>
          {OBJECTS.find(o => o.id === hovered)?.label}
        </div>
      )}
    </div>
  );
}
