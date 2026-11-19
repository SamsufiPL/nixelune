/** What a run leaves behind in the save. Pure: mutates the draft it is given. */
import type { GameMode, Outcome } from '../game/types';
import type { SaveData } from '../platform/types';

export interface RunResult {
  readonly mode: GameMode;
  readonly score: number;
  readonly stage: number;
  readonly outcome: Outcome | null;
  /** True once per run, when it ends or is abandoned: counts the game as played. */
  readonly countGame: boolean;
}

export function applyResult(draft: SaveData, result: RunResult): void {
  if (result.countGame) draft.gamesPlayed += 1;
  if (result.mode.kind === 'endless') {
    if (result.score > draft.bestScore) draft.bestScore = result.score;
    if (result.stage > draft.bestStage) draft.bestStage = result.stage;
    return;
  }
  if (result.outcome !== 'challengeWon') return;
  const id = result.mode.challenge.id;
  const record = draft.challenges[id] ?? { completed: false, bestScore: 0 };
  record.completed = true;
  if (result.score > record.bestScore) record.bestScore = result.score;
  draft.challenges[id] = record;
}
