/** Binds the gesture recogniser to pointer events on the board. Listeners are passive. */
import type { Command } from '../../game/types';
import { DEFAULT_GESTURE, GestureRecognizer } from './gesture';

export interface BoardTouch {
  setColumnPx(px: number): void;
  /** Drop the touch in progress. */
  reset(): void;
  dispose(): void;
}

export function bindBoardTouch(target: HTMLElement, send: (command: Command) => void): BoardTouch {
  const recognizer = new GestureRecognizer({ ...DEFAULT_GESTURE, columnPx: 32 });
  const out: Command[] = [];
  const flush = (): void => {
    for (let i = 0; i < out.length; i++) {
      const command = out[i];
      if (command) send(command);
    }
    out.length = 0;
  };
  const down = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    recognizer.down(event.pointerId, event.clientX, event.clientY, event.timeStamp);
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone; the gesture simply ends with the next event.
    }
  };
  const move = (event: PointerEvent): void => {
    if (!recognizer.active) return;
    recognizer.move(event.pointerId, event.clientX, event.clientY, event.timeStamp, out);
    flush();
  };
  const up = (event: PointerEvent): void => {
    recognizer.up(event.pointerId, event.clientX, event.clientY, event.timeStamp, out);
    flush();
  };
  const cancel = (event: PointerEvent): void => recognizer.cancel(event.pointerId);
  const passive = { passive: true } as const;
  target.addEventListener('pointerdown', down, passive);
  target.addEventListener('pointermove', move, passive);
  target.addEventListener('pointerup', up, passive);
  target.addEventListener('pointercancel', cancel, passive);
  return {
    setColumnPx: (px) => recognizer.setColumnPx(px),
    reset: () => recognizer.reset(),
    dispose: () => {
      target.removeEventListener('pointerdown', down);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
    },
  };
}
