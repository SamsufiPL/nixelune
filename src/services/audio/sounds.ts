import type { SoundId } from '../../platform/types';

/**
 * The whole sound set as data. Everything is synthesised: soft sine / triangle tones
 * and short filtered noise. Matte and quiet by design (GDD section 5): no bright or
 * buzzy waveforms, short envelopes, low gains.
 */

export interface ToneLayer {
  readonly kind: 'tone';
  /** Only waveforms without harsh upper harmonics. */
  readonly wave: 'sine' | 'triangle';
  /** Hz at the start of the layer. */
  readonly freq: number;
  /** Hz reached at the end of the layer (pitch glide); omitted = steady. */
  readonly glideTo?: number;
  /** ms after the sound starts. */
  readonly delayMs: number;
  readonly attackMs: number;
  readonly decayMs: number;
  /** Peak level of the layer, 0..1, before the sound's own gain. */
  readonly gain: number;
}

export interface NoiseLayer {
  readonly kind: 'noise';
  readonly filter: 'lowpass' | 'bandpass';
  /** Filter frequency in Hz. */
  readonly cutoff: number;
  readonly q: number;
  readonly delayMs: number;
  readonly attackMs: number;
  readonly decayMs: number;
  readonly gain: number;
}

export type SoundLayer = ToneLayer | NoiseLayer;

export interface SoundDef {
  readonly layers: readonly SoundLayer[];
  /** Level of the whole sound, 0..1. */
  readonly gain: number;
  /** True when `step` (chain length) transposes the sound. */
  readonly chainPitched: boolean;
  /** Repeats of the same sound closer than this are dropped (held keys, fast drags). */
  readonly minIntervalMs: number;
}

const tone = (wave: ToneLayer['wave'], freq: number, delayMs: number, attackMs: number, decayMs: number, gain: number, glideTo?: number): ToneLayer =>
  glideTo === undefined ? { kind: 'tone', wave, freq, delayMs, attackMs, decayMs, gain } : { kind: 'tone', wave, freq, glideTo, delayMs, attackMs, decayMs, gain };

const noise = (filter: NoiseLayer['filter'], cutoff: number, q: number, delayMs: number, attackMs: number, decayMs: number, gain: number): NoiseLayer => ({
  kind: 'noise', filter, cutoff, q, delayMs, attackMs, decayMs, gain,
});

/** Hz. A3: low enough that the highest chain step stays below 1 kHz. */
export const ACTIVATE_BASE_HZ = 220;
/** ms between the three notes: the run ends inside the 200-260 ms path flow. */
const ACTIVATE_NOTE_GAP_MS = 80;
/** Semitones above the base: an open, unresolved rise (root, second, fifth). */
const ACTIVATE_INTERVALS = [0, 2, 7] as const;

const semitones = (base: number, offset: number): number => base * 2 ** (offset / 12);

