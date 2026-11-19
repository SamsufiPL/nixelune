/**
 * Movement of the rigid active piece: spawn, sideways steps, rotation with wall
 * kicks, the alternating fall and the landing. Pure functions over a board.
 */
import { restingCells } from './board';
import { axialToOffset, cellIndex, fallShift, inBounds, offsetToAxial } from './hex';
import { rotateCells } from './pieces';
import type { Piece, PieceCell } from './pieces';
import { ROTATION_KICKS, SPAWN_COL, SPAWN_ROW } from './tuning';
import type { ColoredCell, TileColor } from './types';

export interface ActivePiece {
  /** The piece in spawn orientation (what goes to hold). */
  readonly piece: Piece;
  /** Current orientation as axial offsets from the pivot. */
  readonly cells: readonly PieceCell[];
  /** Pivot in axial coordinates. */
  readonly q: number;
  readonly r: number;
}

type ReadBoard = readonly (TileColor | null)[];

export function spawnPiece(piece: Piece): ActivePiece {
  const pivot = offsetToAxial(SPAWN_COL, SPAWN_ROW);
  return { piece, cells: piece.cells, q: pivot.q, r: pivot.r };
}

export function boardCells(active: ActivePiece): ColoredCell[] {
  return active.cells.map((c) => {
    const cell = axialToOffset(active.q + c.q, active.r + c.r);
    return { col: cell.col, row: cell.row, color: c.color };
  });
}

export function fits(board: ReadBoard, active: ActivePiece): boolean {
  for (const c of active.cells) {
    const cell = axialToOffset(active.q + c.q, active.r + c.r);
    if (!inBounds(cell.col, cell.row) || board[cellIndex(cell.col, cell.row)] !== null) return false;
  }
  return true;
}

/** One cell west (-1) or east (+1); null when blocked. */
export function shifted(board: ReadBoard, active: ActivePiece, dir: -1 | 1): ActivePiece | null {
  const moved = { ...active, q: active.q + dir };
  return fits(board, moved) ? moved : null;
}

/** One row down, alternating down-left / down-right; null when resting. */
export function steppedDown(board: ReadBoard, active: ActivePiece): ActivePiece | null {
  const moved = { ...active, q: active.q + fallShift(active.r), r: active.r + 1 };
  return fits(board, moved) ? moved : null;
}

/** 60 degrees around the pivot, trying ROTATION_KICKS in order; null when none fits. */
export function rotated(board: ReadBoard, active: ActivePiece, dir: 'cw' | 'ccw'): ActivePiece | null {
  const cells = rotateCells(active.cells, dir);
  for (const [dq, dr] of ROTATION_KICKS) {
    const candidate = { ...active, cells, q: active.q + dq, r: active.r + dr };
    if (fits(board, candidate)) return candidate;
  }
  return null;
}

export interface Landing {
  /** The piece at its rigid resting position. */
  readonly piece: ActivePiece;
  readonly rowsDropped: number;
  /** Rigid landing cells, in piece-cell order. */
  readonly lockCells: readonly ColoredCell[];
  /** Final cells after every tile settled in its column, in the same order. */
  readonly restCells: readonly ColoredCell[];
}

/** Drop the piece rigidly as far as it goes, then let its tiles settle one by one. */
export function landing(board: ReadBoard, active: ActivePiece): Landing {
  let piece = active;
  let rowsDropped = 0;
  for (let next = steppedDown(board, piece); next !== null; next = steppedDown(board, piece)) {
    piece = next;
    rowsDropped++;
  }
  const lockCells = boardCells(piece);
  return { piece, rowsDropped, lockCells, restCells: restingCells(board, lockCells) };
}
