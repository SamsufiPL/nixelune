/**
 * Touch gesture recogniser for the board. Pure: fed with pointer samples, it returns
 * commands. A horizontal drag moves the piece column by column under the finger, a
 * short tap rotates, a fast downward flick drops.
 */
import type { Command } from '../../game/types';

export interface GestureConfig {
  /** Horizontal finger travel for one column, in px (the board's column pitch). */
  columnPx: number;
  /** Movement below this is still a tap. */
  tapSlopPx: number;
  tapMaxMs: number;
  /** A flick must travel at least this far down ... */
  flickMinPx: number;
  /** ... at least this fast (px per ms), measured over the last `flickWindowMs`. */
  flickMinSpeed: number;
  flickWindowMs: number;
}

export const DEFAULT_GESTURE: Readonly<Omit<GestureConfig, 'columnPx'>> = {
  tapSlopPx: 10,
  tapMaxMs: 280,
  flickMinPx: 36,
  flickMinSpeed: 0.7,
  flickWindowMs: 110,
};

const SAMPLES = 8;

export class GestureRecognizer {
  private config: GestureConfig;
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startT = 0;
  /** Finger x at which the piece's current column was reached. */
  private anchorX = 0;
  private travelled = 0;
  private movedColumns = false;
  private done = false;
  // Ring buffer of recent samples for the flick speed.
  private readonly sx = new Float64Array(SAMPLES);
  private readonly sy = new Float64Array(SAMPLES);
  private readonly st = new Float64Array(SAMPLES);
  private count = 0;
  private head = 0;

  constructor(config: GestureConfig) {
    this.config = config;
  }

  setColumnPx(columnPx: number): void {
    this.config = { ...this.config, columnPx };
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Forget the touch in progress (pause, resume, focus loss). */
  reset(): void {
    this.pointerId = null;
    this.done = false;
    this.count = 0;
  }

  private sample(x: number, y: number, t: number): void {
    this.sx[this.head] = x;
    this.sy[this.head] = y;
    this.st[this.head] = t;
    this.head = (this.head + 1) % SAMPLES;
    if (this.count < SAMPLES) this.count++;
  }

  down(id: number, x: number, y: number, t: number): void {
    if (this.pointerId !== null) return; // one finger steers; others are ignored
    this.pointerId = id;
    this.startX = x;
    this.startY = y;
    this.startT = t;
    this.anchorX = x;
    this.travelled = 0;
    this.movedColumns = false;
    this.done = false;
    this.count = 0;
    this.head = 0;
    this.sample(x, y, t);
  }

  /** Returns the commands produced by this sample (usually none). */
  move(id: number, x: number, y: number, t: number, out: Command[]): void {
    if (id !== this.pointerId || this.done) return;
    this.sample(x, y, t);
    this.travelled = Math.max(this.travelled, Math.hypot(x - this.startX, y - this.startY));
    if (this.isFlick(x, y, t)) {
      this.done = true;
      out.push('drop');
      return;
    }
    const step = this.config.columnPx;
    if (step <= 0) return;
    // Hysteresis: the first column needs a little less than a full pitch but more than a tap.
    let threshold = this.movedColumns ? step : Math.max(step * 0.6, this.config.tapSlopPx);
    let dx = x - this.anchorX;
    let guard = 0;
    while (Math.abs(dx) >= threshold && guard++ < 12) {
      const dir = dx > 0 ? 1 : -1;
      out.push(dir > 0 ? 'right' : 'left');
      this.anchorX += dir * threshold;
      this.movedColumns = true;
      threshold = step;
      dx = x - this.anchorX;
    }
  }

  up(id: number, x: number, y: number, t: number, out: Command[]): void {
    if (id !== this.pointerId) return;
    const wasDone = this.done;
    this.pointerId = null;
    this.done = false;
    if (wasDone) return;
    this.sample(x, y, t);
    this.travelled = Math.max(this.travelled, Math.hypot(x - this.startX, y - this.startY));
    if (this.isFlick(x, y, t)) {
      out.push('drop');
      return;
    }
    if (!this.movedColumns && this.travelled <= this.config.tapSlopPx && t - this.startT <= this.config.tapMaxMs) {
      out.push('rotateCw');
    }
  }

  cancel(id: number): void {
    if (id === this.pointerId) this.reset();
  }

  private isFlick(x: number, y: number, t: number): boolean {
    const c = this.config;
    if (y - this.startY < c.flickMinPx) return false;
    // Oldest sample inside the window.
    let ox = x;
    let oy = y;
    let ot = t;
    for (let i = 1; i <= this.count; i++) {
      const at = (this.head - i + SAMPLES * 2) % SAMPLES;
      const ts = this.st[at] ?? t;
      if (t - ts > c.flickWindowMs) break;
      ox = this.sx[at] ?? x;
      oy = this.sy[at] ?? y;
      ot = ts;
    }
    const dt = t - ot;
    if (dt <= 0) return false;
    const dy = y - oy;
    const dx = Math.abs(x - ox);
    if (dy <= 0) return false;
    // Mostly vertical; stricter once the gesture has already been steering sideways.
    if (dy < dx * (this.movedColumns ? 2.5 : 1.6)) return false;
    return dy / dt >= c.flickMinSpeed;
  }
}
