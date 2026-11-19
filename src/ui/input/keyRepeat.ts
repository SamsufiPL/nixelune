/**
 * Our own key repeat for left / right, independent of the OS setting: a short delay,
 * then a steady rate. The most recently pressed direction wins while both are held.
 */

export type MoveDir = 'left' | 'right';

/** Delay before the first repeat, ms. Long enough for a single deliberate step. */
export const REPEAT_DELAY_MS = 170;
/** Interval between repeats, ms: about 18 columns per second, a full row in half a second. */
export const REPEAT_INTERVAL_MS = 55;

export class KeyRepeater {
  private held: MoveDir[] = [];
  private nextAt = 0;

  /** Returns true when the press should produce an immediate step. */
  press(dir: MoveDir, now: number): boolean {
    if (this.held.includes(dir)) return false; // OS auto-repeat of a key that is already down
    this.held.push(dir);
    this.nextAt = now + REPEAT_DELAY_MS;
    return true;
  }

  release(dir: MoveDir, now: number): void {
    const at = this.held.indexOf(dir);
    if (at < 0) return;
    const wasCurrent = at === this.held.length - 1;
    this.held.splice(at, 1);
    if (wasCurrent && this.held.length > 0) this.nextAt = now + REPEAT_DELAY_MS;
  }

  reset(): void {
    this.held.length = 0;
  }

  get current(): MoveDir | null {
    return this.held[this.held.length - 1] ?? null;
  }

  /** Number of repeat steps due at `now` (capped so a stall cannot fling the piece). */
  due(now: number): number {
    if (this.held.length === 0 || now < this.nextAt) return 0;
    const steps = Math.min(3, 1 + Math.floor((now - this.nextAt) / REPEAT_INTERVAL_MS));
    this.nextAt = now + REPEAT_INTERVAL_MS;
    return steps;
  }
}
