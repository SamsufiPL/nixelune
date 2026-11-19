/**
 * How one mineral tile is drawn: one flat hexagon, a micro-bevel (the diagonal
 * light-to-shade overlay of the kit mockup) and one facet. With tile marks on, the
 * facet is replaced by an engraved per-colour mark, so a tile never carries more
 * than these three things. Proportions are taken from the mockup SVG, in hex radii.
 */
import { TILE_COLORS, type TileColor } from '../game/types';
import { hexPath, SQRT3 } from './hex';
import { CELL_FILL, CELL_STROKE, CELL_STROKE_STRONG, BRASS, TEXT, TILE_FILL } from './palette';

export const TILE_RADIUS = 0.854;
export const BEVEL_RADIUS = 0.805;
export const FACET_RADIUS = 0.51;
export const ACTIVE_RADIUS = 0.844;
export const GHOST_RADIUS = 0.805;
export const EMPTY_RADIUS = 0.942;

export type TileVariant = 'locked' | 'active' | 'lit';

export interface TileStyle {
  readonly marks: boolean;
  readonly highContrast: boolean;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Each colour has its own simple mark, so colour is never the only cue. */
export const MARK_SHAPE: Readonly<Record<TileColor, 'ring' | 'triangle' | 'bars' | 'diamond' | 'cross'>> = {
  teal: 'ring',
  coral: 'triangle',
  ice: 'bars',
  lilac: 'diamond',
  amber: 'cross',
};

function traceMark(ctx: Ctx, color: TileColor, cx: number, cy: number, r: number): void {
  const s = r * 0.25;
  ctx.beginPath();
  switch (MARK_SHAPE[color]) {
    case 'ring':
      ctx.arc(cx, cy, s * 0.92, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - s * 1.05);
      ctx.lineTo(cx + s * 1.0, cy + s * 0.7);
      ctx.lineTo(cx - s * 1.0, cy + s * 0.7);
      ctx.closePath();
      break;
    case 'bars':
      ctx.moveTo(cx - s, cy - s * 0.48);
      ctx.lineTo(cx + s, cy - s * 0.48);
      ctx.moveTo(cx - s, cy + s * 0.48);
      ctx.lineTo(cx + s, cy + s * 0.48);
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - s * 1.1);
      ctx.lineTo(cx + s * 0.9, cy);
      ctx.lineTo(cx, cy + s * 1.1);
      ctx.lineTo(cx - s * 0.9, cy);
      ctx.closePath();
      break;
    case 'cross':
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx, cy + s);
      break;
  }
}

/** Engraved mark: a shallow dark cut, stronger in high contrast. */
export function drawMark(ctx: Ctx, color: TileColor, cx: number, cy: number, r: number, strong: boolean): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, r * (strong ? 0.11 : 0.075));
  traceMark(ctx, color, cx, cy, r);
  ctx.strokeStyle = strong ? 'rgba(14,21,34,0.86)' : 'rgba(14,21,34,0.3)';
  ctx.stroke();
}

