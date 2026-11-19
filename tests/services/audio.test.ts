import { describe, expect, it } from 'vitest';
import type { SoundId } from '../../src/platform/types';
import { FakeAudio } from '../../src/services/audio/fakeAudio';
import {
  ACTIVATE_BASE_HZ,
  MASTER_HEADROOM,
  MAX_CHAIN_PITCH_STEP,
  SOUNDS,
  chainPitchRatio,
  chainSemitones,
  clampVolume,
  soundDurationMs,
  volumeToGain,
} from '../../src/services/audio/sounds';
import { WebAudioService } from '../../src/services/audio/webAudio';

const ALL_SOUNDS: readonly SoundId[] = ['move', 'rotate', 'blocked', 'swap', 'land', 'activate', 'stageComplete', 'over', 'uiTap'];
/** Sounds heard many times a minute must stay very short (ms). */
const FREQUENT: readonly SoundId[] = ['move', 'rotate', 'blocked', 'swap', 'land', 'uiTap'];

describe('sound table', () => {
  it('defines every sound id and nothing else', () => {
    expect(Object.keys(SOUNDS).sort()).toEqual([...ALL_SOUNDS].sort());
  });

  for (const id of ALL_SOUNDS) {
    describe(id, () => {
      const def = SOUNDS[id];

      it('has layers and a low overall level', () => {
        expect(def.layers.length).toBeGreaterThan(0);
        expect(def.layers.length).toBeLessThanOrEqual(6);
        expect(def.gain).toBeGreaterThan(0);
        expect(def.gain).toBeLessThanOrEqual(0.5);
        for (const layer of def.layers) {
          expect(layer.gain).toBeGreaterThan(0);
          expect(layer.gain).toBeLessThanOrEqual(0.5);
        }
      });

      it('uses only soft sources in a matte frequency range', () => {
        for (const layer of def.layers) {
          if (layer.kind === 'tone') {
            expect(['sine', 'triangle']).toContain(layer.wave);
            for (const hz of [layer.freq, layer.glideTo ?? layer.freq]) {
              expect(hz).toBeGreaterThanOrEqual(55);
              expect(hz * chainPitchRatio(MAX_CHAIN_PITCH_STEP)).toBeLessThanOrEqual(def.chainPitched ? 2000 : 5000);
              expect(hz).toBeLessThanOrEqual(1200);
            }
          } else {
            expect(['lowpass', 'bandpass']).toContain(layer.filter);
            expect(layer.cutoff).toBeGreaterThanOrEqual(100);
            expect(layer.cutoff).toBeLessThanOrEqual(2000);
            expect(layer.q).toBeGreaterThan(0);
            expect(layer.q).toBeLessThanOrEqual(4);
          }
        }
      });

      it('has click-free, short envelopes', () => {
        for (const layer of def.layers) {
          expect(layer.delayMs).toBeGreaterThanOrEqual(0);
          expect(layer.attackMs).toBeGreaterThanOrEqual(2);
          expect(layer.decayMs).toBeGreaterThanOrEqual(10);
        }
        const duration = soundDurationMs(def);
        expect(duration).toBeGreaterThanOrEqual(20);
        expect(duration).toBeLessThanOrEqual(FREQUENT.includes(id) ? 160 : 1000);
        expect(def.minIntervalMs).toBeGreaterThan(0);
      });
    });
  }

  it('only the activation follows the chain', () => {
    expect(ALL_SOUNDS.filter((id) => SOUNDS[id].chainPitched)).toEqual(['activate']);
  });

  it('activation is a rising run that fits the 200-260 ms path flow', () => {
    const tones = SOUNDS.activate.layers.filter((layer) => layer.kind === 'tone' && layer.wave === 'sine');
    const onsets = tones.map((layer) => layer.delayMs);
    const pitches = tones.map((layer) => (layer.kind === 'tone' ? layer.freq : 0));
    expect(tones.length).toBeGreaterThanOrEqual(3);
    expect(onsets).toEqual([...onsets].sort((x, y) => x - y));
    expect(pitches).toEqual([...pitches].sort((x, y) => x - y));
    expect(new Set(pitches).size).toBe(pitches.length);
    expect(pitches[0]).toBeCloseTo(ACTIVATE_BASE_HZ, 5);
    expect(Math.max(...onsets)).toBeLessThanOrEqual(260);
    expect(soundDurationMs(SOUNDS.activate)).toBeLessThanOrEqual(400);
  });

  it('game over falls, stage complete rises', () => {
    const main = (id: SoundId) => SOUNDS[id].layers.flatMap((layer) => (layer.kind === 'tone' && layer.wave === 'sine' ? [layer.freq] : []));
    expect(main('over')).toEqual([...main('over')].sort((x, y) => y - x));
    expect(main('stageComplete')).toEqual([...main('stageComplete')].sort((x, y) => x - y));
  });
});

