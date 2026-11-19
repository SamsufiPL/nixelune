import { describe, expect, it } from 'vitest';
import { BOARD_COLS, BOARD_ROWS } from '../../src/game/types';
import { axialX, axialY, boardAspect, cellX, cellY, columnPitch, fitBoard, fitPreview, gridUnits, hexPath, SQRT3 } from '../../src/render/hex';

describe('hex to pixel', () => {
  it('follows the odd-r formula of the contract', () => {
    expect(cellX(0, 0, 10)).toBe(0);
    expect(cellX(3, 0, 10)).toBeCloseTo(SQRT3 * 10 * 3);
    expect(cellX(3, 1, 10)).toBeCloseTo(SQRT3 * 10 * 3.5);
    expect(cellX(3, 2, 10)).toBeCloseTo(SQRT3 * 10 * 3);
    expect(cellY(4, 10)).toBe(60);
  });

  it('keeps neighbours exactly one pitch apart in all six directions', () => {
    const r = 17;
    const d = (c1: number, r1: number, c2: number, r2: number) =>
      Math.hypot(cellX(c1, r1, r) - cellX(c2, r2, r), cellY(r1, r) - cellY(r2, r));
    // Even row 2: lower neighbours are (col-1, row+1) and (col, row+1).
    expect(d(4, 2, 5, 2)).toBeCloseTo(columnPitch(r));
    expect(d(4, 2, 3, 3)).toBeCloseTo(columnPitch(r));
    expect(d(4, 2, 4, 3)).toBeCloseTo(columnPitch(r));
    // Odd row 3: lower neighbours are (col, row+1) and (col+1, row+1).
    expect(d(4, 3, 4, 4)).toBeCloseTo(columnPitch(r));
    expect(d(4, 3, 5, 4)).toBeCloseTo(columnPitch(r));
  });

  it('axial offsets agree with board cells', () => {
    expect(axialX(1, 0, 10)).toBeCloseTo(cellX(1, 0, 10));
    expect(axialX(0, 1, 10)).toBeCloseTo(cellX(0, 1, 10));
    expect(axialY(2, 10)).toBe(cellY(2, 10));
  });
});

describe('board fit', () => {
  it('fills the limiting dimension and centres the grid', () => {
    const pad = 0.6;
    const m = fitBoard(328, 2000, BOARD_COLS, BOARD_ROWS, pad);
    const g = gridUnits(BOARD_COLS, BOARD_ROWS);
    expect(m.r).toBeCloseTo(328 / (g.w + 2 * pad));
    // Left edge of column 0 and right edge of the shifted last column are symmetric.
    const left = m.originX - (SQRT3 / 2) * m.r;
    const right = m.originX + cellX(BOARD_COLS - 1, 1, m.r) + (SQRT3 / 2) * m.r;
    expect(left).toBeCloseTo(328 - right);
    const top = m.originY - m.r;
    const bottom = m.originY + cellY(BOARD_ROWS - 1, m.r) + m.r;
    expect(top).toBeCloseTo(2000 - bottom);
  });

  it('is limited by height on short screens', () => {
    const m = fitBoard(2000, 300, BOARD_COLS, BOARD_ROWS, 0.6);
    expect(m.r).toBeCloseTo(300 / (gridUnits(BOARD_COLS, BOARD_ROWS).h + 1.2));
  });

  it('a surface with the board aspect is filled in both directions', () => {
    const ratio = boardAspect(BOARD_COLS, BOARD_ROWS, 0.62);
    const m = fitBoard(400 * ratio, 400, BOARD_COLS, BOARD_ROWS, 0.62);
    const g = gridUnits(BOARD_COLS, BOARD_ROWS);
    expect((g.w + 1.24) * m.r).toBeCloseTo(400 * ratio);
    expect((g.h + 1.24) * m.r).toBeCloseTo(400);
  });

  it('never returns a negative radius', () => {
    expect(fitBoard(0, 0, 9, 15, 0.6).r).toBe(0);
  });
});

describe('preview fit', () => {
  const line = [
    { q: -1, r: 0 },
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ];

  it('caps the radius and centres the piece', () => {
    const layout = fitPreview(line, 300, 100, 12, 2);
    expect(layout.r).toBe(12);
    expect(layout.pivotX).toBeCloseTo(150);
    expect(layout.pivotY).toBeCloseTo(50);
  });

  it('shrinks to fit a small box', () => {
    const layout = fitPreview(line, 40, 40, 12, 2);
    expect(layout.r).toBeCloseTo(36 / (3 * SQRT3));
  });

  it('centres an off-pivot shape by its bounds', () => {
    const layout = fitPreview([{ q: 0, r: 0 }, { q: 1, r: 0 }], 100, 100, 10, 0);
    expect(layout.pivotX).toBeCloseTo(50 - (SQRT3 * 10) / 2);
  });

  it('handles an empty piece', () => {
    expect(fitPreview([], 50, 50, 10, 2).r).toBe(0);
  });
});

describe('hexPath', () => {
  it('traces six pointy-top vertices', () => {
    const points: [number, number][] = [];
    hexPath(
      { beginPath() {}, closePath() {}, moveTo: (x, y) => points.push([x, y]), lineTo: (x, y) => points.push([x, y]) },
      0,
      0,
      10,
    );
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual([0, -10]);
    for (const [x, y] of points) expect(Math.hypot(x, y)).toBeCloseTo(10);
  });
});
