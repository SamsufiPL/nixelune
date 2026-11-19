/**
 * Fixed-step loop. Rendering follows requestAnimationFrame; the simulation advances
 * in whole TICK_MS steps taken from an accumulator, with a cap on catch-up so a long
 * frame (tab switch, GC, a slow device) never turns into a burst of lost control.
 */

export interface StepResult {
  readonly ticks: number;
  readonly accumulator: number;
}

/** Longest frame time that is honoured; anything above is treated as a pause. */
export const MAX_FRAME_MS = 250;
/** Most simulation steps taken in one frame. */
export const MAX_CATCH_UP_TICKS = 5;

/** Pure accumulator step: how many ticks to run for `elapsedMs` and what remains. */
export function stepAccumulator(
  accumulator: number,
  elapsedMs: number,
  tickMs: number,
  maxTicks: number = MAX_CATCH_UP_TICKS,
): StepResult {
  const elapsed = elapsedMs > 0 ? Math.min(elapsedMs, MAX_FRAME_MS) : 0;
  let acc = accumulator + elapsed;
  let ticks = 0;
  // The small epsilon keeps a 60 Hz display at exactly one tick per frame.
  while (acc >= tickMs - 1e-6 && ticks < maxTicks) {
    acc -= tickMs;
    ticks++;
  }
  if (ticks === maxTicks && acc >= tickMs) acc = 0; // drop the backlog instead of racing
  return { ticks, accumulator: Math.max(0, acc) };
}

export interface LoopCallbacks {
  /** Advance the simulation by one fixed step. Called only while `simulating()` is true. */
  tick(): void;
  /** Called once per animation frame with the presentation clock in ms. */
  frame(now: number): void;
  simulating(): boolean;
}

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
  /** Presentation clock: advances only while the loop runs. */
  readonly now: number;
}

type Raf = (callback: (time: number) => void) => number;

export function createLoop(
  tickMs: number,
  callbacks: LoopCallbacks,
  raf: Raf = (cb) => requestAnimationFrame(cb),
  caf: (handle: number) => void = (h) => cancelAnimationFrame(h),
): Loop {
  let handle = 0;
  let running = false;
  let last = -1;
  let accumulator = 0;
  let clock = 0;

  const onFrame = (time: number): void => {
    if (!running) return;
    handle = raf(onFrame);
    const elapsed = last < 0 ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, time - last));
    last = time;
    clock += elapsed;
    if (callbacks.simulating()) {
      const step = stepAccumulator(accumulator, elapsed, tickMs);
      accumulator = step.accumulator;
      for (let i = 0; i < step.ticks; i++) callbacks.tick();
    } else {
      accumulator = 0;
    }
    callbacks.frame(clock);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      last = -1;
      accumulator = 0;
      handle = raf(onFrame);
    },
    stop(): void {
      if (!running) return;
      running = false;
      caf(handle);
    },
    get running(): boolean {
      return running;
    },
    get now(): number {
      return clock;
    },
  };
}
