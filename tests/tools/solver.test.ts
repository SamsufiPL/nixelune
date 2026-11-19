import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../../src/game/challenges';
import { proveChallenges } from '../../tools/balance';
import { replayChallenge, solveChallenge } from '../../tools/solver';

describe('challenge solver', () => {
  const proofs = proveChallenges();

  it.each(CHALLENGES.map((def, i) => [def.id, i] as const))('%s is winnable within its piece limit', (_id, i) => {
    const proof = proofs[i]!;
    const def = CHALLENGES[i]!;
    expect(proof.won).toBe(true);
    expect(proof.piecesUsed).toBeLessThanOrEqual(def.pieceLimit);
    expect(proof.piecesUsed).toBeGreaterThan(0);
  });

  it('later challenges cannot be won by dropping every piece where it spawns', () => {
    const straight = CHALLENGES.map((def) => replayChallenge(def, new Array(def.pieceLimit).fill(['drop'])).outcome);
    expect(straight.slice(3)).toEqual(new Array(9).fill('challengeFailed'));
  });

  it('the hard ones need search: a one-move-ahead greedy player fails them', () => {
    const greedyWins = CHALLENGES.filter((def) => solveChallenge(def, 1) !== null).map((def) => def.id);
    for (const id of ['c08', 'c11', 'c12']) expect(greedyWins).not.toContain(id);
    expect(greedyWins).toContain('c01');
  });

  it('replaying a losing line fails the challenge and no solution is found without pieces', () => {
    const def = CHALLENGES[11]!;
    expect(replayChallenge(def, [['drop']]).outcome).toBeNull();
    expect(solveChallenge(def, 30, 2)).toBeNull();
  });
});
