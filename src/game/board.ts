/**
 * Board storage, column settling and same-colour groups. A board is a row-major
 * array (index = row * BOARD_COLS + col). Outside a resolution step it is always
 * settled: no tile has an empty cell below it in its offset column.
 */
import { cellIndex, NEIGHBOUR_INDICES } from './hex';
import { BOARD_COLS, BOARD_ROWS } from './types';
import type { Cell, ColoredCell, TileColor, TileGroup, TileMove } from './types';

export type Board = (TileColor | null)[];

export const CELL_COUNT = BOARD_COLS * BOARD_ROWS;

/** Shared cell objects, one per board index. */
const CELLS: readonly Cell[] = Array.from({ length: CELL_COUNT }, (_, i) => ({
  col: i % BOARD_COLS,
  row: Math.floor(i / BOARD_COLS),
}));

export function cellAt(index: number): Cell {
  return CELLS[index] as Cell;
}

export function createBoard(): Board {
  return new Array<TileColor | null>(CELL_COUNT).fill(null);
}

const PREFILL_CHARS: Readonly<Record<string, TileColor | null>> = {
  '.': null,
  t: 'teal',
  c: 'coral',
  i: 'ice',
  l: 'lilac',
  a: 'amber',
};

/** Build a board from `ChallengeDef.prefill`; the rows given are the bottom rows. */
export function parsePrefill(prefill: readonly string[]): Board {
  if (prefill.length > BOARD_ROWS) throw new Error(`prefill has ${prefill.length} rows, the board has ${BOARD_ROWS}`);
  const board = createBoard();
  const firstRow = BOARD_ROWS - prefill.length;
  prefill.forEach((line, i) => {
    if (line.length !== BOARD_COLS) throw new Error(`prefill row ${i} must have ${BOARD_COLS} characters`);
    for (let col = 0; col < BOARD_COLS; col++) {
      const ch = line[col] as string;
      const color = PREFILL_CHARS[ch];
      if (color === undefined) throw new Error(`prefill row ${i}: unknown character '${ch}'`);
      board[cellIndex(col, firstRow + i)] = color;
    }
  });
  return board;
}

export function isSettled(board: readonly (TileColor | null)[]): boolean {
  for (let i = 0; i < CELL_COUNT - BOARD_COLS; i++) {
    if (board[i] !== null && board[i + BOARD_COLS] === null) return false;
  }
  return true;
}

/** Compact every column downwards in place. Moves are listed column by column, bottom-up. */
export function settle(board: Board): TileMove[] {
  const moves: TileMove[] = [];
  for (let col = 0; col < BOARD_COLS; col++) {
    let write = BOARD_ROWS - 1;
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      const from = cellIndex(col, row);
      const color = board[from];
      if (color === null || color === undefined) continue;
      if (write !== row) {
        const to = cellIndex(col, write);
        board[from] = null;
        board[to] = color;
        moves.push({ from: cellAt(from), to: cellAt(to), color });
      }
      write--;
    }
  }
  return moves;
}

/**
 * Where tiles placed on free cells of a settled board come to rest when each falls
 * down its own column. The result is index-aligned with `cells`; the board is not changed.
 */
export function restingCells(board: readonly (TileColor | null)[], cells: readonly ColoredCell[]): ColoredCell[] {
  const order = cells.map((_, i) => i).sort((a, b) => (cells[b] as ColoredCell).row - (cells[a] as ColoredCell).row);
  const taken: number[] = [];
  const out = new Array<ColoredCell>(cells.length);
  for (const i of order) {
    const cell = cells[i] as ColoredCell;
    let row = cell.row;
    while (row + 1 < BOARD_ROWS) {
      const below = cellIndex(cell.col, row + 1);
      if (board[below] !== null || taken.includes(below)) break;
      row++;
    }
    taken.push(cellIndex(cell.col, row));
    out[i] = row === cell.row ? cell : { col: cell.col, row, color: cell.color };
  }
  return out;
}

/**
 * Connected same-colour groups with at least `minSize` tiles, in row-major order of
 * their first tile. Cells are in breadth-first order; the search starts from the
 * group's first tile flagged in `preferStart` (tiles that just landed or moved) and
 * falls back to its first tile in row-major order.
 */
export function findGroups(
  board: readonly (TileColor | null)[],
  minSize: number,
  preferStart?: ReadonlySet<number>,
): TileGroup[] {
  const groups: TileGroup[] = [];
  const seen = new Uint8Array(CELL_COUNT);
  const component: number[] = [];
  for (let first = 0; first < CELL_COUNT; first++) {
    const color = board[first];
    if (color === null || color === undefined || seen[first] === 1) continue;
    // Flood the component to learn its size and members.
    component.length = 0;
    component.push(first);
    seen[first] = 1;
    for (let head = 0; head < component.length; head++) {
      for (const n of NEIGHBOUR_INDICES[component[head] as number] as readonly number[]) {
        if (seen[n] === 0 && board[n] === color) {
          seen[n] = 1;
          component.push(n);
        }
      }
    }
    if (component.length < minSize) continue;
    let start = first;
    if (preferStart !== undefined && preferStart.size > 0) {
      let best = -1;
      for (const index of component) {
        if (preferStart.has(index) && (best === -1 || index < best)) best = index;
      }
      if (best !== -1) start = best;
    }
    groups.push(buildGroup(board, color, start));
  }
  return groups;
}

function buildGroup(board: readonly (TileColor | null)[], color: TileColor, start: number): TileGroup {
  const order: number[] = [start];
  const visited = new Set<number>(order);
  const links: (readonly [Cell, Cell])[] = [];
  for (let head = 0; head < order.length; head++) {
    const from = order[head] as number;
    for (const n of NEIGHBOUR_INDICES[from] as readonly number[]) {
      if (!visited.has(n) && board[n] === color) {
        visited.add(n);
        order.push(n);
        links.push([cellAt(from), cellAt(n)]);
      }
    }
  }
  return { color, cells: order.map(cellAt), links };
}

/** Clear the groups' cells in place and return what was removed. */
export function removeGroups(board: Board, groups: readonly TileGroup[]): ColoredCell[] {
  const removed: ColoredCell[] = [];
  for (const group of groups) {
    for (const cell of group.cells) {
      board[cellIndex(cell.col, cell.row)] = null;
      removed.push({ col: cell.col, row: cell.row, color: group.color });
    }
  }
  return removed;
}