describe('chain pitch', () => {
  it('step 1 is the base pitch', () => {
    expect(chainSemitones(1)).toBe(0);
    expect(chainPitchRatio(1)).toBe(1);
  });

  it('walks the pentatonic scale', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(chainSemitones)).toEqual([0, 2, 4, 7, 9, 12, 14, 16]);
    expect(chainPitchRatio(6)).toBeCloseTo(2, 10);
  });

  it('rises strictly up to the cap, then holds', () => {
    for (let step = 2; step <= MAX_CHAIN_PITCH_STEP; step += 1) {
      expect(chainPitchRatio(step)).toBeGreaterThan(chainPitchRatio(step - 1));
    }
    expect(chainPitchRatio(MAX_CHAIN_PITCH_STEP + 1)).toBe(chainPitchRatio(MAX_CHAIN_PITCH_STEP));
    expect(chainPitchRatio(1000)).toBe(chainPitchRatio(MAX_CHAIN_PITCH_STEP));
  });

  it('treats missing or odd steps as the first', () => {
    for (const step of [undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(chainPitchRatio(step)).toBe(1);
    }
    expect(chainPitchRatio(2.9)).toBe(chainPitchRatio(2));
  });
});

describe('volume', () => {
  it('clamps', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
    expect(clampVolume(0.4)).toBe(0.4);
  });

  it('maps to a monotonic gain with headroom', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(1)).toBe(MASTER_HEADROOM);
    expect(volumeToGain(0.5)).toBeLessThan(volumeToGain(0.6));
    expect(MASTER_HEADROOM).toBeLessThan(1);
  });
});

/** Minimal stand-in for an AudioContext that counts what gets built. */
class MockContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  nodes: string[] = [];
  started: { type: string; at: number; frequency?: number }[] = [];
  resumeCalls = 0;
  suspendCalls = 0;
  failResume = false;

  private param(initial = 0) {
    const param = {
      value: initial,
      firstValue: undefined as number | undefined,
      setValueAtTime(value: number) {
        param.firstValue ??= value;
        param.value = value;
      },
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
      setTargetAtTime(value: number) {
        param.value = value;
      },
    };
    return param;
  }

  private node(type: string, extra: Record<string, unknown> = {}) {
    this.nodes.push(type);
    return { connect() {}, disconnect() {}, ...extra };
  }

  masterGain: { gain: { value: number } } | null = null;

  createGain() {
    const node = this.node('gain', { gain: this.param(1) });
    this.masterGain ??= node as unknown as { gain: { value: number } };
    return node;
  }

  createBiquadFilter() {
    return this.node('filter', { type: 'lowpass', frequency: this.param(), Q: this.param() });
  }

  createDynamicsCompressor() {
    return this.node('compressor', { threshold: this.param(), knee: this.param(), ratio: this.param(), attack: this.param(), release: this.param() });
  }

  private source(type: string, extra: Record<string, unknown>) {
    const frequency = this.param();
    const node = this.node(type, {
      ...extra,
      frequency,
      onended: null as (() => void) | null,
      start: (at: number) => {
        this.started.push({ type, at, frequency: frequency.firstValue });
        this.sources.push(node as unknown as { onended: (() => void) | null });
      },
      stop() {},
    });
    return node;
  }

  sources: { onended: (() => void) | null }[] = [];

  createOscillator() {
    return this.source('oscillator', { type: 'sine' });
  }

  createBufferSource() {
    return this.source('noise', { buffer: null });
  }

  createBuffer(_channels: number, length: number) {
    this.nodes.push('buffer');
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  resume() {
    this.resumeCalls += 1;
    // Like a browser: the state changes later, not during the call.
    return Promise.resolve().then(() => {
      if (this.failResume) throw new Error('not allowed');
      this.state = 'running';
    });
  }

  suspend() {
    this.suspendCalls += 1;
    return Promise.resolve().then(() => {
      this.state = 'suspended';
    });
  }

  finishAll() {
    for (const source of this.sources.splice(0)) source.onended?.();
  }
}

