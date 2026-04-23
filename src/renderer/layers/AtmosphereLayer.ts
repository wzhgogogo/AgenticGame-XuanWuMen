import { Container, Graphics } from 'pixi.js';
import type { Ticker } from 'pixi.js';

export class AtmosphereLayer {
  readonly container: Container;
  private candleGfx: Graphics;
  private beamGfx: Graphics;
  private width = 0;
  private height = 0;
  private elapsed = 0;

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

  update(ticker: Ticker) {
    this.elapsed += ticker.deltaMS / 1000;
    const breath = 0.5 + 0.5 * Math.sin(this.elapsed * 1.2);
    this.candleGfx.alpha = 0.08 + 0.06 * breath;

    const shift = 0.5 + 0.5 * Math.sin(this.elapsed * 0.5);
    this.beamGfx.alpha = 0.02 + 0.02 * shift;
  }

  private drawStatic() {
    const { width: w, height: h } = this;
    if (w === 0 || h === 0) return;

    // Candlelight glow — ellipse at lower-left
    this.candleGfx.clear();
    this.candleGfx.ellipse(w * 0.1, h * 0.6, w * 0.35, h * 0.4);
    this.candleGfx.fill({ color: 0xc9a84c, alpha: 1.0 });
    this.candleGfx.alpha = 0.1;

    // Diagonal light beam
    this.beamGfx.clear();
    const bw = w * 0.15;
    this.beamGfx.moveTo(w * 0.4, 0);
    this.beamGfx.lineTo(w * 0.4 + bw, 0);
    this.beamGfx.lineTo(w * 0.6 + bw, h);
    this.beamGfx.lineTo(w * 0.6, h);
    this.beamGfx.closePath();
    this.beamGfx.fill({ color: 0xc9a84c, alpha: 1.0 });
    this.beamGfx.alpha = 0.03;
  }
}
