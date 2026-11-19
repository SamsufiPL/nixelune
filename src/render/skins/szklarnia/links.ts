/**
 * Forming paths are joined by brass clasps across the seam between two tiles: a
 * short dark bar with a gilt line on it. Per frame, so flat strokes only.
 */
import type { Ctx2D, LinkSkin } from '../../skin';

export function paintLinkClasp(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, r: number, level: 1 | 2): void {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const reach = r * (level === 2 ? 0.34 : 0.27);
  const dx = ((bx - ax) / len) * reach;
  const dy = ((by - ay) / len) * reach;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6E4E14';
  ctx.lineWidth = Math.max(2.5, r * (level === 2 ? 0.26 : 0.21));
  ctx.beginPath();
  ctx.moveTo(mx - dx, my - dy);
  ctx.lineTo(mx + dx, my + dy);
  ctx.stroke();
  ctx.strokeStyle = level === 2 ? '#FFE9A0' : '#E9BF5A';
  ctx.lineWidth = Math.max(1.25, r * (level === 2 ? 0.14 : 0.1));
  ctx.beginPath();
  ctx.moveTo(mx - dx, my - dy);
  ctx.lineTo(mx + dx, my + dy);
  ctx.stroke();
}

export const LINKS: LinkSkin = {
  paintLink(ctx, ax, ay, bx, by, r, level, env) {
    // The falling piece and its landing print stay above everything; a clasp only
    // spans the seam, so it never crosses a relief.
    paintLinkClasp(ctx, ax, ay - r * 0.07, bx, by - r * 0.07, r, level);
    if (env.highContrast) {
      ctx.strokeStyle = '#1B3327';
      ctx.lineWidth = 1;
    }
  },
};
