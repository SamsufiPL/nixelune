/**
 * Tile sprites: every colour and state of the active skin, painted once per board
 * size at device resolution and then drawn with drawImage. Built lazily, so a state
 * that never appears is never painted.
 */
import { TILE_COLORS, type TileColor } from '../game/types';
import { TILE_STATES, type Ctx2D, type PaintEnv, type TileSkin, type TileState } from './skin';

const COLOR_INDEX: Readonly<Record<TileColor, number>> = { teal: 0, coral: 1, ice: 2, lilac: 3, amber: 4 };
const STATE_INDEX: Readonly<Record<TileState, number>> = { normal: 0, hint1: 1, hint2: 2, active: 3, ghost: 4, lit: 5 };

export class TileSprites {
  private readonly sprites: (HTMLCanvasElement | null)[] = new Array<HTMLCanvasElement | null>(
    TILE_COLORS.length * TILE_STATES.length,
  ).fill(null);
  /** Sprite size in CSS px and the cell centre inside it. */
  readonly width: number;
  readonly height: number;
  readonly originX: number;
  readonly originY: number;
  /** Distance from the cell centre to the tile's resting edge: the squash anchor. */
  readonly baseY: number;

  constructor(
    private readonly tile: TileSkin,
    readonly r: number,
    private readonly env: PaintEnv,
    private readonly doc: Document,
  ) {
    const dpr = env.dpr;
    const ox = Math.max(0, tile.overflow.x);
    const top = Math.max(0, tile.overflow.top);
    const bottom = Math.max(0, tile.overflow.bottom);
    // Whole device pixels, so resting sprites can be snapped and stay crisp.
    this.originX = Math.ceil(r * (1 + ox) * dpr) / dpr;
    this.originY = Math.ceil(r * (1 + top) * dpr) / dpr;
    this.width = this.originX * 2;
    this.height = this.originY + Math.ceil(r * (1 + bottom) * dpr) / dpr;
    this.baseY = r * 0.9;
  }

  private build(color: TileColor, state: TileState): HTMLCanvasElement {
    const dpr = this.env.dpr;
    const canvas = this.doc.createElement('canvas');
    canvas.width = Math.max(1, Math.round(this.width * dpr));
    canvas.height = Math.max(1, Math.round(this.height * dpr));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.tile.paint({ ctx, color, state, cx: this.originX, cy: this.originY, r: this.r, ...this.env });
    }
    return canvas;
  }

  get(color: TileColor, state: TileState): HTMLCanvasElement {
    const index = COLOR_INDEX[color] * TILE_STATES.length + STATE_INDEX[state];
    let sprite = this.sprites[index];
    if (!sprite) {
      sprite = this.build(color, state);
      this.sprites[index] = sprite;
    }
    return sprite;
  }

  /** Paint every sprite now (after a resize, so the first chain does not pay for it). */
  warm(): void {
    for (const color of TILE_COLORS) for (const state of TILE_STATES) this.get(color, state);
  }

  /** Draw at rest, snapped to device pixels. */
  draw(ctx: Ctx2D, color: TileColor, state: TileState, cx: number, cy: number): void {
    const dpr = this.env.dpr;
    ctx.drawImage(
      this.get(color, state),
      Math.round((cx - this.originX) * dpr) / dpr,
      Math.round((cy - this.originY) * dpr) / dpr,
      this.width,
      this.height,
    );
  }

  /** Draw in motion: free position, scaled about the tile's resting edge (squash) . */
  drawScaled(ctx: Ctx2D, color: TileColor, state: TileState, cx: number, cy: number, sx: number, sy: number): void {
    const anchorY = cy + this.baseY;
    ctx.drawImage(
      this.get(color, state),
      cx - this.originX * sx,
      anchorY - (this.originY + this.baseY) * sy,
      this.width * sx,
      this.height * sy,
    );
  }

  /** Draw scaled about the cell centre (pulse, pop). */
  drawCentered(ctx: Ctx2D, color: TileColor, state: TileState, cx: number, cy: number, scale: number): void {
    ctx.drawImage(
      this.get(color, state),
      cx - this.originX * scale,
      cy - this.originY * scale,
      this.width * scale,
      this.height * scale,
    );
  }
}
