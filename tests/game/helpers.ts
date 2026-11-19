import type { ChallengeDef, Game, GameEvent, GoalKind, TileColor } from '../../src/game/types';

export function challenge(
  prefill: readonly string[],
  options: { colors?: readonly TileColor[]; kind?: GoalKind; target?: number; pieceLimit?: number; seed?: number } = {},
): ChallengeDef {
  return {
    id: 'test',
    seed: options.seed ?? 7,
    prefill,
    goal: { kind: options.kind ?? 'paths', target: options.target ?? 1 },
    pieceLimit: options.pieceLimit ?? 10,
    colors: options.colors ?? ['teal'],
  };
}

/** Tick until the game leaves 'resolving'; returns the number of ticks. */
export function resolve(game: Game): number {
  let ticks = 0;
  while (game.view.phase === 'resolving') {
    game.tick();
    if (++ticks > 10000) throw new Error('resolution does not end');
  }
  return ticks;
}

export function types(events: readonly GameEvent[]): string[] {
  return events.map((e) => e.type);
}

export function ofType<T extends GameEvent['type']>(events: readonly GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

export function key(cell: { col: number; row: number }): string {
  return `${cell.col},${cell.row}`;
}
