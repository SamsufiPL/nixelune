/**
 * Hex grid geometry shared by the board renderer, the previews and the touch layer.
 * Pointy-top hexagons, "odd-r" offset rows (see src/game/types.ts). Pure maths, no DOM.
 */

export const SQRT3 = Math.sqrt(3);

/** Centre x of a board cell, relative to the centre of cell (0,0), for hex radius `r`. */
export function cellX(col: number, row: number, r: number): number {
  return SQRT3 * r * (col + 0.5 * (row & 1));
}

/** Centre y of a board cell, relative to the centre of cell (0,0), for hex radius `r`. */
export function cellY(row: number, r: number): number {
  return 1.5 * r * row;
}

/** Horizontal distance between neighbouring columns: the unit of a touch drag step. */
export function columnPitch(r: number): number {
  return SQRT3 * r;
}

/** Size of the whole grid in units of the hex radius. */
export function gridUnits(cols: number, rows: number): { w: number; h: number } {
  return { w: SQRT3 * (cols + 0.5), h: 1.5 * (rows - 1) + 2 };
}

/**
 * Width / height of the board surface (grid plus `padRatio` hex radii of padding on
 * every side). CSS uses it so the frame hugs the grid at every screen size.
 */
export function boardAspect(cols: number, rows: number, padRatio: number): number {
  const g = gridUnits(cols, rows);
  return (g.w + 2 * padRatio) / (g.h + 2 * padRatio);
}

export interface BoardMetrics {
  /** Hex radius in CSS px. */
  readonly r: number;
  /** Centre of cell (0,0) in CSS px from the canvas top-left corner. */
  readonly originX: number;
  readonly originY: number;
  readonly cols: number;
  readonly rows: number;
}

/** Largest grid that fits a `width` x `height` surface, centred in it. */
export function fitBoard(
  width: number,
  height: number,
  cols: number,
  rows: number,
  padRatio: number,
): BoardMetrics {
  const g = gridUnits(cols, rows);
  const r = Math.max(0, Math.min(width / (g.w + 2 * padRatio), height / (g.h + 2 * padRatio)));
  return {
    r,
    originX: (width - g.w * r) / 2 + (SQRT3 * r) / 2,
    originY: (height - g.h * r) / 2 + r,
    cols,
    rows,
  };
}

/** Axial offset (next / held pieces) to pixel offset from the pivot, pointy-top. */
export function axialX(q: number, rAxial: number, r: number): number {
  return SQRT3 * r * (q + rAxial / 2);
}

export function axialY(rAxial: number, r: number): number {
  return 1.5 * r * rAxial;
}

export interface PreviewLayout {
  readonly r: number;
  /** Pixel position of the pivot (axial 0,0). */
  readonly pivotX: number;
  readonly pivotY: number;
}

/** Fit a piece given as axial offsets into a box, centred, with the radius capped. */
export function fitPreview(
  cells: readonly { readonly q: number; readonly r: number }[],
  width: number,
  height: number,
  maxR: number,
  margin: number,
): PreviewLayout {
  if (cells.length === 0) return { r: 0, pivotX: width / 2, pivotY: height / 2 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    const x = axialX(c.q, c.r, 1);
    const y = axialY(c.r, 1);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const unitW = maxX - minX + SQRT3;
  const unitH = maxY - minY + 2;
  const r = Math.max(
    0,
    Math.min(maxR, (width - 2 * margin) / unitW, (height - 2 * margin) / unitH),
  );
  return {
    r,
    pivotX: width / 2 - ((minX + maxX) / 2) * r,
    pivotY: height / 2 - ((minY + maxY) / 2) * r,
  };
}

/** Trace a pointy-top hexagon path. Does not fill or stroke. */
export function hexPath(
  ctx: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; closePath(): void },
  cx: number,
  cy: number,
  radius: number,
): void {
  const hw = (SQRT3 / 2) * radius;
  const hh = radius / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + hw, cy - hh);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.lineTo(cx, cy + radius);
  ctx.lineTo(cx - hw, cy + hh);
  ctx.lineTo(cx - hw, cy - hh);
  ctx.closePath();
}
