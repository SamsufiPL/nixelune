/**
 * Menu picture: a corner of the potting table. A small slab with ten tiles, a path
 * of sun tiles catching the morning beam, fern behind it. Painted with the very
 * painters the board uses, so the menu promises exactly what the game shows.
 */
import type { TileColor } from '../../../game/types';
import type { Ctx2D, TileState } from '../../skin';
import { crown, DEEP, NEAR, pot } from './backdrop';
import { seeded } from './bed';
import { paintLinkClasp } from './links';
import { paintSocket, paintTile, roundedHex } from './tile';

const W = 320;
const H = 236;
const R = 27;
const STEP = Math.sqrt(3) * R;

interface Piece {
  readonly x: number;
  readonly y: number;
  readonly color: TileColor;
  readonly state: TileState;
}

const ROW0 = 76;
const ROW1 = ROW0 + R * 1.5;
const ROW2 = ROW1 + R * 1.5;
const X0 = W / 2 + 4;
const PIECES: readonly Piece[] = [
  { x: X0 - STEP, y: ROW0, color: 'teal', state: 'normal' },
  { x: X0, y: ROW0, color: 'amber', state: 'lit' },
  { x: X0 + STEP, y: ROW0, color: 'lilac', state: 'normal' },
  { x: X0 - STEP * 1.5, y: ROW1, color: 'amber', state: 'hint2' },
  { x: X0 - STEP * 0.5, y: ROW1, color: 'amber', state: 'hint2' },
  { x: X0 + STEP * 0.5, y: ROW1, color: 'amber', state: 'lit' },
  { x: X0 + STEP * 1.5, y: ROW1, color: 'ice', state: 'normal' },
  { x: X0 - STEP, y: ROW2, color: 'coral', state: 'normal' },
  { x: X0, y: ROW2, color: 'teal', state: 'normal' },
  { x: X0 + STEP, y: ROW2, color: 'amber', state: 'lit' },
];
/** The sun path, in the order the beam runs along it. */
const PATH: readonly number[] = [3, 4, 1, 5, 9];

function glint(ctx: Ctx2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fillStyle = '#F3B93A';
  ctx.fill();
  ctx.beginPath();
  const s = size * 0.84;
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

export function createMenuArt(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'szk-menu-art';
  canvas.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = seeded(0x3e9a);

  // Fern and a pot behind the slab.
  crown(ctx, 44, 150, 96, Math.PI * 1.12, Math.PI * 1.86, 7, 0.5, DEEP, rnd);
  crown(ctx, 42, 152, 70, Math.PI * 1.2, Math.PI * 1.8, 5, 0.4, NEAR, rnd);
  crown(ctx, W - 36, 120, 84, Math.PI * 1.1, Math.PI * 1.8, 7, 0.55, DEEP, rnd);
  crown(ctx, W - 38, 122, 60, Math.PI * 1.2, Math.PI * 1.75, 5, 0.45, NEAR, rnd);
  pot(ctx, W - 36, 176, 50);

  // The slab: one piece of stone following the sockets, with thickness and a shadow.
  const slab = (dy: number, grow: number): void => {
    ctx.beginPath();
    for (const piece of PIECES) {
      const radius = R * 1.3 + grow;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const x = piece.x + Math.cos(a) * radius;
        const y = piece.y + dy + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  };
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.shadowColor = 'rgba(64,48,26,0.42)';
  ctx.shadowBlur = 16 * dpr;
  ctx.shadowOffsetX = -9 * dpr;
  ctx.shadowOffsetY = 12 * dpr;
  slab(9, 0);
  ctx.fillStyle = '#B9AC93';
  ctx.strokeStyle = '#B9AC93';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  const side = ctx.createLinearGradient(0, 0, W, 0);
  side.addColorStop(0, '#A89A80');
  side.addColorStop(1, '#D2C6AE');
  slab(9, 0);
  ctx.fillStyle = side;
  ctx.strokeStyle = side;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fill();
  const top = ctx.createLinearGradient(W, 0, 0, H);
  top.addColorStop(0, '#FCF8EE');
  top.addColorStop(1, '#E9E0CE');
  slab(0, 0);
  ctx.fillStyle = top;
  ctx.strokeStyle = top;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fill();
  // Brass inlay line round the top face.
  slab(0, -1.5);
  ctx.strokeStyle = 'rgba(199,154,62,0.0)';
  ctx.stroke();

  for (const piece of PIECES) paintSocket(ctx, piece.x, piece.y, R, dpr, false);
  const env = { marks: true, highContrast: false, dpr };
  for (const piece of PIECES) {
    ctx.save();
    paintTile({ ctx, color: piece.color, state: piece.state, cx: piece.x, cy: piece.y, r: R, ...env });
    ctx.restore();
  }
  // Clasps and the beam along the path.
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PIECES[PATH[i] ?? 0];
    const b = PIECES[PATH[i + 1] ?? 0];
    if (a && b) paintLinkClasp(ctx, a.x, a.y, b.x, b.y, R, 2);
  }

  // The beam itself, slanting across from the upper right.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createLinearGradient(W * 0.86, 0, W * 0.2, H);
  beam.addColorStop(0, 'rgba(255,244,196,0.5)');
  beam.addColorStop(0.7, 'rgba(255,244,196,0.14)');
  beam.addColorStop(1, 'rgba(255,244,196,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(W * 0.74, 0);
  ctx.lineTo(W * 1.0, 0);
  ctx.lineTo(W * 0.42, H);
  ctx.lineTo(W * 0.1, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  glint(ctx, X0 + STEP + 13, ROW2 - 20, 13);
  glint(ctx, X0 + 12, ROW0 - 22, 10);
  glint(ctx, X0 + STEP * 0.5 + 16, ROW1 - 6, 6);
  glint(ctx, X0 - STEP * 0.5 - 20, ROW1 - 26, 5);

  // A few petals let fall on the table.
  const petals: readonly (readonly [number, number, number, string])[] = [
    [58, 200, 0.6, '#EC5F4C'],
    [86, 214, -0.9, '#FFC4B0'],
    [250, 212, 2.2, '#A07CDA'],
    [224, 222, 0.3, '#F4B224'],
  ];
  for (const [x, y, turn, color] of petals) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.fillStyle = 'rgba(64,48,26,0.2)';
    ctx.beginPath();
    ctx.ellipse(-2, 3, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-9, 2, -6, -8, 0, -7);
    ctx.bezierCurveTo(6, -8, 9, 2, 0, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, -2, 2.2, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Keep `roundedHex` in the bundle path used by the slab's inlay on wide screens.
  void roundedHex;
  return canvas;
}
