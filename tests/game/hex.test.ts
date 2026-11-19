import { describe, expect, it } from 'vitest';
import { axialToOffset, fallShift, neighbours, NEIGHBOUR_INDICES, offsetToAxial, rotateCcw, rotateCw } from '../../src/game/hex';
import { BOARD_COLS, BOARD_ROWS } from '../../src/game/types';

/** Cell centre in units of the hex radius, as documented in types.ts. */
function centre(col: number, row: number): { x: number; y: number } {
  return { x: Math.sqrt(3) * (col + 0.5 * (row & 1)), y: 1.5 * row };
}

describe('hex grid', () => {
  it('converts offset <-> axial both ways, also above the board', () => {
    for (let row = -3; row < BOARD_ROWS; row++) {
      for (let col = -2; col < BOARD_COLS + 2; col++) {
        const a = offsetToAxial(col, row);
        expect(axialToOffset(a.q, a.r)).toEqual({ col, row });
      }
    }
  });

  it('gives six neighbours at distance sqrt(3) for an inner cell of either row parity', () => {
    for (const [col, row] of [[4, 6], [4, 7]] as const) {
      const list = neighbours(col, row);
      expect(list).toHaveLength(6);
      expect(new Set(list.map((c) => `${c.col},${c.row}`)).size).toBe(6);
      const from = centre(col, row);
      for (const n of list) {
        const to = centre(n.col, n.row);
        expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeCloseTo(Math.sqrt(3), 9);
      }
    }
  });

  it('clips neighbours at the board edge and keeps the relation symmetric', () => {
    expect(neighbours(0, 0)).toEqual([{ col: 1, row: 0 }, { col: 0, row: 1 }]);
    expect(neighbours(8, 14)).toHaveLength(3);
    NEIGHBOUR_INDICES.forEach((list, index) => {
      for (const n of list) expect(NEIGHBOUR_INDICES[n]).toContain(index);
    });
  });

  it('rotates by 60 degrees: six clockwise turns are the identity, ccw undoes cw', () => {
    let a = { q: 2, r: -1 };
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      seen.add(`${a.q},${a.r}`);
      expect(rotateCcw(rotateCw(a))).toEqual(a);
      a = rotateCw(a);
    }
    expect(a).toEqual({ q: 2, r: -1 });
    expect(seen.size).toBe(6);
    expect(rotateCw({ q: 1, r: 0 })).toEqual({ q: 0, r: 1 });
  });

  it('falls so that the pivot keeps its offset column', () => {
    for (let row = 0; row < BOARD_ROWS - 1; row++) {
      const a = offsetToAxial(4, row);
      expect(axialToOffset(a.q + fallShift(row), a.r + 1)).toEqual({ col: 4, row: row + 1 });
    }
  });
});