export function drawTile(
  ctx: Ctx,
  color: TileColor,
  variant: TileVariant,
  cx: number,
  cy: number,
  r: number,
  style: TileStyle,
): void {
  const fill = TILE_FILL[color];
  const lit = variant === 'lit';
  const active = variant === 'active';

  // Body.
  ctx.globalAlpha = lit ? 1 : active ? 0.94 : 0.85;
  hexPath(ctx, cx, cy, r * (active ? ACTIVE_RADIUS : TILE_RADIUS));
  ctx.fillStyle = fill;
  ctx.fill();
  if (active) {
    ctx.lineWidth = Math.max(1, r * 0.048);
    ctx.strokeStyle = TEXT;
  } else {
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = fill;
  }
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Micro-bevel: the mockup's diagonal overlay, light top-left to shade bottom-right.
  const br = r * BEVEL_RADIUS;
  const hw = (SQRT3 / 2) * br;
  const bevel = ctx.createLinearGradient(cx - hw, cy - br, cx + hw, cy + br);
  bevel.addColorStop(0, 'rgba(255,255,255,0.24)');
  bevel.addColorStop(0.45, 'rgba(255,255,255,0.03)');
  bevel.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.globalAlpha = 0.7;
  hexPath(ctx, cx, cy, br);
  ctx.fillStyle = bevel;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (lit) {
    // Charged state from the interface kit: a light veil and a bright core.
    hexPath(ctx, cx, cy, r * TILE_RADIUS);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.21, 0, Math.PI * 2);
    ctx.fillStyle = TEXT;
    ctx.fill();
  } else if (style.marks) {
    drawMark(ctx, color, cx, cy, r, style.highContrast);
  } else {
    hexPath(ctx, cx, cy, r * FACET_RADIUS);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(242,239,232,0.09)';
    ctx.stroke();
  }

  if (style.highContrast && !active) {
    hexPath(ctx, cx, cy, r * TILE_RADIUS);
    ctx.lineWidth = Math.max(1.25, r * 0.06);
    ctx.strokeStyle = lit ? TEXT : 'rgba(242,239,232,0.62)';
    ctx.stroke();
  } else if (style.highContrast) {
    hexPath(ctx, cx, cy, r * ACTIVE_RADIUS);
    ctx.lineWidth = Math.max(1.75, r * 0.09);
    ctx.strokeStyle = TEXT;
    ctx.stroke();
  }
}

export function drawEmptyCell(ctx: Ctx, cx: number, cy: number, r: number, highContrast: boolean): void {
  hexPath(ctx, cx, cy, r * EMPTY_RADIUS);
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = CELL_FILL;
  ctx.fill();
  ctx.globalAlpha = highContrast ? 1 : 0.72;
  ctx.lineWidth = highContrast ? 1.2 : 0.95;
  ctx.strokeStyle = highContrast ? CELL_STROKE_STRONG : CELL_STROKE;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Landing preview: a thin brass outline, nothing filled. */
export function drawGhost(ctx: Ctx, cx: number, cy: number, r: number, highContrast: boolean): void {
  hexPath(ctx, cx, cy, r * GHOST_RADIUS);
  ctx.globalAlpha = highContrast ? 0.95 : 0.56;
  ctx.lineWidth = Math.max(1.2, r * (highContrast ? 0.085 : 0.058));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = BRASS;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const VARIANTS: readonly TileVariant[] = ['locked', 'active', 'lit'];

/**
 * Tiles pre-rendered at device resolution, one sprite per colour and variant, so the
 * per-frame cost of a tile is a single drawImage.
 */
export class TileSprites {
  private readonly sprites: Record<TileColor, Partial<Record<TileVariant, HTMLCanvasElement>>> = {
    teal: {},
    coral: {},
    ice: {},
    lilac: {},
    amber: {},
  };
  /** Sprite edge in CSS px. */
  readonly size: number;
  private readonly dpr: number;

  constructor(r: number, dpr: number, style: TileStyle, doc: Document = document) {
    this.dpr = dpr;
    const edgePx = Math.max(2, Math.ceil((2 * r + 4) * dpr));
    this.size = edgePx / dpr;
    for (const color of TILE_COLORS) {
      for (const variant of VARIANTS) {
        const canvas = doc.createElement('canvas');
        canvas.width = edgePx;
        canvas.height = edgePx;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawTile(ctx, color, variant, this.size / 2, this.size / 2, r, style);
        }
        this.sprites[color][variant] = canvas;
      }
    }
  }

  /** Draw a sprite centred on (cx, cy); `ctx` must be scaled by the same DPR. */
  draw(
    ctx: CanvasRenderingContext2D,
    color: TileColor,
    variant: TileVariant,
    cx: number,
    cy: number,
    scale = 1,
    snap = true,
  ): void {
    const sprite = this.sprites[color][variant];
    if (!sprite) return;
    const size = this.size * scale;
    const dpr = this.dpr;
    // Snap to device pixels so resting tiles stay crisp.
    const x = snap && scale === 1 ? Math.round((cx - size / 2) * dpr) / dpr : cx - size / 2;
    const y = snap && scale === 1 ? Math.round((cy - size / 2) * dpr) / dpr : cy - size / 2;
    ctx.drawImage(sprite, x, y, size, size);
  }
}
