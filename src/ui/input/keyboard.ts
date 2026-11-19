/** Keyboard mapping from the player instructions. Pure lookup; the screen owns the listeners. */
import type { Command } from '../../game/types';
import type { MoveDir } from './keyRepeat';

export type KeyIntent =
  | { readonly kind: 'move'; readonly dir: MoveDir }
  | { readonly kind: 'command'; readonly command: Command }
  | { readonly kind: 'pause' }
  | { readonly kind: 'restart' };

/** Uses `KeyboardEvent.code` for letters so the layout (QWERTY, AZERTY) does not matter. */
export function keyIntent(code: string, key: string): KeyIntent | null {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return { kind: 'move', dir: 'left' };
    case 'ArrowRight':
    case 'KeyD':
      return { kind: 'move', dir: 'right' };
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyX':
      return { kind: 'command', command: 'rotateCw' };
    case 'KeyZ':
    case 'KeyQ':
      return { kind: 'command', command: 'rotateCcw' };
    case 'Space':
    case 'ArrowDown':
    case 'KeyS':
      return { kind: 'command', command: 'drop' };
    case 'KeyC':
      return { kind: 'command', command: 'swap' };
    case 'KeyP':
      return { kind: 'pause' };
    case 'KeyR':
      return { kind: 'restart' };
    default:
      break;
  }
  // Keyboards that do not report `code` (some virtual ones).
  if (key === ' ') return { kind: 'command', command: 'drop' };
  return null;
}
