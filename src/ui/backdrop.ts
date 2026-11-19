/**
 * Host of the skin's backdrop: the layer behind every screen. A canvas backdrop is
 * painted once per size; its optional ambient layer runs on its own slow clock and
 * stops under reduced motion, in high contrast and while the app is hidden. A DOM
 * backdrop is simply mounted.
 */
import type { BackdropSkin, PaintEnv, Skin } from '../render/skin';
import { el } from './dom';

/** Full-screen canvases are capped lower than the board: nobody inspects the sky. */
export const BACKDROP_MAX_DPR = 2;

export interface BackdropEnv {
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
}

export interface BackdropHost {
  readonly root: HTMLElement;
  /** Mount the backdrop of `skin`; call again when preferences change. */
  set(skin: Skin, env: BackdropEnv): void;
}

/** Interval between ambient frames for a requested rate, clamped to 1-30 fps. */
export function ambientInterval(fps: number): number {
  const rate = Number.isFinite(fps) ? Math.min(30, Math.max(1, fps)) : 10;
  return 1000 / rate;
}

export function createBackdropHost(): BackdropHost {
  const root = el('div', { class: 'backdrop', 'aria-hidden': 'true' });
  let current: BackdropSkin | null = null;
  let domNode: HTMLElement | SVGElement | null = null;
  let staticCanvas: HTMLCanvasElement | null = null;
  let ambientCanvas: HTMLCanvasElement | null = null;
  let env: BackdropEnv = { highContrast: false, reducedMotion: false };
  let frame = 0;
  let lastAmbient = 0;
  let started = 0;

  const paintEnv = (dpr: number): PaintEnv => ({ marks: true, highContrast: env.highContrast, dpr });

  function size(canvas: HTMLCanvasElement, dpr: number): CanvasRenderingContext2D | null {
    const width = root.clientWidth;
    const height = root.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function paintStatic(): void {
    if (!current || current.kind !== 'canvas' || !staticCanvas) return;
    const dpr = Math.min(BACKDROP_MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
    const ctx = size(staticCanvas, dpr);
    if (ctx) current.paint(ctx, root.clientWidth, root.clientHeight, paintEnv(dpr));
    if (ambientCanvas) size(ambientCanvas, Math.min(1.5, dpr));
  }

  function ambientAllowed(): boolean {
    return (
      current !== null &&
      current.kind === 'canvas' &&
      current.ambient !== undefined &&
      !env.reducedMotion &&
      !env.highContrast &&
      !document.hidden
    );
  }

  function tick(time: number): void {
    frame = 0;
    if (!ambientAllowed() || !current || current.kind !== 'canvas' || !current.ambient || !ambientCanvas) return;
    frame = requestAnimationFrame(tick);
    if (time - lastAmbient < ambientInterval(current.ambient.fps) - 1) return;
    lastAmbient = time;
    if (started === 0) started = time;
    const ctx = ambientCanvas.getContext('2d');
    if (!ctx) return;
    const dpr = ambientCanvas.width / Math.max(1, root.clientWidth);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    current.ambient.paint(ctx, root.clientWidth, root.clientHeight, time - started, paintEnv(dpr));
  }

  function syncAmbient(): void {
    if (ambientAllowed()) {
      if (frame === 0) frame = requestAnimationFrame(tick);
      return;
    }
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    const ctx = ambientCanvas?.getContext('2d');
    if (ctx && ambientCanvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
    }
  }

  function unmount(): void {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    if (current?.kind === 'dom' && domNode) current.destroy?.(domNode);
    domNode = null;
    staticCanvas = null;
    ambientCanvas = null;
    root.replaceChildren();
  }

  new ResizeObserver(paintStatic).observe(root);
  document.addEventListener('visibilitychange', syncAmbient);

  return {
    root,
    set(skin, nextEnv) {
      const sameSkin = skin.backdrop === current;
      const repaint = nextEnv.highContrast !== env.highContrast;
      env = nextEnv;
      if (!sameSkin) {
        unmount();
        current = skin.backdrop;
        if (current.kind === 'dom') {
          domNode = current.create(paintEnv(1));
          root.append(domNode);
        } else {
          staticCanvas = el('canvas', { class: 'backdrop__layer' });
          root.append(staticCanvas);
          if (current.ambient) {
            ambientCanvas = el('canvas', { class: 'backdrop__layer' });
            root.append(ambientCanvas);
          }
          paintStatic();
        }
      } else if (repaint) {
        if (current?.kind === 'dom') {
          // A DOM backdrop reads `:root[data-contrast]` in its CSS; nothing to rebuild.
        } else {
          paintStatic();
        }
      }
      syncAmbient();
    },
  };
}
