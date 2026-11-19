import { describe, expect, it } from 'vitest';
import { TICK_MS } from '../../src/game/types';
import { createLoop, MAX_CATCH_UP_TICKS, MAX_FRAME_MS, stepAccumulator } from '../../src/ui/loop';

describe('accumulator', () => {
  it('runs one tick per 60 Hz frame', () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 600; i++) {
      const step = stepAccumulator(acc, 1000 / 60, TICK_MS);
      acc = step.accumulator;
      total += step.ticks;
      expect(step.ticks).toBe(1);
    }
    expect(total).toBe(600);
  });

  it('keeps simulation speed on a 120 Hz display', () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 1200; i++) {
      const step = stepAccumulator(acc, 1000 / 120, TICK_MS);
      acc = step.accumulator;
      total += step.ticks;
    }
    expect(Math.abs(total - 600)).toBeLessThanOrEqual(1);
  });

  it('catches up after a slow frame, within the cap', () => {
    expect(stepAccumulator(0, 50, TICK_MS).ticks).toBe(3);
    const stalled = stepAccumulator(0, 5000, TICK_MS);
    expect(stalled.ticks).toBe(MAX_CATCH_UP_TICKS);
    expect(stalled.accumulator).toBe(0); // backlog dropped, no burst on the next frame
  });

  it('treats very long frames as a pause', () => {
    expect(stepAccumulator(0, 1e9, 1, 1000).ticks).toBeLessThanOrEqual(MAX_FRAME_MS + 1);
  });

  it('ignores negative time', () => {
    expect(stepAccumulator(3, -20, TICK_MS)).toEqual({ ticks: 0, accumulator: 3 });
  });
});

describe('loop', () => {
  function harness(simulating: () => boolean) {
    let callback: ((time: number) => void) | null = null;
    let ticks = 0;
    const frames: number[] = [];
    const loop = createLoop(
      TICK_MS,
      { tick: () => ticks++, frame: (now) => frames.push(now), simulating },
      (cb) => {
        callback = cb;
        return 1;
      },
      () => {
        callback = null;
      },
    );
    const fire = (time: number) => callback?.(time);
    return { loop, fire, frames, ticks: () => ticks, scheduled: () => callback !== null };
  }

  it('ticks only while simulating and always calls frame', () => {
    let on = true;
    const h = harness(() => on);
    h.loop.start();
    h.fire(0);
    h.fire(1000 / 60);
    h.fire(2000 / 60);
    expect(h.ticks()).toBe(2);
    on = false;
    h.fire(3000 / 60);
    expect(h.ticks()).toBe(2);
    expect(h.frames).toHaveLength(4);
  });

  it('does not count time spent stopped', () => {
    const h = harness(() => true);
    h.loop.start();
    h.fire(0);
    h.fire(16);
    h.loop.stop();
    expect(h.scheduled()).toBe(false);
    h.loop.start();
    h.fire(60_000);
    h.fire(60_016);
    expect(h.loop.now).toBeCloseTo(32);
    expect(h.ticks()).toBeLessThanOrEqual(3);
  });
});
