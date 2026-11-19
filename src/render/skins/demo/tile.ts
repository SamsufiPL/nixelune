/**
 * ROUGH DEMO SKIN - exists only to exercise every hook of the skin contract (rich
 * sprite painting, overflow, row order, hint states, particles). To be deleted.
 */
import type { TileColor } from '../../../game/types';
import { hexPath, SQRT3 } from '../../hex';
import type { Ctx2D, TilePaint } from '../../skin';

interface Tone {
  readonly light: string;
  readonly base: string;
  readonly dark: string;
  readonly side: string;
}

export const TONES: Readonly<Record<TileColor, Tone>> = {
  teal: { light: '#8FF5E0', base: '#1FBFA5', dark: '#0F8F7C', side: '#0A6457' },
  coral: { light: '#FFB0B8', base: '#FF5A6E', dark: '#D43A52', side: '#9C2439' },
  ice: { light: '#B5DEFF', base: '#3FA8FF', dark: '#1F7FDB', side: '#15579B' },
  lilac: { light: '#D5C2FF', base: '#9B6BFF', dark: '#7446DB', side: '#4D2C9C' },
  amber: { light: '#FFE3A0', base: '#FFB020', dark: '#DB8A0C', side: '#9C5F06' },
};

/** Thickness of a tile below its face, in units of r. */
const DEPTH = 0.2;

function mark(ctx: Ctx2D, color: TileColor, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  switch (color) {
    case 'teal':
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      break;
    case 'coral':
      ctx.moveTo(cx, cy - s * 1.1);
      ctx.lineTo(cx + s * 1.05, cy + s * 0.8);
      ctx.lineTo(cx - s * 1.05, cy + s * 0.8);
      ctx.closePath();
      break;
    case 'ice':
      ctx.rect(cx - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8);
      break;
    case 'lilac':
      ctx.moveTo(cx, cy - s * 1.2);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s * 1.2);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      break;
    case 'amber':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? s * 1.25 : s * 0.55;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        else ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
  }
}

export function paintDemoTile(p: TilePaint): void {
  const { ctx, cx, cy, r, color, state } = p;
  const tone = TONES[color];
  const face = r * 0.9;

  if (state === 'ghost') {
    ctx.lineJoin = 'round';
    ctx.setLineDash([r * 0.3, r * 0.2]);
    hexPath(ctx, cx, cy, r * 0.78);
    ctx.lineWidth = Math.max(1.5, r * (p.highContrast ? 0.14 : 0.09));
    ctx.strokeStyle = tone.light;
    ctx.globalAlpha = p.highContrast ? 1 : 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    mark(ctx, color, cx, cy, r * 0.2);
    ctx.lineWidth = Math.max(1.25, r * 0.07);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  // Soft contact shadow under the tile (uses the bottom overflow).
  const shadow = ctx.createRadialGradient(cx, cy + r * 1.0, r * 0.1, cx, cy + r * 1.0, r * 0.95);
  shadow.addColorStop(0, 'rgba(10,4,20,0.5)');
  shadow.addColorStop(1, 'rgba(10,4,20,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.02, r * 0.95, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thickness: the side of the block.
  ctx.lineJoin = 'round';
  hexPath(ctx, cx, cy + r * DEPTH, face);
  ctx.fillStyle = tone.side;
  ctx.strokeStyle = tone.side;
  ctx.lineWidth = r * 0.12;
  ctx.fill();
  ctx.stroke();

  // Face with a radial light from the upper left.
  const light = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.1);
  light.addColorStop(0, tone.light);
  light.addColorStop(0.45, tone.base);
  light.addColorStop(1, tone.dark);
  hexPath(ctx, cx, cy, face);
  ctx.fillStyle = light;
  ctx.strokeStyle = tone.base;
  ctx.lineWidth = r * 0.12;
  ctx.stroke();
  ctx.fill();

  // Inner bevel: a lighter rim above, a darker one below.
  ctx.save();
  hexPath(ctx, cx, cy, face);
  ctx.clip();
  const rim = ctx.createLinearGradient(cx, cy - face, cx, cy + face);
  rim.addColorStop(0, 'rgba(255,255,255,0.55)');
  rim.addColorStop(0.5, 'rgba(255,255,255,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.3)');
  hexPath(ctx, cx, cy, face * 0.86);
  ctx.strokeStyle = rim;
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  // Gloss: a soft highlight across the upper half.
  const gloss = ctx.createLinearGradient(cx, cy - face, cx, cy);
  gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.1, cy - r * 0.55, (SQRT3 / 2) * face * 0.82, r * 0.46, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Mark: white, with a dark edge so it reads on every colour.
  const s = r * (p.marks ? 0.24 : 0.16);
  mark(ctx, color, cx, cy + r * 0.05, s);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  mark(ctx, color, cx, cy, s);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  if (p.highContrast) {
    ctx.strokeStyle = '#1B0F2E';
    ctx.lineWidth = Math.max(1.25, r * 0.07);
    ctx.stroke();
    hexPath(ctx, cx, cy, face);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.stroke();
  }

  if (state === 'hint1' || state === 'hint2') {
    // Forming path: a ring of light inside the face, stronger one step from a path.
    hexPath(ctx, cx, cy, face * 0.7);
    ctx.strokeStyle = state === 'hint2' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1.25, r * (state === 'hint2' ? 0.1 : 0.06));
    ctx.stroke();
  } else if (state === 'active') {
    hexPath(ctx, cx, cy, face);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.stroke();
  } else if (state === 'lit') {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, face);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    glow.addColorStop(1, 'rgba(255,255,255,0.15)');
    hexPath(ctx, cx, cy, face);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.stroke();
    mark(ctx, color, cx, cy, s);
    ctx.fillStyle = tone.dark;
    ctx.fill();
  }
}

/** A socket of the bed: a dark well with a lit lower lip. */
export function paintDemoSocket(ctx: Ctx2D, cx: number, cy: number, r: number, strong: boolean): void {
  const well = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  well.addColorStop(0, 'rgba(8,3,18,0.75)');
  well.addColorStop(1, 'rgba(40,22,70,0.55)');
  ctx.lineJoin = 'round';
  hexPath(ctx, cx, cy, r * 0.9);
  ctx.fillStyle = well;
  ctx.fill();
  ctx.strokeStyle = strong ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.1)';
  ctx.lineWidth = strong ? 1.5 : 1;
  ctx.stroke();
}
