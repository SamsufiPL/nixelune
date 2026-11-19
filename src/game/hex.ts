/**
 * Grid maths for pointy-top hexagons in odd-r offset layout (odd rows shifted right).
 * Axial coordinates (q, r) share the row axis with offset coordinates (r = row).
 */
import { BOARD_COLS, BOARD_ROWS } from './types';
import type { Cell } from './types';

export interface Axial {
  readonly q: number;
  readonly r: number;
}

export function offsetToAxial(col: number, row: number): Axial {
  return { q: col - ((row - (row & 1)) >> 1), r: row };
}

export function axialToOffset(q: number, r: number): Cell {
  return { col: q + ((r - (r & 1)) >> 1), row: r };
}

/** Rotate an axial offset 60 degrees clockwise around the origin (east -> south-east). */
export function rotateCw(a: Axial): Axial {
  return { q: 0 - a.r, r: a.q + a.r };
}

export function rotateCcw(a: Axial): Axial {
  return { q: a.q + a.r, r: 0 - a.q };
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

export function cellIndex(col: number, row: number): number {
  return row * BOARD_COLS + col;
}

/** Axial steps to the six neighbours: E, SE, SW, W, NW, NE. */
export const AXIAL_DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

/** In-board neighbours of a cell, in the order E, SE, SW, W, NW, NE. */
export function neighbours(col: number, row: number): Cell[] {
  const a = offsetToAxial(col, row);
  const out: Cell[] = [];
  for (const d of AXIAL_DIRECTIONS) {
    const c = axialToOffset(a.q + d.q, a.r + d.r);
    if (inBounds(c.col, c.row)) out.push(c);
  }
  return out;
}

/** Neighbour cell indices for every cell index, precomputed once. */
export const NEIGHBOUR_INDICES: readonly (readonly number[])[] = (() => {
  const table: number[][] = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      table.push(neighbours(col, row).map((c) => cellIndex(c.col, c.row)));
    }
  }
  return table;
})();

/**
 * Axial column shift of a rigid one-row fall for a pivot in `row`. The fall alternates
 * down-left (from odd rows) and down-right (from even rows), so the pivot keeps its
 * offset column.
 */
export function fallShift(row: number): number {
  return (row & 1) === 1 ? -1 : 0;
}
