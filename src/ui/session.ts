/** One run of the game: the simulation object and what the shell remembers about it. */
import type { ChallengeDef, Game, GameConfig, GameMode } from '../game/types';

export type CreateGame = (config: GameConfig) => Game;

/** Seeds come from the clock: gameplay randomness stays inside the seeded simulation. */
export function freshSeed(now: number = Date.now()): number {
  return (now ^ (now / 4294967296)) >>> 0;
}

export class Session {
  game: Game;
  /** Bonus of the stage that was just completed, for the stage panel. */
  stageBonus = 0;
  completedStage = 0;
  /** Best score before this run started, to tell the player about a new record. */
  bestBefore: number;
  /** Whether this run was already counted in `gamesPlayed`. */
  counted = false;

  constructor(
    private readonly createGame: CreateGame,
    readonly challenge: ChallengeDef | null,
    bestBefore: number,
  ) {
    this.bestBefore = bestBefore;
    this.game = this.create();
  }

  get mode(): GameMode {
    return this.challenge ? { kind: 'challenge', challenge: this.challenge } : { kind: 'endless' };
  }

  private create(): Game {
    return this.createGame({ seed: this.challenge ? this.challenge.seed : freshSeed(), mode: this.mode });
  }

  restart(bestBefore: number): void {
    this.game = this.create();
    this.stageBonus = 0;
    this.completedStage = 0;
    this.bestBefore = bestBefore;
    this.counted = false;
  }
}
