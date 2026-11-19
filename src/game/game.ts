/**
 * The game state machine: commands, ticks, phases and events.
 *
 * Event order of one move:
 *   locked -> [settled] -> { activated -> (activation window) -> removed -> [settled]
 *   -> (collapse pause, only if tiles moved) }* -> [chainEnded] -> [goalProgress]
 *   -> stageCompleted | over | spawned (or over when the spawn cells are taken).
 */
import { createBoard, findGroups, parsePrefill, removeGroups, settle } from './board';
import type { Board } from './board';
import { cellIndex } from './hex';
import { fits, landing, rotated, shifted, spawnPiece, steppedDown } from './motion';
import type { ActivePiece } from './motion';
import { createPieceGenerator } from './pieces';
import type { Piece, PieceGenerator } from './pieces';
import { activationPoints, hardDropPoints, stageBonus } from './scoring';
import { stageDropIntervalMs, stageGoal, stageMixedShare } from './stages';
import { ACTIVATION_TICKS, CHALLENGE_DROP_MS, COLLAPSE_TICKS, LOCK_DELAY_TICKS, MAX_LOCK_RESETS } from './tuning';
import { ACTIVATION_THRESHOLD, TICK_MS, TILE_COLORS } from './types';
import type {
  Command,
  Game,
  GameConfig,
  GameEvent,
  GameMode,
  GamePhase,
  GameView,
  Goal,
  GoalKind,
  Outcome,
  TileGroup,
} from './types';
import { ViewCache } from './view';

const NO_GROUPS: readonly TileGroup[] = [];

class GameCore implements Game {
  readonly mode: GameMode;
  readonly board: Board;
  boardVersion = 0;
  active: ActivePiece | null = null;
  pieceVersion = 0;
  stateVersion = 0;
  phase: GamePhase = 'falling';
  outcome: Outcome | null = null;
  next: Piece;
  held: Piece | null = null;
  canSwap = false;
  score = 0;
  stage = 1;
  chain = 0;
  goal: Goal;
  piecesLeft: number | null;
  activating: readonly TileGroup[] = NO_GROUPS;
  dropIntervalMs: number;

  private readonly generator: PieceGenerator;
  private readonly cache = new ViewCache();
  private events: GameEvent[] = [];

  // Falling.
  private gravityTicks = 0;
  private lockTicks = 0;
  private lockResets = 0;
  private lowestRow = 0;

  // Resolution.
  private resolveStep: 'activation' | 'collapse' = 'activation';
  private resolveTicks = 0;
  private chainPoints = 0;
  private moved = new Set<number>();

  // Goal counters, reset per stage.
  private goalPaths = 0;
  private goalTiles = 0;
  private goalBestChain = 0;
  private goalScoreBase = 0;
  /** Pieces locked inside the current stage; drives the gravity creep. */
  private piecesInStage = 0;

  constructor(config: GameConfig) {
    this.mode = config.mode;
    if (config.mode.kind === 'challenge') {
      const def = config.mode.challenge;
      this.board = parsePrefill(def.prefill);
      this.generator = createPieceGenerator(def.seed, def.colors);
      this.goal = { kind: def.goal.kind, target: def.goal.target, progress: 0 };
      this.piecesLeft = def.pieceLimit;
      this.dropIntervalMs = CHALLENGE_DROP_MS;
    } else {
      this.board = createBoard();
      this.generator = createPieceGenerator(config.seed, TILE_COLORS);
      this.goal = { ...stageGoal(1), progress: 0 };
      this.piecesLeft = null;
      this.dropIntervalMs = stageDropIntervalMs(1);
      this.events.push({ type: 'stageStarted', stage: 1 });
    }
    this.next = this.generator.next(this.mixedShare());
    if (this.piecesLeft !== null && this.piecesLeft <= 0) this.end('challengeFailed');
    else this.spawnNext();
  }

  get view(): GameView {
    return this.cache.read(this);
  }