function setup(volume = 0.7) {
  const context = new MockContext();
  let created = 0;
  const logged: string[] = [];
  const audio = new WebAudioService(
    () => {
      created += 1;
      return context as unknown as AudioContext;
    },
    (_scope, message) => logged.push(message),
  );
  audio.setVolume(volume);
  return { audio, context, logged, created: () => created };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('WebAudioService', () => {
  it('creates nothing before unlock', () => {
    const { audio, context, created } = setup();
    audio.play('move');
    audio.resume();
    audio.suspend();
    expect(created()).toBe(0);
    expect(context.nodes).toEqual([]);
  });

  it('creates the context on unlock and resumes a suspended one', async () => {
    const { audio, context, created } = setup();
    audio.unlock();
    expect(created()).toBe(1);
    expect(context.nodes).toEqual(['gain', 'filter', 'compressor']);
    expect(context.resumeCalls).toBe(1);
    await settle();
    audio.unlock();
    expect(created()).toBe(1);
    expect(context.resumeCalls).toBe(1);
  });

  it('creates no context and no nodes while the volume is 0', async () => {
    const { audio, context, created } = setup(0);
    audio.unlock();
    audio.play('land');
    expect(created()).toBe(0);
    expect(context.nodes).toEqual([]);
    // Raising the volume later builds the graph without another unlock.
    audio.setVolume(0.5);
    expect(created()).toBe(1);
    audio.play('land');
    await settle();
    audio.play('land');
    expect(context.started.length).toBe(SOUNDS.land.layers.length);
  });

  it('creates no nodes for a sound after the volume drops to 0', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    audio.setVolume(0);
    const before = context.nodes.length;
    audio.play('activate', { step: 2 });
    expect(context.nodes.length).toBe(before);
    expect(context.masterGain?.gain.value).toBe(0);
  });

  it('lets a single sound through while the context is still starting', async () => {
    const { audio, context } = setup();
    audio.unlock();
    audio.play('uiTap');
    audio.play('land');
    audio.play('rotate');
    expect(context.started.length).toBe(SOUNDS.uiTap.layers.length);
    await settle();
    audio.play('land');
    expect(context.started.length).toBe(SOUNDS.uiTap.layers.length + SOUNDS.land.layers.length);
  });

  it('schedules one source per layer, all in the future', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    context.currentTime = 2;
    audio.play('activate');
    expect(context.started.length).toBe(SOUNDS.activate.layers.length);
    for (const start of context.started) expect(start.at).toBeGreaterThan(2);
  });

  it('transposes the activation by the chain step and nothing else', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    audio.play('activate', { step: 1 });
    const base = context.started[0]?.frequency ?? 0;
    context.started.length = 0;
    context.currentTime = 1;
    audio.play('activate', { step: 3 });
    expect(context.started[0]?.frequency).toBeCloseTo(base * chainPitchRatio(3), 6);

    context.started.length = 0;
    context.currentTime = 2;
    audio.play('rotate', { step: 5 });
    const rotate = SOUNDS.rotate.layers[0];
    expect(context.started[0]?.frequency).toBe(rotate?.kind === 'tone' ? rotate.freq : -1);
  });

  it('drops rapid repeats of the same sound', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    audio.play('move');
    audio.play('move');
    expect(context.started.length).toBe(SOUNDS.move.layers.length);
    context.currentTime += SOUNDS.move.minIntervalMs / 1000 + 0.001;
    audio.play('move');
    expect(context.started.length).toBe(2 * SOUNDS.move.layers.length);
  });

  it('caps the number of ringing sources and frees them when they end', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    for (let i = 0; i < 40; i += 1) {
      context.currentTime += 1;
      audio.play('activate');
    }
    const capped = context.started.length;
    expect(capped).toBeLessThanOrEqual(24);
    expect(capped).toBeGreaterThan(0);
    context.finishAll();
    context.currentTime += 1;
    audio.play('activate');
    expect(context.started.length).toBe(capped + SOUNDS.activate.layers.length);
  });

  it('is silent in the background and wakes on resume', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    audio.suspend();
    expect(context.suspendCalls).toBe(1);
    audio.play('land');
    audio.unlock();
    expect(context.started).toEqual([]);
    expect(context.resumeCalls).toBe(1);
    audio.resume();
    expect(context.resumeCalls).toBe(2);
    await settle();
    audio.play('land');
    expect(context.started.length).toBe(SOUNDS.land.layers.length);
  });

  it('applies volume changes to the master gain', async () => {
    const { audio, context } = setup(1);
    audio.unlock();
    expect(context.masterGain?.gain.value).toBe(volumeToGain(1));
    audio.setVolume(0.5);
    expect(context.masterGain?.gain.value).toBe(volumeToGain(0.5));
  });

  it('logs instead of throwing when the context cannot be created, and does not retry', () => {
    let attempts = 0;
    const logged: string[] = [];
    const audio = new WebAudioService(
      () => {
        attempts += 1;
        throw new Error('no audio');
      },
      (_scope, message) => logged.push(message),
    );
    audio.setVolume(1);
    expect(() => {
      audio.unlock();
      audio.play('move');
      audio.unlock();
      audio.suspend();
      audio.resume();
    }).not.toThrow();
    expect(attempts).toBe(1);
    expect(logged).toHaveLength(1);
  });

  it('logs a rejected resume', async () => {
    const { audio, context, logged } = setup();
    context.failResume = true;
    audio.unlock();
    await settle();
    expect(logged.some((line) => line.includes('resume'))).toBe(true);
  });

  it('logs instead of throwing when a node misbehaves', async () => {
    const { audio, context, logged } = setup();
    audio.unlock();
    await settle();
    context.createOscillator = () => {
      throw new Error('broken node');
    };
    expect(() => audio.play('rotate')).not.toThrow();
    expect(logged.some((line) => line.includes('play'))).toBe(true);
  });

  it('ignores an unknown sound id', async () => {
    const { audio, context } = setup();
    audio.unlock();
    await settle();
    expect(() => audio.play('nope' as SoundId)).not.toThrow();
    expect(context.started).toEqual([]);
  });
});

describe('FakeAudio', () => {
  it('records plays with their step', () => {
    const audio = new FakeAudio();
    audio.unlock();
    audio.play('move');
    audio.play('activate', { step: 3 });
    expect(audio.unlocked).toBe(true);
    expect(audio.played).toEqual([
      { sound: 'move', step: undefined },
      { sound: 'activate', step: 3 },
    ]);
  });

  it('is silent at volume 0 and while suspended', () => {
    const audio = new FakeAudio();
    audio.setVolume(0);
    audio.play('move');
    audio.setVolume(0.5);
    audio.suspend();
    audio.play('move');
    audio.resume();
    audio.play('land');
    expect(audio.played).toEqual([{ sound: 'land', step: undefined }]);
  });
});
