import { Container, Graphics } from 'pixi.js';
import type { Ticker } from 'pixi.js';

type TimeSlot = 'morning' | 'afternoon' | 'evening';

const TIME_ATMOSPHERE: Record<TimeSlot, {
  candleAlpha: number; candleBreath: number;
  beamAlpha: number; beamBreath: number;
  candleColor: number; beamColor: number;
  candleX: number; candleY: number;
}> = {
  morning: {
    candleAlpha: 0.02, candleBreath: 0.01,
    beamAlpha: 0.06, beamBreath: 0.02,
    candleColor: 0xb0c0d0, beamColor: 0xc0c8d8,
    candleX: 0.85, candleY: 0.3,
  },
  afternoon: {
    candleAlpha: 0.05, candleBreath: 0.03,
    beamAlpha: 0.04, beamBreath: 0.015,
    candleColor: 0xe0c878, beamColor: 0xc9a84c,
    candleX: 0.5, candleY: 0.15,
  },
  evening: {
    candleAlpha: 0.14, candleBreath: 0.08,
    beamAlpha: 0.01, beamBreath: 0.005,
    candleColor: 0xc9a84c, beamColor: 0xc9a84c,
    candleX: 0.1, candleY: 0.6,
  },
};

export class AtmosphereLayer {
  readonly container: Container;
  private candleGfx: Graphics;
  private beamGfx: Graphics;
  private width = 0;
  private height = 0;
  private elapsed = 0;
  private currentSlot: TimeSlot = 'morning';

  constructor() {
    this.container = new Container();
    this.candleGfx = new Graphics();
    this.beamGfx = new Graphics();
    this.container.addChild(this.candleGfx, this.beamGfx);
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.drawStatic();
  }

  setTimeSlot(slot: TimeSlot) {
    if (slot === this.currentSlot) return;
    this.currentSlot = slot;
    this.drawStatic();
  }

  update(ticker: Ticker) {
    this.elapsed += ticker.deltaMS / 1000;
    const atm = TIME_ATMOSPHERE[this.currentSlot];
    const breath = 0.5 + 0.5 * Math.sin(this.elapsed * 1.2);
    this.candleGfx.alpha = atm.candleAlpha + atm.candleBreath * breath;

    const shift = 0.5 + 0.5 * Math.sin(this.elapsed * 0.5);
    this.beamGfx.alpha = atm.beamAlpha + atm.beamBreath * shift;
  }

  private drawStatic() {
    const { width: w, height: h } = this;
    if (w === 0 || h === 0) return;
    const atm = TIME_ATMOSPHERE[this.currentSlot];

    this.candleGfx.clear();
    this.candleGfx.ellipse(w * atm.candleX, h * atm.candleY, w * 0.35, h * 0.4);
    this.candleGfx.fill({ color: atm.candleColor, alpha: 1.0 });
    this.candleGfx.alpha = atm.candleAlpha;

    this.beamGfx.clear();
    const bw = w * 0.15;
    this.beamGfx.moveTo(w * 0.4, 0);
    this.beamGfx.lineTo(w * 0.4 + bw, 0);
    this.beamGfx.lineTo(w * 0.6 + bw, h);
    this.beamGfx.lineTo(w * 0.6, h);
    this.beamGfx.closePath();
    this.beamGfx.fill({ color: atm.beamColor, alpha: 1.0 });
    this.beamGfx.alpha = atm.beamAlpha;
  }
}