  drainEvents(): GameEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  apply(command: Command): void {
    if (command === 'continue') {
      if (this.phase === 'stageComplete') this.startNextStage();
      return;
    }
    if (this.phase !== 'falling' || this.active === null) return;
    const active = this.active;
    switch (command) {
      case 'left':
      case 'right': {
        const moved = shifted(this.board, active, command === 'left' ? -1 : 1);
        if (moved === null) this.events.push({ type: 'blocked', command });
        else {
          this.setActive(moved);
          this.restartLockDelay();
          this.events.push({ type: 'moved', dir: command });
        }
        return;
      }
      case 'rotateCw':
      case 'rotateCcw': {
        const turned = rotated(this.board, active, command === 'rotateCw' ? 'cw' : 'ccw');
        if (turned === null) this.events.push({ type: 'blocked', command });
        else {
          this.setActive(turned);
          this.restartLockDelay();
          this.events.push({ type: 'rotated' });
        }
        return;
      }
      case 'drop':
        this.lock(true);
        return;
      case 'swap':
        this.swap(active);
        return;
    }
  }

  tick(): void {
    if (this.phase === 'falling' && this.active !== null) this.tickFalling(this.active);
    else if (this.phase === 'resolving') this.tickResolving();
  }

  // --- Falling ---------------------------------------------------------------------

  private tickFalling(active: ActivePiece): void {
    const below = steppedDown(this.board, active);
    if (below === null) {
      this.lockTicks++;
      if (this.lockTicks >= LOCK_DELAY_TICKS) this.lock(false);
      return;
    }
    this.gravityTicks++;
    if (this.gravityTicks < Math.max(1, Math.round(this.dropIntervalMs / TICK_MS))) return;
    this.gravityTicks = 0;
    this.setActive(below);
    if (below.r > this.lowestRow) {
      // A new lowest row gets a fresh lock delay; the reset budget stays per piece.
      this.lowestRow = below.r;
      this.lockTicks = 0;
    }
  }

  private setActive(active: ActivePiece | null): void {
    this.active = active;
    this.pieceVersion++;
  }

  private restartLockDelay(): void {
    if (this.lockTicks === 0 || this.lockResets >= MAX_LOCK_RESETS) return;
    this.lockTicks = 0;
    this.lockResets++;
  }

  private enter(active: ActivePiece): void {
    this.setActive(active);
    this.gravityTicks = 0;
    this.lockTicks = 0;
    this.lockResets = 0;
    this.lowestRow = active.r;
  }

  private spawnNext(): void {
    const active = spawnPiece(this.next);
    if (!fits(this.board, active)) {
      this.end(this.mode.kind === 'challenge' ? 'challengeFailed' : 'blocked');
      return;
    }
    this.next = this.generator.next(this.mixedShare());
    if (this.mode.kind === 'endless') this.dropIntervalMs = stageDropIntervalMs(this.stage, this.piecesInStage);
    this.canSwap = true;
    this.phase = 'falling';
    this.stateVersion++;
    this.enter(active);
    this.events.push({ type: 'spawned' });
  }

  private swap(active: ActivePiece): void {
    const incoming = spawnPiece(this.held ?? this.next);
    if (!this.canSwap || !fits(this.board, incoming)) {
      this.events.push({ type: 'blocked', command: 'swap' });
      return;
    }
    if (this.held === null) this.next = this.generator.next(this.mixedShare());
    this.held = active.piece;
    this.canSwap = false;
    this.stateVersion++;
    this.enter(incoming);
    this.events.push({ type: 'swapped' });
  }

  // --- Lock and resolution ---------------------------------------------------------

  private lock(hard: boolean): void {
    const active = this.active;
    if (active === null) return;
    const landed = landing(this.board, active);
    if (hard) this.score += hardDropPoints(landed.rowsDropped);
    this.moved.clear();
    const moves = [];
    for (let i = 0; i < landed.restCells.length; i++) {
      const from = landed.lockCells[i]!;
      const to = landed.restCells[i]!;
      const index = cellIndex(to.col, to.row);
      this.board[index] = to.color;
      this.moved.add(index);
      if (from !== to) moves.push({ from: { col: from.col, row: from.row }, to: { col: to.col, row: to.row }, color: to.color });
    }
    this.boardVersion++;
    this.stateVersion++;
    this.setActive(null);
    this.canSwap = false;
    if (this.piecesLeft !== null) this.piecesLeft--;
    this.piecesInStage++;
    this.events.push({ type: 'locked', cells: landed.lockCells, hard, rowsDropped: landed.rowsDropped });
    if (moves.length > 0) this.events.push({ type: 'settled', moves });
    this.chainPoints = 0;
    if (!this.activate(1)) this.finishMove(0);
  }

