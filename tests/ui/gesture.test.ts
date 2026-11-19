import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/game/types';
import { DEFAULT_GESTURE, GestureRecognizer } from '../../src/ui/input/gesture';
import { KeyRepeater, REPEAT_DELAY_MS, REPEAT_INTERVAL_MS } from '../../src/ui/input/keyRepeat';
import { keyIntent } from '../../src/ui/input/keyboard';

function recognizer(): GestureRecognizer {
  return new GestureRecognizer({ ...DEFAULT_GESTURE, columnPx: 30 });
}

/** Drag in a straight line with samples every 16 ms. */
function drag(g: GestureRecognizer, from: [number, number], to: [number, number], ms: number, lift = true): Command[] {
  const out: Command[] = [];
  const steps = Math.max(1, Math.round(ms / 16));
  g.down(1, from[0], from[1], 0);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    g.move(1, from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, k * ms, out);
  }
  if (lift) g.up(1, to[0], to[1], ms + 1, out);
  return out;
}

describe('board gestures', () => {
  it('a short tap rotates', () => {
    const g = recognizer();
    const out: Command[] = [];
    g.down(1, 100, 100, 0);
    g.up(1, 102, 101, 90, out);
    expect(out).toEqual(['rotateCw']);
  });

  it('a long press does nothing', () => {
    const g = recognizer();
    const out: Command[] = [];
    g.down(1, 100, 100, 0);
    g.up(1, 100, 100, 600, out);
    expect(out).toEqual([]);
  });

  it('a horizontal drag moves one column per pitch, following the finger', () => {
    // First column after 0.6 pitch (18 px), then one per 30 px: 18, 48, 78, 108.
    expect(drag(recognizer(), [100, 300], [200, 302], 400)).toEqual(['right', 'right', 'right']);
    expect(drag(recognizer(), [200, 300], [100, 300], 400)).toEqual(['left', 'left', 'left']);
  });

  it('reversing direction steps back', () => {
    const g = recognizer();
    const out: Command[] = [];
    g.down(1, 100, 300, 0);
    g.move(1, 150, 300, 100, out);
    g.move(1, 100, 300, 300, out);
    g.up(1, 100, 300, 320, out);
    expect(out).toEqual(['right', 'right', 'left']);
  });

  it('a drag never ends in a rotation', () => {
    expect(drag(recognizer(), [100, 300], [125, 300], 200)).toEqual(['right']);
  });

  it('a fast downward flick drops once', () => {
    expect(drag(recognizer(), [100, 100], [104, 220], 96)).toEqual(['drop']);
  });

  it('a slow downward drag does not drop', () => {
    expect(drag(recognizer(), [100, 100], [100, 220], 900)).toEqual([]);
  });

  it('a diagonal drag steers and does not drop', () => {
    const out = drag(recognizer(), [100, 100], [200, 160], 300);
    expect(out).not.toContain('drop');
    expect(out.filter((c) => c === 'right').length).toBe(3);
  });

  it('after a drop the rest of the touch is ignored', () => {
    const g = recognizer();
    const out = drag(g, [100, 100], [100, 220], 96, false);
    g.move(1, 200, 220, 150, out);
    g.up(1, 200, 220, 160, out);
    expect(out).toEqual(['drop']);
  });

  it('ignores a second finger', () => {
    const g = recognizer();
    const out: Command[] = [];
    g.down(1, 100, 100, 0);
    g.down(2, 300, 100, 5);
    g.move(2, 400, 100, 40, out);
    g.up(2, 400, 100, 50, out);
    expect(out).toEqual([]);
    expect(g.active).toBe(true);
  });

  it('reset clears a held touch', () => {
    const g = recognizer();
    const out: Command[] = [];
    g.down(1, 100, 100, 0);
    g.reset();
    g.move(1, 300, 100, 50, out);
    g.up(1, 300, 100, 60, out);
    expect(out).toEqual([]);
    expect(g.active).toBe(false);
  });

  it('follows a new column pitch after a resize', () => {
    const g = recognizer();
    g.setColumnPx(60);
    expect(drag(g, [100, 300], [200, 300], 400)).toEqual(['right', 'right']);
  });
});

describe('key repeat', () => {
  it('steps at once, waits, then repeats steadily', () => {
    const keys = new KeyRepeater();
    expect(keys.press('left', 0)).toBe(true);
    expect(keys.press('left', 30)).toBe(false); // OS auto-repeat
    expect(keys.due(REPEAT_DELAY_MS - 1)).toBe(0);
    expect(keys.due(REPEAT_DELAY_MS)).toBe(1);
    expect(keys.due(REPEAT_DELAY_MS + 10)).toBe(0);
    expect(keys.due(REPEAT_DELAY_MS + REPEAT_INTERVAL_MS)).toBe(1);
  });

  it('the latest direction wins and the earlier one returns after release', () => {
    const keys = new KeyRepeater();
    keys.press('left', 0);
    keys.press('right', 50);
    expect(keys.current).toBe('right');
    keys.release('right', 80);
    expect(keys.current).toBe('left');
    expect(keys.due(100)).toBe(0); // the delay restarts
    keys.release('left', 120);
    expect(keys.current).toBeNull();
    expect(keys.due(10_000)).toBe(0);
  });

  it('caps the steps after a stall and forgets keys on reset', () => {
    const keys = new KeyRepeater();
    keys.press('right', 0);
    expect(keys.due(5000)).toBeLessThanOrEqual(3);
    keys.reset();
    expect(keys.current).toBeNull();
  });
});

describe('keyboard map', () => {
  it('follows the player instructions', () => {
    expect(keyIntent('ArrowLeft', 'ArrowLeft')).toEqual({ kind: 'move', dir: 'left' });
    expect(keyIntent('KeyD', 'd')).toEqual({ kind: 'move', dir: 'right' });
    expect(keyIntent('ArrowUp', 'ArrowUp')).toEqual({ kind: 'command', command: 'rotateCw' });
    expect(keyIntent('KeyW', 'w')).toEqual({ kind: 'command', command: 'rotateCw' });
    expect(keyIntent('Space', ' ')).toEqual({ kind: 'command', command: 'drop' });
    expect(keyIntent('ArrowDown', 'ArrowDown')).toEqual({ kind: 'command', command: 'drop' });
    expect(keyIntent('KeyC', 'c')).toEqual({ kind: 'command', command: 'swap' });
    expect(keyIntent('KeyP', 'p')).toEqual({ kind: 'pause' });
    expect(keyIntent('KeyR', 'r')).toEqual({ kind: 'restart' });
    expect(keyIntent('', ' ')).toEqual({ kind: 'command', command: 'drop' });
    expect(keyIntent('KeyK', 'k')).toBeNull();
  });
});
