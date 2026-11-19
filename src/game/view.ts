/**
 * Builds `GameView` snapshots. Derived data (cell snapshot, groups, active cells,
 * ghost) is rebuilt only when its inputs changed, and the same view object is
 * returned until something changes, so reading `game.view` every frame is free.
 */
import { findGroups } from './board';
import type { Board } from './board';
import { boardCells, landing } from './motion';
import type { ActivePiece } from './motion';
import { VIEW_GROUP_MIN } from './tuning';
import { BOARD_COLS, BOARD_ROWS } from './types';
import type { ColoredCell, GameMode, GamePhase, GameView, Goal, Outcome, PiecePreview, TileColor, TileGroup } from './types';

/** What the view is built from. The version counters tell which parts changed. */
export interface ViewSource {
  readonly board: Board;
  /** Bumped on every board mutation. */
  readonly boardVersion: number;
  readonly active: ActivePiece | null;
  /** Bumped whenever the active piece changes or moves. */
  readonly pieceVersion: number;
  /** Bumped on any other visible change. */
  readonly stateVersion: number;
  readonly phase: GamePhase;
  readonly outcome: Outcome | null;
  readonly mode: GameMode;
  readonly next: PiecePreview;
  readonly held: PiecePreview | null;
  readonly canSwap: boolean;
  readonly score: number;
  readonly stage: number;
  readonly chain: number;
  readonly goal: Goal;
  readonly piecesLeft: number | null;
  readonly activating: readonly TileGroup[];
  readonly dropIntervalMs: number;
}

export class ViewCache {
  private view: GameView | null = null;
  private boardVersion = -1;
  private pieceVersion = -1;
  private stateVersion = -1;
  private cells: readonly (TileColor | null)[] = [];
  private groups: readonly TileGroup[] = [];
  private active: readonly ColoredCell[] | null = null;
  private ghost: readonly ColoredCell[] | null = null;

  read(source: ViewSource): GameView {
    const boardChanged = source.boardVersion !== this.boardVersion;
    const pieceChanged = source.pieceVersion !== this.pieceVersion;
    if (this.view !== null && !boardChanged && !pieceChanged && source.stateVersion === this.stateVersion) {
      return this.view;
    }
    if (boardChanged) {
      this.cells = source.board.slice();
      this.groups = findGroups(this.cells, VIEW_GROUP_MIN);
    }
    if (pieceChanged) {
      this.active = source.active === null ? null : boardCells(source.active);
    }
    if (boardChanged || pieceChanged) {
      this.ghost = source.active === null ? null : landing(source.board, source.active).restCells;
    }
    this.boardVersion = source.boardVersion;
    this.pieceVersion = source.pieceVersion;
    this.stateVersion = source.stateVersion;
    this.view = {
      cols: BOARD_COLS,
      rows: BOARD_ROWS,
      cells: this.cells,
      phase: source.phase,
      outcome: source.outcome,
      mode: source.mode,
      active: this.active,
      ghost: this.ghost,
      next: source.next,
      held: source.held,
      canSwap: source.canSwap,
      score: source.score,
      stage: source.stage,
      chain: source.chain,
      goal: source.goal,
      piecesLeft: source.piecesLeft,
      groups: this.groups,
      activating: source.activating,
      dropIntervalMs: source.dropIntervalMs,
    };
    return this.view;
  }
}
