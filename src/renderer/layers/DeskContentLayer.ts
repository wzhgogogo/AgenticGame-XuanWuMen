import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DeskCanvasState, DeskObjectState } from '../GameCanvasContext';
import type { ActivityCategory } from '../../types/world';

const CATEGORY_COLORS: Record<string, number> = {
  governance: 0x6b8fbf,
  military: 0xbf6b6b,
  intelligence: 0x8b6bbf,
  social: 0x6bbf8f,
  personal: 0xb8a060,
};

const OBJECT_LABELS: Record<string, string> = {
  governance: '奏折',
  military: '兵符',
  intelligence: '密信',
  social: '请帖',
  personal: '书卷',
};

interface ObjLayout {
  xPct: number; yPct: number; rotation: number; w: number; h: number;
}

const LAYOUTS: Record<string, ObjLayout> = {
  governance:   { xPct: 0.12, yPct: 0.15, rotation: -0.07, w: 72, h: 100 },
  military:     { xPct: 0.14, yPct: 0.70, rotation:  0.10, w: 68, h: 72 },
  intelligence: { xPct: 0.80, yPct: 0.18, rotation: -0.12, w: 76, h: 56 },
  social:       { xPct: 0.76, yPct: 0.60, rotation:  0.05, w: 88, h: 60 },
  personal:     { xPct: 0.60, yPct: 0.78, rotation: -0.03, w: 64, h: 64 },
};

const TIME_TINTS: Record<string, { color: number; alpha: number; x: number; y: number }> = {
  morning:   { color: 0xb0c0d8, alpha: 0.10, x: 0.85, y: 0.2 },
  afternoon: { color: 0xe0c878, alpha: 0.12, x: 0.50, y: 0.1 },
  evening:   { color: 0xc9a84c, alpha: 0.18, x: 0.15, y: 0.5 },
};

export class DeskContentLayer {
  readonly container: Container;
  private deskBg: Graphics;
  private mapGfx: Graphics;
  private lightGfx: Graphics;
  private objectContainers: Map<string, Container> = new Map();
  private width = 0;
  private height = 0;
  private onObjectClick: ((cat: ActivityCategory) => void) | null = null;

  constructor() {
    this.container = new Container();
    this.deskBg = new Graphics();
    this.mapGfx = new Graphics();
    this.lightGfx = new Graphics();
    this.container.addChild(this.deskBg, this.mapGfx);
    this.buildObjects();
    this.container.addChild(this.lightGfx);
    this.container.visible = false;
  }

  setClickHandler(handler: (cat: ActivityCategory) => void) {
    this.onObjectClick = handler;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.drawDesk();
    this.drawMap();
    this.positionObjects();
  }

  setState(state: DeskCanvasState | null) {
    this.container.visible = !!state;
    if (!state) return;
    this.drawLight(state.timeSlot);
    for (const obj of state.objects) {
      this.updateObject(obj);
    }
  }

  private drawDesk() {
    const { width: w, height: h } = this;
    const dw = w * 0.75;
    const dh = h * 0.65;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    this.deskBg.clear();
    // Wood base
    this.deskBg.roundRect(dx, dy, dw, dh, 6);
    this.deskBg.fill(0x2a1c0e);
    // Wood grain lines
    for (let i = 0; i < 8; i++) {
      const y = dy + 20 + i * (dh - 40) / 8;
      this.deskBg.moveTo(dx + 10, y);
      this.deskBg.lineTo(dx + dw - 10, y);
      this.deskBg.stroke({ color: 0x3a2a18, alpha: 0.3, width: 0.5 });
    }
    // Border
    this.deskBg.roundRect(dx, dy, dw, dh, 6);
    this.deskBg.stroke({ color: 0x4a3a28, alpha: 0.4, width: 1 });
  }

  private drawMap() {
    const { width: w, height: h } = this;
    const cx = w * 0.5;
    const cy = h * 0.45;
    const scale = Math.min(w, h) / 600;

    this.mapGfx.clear();
    // City wall outline
    this.mapGfx.rect(cx - 80 * scale, cy - 110 * scale, 160 * scale, 220 * scale);
    this.mapGfx.stroke({ color: 0x503c1e, alpha: 0.08, width: 0.8 });
    // Central axis
    this.mapGfx.moveTo(cx, cy - 105 * scale);
    this.mapGfx.lineTo(cx, cy + 105 * scale);
    this.mapGfx.stroke({ color: 0x503c1e, alpha: 0.06, width: 0.8 });
    // Taiji Palace
    this.mapGfx.rect(cx - 40 * scale, cy - 105 * scale, 80 * scale, 35 * scale);
    this.mapGfx.fill({ color: 0x503c1e, alpha: 0.04 });
    this.mapGfx.stroke({ color: 0x503c1e, alpha: 0.1, width: 0.6 });
    // Xuanwu Gate
    this.mapGfx.rect(cx - 18 * scale, cy - 112 * scale, 36 * scale, 9 * scale);
    this.mapGfx.fill({ color: 0x8c6428, alpha: 0.06 });
    this.mapGfx.stroke({ color: 0x8c6428, alpha: 0.15, width: 0.6 });
  }

  private buildObjects() {
    const labelStyle = new TextStyle({
      fontFamily: 'Noto Serif SC, STSong, serif',
      fontSize: 11,
      fill: 0xe8e0d0,
    });

    for (const [cat, layout] of Object.entries(LAYOUTS)) {
      const c = new Container();
      c.eventMode = 'static';
      c.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(-layout.w / 2, -layout.h / 2, layout.w, layout.h, 4);
      bg.fill({ color: CATEGORY_COLORS[cat] || 0x888888, alpha: 0.25 });
      bg.stroke({ color: CATEGORY_COLORS[cat] || 0x888888, alpha: 0.5, width: 1 });
      c.addChild(bg);

      const label = new Text({ text: OBJECT_LABELS[cat] || cat, style: labelStyle });
      label.anchor.set(0.5);
      c.addChild(label);

      c.on('pointerdown', () => {
        if (this.onObjectClick) this.onObjectClick(cat as ActivityCategory);
      });

      this.objectContainers.set(cat, c);
      this.container.addChild(c);
    }
  }

  private positionObjects() {
    const { width: w, height: h } = this;
    const dw = w * 0.75;
    const dh = h * 0.65;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    for (const [cat, layout] of Object.entries(LAYOUTS)) {
      const c = this.objectContainers.get(cat);
      if (!c) continue;
      c.x = dx + layout.xPct * dw;
      c.y = dy + layout.yPct * dh;
      c.rotation = layout.rotation;
    }
  }

  private updateObject(obj: DeskObjectState) {
    const c = this.objectContainers.get(obj.category);
    if (!c) return;

    if (obj.isFocused) {
      c.alpha = 1;
      c.scale.set(1.15);
      c.zIndex = 20;
    } else if (obj.isDimmed) {
      c.alpha = 0.25;
      c.scale.set(1);
      c.zIndex = 5;
      c.eventMode = 'none';
    } else {
      c.alpha = 1;
      c.scale.set(1);
      c.zIndex = 5;
      c.eventMode = 'static';
    }
  }

  private drawLight(timeSlot: string) {
    const { width: w, height: h } = this;
    const tint = TIME_TINTS[timeSlot] || TIME_TINTS.morning;

    this.lightGfx.clear();
    this.lightGfx.ellipse(w * tint.x, h * tint.y, w * 0.4, h * 0.4);
    this.lightGfx.fill({ color: tint.color, alpha: tint.alpha });
  }
}
