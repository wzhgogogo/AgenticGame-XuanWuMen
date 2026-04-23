import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { AtmosphereLayer } from './layers/AtmosphereLayer';
import { DeskContentLayer } from './layers/DeskContentLayer';
import { useGameCanvas } from './GameCanvasContext';
import type { SceneType } from './GameCanvasContext';

export function GameCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const layersRef = useRef<{
    bg: BackgroundLayer;
    atmo: AtmosphereLayer;
    desk: DeskContentLayer;
  } | null>(null);
  const { sceneType, deskState, onCanvasEvent } = useGameCanvas();

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const app = new Application();
    let destroyed = false;

    (async () => {
      await app.init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: true,
      });
      if (destroyed) { app.destroy(true); return; }

      el.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const bg = new BackgroundLayer();
      const atmo = new AtmosphereLayer();
      const desk = new DeskContentLayer();

      app.stage.addChild(bg.container, atmo.container, desk.container);

      const w = app.screen.width;
      const h = app.screen.height;
      bg.resize(w, h);
      atmo.resize(w, h);
      desk.resize(w, h);

      app.ticker.add((ticker) => {
        atmo.update(ticker);
      });

      layersRef.current = { bg, atmo, desk };
    })();

    const ro = new ResizeObserver(() => {
      if (!appRef.current || !layersRef.current) return;
      const w = appRef.current.screen.width;
      const h = appRef.current.screen.height;
      layersRef.current.bg.resize(w, h);
      layersRef.current.atmo.resize(w, h);
      layersRef.current.desk.resize(w, h);
    });
    ro.observe(el);

    return () => {
      destroyed = true;
      ro.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      layersRef.current = null;
    };
  }, []);

  const prevSceneRef = useRef<SceneType>('title');
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.bg.setScene(sceneType);
    const showDesk = sceneType === 'desk';
    layersRef.current.desk.container.visible = showDesk;
    prevSceneRef.current = sceneType;
  }, [sceneType]);

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.desk.setState(deskState);
  }, [deskState]);

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.desk.setClickHandler((cat) => {
      onCanvasEvent({ type: 'click_object', category: cat });
    });
  }, [onCanvasEvent]);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
