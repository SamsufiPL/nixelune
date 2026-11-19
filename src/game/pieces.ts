/**
 * Piece shapes, rotation and the streak-free generator.
 *
 * Shapes are clusters native to the hex grid, given as axial offsets from the pivot
 * in spawn orientation. They are deliberately not the tetromino silhouettes.
 */
import { rotateCcw, rotateCw } from './hex';
import type { Axial } from './hex';
import { createRng, deriveSeed, shuffle } from './rng';
import type { Rng } from './rng';
import { COLOR_BAG_COPIES, MAX_COLOR_RUN, MAX_SHAPE_RUN, SHAPE_BAG_COPIES } from './tuning';
import type { PiecePreview, TileColor } from './types';

export interface ShapeDef {
  readonly id: string;
  readonly cells: readonly Axial[];
}

export const SHAPES: readonly ShapeDef[] = [
  // Three tiles.
  /** Three mutually touching tiles. */
  { id: 'triangle', cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }] },
  /** Straight line, pivot in the middle. */
  { id: 'line', cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }] },
  /** Wide 120-degree bend, pivot at the bend. */
  { id: 'arc', cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 0, r: 1 }] },
  // Four tiles.
  /** Three arms at 120 degrees around the pivot. */
  { id: 'propeller', cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: -1 }] },
  /** Four tiles of the ring around an empty pivot. */
  { id: 'crescent', cells: [{ q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }] },
  /** Zigzag: east, south-east, east. */
  { id: 'wave', cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 0, r: 1 }, { q: 1, r: 1 }] },
  /** Two triangles sharing an edge. */
  { id: 'rhombus', cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }] },
  /** Line of three with a tile nested on top of one end. */
  { id: 'hook', cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: -1 }] },
  /** Line of three that bends away at one end. */
  { id: 'crook', cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: 1 }] },
];

export interface PieceCell extends Axial {
  readonly color: TileColor;
}

/** A piece in spawn orientation. Structurally a `PiecePreview`. */
export interface Piece extends PiecePreview {
  readonly shapeId: string;
  readonly cells: readonly PieceCell[];
}

export function makePiece(shape: ShapeDef, color: TileColor): Piece {
  return { shapeId: shape.id, cells: shape.cells.map((c) => ({ q: c.q, r: c.r, color })) };
}

export function rotateCells(cells: readonly PieceCell[], dir: 'cw' | 'ccw'): PieceCell[] {
  const turn = dir === 'cw' ? rotateCw : rotateCcw;
  return cells.map((c) => ({ ...turn(c), color: c.color }));
}

/**
 * Draws from shuffled bags (`copies` of every item per bag) and never lets one item
 * come more than `maxRun` times in a row, also across bag borders.
 */
export function createBag<T>(rng: Rng, items: readonly T[], copies: number, maxRun: number): () => T {
  let bag: T[] = [];
  let last: T | undefined;
  let run = 0;
  return () => {
    if (bag.length === 0) {
      for (let i = 0; i < copies; i++) bag.push(...items);
      shuffle(bag, rng);
    }
    let pick = 0;
    if (run >= maxRun && bag[0] === last) {
      const other = bag.findIndex((item) => item !== last);
      if (other > 0) pick = other;
    }
    const item = bag.splice(pick, 1)[0] as T;
    run = item === last ? run + 1 : 1;
    last = item;
    return item;
  };
}

export interface PieceGenerator {
  next(): Piece;
}

/** Deterministic piece stream; shapes and colours come from independent bags. */
export function createPieceGenerator(seed: number, colors: readonly TileColor[]): PieceGenerator {
  const nextShape = createBag(createRng(deriveSeed(seed, 1)), SHAPES, SHAPE_BAG_COPIES, MAX_SHAPE_RUN);
  const nextColor = createBag(createRng(deriveSeed(seed, 2)), colors, COLOR_BAG_COPIES, MAX_COLOR_RUN);
  return { next: () => makePiece(nextShape(), nextColor()) };
}