  /** Light every path on the board as chain step `chain`; false when there is none. */
  private activate(chain: number): boolean {
    const groups = findGroups(this.board, ACTIVATION_THRESHOLD, this.moved);
    if (groups.length === 0) return false;
    const sizes = groups.map((g) => g.cells.length);
    const points = activationPoints(sizes, chain);
    this.score += points;
    this.chainPoints += points;
    this.chain = chain;
    this.goalPaths += groups.length;
    for (const size of sizes) this.goalTiles += size;
    this.goalBestChain = Math.max(this.goalBestChain, chain);
    this.activating = groups;
    this.phase = 'resolving';
    this.resolveStep = 'activation';
    this.resolveTicks = ACTIVATION_TICKS;
    this.stateVersion++;
    this.events.push({ type: 'activated', groups, chain, points });
    return true;
  }

  private tickResolving(): void {
    this.resolveTicks--;
    if (this.resolveTicks > 0) return;
    if (this.resolveStep === 'collapse') {
      if (!this.activate(this.chain + 1)) this.finishMove(this.chain);
      return;
    }
    const removed = removeGroups(this.board, this.activating);
    const moves = settle(this.board);
    this.activating = NO_GROUPS;
    this.boardVersion++;
    this.stateVersion++;
    this.events.push({ type: 'removed', cells: removed });
    if (moves.length === 0) {
      // Nothing fell, so no new path can have formed.
      this.finishMove(this.chain);
      return;
    }
    this.moved.clear();
    for (const move of moves) this.moved.add(cellIndex(move.to.col, move.to.row));
    this.events.push({ type: 'settled', moves });
    this.resolveStep = 'collapse';
    this.resolveTicks = COLLAPSE_TICKS;
  }

  private finishMove(chainLength: number): void {
    if (chainLength > 0) this.events.push({ type: 'chainEnded', length: chainLength, points: this.chainPoints });
    this.stateVersion++;
    const progress = Math.min(this.goal.target, this.goalProgress(this.goal.kind));
    if (progress !== this.goal.progress) {
      this.goal = { ...this.goal, progress };
      this.events.push({ type: 'goalProgress', goal: this.goal });
    }
    const met = this.goal.progress >= this.goal.target;
    if (this.mode.kind === 'challenge') {
      if (met) this.end('challengeWon');
      else if (this.piecesLeft !== null && this.piecesLeft <= 0) this.end('challengeFailed');
      else this.spawnNext();
      return;
    }
    if (!met) {
      this.spawnNext();
      return;
    }
    const bonus = stageBonus(this.stage);
    this.score += bonus;
    this.phase = 'stageComplete';
    this.events.push({ type: 'stageCompleted', stage: this.stage, bonus });
  }

  /** Share of two-colour pieces for the piece generated now. */
  private mixedShare(): number {
    return this.mode.kind === 'challenge' ? (this.mode.challenge.mixedShare ?? 0) : stageMixedShare(this.stage);
  }

  private goalProgress(kind: GoalKind): number {
    switch (kind) {
      case 'paths':
        return this.goalPaths;
      case 'chain':
        return this.goalBestChain;
      case 'tiles':
        return this.goalTiles;
      case 'score':
        return this.score - this.goalScoreBase;
    }
  }

  private startNextStage(): void {
    this.stage++;
    this.goalPaths = 0;
    this.goalTiles = 0;
    this.goalBestChain = 0;
    this.goalScoreBase = this.score;
    this.piecesInStage = 0;
    this.goal = { ...stageGoal(this.stage), progress: 0 };
    this.dropIntervalMs = stageDropIntervalMs(this.stage);
    this.stateVersion++;
    this.events.push({ type: 'stageStarted', stage: this.stage });
    this.spawnNext();
  }

  private end(outcome: Outcome): void {
    this.phase = 'over';
    this.outcome = outcome;
    this.setActive(null);
    this.stateVersion++;
    this.events.push({ type: 'over', outcome, score: this.score, stage: this.stage });
  }
}

/**
 * Create a game. In challenge mode the piece stream comes from the challenge's own
 * seed (`config.seed` is not used), so a challenge always plays the same.
 */
export function createGame(config: GameConfig): Game {
  return new GameCore(config);
}
