/**
 * Balance report: what the bots see in endless mode and how much room every
 * challenge leaves. Print it with
 *   BALANCE_REPORT=1 npx vitest run tests/tools/balance.test.ts
 */
import { CHALLENGES } from '../src/game/challenges';
import { createRng } from '../src/game/rng';
import { stageDropIntervalMs, stageGoal, stageMixedShare } from '../src/game/stages';
import { greedyPolicy, playEndless, randomPolicy } from './bot';
import type { RunResult } from './bot';
import { replayChallenge, solveChallenge } from './solver';

/** Beam widths tried in order when proving a challenge; the first that wins is used. */
export const SOLVER_BEAM_WIDTHS: readonly number[] = [1, 30, 300];

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? NaN : (sorted[Math.floor((sorted.length - 1) / 2)] as number);
}

export function greedyRuns(seeds: readonly number[], maxPieces: number): RunResult[] {
  return seeds.map((seed) => playEndless(seed, greedyPolicy, maxPieces));
}

export function randomRuns(seeds: readonly number[], maxPieces: number): RunResult[] {
  return seeds.map((seed) => playEndless(seed, randomPolicy(createRng(seed ^ 0x5eed)), maxPieces));
}

export interface ChallengeProof {
  readonly id: string;
  readonly pieceLimit: number;
  /** Beam width that found a win, or null when none did. */
  readonly beamWidth: number | null;
  /** Pieces the found solution uses (an upper bound of the true minimum). */
  readonly piecesUsed: number | null;
  /** Outcome of replaying the solution through the real game. */
  readonly won: boolean;
}

export function proveChallenges(): ChallengeProof[] {
  return CHALLENGES.map((def) => {
    for (const beamWidth of SOLVER_BEAM_WIDTHS) {
      const solution = solveChallenge(def, beamWidth);
      if (solution === null) continue;
      const replay = replayChallenge(def, solution.moves);
      return { id: def.id, pieceLimit: def.pieceLimit, beamWidth, piecesUsed: replay.piecesUsed, won: replay.outcome === 'challengeWon' };
    }
    return { id: def.id, pieceLimit: def.pieceLimit, beamWidth: null, piecesUsed: null, won: false };
  });
}

export function balanceReport(): string {
  const lines: string[] = [];
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const greedy = greedyRuns(seeds, 600);
  lines.push('ENDLESS, greedy bot, 600 pieces per seed');
  lines.push(`  runs ended early: ${greedy.filter((r) => r.outcome !== null).length} of ${greedy.length}`);
  lines.push(`  stage reached (median): ${median(greedy.map((r) => r.stage))}, score (median): ${median(greedy.map((r) => r.score))}`);
  lines.push('  stage: goal, gravity, share of two-colour pieces, pieces the greedy bot needs (min / median / max)');
  for (let stage = 1; stage <= 12; stage++) {
    const counts = greedy.map((r) => r.piecesPerStage[stage - 1]).filter((n): n is number => n !== undefined);
    const goal = stageGoal(stage);
    lines.push(
      `  ${String(stage).padStart(2)}: ${goal.kind} ${goal.target}, ${stageDropIntervalMs(stage)} ms/row, ${Math.round(stageMixedShare(stage) * 100)}% mixed, ` +
        `${Math.min(...counts)} / ${median(counts)} / ${Math.max(...counts)}`,
    );
  }
  const long = greedyRuns(seeds.slice(0, 6), 1500);
  lines.push(`ENDLESS, greedy bot, 1500 pieces on 6 seeds: lost ${long.filter((r) => r.outcome !== null).length}, lowest stage reached ${Math.min(...long.map((r) => r.stage))}`);
  const random = randomRuns(seeds, 5000);
  lines.push('ENDLESS, random placement bot, up to 5000 pieces per seed');
  lines.push(`  lost: ${random.filter((r) => r.outcome === 'blocked').length} of ${random.length}`);
  lines.push(`  pieces survived: min ${Math.min(...random.map((r) => r.pieces))}, median ${median(random.map((r) => r.pieces))}, max ${Math.max(...random.map((r) => r.pieces))}`);
  lines.push(`  mean pieces survived: ${Math.round(random.reduce((sum, r) => sum + r.pieces, 0) / random.length)}`);
  lines.push(`  pieces for stage 1 (median of runs that finished it): ${median(random.map((r) => r.piecesPerStage[0]).filter((n): n is number => n !== undefined))}`);
  lines.push('CHALLENGES: id, goal, colours, piece limit, pieces used by the solver, beam width');
  const proofs = proveChallenges();
  CHALLENGES.forEach((def, i) => {
    const proof = proofs[i] as ChallengeProof;
    lines.push(
      `  ${def.id}: ${def.goal.kind} ${def.goal.target}, ${def.colors.length} colours, limit ${def.pieceLimit}, ` +
        `solved in ${proof.piecesUsed ?? '-'} (beam ${proof.beamWidth ?? '-'})${proof.won ? '' : '  NOT WON'}`,
    );
  });
  return lines.join('\n');
}
