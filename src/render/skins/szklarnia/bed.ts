/**
 * The bed: a slab of pale limestone on the potting table, with a recessed socket for
 * every cell. Morning light crosses it from the upper right, broken by the glazing
 * bars and a few leaves. Painted once per board size.
 */
import type { BedPaint } from '../../skin';
import { paintSocket } from './tile';

/** Small deterministic generator for texture; never used for gameplay. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paintBed(b: BedPaint): void {
  const { ctx, width, height, r } = b;
  const rnd = seeded(0x5a17);

  // Stone, a touch warmer where the light arrives.
  const stone = ctx.createLinearGradient(width, 0, 0, height);
  stone.addColorStop(0, '#FBF6EA');
  stone.addColorStop(0.5, '#F3ECDD');
  stone.addColorStop(1, '#E7DECB');
  ctx.fillStyle = stone;
  ctx.fillRect(0, 0, width, height);

  if (!b.highContrast) {
    // Fossil flecks and pores of the limestone.
    const flecks = Math.round((width * height) / 520);
    for (let i = 0; i < flecks; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const size = 0.4 + rnd() * 1.1;
      ctx.fillStyle = rnd() < 0.5 ? `rgba(150,128,96,${0.1 + rnd() * 0.14})` : `rgba(255,255,255,${0.35 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(x, y, size * (1 + rnd()), size, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Two faint veins.
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const x0 = width * (0.15 + rnd() * 0.5);
      ctx.beginPath();
      ctx.moveTo(x0, -4);
      ctx.bezierCurveTo(x0 + width * 0.3, height * 0.3, x0 - width * 0.25, height * 0.62, x0 + width * 0.2, height + 4);
      ctx.strokeStyle = 'rgba(170,150,118,0.14)';
      ctx.lineWidth = 0.8 + rnd();
      ctx.stroke();
    }
  }

  for (let row = 0; row < b.rows; row++) {
    for (let col = 0; col < b.cols; col++) {
      paintSocket(ctx, b.cellX(col, row), b.cellY(row), r, b.dpr, b.highContrast);
    }
  }
  if (b.highContrast) return;

  // One broad wash of morning light from the upper right; no pattern to compete
  // with the tiles.
  const light = ctx.createLinearGradient(width, 0, width * 0.2, height * 0.8);
  light.addColorStop(0, 'rgba(255,250,228,0.4)');
  light.addColorStop(1, 'rgba(255,250,228,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  // Soft shade at the foot and the left, where the frame stands in the light.
  const shade = ctx.createLinearGradient(width, 0, 0, height);
  shade.addColorStop(0, 'rgba(120,98,60,0)');
  shade.addColorStop(0.7, 'rgba(120,98,60,0)');
  shade.addColorStop(1, 'rgba(120,98,60,0.16)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  // Shadow of the frame along the top and right inner edges.
  const top = ctx.createLinearGradient(0, 0, 0, r * 0.55);
  top.addColorStop(0, 'rgba(70,52,28,0.3)');
  top.addColorStop(1, 'rgba(70,52,28,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, r * 0.55);
  const right = ctx.createLinearGradient(width, 0, width - r * 0.45, 0);
  right.addColorStop(0, 'rgba(70,52,28,0.26)');
  right.addColorStop(1, 'rgba(70,52,28,0)');
  ctx.fillStyle = right;
  ctx.fillRect(width - r * 0.45, 0, r * 0.45, height);
}
