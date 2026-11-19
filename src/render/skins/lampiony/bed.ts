/**
 * The board bed of `lampiony`: a tray of dark lacquered wood with a socket carved for
 * every cell. Light comes from the upper left, so the upper-left wall of a socket is
 * in shade and its lower-right lip catches the light. Painted once per size.
 */
import { hexPath } from '../../hex';
import type { BedPaint, Ctx2D } from '../../skin';
import { LACQUER } from './palette';

/** Deterministic scatter in [0, 1): the bed needs no random generator. */
function hash(i: number, k: number): number {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function paintGrain(ctx: Ctx2D, width: number, height: number, r: number): void {
  // Long, slightly wavy grain lines under the lacquer.
  const lines = Math.round(height / Math.max(3, r * 0.34));
  ctx.lineCap = 'round';
  for (let i = 0; i < lines; i++) {
    const y = (i + hash(i, 1)) * (height / lines);
    const wave = r * (0.1 + hash(i, 2) * 0.25);
    const from = width * hash(i, 3) * 0.5;
    const to = width * (0.5 + hash(i, 4) * 0.5);
    ctx.beginPath();
    ctx.moveTo(from, y);
    ctx.bezierCurveTo(from + (to - from) * 0.33, y - wave, from + (to - from) * 0.66, y + wave, to, y);
    const pale = hash(i, 5) > 0.5;
    ctx.strokeStyle = pale ? 'rgba(190,96,80,0.07)' : 'rgba(6,2,4,0.2)';
    ctx.lineWidth = 0.5 + hash(i, 6) * 1.1;
    ctx.stroke();
  }
}

function paintSocket(ctx: Ctx2D, cx: number, cy: number, r: number, strong: boolean): void {
  const s = r * 0.9;
  // The floor: darkest under the shaded wall, a breath of warmth at the far side.
  const floor = ctx.createLinearGradient(cx - s * 0.7, cy - s * 0.8, cx + s * 0.7, cy + s * 0.8);
  floor.addColorStop(0, '#070304');
  floor.addColorStop(0.55, LACQUER.socket);
  floor.addColorStop(1, '#1B0D12');
  ctx.lineJoin = 'round';
  hexPath(ctx, cx, cy, s);
  ctx.fillStyle = floor;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Shade thrown into the socket by its upper-left wall.
  hexPath(ctx, cx + r * 0.13, cy + r * 0.17, s);
  ctx.lineWidth = r * 0.26;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.stroke();
  // A dimple where the lantern's foot rests.
  const dimple = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.42);
  dimple.addColorStop(0, 'rgba(92,44,44,0.34)');
  dimple.addColorStop(1, 'rgba(92,44,44,0)');
  ctx.fillStyle = dimple;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  // Carved edge: dark above and to the left, a lit lip below and to the right.
  const lip = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  lip.addColorStop(0, 'rgba(0,0,0,0.75)');
  lip.addColorStop(0.5, 'rgba(60,26,28,0.5)');
  lip.addColorStop(1, strong ? '#FFE9C8' : 'rgba(214,128,96,0.6)');
  hexPath(ctx, cx, cy, s);
  ctx.lineWidth = strong ? 1.5 : Math.max(1, r * 0.06);
  ctx.strokeStyle = strong ? '#FFE9C8' : lip;
  ctx.stroke();
}

export function paintBed(b: BedPaint): void {
  const { ctx, width, height, r } = b;
  const wood = ctx.createLinearGradient(0, 0, width, height);
  wood.addColorStop(0, '#34181F');
  wood.addColorStop(0.5, LACQUER.base);
  wood.addColorStop(1, LACQUER.low);
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, width, height);
  if (!b.highContrast) {
    paintGrain(ctx, width, height, r);
    // The sheen of the lacquer: one broad soft band from the light.
    const sheen = ctx.createLinearGradient(0, 0, width * 0.9, height * 0.6);
    sheen.addColorStop(0, 'rgba(255,170,130,0.1)');
    sheen.addColorStop(0.3, 'rgba(255,170,130,0.03)');
    sheen.addColorStop(0.42, 'rgba(255,190,150,0.08)');
    sheen.addColorStop(0.55, 'rgba(255,170,130,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);
  }
  for (let row = 0; row < b.rows; row++) {
    for (let col = 0; col < b.cols; col++) paintSocket(ctx, b.cellX(col, row), b.cellY(row), r, b.highContrast);
  }
  if (!b.highContrast) {
    // The frame stands above the tray and shades its upper and left edges.
    const top = ctx.createLinearGradient(0, 0, 0, r * 1.1);
    top.addColorStop(0, 'rgba(0,0,0,0.5)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, r * 1.1);
    const left = ctx.createLinearGradient(0, 0, r * 0.9, 0);
    left.addColorStop(0, 'rgba(0,0,0,0.42)');
    left.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, r * 0.9, height);
  }
}