export const SOUNDS: Readonly<Record<SoundId, SoundDef>> = {
  // Discreet tick: a grain of band-passed noise over a very short low sine.
  move: {
    gain: 0.3,
    chainPitched: false,
    minIntervalMs: 35,
    layers: [noise('bandpass', 1500, 1.2, 0, 2, 16, 0.35), tone('sine', 540, 0, 2, 22, 0.3)],
  },
  // Soft upward nudge, shorter than the 160 ms rotation.
  rotate: {
    gain: 0.34,
    chainPitched: false,
    minIntervalMs: 50,
    layers: [tone('sine', 370, 0, 8, 90, 0.5, 466)],
  },
  // Dull, low "no": felt more than heard.
  blocked: {
    gain: 0.36,
    chainPitched: false,
    minIntervalMs: 90,
    layers: [tone('sine', 150, 0, 4, 70, 0.5, 120), noise('lowpass', 300, 0.7, 0, 3, 40, 0.2)],
  },
  // Two soft notes changing places.
  swap: {
    gain: 0.3,
    chainPitched: false,
    minIntervalMs: 90,
    layers: [tone('sine', 440, 0, 6, 60, 0.45), tone('sine', 330, 55, 6, 80, 0.45)],
  },
  // Short matte thud: falling low sine plus a puff of low-passed noise.
  land: {
    gain: 0.5,
    chainPitched: false,
    minIntervalMs: 60,
    layers: [tone('sine', 118, 0, 3, 95, 0.5, 62), noise('lowpass', 420, 0.7, 0, 2, 45, 0.3)],
  },
  // The signature cue: three quiet notes rising along the path; chains transpose it upwards.
  activate: {
    gain: 0.4,
    chainPitched: true,
    minIntervalMs: 40,
    layers: ACTIVATE_INTERVALS.flatMap((interval, index): SoundLayer[] => [
      tone('sine', semitones(ACTIVATE_BASE_HZ, interval), index * ACTIVATE_NOTE_GAP_MS, 10, 150, 0.36),
      tone('triangle', semitones(ACTIVATE_BASE_HZ, interval + 12), index * ACTIVATE_NOTE_GAP_MS, 10, 90, 0.07),
    ]),
  },
  // Gentle resolution: G - B - D, each note left to ring briefly.
  stageComplete: {
    gain: 0.36,
    chainPitched: false,
    minIntervalMs: 400,
    layers: [tone('sine', 392, 0, 14, 320, 0.4), tone('sine', 493.88, 130, 14, 340, 0.4), tone('sine', 587.33, 260, 16, 460, 0.42), tone('triangle', 196, 0, 20, 500, 0.12)],
  },
  // The path closes: three slow falling notes, no drama.
  over: {
    gain: 0.36,
    chainPitched: false,
    minIntervalMs: 600,
    layers: [tone('sine', 293.66, 0, 16, 340, 0.4), tone('sine', 220, 170, 16, 380, 0.4), tone('sine', 164.81, 340, 20, 560, 0.42)],
  },
  // Tiny UI tap.
  uiTap: {
    gain: 0.24,
    chainPitched: false,
    minIntervalMs: 40,
    layers: [tone('sine', 520, 0, 2, 28, 0.5)],
  },
};

export function layerEndMs(layer: SoundLayer): number {
  return layer.delayMs + layer.attackMs + layer.decayMs;
}

/** Length of a sound from its start to the end of its last layer, in ms. */
export function soundDurationMs(def: SoundDef): number {
  return Math.max(...def.layers.map(layerEndMs));
}

/** Major pentatonic, in semitones: steps that always sound consonant with each other. */
const PENTATONIC = [0, 2, 4, 7, 9] as const;
/** Chain steps beyond this keep the same pitch: the streak modulates, it never climbs for ever. */
export const MAX_CHAIN_PITCH_STEP = 8;

/** Semitones added for a chain step (1 = first activation = 0). Walks the pentatonic scale, capped. */
export function chainSemitones(step: number | undefined): number {
  const safe = typeof step === 'number' && Number.isFinite(step) ? Math.floor(step) : 1;
  const degree = Math.min(MAX_CHAIN_PITCH_STEP, Math.max(1, safe)) - 1;
  return 12 * Math.floor(degree / PENTATONIC.length) + (PENTATONIC[degree % PENTATONIC.length] ?? 0);
}

/** Frequency multiplier for a chain step. */
export function chainPitchRatio(step: number | undefined): number {
  return 2 ** (chainSemitones(step) / 12);
}

/** Headroom left on the master so layered sounds stay well below full scale. */
export const MASTER_HEADROOM = 0.6;

/** Volume setting (0..1) to master gain: squared, so the slider feels even to the ear. */
export function volumeToGain(volume: number): number {
  const clamped = clampVolume(volume);
  return clamped * clamped * MASTER_HEADROOM;
}

export function clampVolume(volume: number): number {
  return typeof volume === 'number' && Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;
}
