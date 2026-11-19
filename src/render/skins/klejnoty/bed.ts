/**
 * The board bed: a jeweller's tray lined with deep wine velvet. Lamp light falls
 * across it from the upper left, the nap gives it grain, and every cell is a soft
 * embossed socket: shaded on the wall nearest the lamp, catching light on the far lip.
 * Painted once per size into the engine's cached layer.
 */
import { hexPath } from '../../hex';
import type { BedPaint, Ctx2D } from '../../skin';
import { LIGHT_X, LIGHT_Y } from './palette';

/** Small deterministic generator for textures (never Math.random in a skin). */
export function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Fine nap: a tile of light and dark specks used as a repeating pattern. */
function napPattern(ctx: Ctx2D, light: string, dark: string, seed: number): CanvasPattern | null {
  const size = 96;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const t = tile.getContext('2d');
  if (!t) return null;
  const next = lcg(seed);
  for (let i = 0; i < 2600; i++) {
    const x = next() * size;
    const y = next() * size;
    const len = 1 + next() * 2.4;
    t.globalAlpha = 0.05 + next() * 0.16;
    t.fillStyle = next() > 0.5 ? light : dark;
    // Short strokes leaning one way, like brushed pile.
    t.fillRect(x, y, 0.8, len);
  }
  return ctx.createPattern(tile, 'repeat');
}

export function paintVelvet(ctx: Ctx2D, x: number, y: number, width: number, height: number, seed = 11): void {
  const span = Math.hypot(width, height);
  const g = ctx.createRadialGradient(x + width * 0.14, y + height * 0.04, 0, x + width * 0.14, y + height * 0.04, span * 1.02);
  g.addColorStop(0, '#6A1830');
  g.addColorStop(0.35, '#4A0F23');
  g.addColorStop(0.75, '#2E0816');
  g.addColorStop(1, '#1C040C');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, width, height);
  const nap = napPattern(ctx, '#B04A68', '#12020A', seed);
  if (nap) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = nap;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}

function paintSocket(ctx: Ctx2D, cx: number, cy: number, r: number, strong: boolean): void {
  const rad = r * 0.84;
  ctx.lineJoin = 'round';
  // The hollow: darkest under the wall that faces away from the lamp.
  const hollow = ctx.createLinearGradient(cx + LIGHT_X * rad, cy + LIGHT_Y * rad, cx - LIGHT_X * rad, cy - LIGHT_Y * rad);
  hollow.addColorStop(0, 'rgba(10,0,5,0.72)');
  hollow.addColorStop(0.45, 'rgba(14,1,7,0.42)');
  hollow.addColorStop(1, 'rgba(20,2,10,0.2)');
  hexPath(ctx, cx, cy, rad);
  ctx.fillStyle = hollow;
  ctx.fill();
  // Far lip catches the light; near lip keeps a crisp shadow line.
  const lip = ctx.createLinearGradient(cx + LIGHT_X * rad, cy + LIGHT_Y * rad, cx - LIGHT_X * rad, cy - LIGHT_Y * rad);
  lip.addColorStop(0, 'rgba(4,0,2,0.75)');
  lip.addColorStop(0.5, 'rgba(4,0,2,0)');
  lip.addColorStop(0.62, 'rgba(255,150,180,0)');
  lip.addColorStop(1, 'rgba(255,160,190,0.36)');
  ctx.strokeStyle = lip;
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.stroke();
  // A pin-prick of pile sheen in the middle of the hollow.
  const sheen = ctx.createRadialGradient(cx + r * 0.12, cy + r * 0.16, 0, cx + r * 0.12, cy + r * 0.16, r * 0.5);
  sheen.addColorStop(0, 'rgba(190,70,105,0.2)');
  sheen.addColorStop(1, 'rgba(190,70,105,0)');
  ctx.fillStyle = sheen;
  ctx.fill();
  if (strong) {
    ctx.strokeStyle = 'rgba(255,225,235,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function paintBed(b: BedPaint): void {
  const { ctx, width, height, r } = b;
  if (b.highContrast) {
    ctx.fillStyle = '#0C0105';
    ctx.fillRect(0, 0, width, height);
  } else {
    paintVelvet(ctx, 0, 0, width, height);
  }
  for (let row = 0; row < b.rows; row++) {
    for (let col = 0; col < b.cols; col++) paintSocket(ctx, b.cellX(col, row), b.cellY(row), r, b.highContrast);
  }
  if (b.highContrast) return;
  // The gold frame stands above the velvet: its lamp-side edges shade the tray.
  const top = ctx.createLinearGradient(0, 0, 0, r * 1.1);
  top.addColorStop(0, 'rgba(5,0,2,0.75)');
  top.addColorStop(1, 'rgba(5,0,2,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, r * 1.1);
  const left = ctx.createLinearGradient(0, 0, r * 0.8, 0);
  left.addColorStop(0, 'rgba(5,0,2,0.65)');
  left.addColorStop(1, 'rgba(5,0,2,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, r * 0.8, height);
  // And the far edges pick up a little bounce from the metal.
  const bottom = ctx.createLinearGradient(0, height - r * 0.5, 0, height);
  bottom.addColorStop(0, 'rgba(255,200,120,0)');
  bottom.addColorStop(1, 'rgba(255,200,120,0.1)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height - r * 0.5, width, r * 0.5);
}
