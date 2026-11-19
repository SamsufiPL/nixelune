/**
 * Forming paths are joined by brass clasps across the seam between two tiles: a
 * short dark bar with a gilt line on it. Per frame, so flat strokes only.
 */
import type { Ctx2D, LinkSkin } from '../../skin';

export function paintLinkClasp(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, r: number, level: 1 | 2): void {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  if (level === 1) {
    // Three in a group: a single gilt bead on the seam, no more.
    ctx.fillStyle = '#7A5718';
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1.6, r * 0.115), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F4D27A';
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Four: one short of a path, the seam is bridged by a gilt bar.
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const reach = r * 0.2;
  const dx = ((bx - ax) / len) * reach;
  const dy = ((by - ay) / len) * reach;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7A5718';
  ctx.lineWidth = Math.max(2.5, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(mx - dx, my - dy);
  ctx.lineTo(mx + dx, my + dy);
  ctx.stroke();
  ctx.strokeStyle = '#FFE9A0';
  ctx.lineWidth = Math.max(1.25, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(mx - dx, my - dy);
  ctx.lineTo(mx + dx, my + dy);
  ctx.stroke();
}

export const LINKS: LinkSkin = {
  paintLink(ctx, ax, ay, bx, by, r, level) {
    // Tiles sit a little above their cell centres; the join follows them.
    paintLinkClasp(ctx, ax, ay - r * 0.07, bx, by - r * 0.07, r, level);
  },
};
