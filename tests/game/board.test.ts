import { describe, expect, it } from 'vitest';
import { createBoard, findGroups, isSettled, parsePrefill, removeGroups, restingCells, settle } from '../../src/game/board';
import { cellIndex, neighbours } from '../../src/game/hex';
import { BOARD_COLS, BOARD_ROWS } from '../../src/game/types';

describe('prefill', () => {
  it('puts the given rows at the bottom', () => {
    const board = parsePrefill(['t........', '.c..ila..']);
    expect(board).toHaveLength(BOARD_COLS * BOARD_ROWS);
    expect(board[cellIndex(0, 13)]).toBe('teal');
    expect(board[cellIndex(1, 14)]).toBe('coral');
    expect([4, 5, 6].map((c) => board[cellIndex(c, 14)])).toEqual(['ice', 'lilac', 'amber']);
    expect(board.filter((c) => c !== null)).toHaveLength(5);
  });

  it('rejects wrong widths, unknown characters and too many rows', () => {
    expect(() => parsePrefill(['....'])).toThrow();
    expect(() => parsePrefill(['x........'])).toThrow();
    expect(() => parsePrefill(new Array(16).fill('.........'))).toThrow();
  });
});

describe('settle', () => {
  it('compacts every column and reports the moves', () => {
    const board = parsePrefill(['t.c......', '.........', 't........']);
    expect(isSettled(board)).toBe(false);
    const moves = settle(board);
    expect(isSettled(board)).toBe(true);
    expect(moves).toEqual([
      { from: { col: 0, row: 12 }, to: { col: 0, row: 13 }, color: 'teal' },
      { from: { col: 2, row: 12 }, to: { col: 2, row: 14 }, color: 'coral' },
    ]);
    expect(settle(board)).toEqual([]);
  });

  it('computes resting cells index-aligned, stacking tiles of one column', () => {
    const board = parsePrefill(['..i......']);
    const cells = [
      { col: 2, row: 3, color: 'teal' as const },
      { col: 2, row: 4, color: 'coral' as const },
      { col: 5, row: 4, color: 'teal' as const },
      { col: 0, row: 14, color: 'teal' as const },
    ];
    const rest = restingCells(board, cells);
    expect(rest.map((c) => [c.col, c.row, c.color])).toEqual([
      [2, 12, 'teal'],
      [2, 13, 'coral'],
      [5, 14, 'teal'],
      [0, 14, 'teal'],
    ]);
    expect(rest[3]).toBe(cells[3]);
    expect(board.filter((c) => c !== null)).toHaveLength(1);
  });
});

describe('groups', () => {
  const board = parsePrefill([
    '..t......',
    'ttt...cc.',
    'c.i...c.t',
  ]);

  it('finds connected same-colour groups of the minimum size in row-major order', () => {
    const groups = findGroups(board, 2);
    expect(groups.map((g) => [g.color, g.cells.length])).toEqual([['teal', 4], ['coral', 3]]);
    expect(findGroups(board, 4)).toHaveLength(1);
    expect(findGroups(board, 5)).toEqual([]);
    expect(findGroups(createBoard(), 1)).toEqual([]);
  });

  it('orders cells breadth-first with spanning-tree links between adjacent cells', () => {
    for (const group of findGroups(board, 2)) {
      expect(group.links).toHaveLength(group.cells.length - 1);
      const reached = [group.cells[0]];
      group.links.forEach(([from, to], i) => {
        expect(reached).toContain(from);
        expect(neighbours(from.col, from.row)).toContainEqual(to);
        expect(to).toBe(group.cells[i + 1]);
        reached.push(to);
      });
    }
  });

  it('starts from a preferred (just landed) tile when the group has one', () => {
    const preferred = new Set([cellIndex(2, 13)]);
    const [teal, coral] = findGroups(board, 2, preferred);
    expect(teal!.cells[0]).toEqual({ col: 2, row: 13 });
    expect(coral!.cells[0]).toEqual({ col: 6, row: 13 });
  });

  it('removes groups and returns their coloured cells', () => {
    const copy = board.slice();
    const removed = removeGroups(copy, findGroups(copy, 4));
    expect(removed).toHaveLength(4);
    expect(removed.every((c) => c.color === 'teal')).toBe(true);
    expect(copy.filter((c) => c === 'teal')).toHaveLength(1);
  });
});
