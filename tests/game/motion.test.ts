import { describe, expect, it } from 'vitest';
import { createBoard, isSettled, parsePrefill } from '../../src/game/board';
import { cellIndex } from '../../src/game/hex';
import { boardCells, fits, landing, rotated, shifted, spawnPiece, steppedDown } from '../../src/game/motion';
import type { ActivePiece } from '../../src/game/motion';
import { makePiece, SHAPES } from '../../src/game/pieces';
import { SPAWN_COL, SPAWN_ROW } from '../../src/game/tuning';
import { BOARD_COLS, BOARD_ROWS } from '../../src/game/types';

const shape = (id: string) => SHAPES.find((s) => s.id === id)!;
const cols = (active: ActivePiece): number[] => boardCells(active).map((c) => c.col);

describe('spawn', () => {
  it('puts every shape fully inside the board around the centre column', () => {
    const board = createBoard();
    for (const s of SHAPES) {
      const active = spawnPiece(makePiece(s, 'teal'));
      expect(fits(board, active)).toBe(true);
      for (const cell of boardCells(active)) {
        expect(cell.row).toBeLessThanOrEqual(SPAWN_ROW + 1);
        expect(Math.abs(cell.col - SPAWN_COL)).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('falling', () => {
  it('steps one row at a time and returns every tile to its column after two steps', () => {
    const board = createBoard();
    for (const s of SHAPES) {
      const start = spawnPiece(makePiece(s, 'teal'));
      const one = steppedDown(board, start)!;
      const two = steppedDown(board, one)!;
      expect(boardCells(one).map((c) => c.row)).toEqual(boardCells(start).map((c) => c.row + 1));
      expect(cols(two)).toEqual(cols(start));
      // The pivot's own row parity keeps its column on every step.
      boardCells(start).forEach((cell, i) => {
        if ((cell.row & 1) === (SPAWN_ROW & 1)) expect(boardCells(one)[i]!.col).toBe(cell.col);
      });
    }
  });

  it('stops on the floor and on tiles', () => {
    const board = parsePrefill(['....c....']);
    const landed = landing(board, spawnPiece(makePiece(shape('line'), 'teal')));
    expect(steppedDown(board, landed.piece)).toBeNull();
    expect(landed.rowsDropped).toBeGreaterThan(8);
  });
});

describe('sideways', () => {
  it('moves until the wall', () => {
    const board = createBoard();
    let active = spawnPiece(makePiece(shape('line'), 'teal'));
    let steps = 0;
    for (let next = shifted(board, active, -1); next !== null; next = shifted(board, active, -1)) {
      active = next;
      steps++;
    }
    expect(steps).toBe(3);
    expect(Math.min(...cols(active))).toBe(0);
    expect(shifted(parsePrefill([]), active, 1)).not.toBeNull();
  });
});

describe('rotation', () => {
  it('turns around the pivot in place when there is room', () => {
    const board = createBoard();
    const start = { ...spawnPiece(makePiece(shape('line'), 'teal')), r: 6, q: 2 };
    const turned = rotated(board, start, 'cw')!;
    expect([turned.q, turned.r]).toEqual([start.q, start.r]);
    expect(boardCells(turned)).not.toEqual(boardCells(start));
    expect(boardCells(rotated(board, turned, 'ccw')!)).toEqual(boardCells(start));
  });

  it('kicks away from a wall and down from the ceiling', () => {
    const board = createBoard();
    // Diagonal line with its pivot in column 0 of an odd row, turned back to horizontal.
    let line = { ...spawnPiece(makePiece(shape('line'), 'teal')), r: 7, q: -2 };
    line = rotated(board, line, 'cw')!;
    while (shifted(board, line, -1) !== null) line = shifted(board, line, -1)!;
    const kicked = rotated(board, line, 'ccw')!;
    expect(kicked).not.toBeNull();
    expect(Math.min(...cols(kicked))).toBe(0);
    expect(kicked.q).toBe(line.q + 1);

    // The crook reaches two rows above its pivot in some orientation: at spawn it is pushed down.
    let crook: ActivePiece | null = spawnPiece(makePiece(shape('crook'), 'teal'));
    for (let i = 0; i < 6; i++) {
      crook = rotated(board, crook!, 'cw');
      expect(crook).not.toBeNull();
      expect(fits(board, crook!)).toBe(true);
    }
  });

  it('is refused when no kick fits', () => {
    const start = { ...spawnPiece(makePiece(shape('line'), 'teal')), r: 6, q: 2 };
    const board = createBoard().fill('coral');
    for (const cell of boardCells(start)) board[cellIndex(cell.col, cell.row)] = null;
    expect(fits(board, start)).toBe(true);
    expect(rotated(board, start, 'cw')).toBeNull();
    expect(rotated(board, start, 'ccw')).toBeNull();
  });
});

describe('landing', () => {
  it('lets every tile settle in its own column after the rigid landing', () => {
    // One tile under the left end of a horizontal line: the line hangs on it, the rest falls on.
    const board = parsePrefill(['...c.....', '...c.....', '...c.....']);
    const active = spawnPiece(makePiece(shape('line'), 'teal'));
    const landed = landing(board, active);
    expect(landed.lockCells.map((c) => c.row)).toEqual([11, 11, 11]);
    expect(landed.restCells.map((c) => [c.col, c.row])).toEqual([[3, 11], [4, 14], [5, 14]]);
    const after = board.slice();
    for (const c of landed.restCells) after[cellIndex(c.col, c.row)] = c.color;
    expect(isSettled(after)).toBe(true);
  });

  it('keeps all tiles inside the board for every shape, orientation and column', () => {
    const board = createBoard();
    for (const s of SHAPES) {
      let active: ActivePiece = spawnPiece(makePiece(s, 'ice'));
      for (let turn = 0; turn < 6; turn++) {
        for (const dir of [-1, 1] as const) {
          for (let at: ActivePiece | null = active; at !== null; at = shifted(board, at, dir)) {
            const rest = landing(board, at).restCells;
            expect(new Set(rest.map((c) => cellIndex(c.col, c.row))).size).toBe(s.cells.length);
            for (const c of rest) {
              expect(c.col >= 0 && c.col < BOARD_COLS && c.row >= 0 && c.row < BOARD_ROWS).toBe(true);
            }
          }
        }
        active = rotated(board, active, 'cw')!;
      }
    }
  });
});
