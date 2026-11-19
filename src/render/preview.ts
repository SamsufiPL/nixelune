/** Small canvases for the next and held pieces. Drawn only when their content changes. */
import type { PiecePreview } from '../game/types';
import { cappedDpr } from './boardRenderer';
import { axialX, axialY, fitPreview } from './hex';
import { drawTile, type TileStyle } from './tile';

export function previewKey(piece: PiecePreview | null, dimmed: boolean): string {
  if (!piece) return 'none';
  let key = piece.shapeId + (dimmed ? '~' : '');
  for (const c of piece.cells) key += `|${c.q},${c.r},${c.color}`;
  return key;
}

export class PiecePreviewCanvas {
  private key = '';
  private width = 0;
  private height = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    /** Largest hex radius in CSS px, so a preview never outgrows board tiles. */
    private readonly maxRadius: number,
  ) {}

  /** Forget the cached content, e.g. after a style change. */
  invalidate(): void {
    this.key = '';
  }

  draw(piece: PiecePreview | null, style: TileStyle, dimmed = false): void {
    const canvas = this.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return; // hidden in this layout
    const key = previewKey(piece, dimmed);
    if (key === this.key && width === this.width && height === this.height) return;
    this.key = key;
    this.width = width;
    this.height = height;
    const dpr = cappedDpr(canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!piece) return;
    const layout = fitPreview(piece.cells, width, height, this.maxRadius, 2);
    for (const cell of piece.cells) {
      drawTile(
        ctx,
        cell.color,
        'locked',
        layout.pivotX + axialX(cell.q, cell.r, layout.r),
        layout.pivotY + axialY(cell.r, layout.r),
        layout.r,
        style,
      );
    }
    if (dimmed) {
      // Swap already used for this piece: the held preview steps back.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
