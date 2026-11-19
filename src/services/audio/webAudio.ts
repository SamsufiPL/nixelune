import { DEFAULT_SETTINGS } from '../../platform/types';
import type { AudioService, SoundId } from '../../platform/types';
import { consoleLogger } from '../log';
import type { Logger } from '../log';
import { SOUNDS, chainPitchRatio, clampVolume, volumeToGain } from './sounds';
import type { SoundLayer } from './sounds';

/** Scheduling lead so envelopes start cleanly, in seconds. */
const LEAD_S = 0.006;
/** Sound sources allowed to ring at once; further sounds are dropped rather than piled up. */
const MAX_ACTIVE_SOURCES = 24;
/** Everything above this is rolled off on the master: keeps the set matte. Hz. */
const MASTER_LOWPASS_HZ = 5200;
const SILENCE = 0.0001;

/** Default factory for browsers and WebViews. Throws where Web Audio does not exist. */
export function createBrowserAudioContext(): AudioContext {
  const scope = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio is not available');
  return new Ctor({ latencyHint: 'interactive' });
}

/**
 * Web Audio synthesiser for the table in `sounds.ts`.
 * Graph: layer -> sound gain -> master gain -> low-pass -> compressor (limiter) -> output.
 * Nothing is created before `unlock()`, and nothing at all while the volume is 0.
 */
export class WebAudioService implements AudioService {
  private volume: number = DEFAULT_SETTINGS.soundVolume;
  private unlocked = false;
  private background = false;
  private unavailable = false;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeSources = 0;
  private queuedWhileStopped = 0;
  private readonly lastPlayed = new Map<SoundId, number>();

  constructor(
    private readonly createContext: () => AudioContext = createBrowserAudioContext,
    private readonly log: Logger = consoleLogger,
  ) {}

  unlock(): void {
    this.unlocked = true;
    this.guard('unlock', () => {
      this.ensureGraph();
      this.wake();
    });
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume);
    this.guard('setVolume', () => {
      this.ensureGraph();
      if (this.context && this.master) {
        this.master.gain.setTargetAtTime(volumeToGain(this.volume), this.context.currentTime, 0.02);
      }
    });
  }

  suspend(): void {
    this.background = true;
    this.guard('suspend', () => {
      // Unconditional: the reported state lags behind a resume that is still in flight.
      if (this.context && this.context.state !== 'closed') this.settle(this.context.suspend(), 'suspend');
    });
  }

  resume(): void {
    this.background = false;
    this.guard('resume', () => {
      // Unconditional for the same reason as in suspend().
      if (this.context && this.context.state !== 'closed') this.settle(this.context.resume(), 'resume');
    });
  }

  play(sound: SoundId, opts?: { step?: number }): void {
    this.guard('play', () => {
      if (this.volume <= 0 || this.background) return;
      const def = SOUNDS[sound];
      if (!def) return;
      this.ensureGraph();
      const context = this.context;
      const master = this.master;
      if (!context || !master) return;
      if (context.state !== 'running') {
        // The clock is stopped (first gesture still resuming, or an OS interruption). Let one
        // sound through so the tap that unlocks audio is heard; more would pile up and replay at once.
        this.wake();
        if (context.state === 'closed' || this.queuedWhileStopped >= 1) return;
        this.queuedWhileStopped += 1;
      } else {
        this.queuedWhileStopped = 0;
      }
      const now = context.currentTime;
      const last = this.lastPlayed.get(sound);
      if (last !== undefined && now >= last && (now - last) * 1000 < def.minIntervalMs) return;
      if (this.activeSources + def.layers.length > MAX_ACTIVE_SOURCES) return;
      this.lastPlayed.set(sound, now);

      const ratio = def.chainPitched ? chainPitchRatio(opts?.step) : 1;
      const start = now + LEAD_S;
      const bus = context.createGain();
      bus.gain.value = def.gain;
      bus.connect(master);
      let remaining = def.layers.length;
      const release = (): void => {
        this.activeSources -= 1;
        remaining -= 1;
        if (remaining === 0) bus.disconnect();
      };
      for (const layer of def.layers) {
        this.activeSources += 1;
        this.scheduleLayer(context, bus, layer, start, ratio, release);
      }
    });
  }

  private scheduleLayer(context: AudioContext, bus: GainNode, layer: SoundLayer, start: number, ratio: number, release: () => void): void {
    const t0 = start + layer.delayMs / 1000;
    const peakAt = t0 + layer.attackMs / 1000;
    const end = peakAt + layer.decayMs / 1000;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(SILENCE, t0);
    envelope.gain.linearRampToValueAtTime(layer.gain, peakAt);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end);
    envelope.connect(bus);

    let source: AudioScheduledSourceNode;
    let filter: BiquadFilterNode | null = null;
    if (layer.kind === 'tone') {
      const oscillator = context.createOscillator();
      oscillator.type = layer.wave;
      oscillator.frequency.setValueAtTime(layer.freq * ratio, t0);
      if (layer.glideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(layer.glideTo * ratio, end);
      oscillator.connect(envelope);
      source = oscillator;
    } else {
      const noise = context.createBufferSource();
      noise.buffer = this.noise(context);
      filter = context.createBiquadFilter();
      filter.type = layer.filter;
      filter.frequency.value = layer.cutoff;
      filter.Q.value = layer.q;
      noise.connect(filter);
      filter.connect(envelope);
      source = noise;
    }
    source.onended = () => {
      try {
        source.disconnect();
        filter?.disconnect();
        envelope.disconnect();
      } catch (error) {
        this.log('audio', 'cleanup failed', error);
      }
      release();
    };
    source.start(t0);
    source.stop(end + 0.02);
  }

  /** Half a second of white noise, generated once. Its own generator: no gameplay randomness involved. */
  private noise(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.floor(context.sampleRate * 0.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let state = 0x2f6e2b1;
    for (let i = 0; i < length; i += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      samples[i] = state / 0x80000000 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** Builds the context and master chain once it is allowed (unlocked) and useful (volume above 0). */
  private ensureGraph(): void {
    if (this.context || this.unavailable || !this.unlocked || this.volume <= 0) return;
    let context: AudioContext;
    try {
      context = this.createContext();
    } catch (error) {
      this.unavailable = true;
      this.log('audio', 'audio is unavailable; the game stays silent', error);
      return;
    }
    const master = context.createGain();
    master.gain.value = volumeToGain(this.volume);
    const matte = context.createBiquadFilter();
    matte.type = 'lowpass';
    matte.frequency.value = MASTER_LOWPASS_HZ;
    matte.Q.value = 0.5;
    // Fast, steep compressor as a safety limiter for overlapping sounds.
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 6;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master.connect(matte);
    matte.connect(limiter);
    limiter.connect(context.destination);
    this.context = context;
    this.master = master;
  }

  /** Browsers start contexts suspended and the OS may interrupt them; resume unless we are in the background. */
  private wake(): void {
    const context = this.context;
    if (!context || this.background) return;
    if (context.state !== 'running' && context.state !== 'closed') this.settle(context.resume(), 'resume');
  }

  private settle(pending: Promise<void> | undefined, action: string): void {
    if (pending && typeof pending.catch === 'function') {
      pending.catch((error: unknown) => this.log('audio', `${action} failed`, error));
    }
  }

  private guard(action: string, run: () => void): void {
    try {
      run();
    } catch (error) {
      this.log('audio', `${action} failed`, error);
    }
  }
}
