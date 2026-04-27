import { Container, Graphics } from 'pixi.js';
import type { SceneType } from '../GameCanvasContext';

type TimeSlot = 'morning' | 'afternoon' | 'evening';

const SCENE_COLORS: Record<SceneType, { base: number; overlay: number; overlayAlpha: number }> = {
  title:    { base: 0x0a0a0f, overlay: 0x141e3c, overlayAlpha: 0.3 },
  desk:     { base: 0x0a0a0f, overlay: 0x3c280f, overlayAlpha: 0.25 },
  scene:    { base: 0x0a0a0f, overlay: 0x141e3c, overlayAlpha: 0.3 },
  briefing: { base: 0x0a0a0f, overlay: 0x2a1c0e, overlayAlpha: 0.2 },
  ending:   { base: 0x0a0a0f, overlay: 0x50140a, overlayAlpha: 0.2 },
  loading:  { base: 0x0a0a0f, overlay: 0x141e3c, overlayAlpha: 0.3 },
};

const DESK_TIME_COLORS: Record<TimeSlot, { overlay: number; overlayAlpha: number; vignetteAlpha: number }> = {
  morning:   { overlay: 0x3c4858, overlayAlpha: 0.18, vignetteAlpha: 0.2 },
  afternoon: { overlay: 0x3c280f, overlayAlpha: 0.25, vignetteAlpha: 0.3 },
  evening:   { overlay: 0x1a1008, overlayAlpha: 0.35, vignetteAlpha: 0.45 },
};

export class BackgroundLayer {
  readonly container: Container;
  private baseGfx: Graphics;
  private overlayGfx: Graphics;
  private vignetteGfx: Graphics;
  private deskEdgeGfx: Graphics;
  private width = 0;
  private height = 0;
  private currentScene: SceneType = 'title';
  private currentTimeSlot: TimeSlot = 'morning';

  constructor() {
    this.container = new Container();
    this.baseGfx = new Graphics();
    this.overlayGfx = new Graphics();
    this.vignetteGfx = new Graphics();
    this.deskEdgeGfx = new Graphics();
    this.container.addChild(this.baseGfx, this.overlayGfx, this.vignetteGfx, this.deskEdgeGfx);
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.draw();
  }

  setScene(scene: SceneType) {
    if (scene === this.currentScene) return;
    this.currentScene = scene;
    this.draw();
  }

  setTimeSlot(slot: TimeSlot) {
    if (slot === this.currentTimeSlot) return;
    this.currentTimeSlot = slot;
    this.draw();
  }

  private draw() {
    const { width: w, height: h } = this;
    if (w === 0 || h === 0) return;

    const colors = SCENE_COLORS[this.currentScene] || SCENE_COLORS.title;
    const isDesk = this.currentScene === 'desk';
    const timeColors = isDesk ? DESK_TIME_COLORS[this.currentTimeSlot] : null;
    const overlayColor = timeColors ? timeColors.overlay : colors.overlay;
    const overlayAlpha = timeColors ? timeColors.overlayAlpha : colors.overlayAlpha;
    const vignetteBase = timeColors ? timeColors.vignetteAlpha : 0.3;

    this.baseGfx.clear();
    this.baseGfx.rect(0, 0, w, h);
    this.baseGfx.fill(colors.base);

    this.overlayGfx.clear();
    this.overlayGfx.rect(0, 0, w, h);
    this.overlayGfx.fill({ color: overlayColor, alpha: overlayAlpha });

    this.vignetteGfx.clear();
    this.vignetteGfx.rect(0, 0, w, h);
    this.vignetteGfx.fill({ color: 0x000000, alpha: 0.0 });
    // Vignette simulated with border overlay
    const vSize = Math.max(w, h) * 0.3;
    // Top
    this.vignetteGfx.rect(0, 0, w, vSize);
    this.vignetteGfx.fill({ color: 0x000000, alpha: vignetteBase });
    // Bottom
    this.vignetteGfx.rect(0, h - vSize, w, vSize);
    this.vignetteGfx.fill({ color: 0x000000, alpha: vignetteBase + 0.1 });
    // Left
    this.vignetteGfx.rect(0, 0, vSize, h);
    this.vignetteGfx.fill({ color: 0x000000, alpha: vignetteBase });
    // Right
    this.vignetteGfx.rect(w - vSize, 0, vSize, h);
    this.vignetteGfx.fill({ color: 0x000000, alpha: vignetteBase });

    this.deskEdgeGfx.clear();
    const edgeH = h * 0.15;
    this.deskEdgeGfx.rect(0, h - edgeH, w, edgeH);
    this.deskEdgeGfx.fill({ color: 0x281e14, alpha: 0.4 });
  }
}
