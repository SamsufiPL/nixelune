import type { AudioService, SoundId } from '../../platform/types';
import { DEFAULT_SETTINGS } from '../../platform/types';
import { clampVolume } from './sounds';

/**
 * Records what would have been played. Silent at volume 0 and while suspended, like the
 * real service; it does not require `unlock()` (check `unlocked` when a test cares).
 */
export class FakeAudio implements AudioService {
  readonly played: { sound: SoundId; step: number | undefined }[] = [];
  unlocked = false;
  suspended = false;
  volume: number = DEFAULT_SETTINGS.soundVolume;

  unlock(): void {
    this.unlocked = true;
  }

  play(sound: SoundId, opts?: { step?: number }): void {
    if (this.suspended || this.volume <= 0) return;
    this.played.push({ sound, step: opts?.step });
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume);
  }

  suspend(): void {
    this.suspended = true;
  }

  resume(): void {
    this.suspended = false;
  }
}
