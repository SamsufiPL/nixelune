import { describe, expect, it } from 'vitest';
import { AXIAL_DIRECTIONS } from '../../src/game/hex';
import { createBag, createPieceGenerator, makePiece, rotateCells, SHAPES } from '../../src/game/pieces';
import { createRng } from '../../src/game/rng';
import { MAX_COLOR_RUN } from '../../src/game/tuning';
import { TILE_COLORS } from '../../src/game/types';

const adjacent = (a: { q: number; r: number }, b: { q: number; r: number }): boolean =>
  AXIAL_DIRECTIONS.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);

/** Shape up to translation and rotation: the smallest of its six normalised turns. */
function canonical(cells: readonly { q: number; r: number }[]): string {
  let current = makePiece({ id: 'x', cells }, 'teal').cells;
  const forms: string[] = [];
  for (let i = 0; i < 6; i++) {
    const minR = Math.min(...current.map((c) => c.r));
    const minQ = Math.min(...current.filter((c) => c.r === minR).map((c) => c.q));
    forms.push(current.map((c) => `${c.q - minQ},${c.r - minR}`).sort().join(' '));
    current = rotateCells(current, 'cw');
  }
  return forms.sort()[0]!;
}

describe('shapes', () => {
  it('are connected clusters of three or four distinct hexes with unique ids', () => {
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(SHAPES.length);
    for (const shape of SHAPES) {
      expect([3, 4]).toContain(shape.cells.length);
      expect(new Set(shape.cells.map((c) => `${c.q},${c.r}`)).size).toBe(shape.cells.length);
      const reached = [shape.cells[0]!];
      for (let i = 0; i < reached.length; i++) {
        for (const c of shape.cells) if (!reached.includes(c) && adjacent(reached[i]!, c)) reached.push(c);
      }
      expect(reached).toHaveLength(shape.cells.length);
    }
  });

  it('are all different up to rotation, with both sizes present', () => {
    expect(new Set(SHAPES.map((s) => canonical(s.cells))).size).toBe(SHAPES.length);
    expect(SHAPES.some((s) => s.cells.length === 3)).toBe(true);
    expect(SHAPES.some((s) => s.cells.length === 4)).toBe(true);
  });

  it('stay within one row above the pivot in spawn orientation and two cells in any', () => {
    for (const shape of SHAPES) {
      for (const c of shape.cells) {
        expect(c.r).toBeGreaterThanOrEqual(-1);
        expect(Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r))).toBeLessThanOrEqual(2);
      }
    }
  });

  it('rotate with their colours; six turns restore the piece', () => {
    const piece = makePiece(SHAPES[7]!, 'amber');
    let cells = piece.cells;
    for (let i = 0; i < 6; i++) cells = rotateCells(cells, 'cw');
    expect(cells).toEqual(piece.cells);
    expect(rotateCells(rotateCells(piece.cells, 'cw'), 'ccw')).toEqual(piece.cells);
  });
});

describe('generator', () => {
  it('is deterministic per seed', () => {
    const a = createPieceGenerator(11, TILE_COLORS);
    const b = createPieceGenerator(11, TILE_COLORS);
    const c = createPieceGenerator(12, TILE_COLORS);
    const seq = Array.from({ length: 40 }, () => a.next());
    expect(Array.from({ length: 40 }, () => b.next())).toEqual(seq);
    expect(Array.from({ length: 40 }, () => c.next())).not.toEqual(seq);
  });

  it('avoids streaks: no shape twice in a row, no colour more than twice, even supply', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const gen = createPieceGenerator(seed, TILE_COLORS);
      const pieces = Array.from({ length: 900 }, () => gen.next());
      let colorRun = 1;
      for (let i = 1; i < pieces.length; i++) {
        expect(pieces[i]!.shapeId).not.toBe(pieces[i - 1]!.shapeId);
        colorRun = pieces[i]!.cells[0]!.color === pieces[i - 1]!.cells[0]!.color ? colorRun + 1 : 1;
        expect(colorRun).toBeLessThanOrEqual(MAX_COLOR_RUN);
      }
      for (const shape of SHAPES) expect(pieces.filter((p) => p.shapeId === shape.id)).toHaveLength(100);
      for (const color of TILE_COLORS) expect(pieces.filter((p) => p.cells[0]!.color === color)).toHaveLength(180);
    }
  });

  it('uses only the given colours, one colour per piece, a colour stored per cell', () => {
    const gen = createPieceGenerator(3, ['ice', 'lilac']);
    for (let i = 0; i < 50; i++) {
      const piece = gen.next();
      expect(['ice', 'lilac']).toContain(piece.cells[0]!.color);
      for (const cell of piece.cells) expect(cell.color).toBe(piece.cells[0]!.color);
    }
  });

  it('bag keeps the run limit with a single item to choose from', () => {
    const draw = createBag(createRng(1), ['a'], 2, 1);
    expect([draw(), draw(), draw()]).toEqual(['a', 'a', 'a']);
  });
});
