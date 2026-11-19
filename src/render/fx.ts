/**
 * Shared effect system: a fixed pool of particles and a small pool of text sprites.
 * Everything is allocated once; spawning and stepping never allocate. Particles are
 * drawn from pre-rendered sprites (one per shape and colour), so a skin's particle
 * painter runs once, not per frame. Visual randomness is seeded and separate from
 * the gameplay generator.
 */
import type { TileColor } from '../game/types';
import { FX_LIMITS, type BurstSpec, type Ctx2D, type EffectsSkin, type ParticleShape, type TextSpec } from './skin';

/** Small seeded generator (mulberry32) for visual randomness only. */
export function createVisualRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Built-in particle shapes, painted into a `size` x `size` box. */
export function paintBuiltinParticle(ctx: Ctx2D, shape: ParticleShape, color: string, size: number): void {
  const c = size / 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  switch (shape) {
    case 'spark':
      // A four-point sparkle.
      ctx.moveTo(c, 0);
      ctx.quadraticCurveTo(c, c, size, c);
      ctx.quadraticCurveTo(c, c, c, size);
      ctx.quadraticCurveTo(c, c, 0, c);
      ctx.quadraticCurveTo(c, c, c, 0);
      ctx.fill();
      break;
    case 'shard':
      ctx.moveTo(c, size * 0.04);
      ctx.lineTo(size * 0.82, size * 0.62);
      ctx.lineTo(size * 0.3, size * 0.96);
      ctx.closePath();
      ctx.fill();
      break;
    case 'ring':
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.arc(c, c, c - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? c : c * 0.45;
        if (i === 0) ctx.moveTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
        else ctx.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.arc(c, c, c, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

/** Ease out with a small overshoot past 1. */
export function backOut(t: number): number {
  const u = (t < 0 ? 0 : t > 1 ? 1 : t) - 1;
  return 1 + 2.70158 * u * u * u + 1.70158 * u * u;
}

/** Edge of a particle sprite in CSS px; particles are scaled down from it. */
const PARTICLE_SPRITE_PX = 24;
const MAX_TEXTS = 8;

interface TextSlot {
  canvas: HTMLCanvasElement | null;
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  t0: number;
  ms: number;
  rise: number;
  banner: boolean;
}

export class FxSystem {
  readonly capacity: number;
  private count = 0;
  // Particle pool, structure of arrays.
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly age: Float32Array; // ms; negative while delayed
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private readonly rot: Float32Array;
  private readonly spin: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly sprite: Uint16Array;
  private readonly flags: Uint8Array; // bit 0 shrink, bit 1 additive

  private readonly sprites: HTMLCanvasElement[] = [];
  private readonly spriteIndex = new Map<string, number>();
  private readonly texts: TextSlot[] = [];
  private additiveLive = 0;
  private dpr = 1;
  private r = 1;
  private effects: EffectsSkin;
  private readonly doc: Document;
  readonly random: () => number;

  constructor(effects: EffectsSkin, doc: Document, capacity: number = FX_LIMITS.maxParticles, seed = 0x9e3779b9) {
    this.effects = effects;
    this.doc = doc;
    this.capacity = capacity;
    this.px = new Float32Array(capacity);
    this.py = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.rot = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.sprite = new Uint16Array(capacity);
    this.flags = new Uint8Array(capacity);
    this.random = createVisualRandom(seed);
    for (let i = 0; i < MAX_TEXTS; i++) {
      this.texts.push({ canvas: null, active: false, x: 0, y: 0, w: 0, h: 0, t0: 0, ms: 0, rise: 0, banner: false });
    }
  }

  /** New skin or new board size: sprites are rebuilt on demand, live effects dropped. */
  configure(effects: EffectsSkin, r: number, dpr: number): void {
    this.effects = effects;
    this.r = r;
    this.dpr = dpr;
    this.sprites.length = 0;
    this.spriteIndex.clear();
    this.clear();
  }

  clear(): void {
    this.count = 0;
    this.additiveLive = 0;
    for (const slot of this.texts) slot.active = false;
  }

  get liveParticles(): number {
    return this.count;
  }

  get busy(): boolean {
    if (this.count > 0) return true;
    for (let i = 0; i < this.texts.length; i++) if (this.texts[i]?.active) return true;
    return false;
  }

  private spriteFor(shape: ParticleShape, color: string): number {
    const key = `${shape}|${color}`;
    const found = this.spriteIndex.get(key);
    if (found !== undefined) return found;
    const edge = Math.max(2, Math.round(PARTICLE_SPRITE_PX * this.dpr));
    const canvas = this.doc.createElement('canvas');
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const custom = this.effects.paintParticle?.(ctx, shape, color, PARTICLE_SPRITE_PX) ?? false;
      if (!custom) paintBuiltinParticle(ctx, shape, color, PARTICLE_SPRITE_PX);
    }
    const index = this.sprites.length;
    this.sprites.push(canvas);
    this.spriteIndex.set(key, index);
    return index;
  }

  /** Spawn a burst. Cut to the per-burst cap and to the free space in the pool. */
  burst(spec: BurstSpec, x: number, y: number, tile: TileColor | null, delay = 0): number {
    const colors = this.effects.particleColors(tile);
    if (colors.length === 0) return 0;
    const free = this.capacity - this.count;
    const n = Math.min(Math.max(0, Math.floor(spec.count)), FX_LIMITS.maxBurst, free);
    const r = this.r;
    const rnd = this.random;
    const a0 = spec.angle ? spec.angle[0] : 0;
    const a1 = spec.angle ? spec.angle[1] : Math.PI * 2;
    const flags = (spec.shrink === false ? 0 : 1) | (spec.additive ? 2 : 0);
    for (let k = 0; k < n; k++) {
      const i = this.count++;
      const angle = a0 + (a1 - a0) * rnd();
      const speed = (spec.speed[0] + (spec.speed[1] - spec.speed[0]) * rnd()) * r;
      const spread = (spec.spread ?? 0) * r * rnd();
      const sa = rnd() * Math.PI * 2;
      this.px[i] = x + Math.cos(sa) * spread;
      this.py[i] = y + Math.sin(sa) * spread;
      this.vx[i] = Math.cos(angle) * speed;
      this.vy[i] = Math.sin(angle) * speed;
      this.age[i] = -Math.max(0, delay);
      this.life[i] = Math.min(FX_LIMITS.maxParticleLife, Math.max(1, spec.life[0] + (spec.life[1] - spec.life[0]) * rnd()));
      this.size[i] = (spec.size[0] + (spec.size[1] - spec.size[0]) * rnd()) * r;
      this.rot[i] = rnd() * Math.PI * 2;
      this.spin[i] = spec.spin ? spec.spin[0] + (spec.spin[1] - spec.spin[0]) * rnd() : 0;
      this.gravity[i] = (spec.gravity ?? 0) * r;
      this.drag[i] = spec.drag ?? 0;
      const color = colors[Math.floor(rnd() * colors.length)] ?? colors[0] ?? '#fff';
      this.sprite[i] = this.spriteFor(spec.shape, color);
      this.flags[i] = flags;
      if (flags & 2) this.additiveLive++;
    }
    return n;
  }

  /** Show a text. `banner` texts scale in and hold; others rise and fade. */
  text(spec: TextSpec, text: string, x: number, y: number, rise: number, now: number, banner: boolean): void {
    let slot: TextSlot | undefined;
    for (let i = 0; i < this.texts.length; i++) {
      const candidate = this.texts[i];
      if (candidate && !candidate.active) {
        slot = candidate;
        break;
      }
    }
    // All slots busy: reuse the oldest.
    if (!slot) {
      for (let i = 0; i < this.texts.length; i++) {
        const candidate = this.texts[i];
        if (candidate && (!slot || candidate.t0 < slot.t0)) slot = candidate;
      }
    }
    if (!slot) return;
    const canvas = slot.canvas ?? this.doc.createElement('canvas');
    slot.canvas = canvas;
    const fontPx = Math.max(8, spec.size * this.r);
    const strokePx = spec.stroke ? Math.max(1, (spec.strokeWidth ?? 0.14) * fontPx) : 0;
    const font = `${spec.weight} ${fontPx}px ${spec.family}`;
    const measure = canvas.getContext('2d');
    if (!measure) return;
    measure.font = font;
    const w = Math.ceil(measure.measureText(text).width + strokePx * 2 + 4);
    const h = Math.ceil(fontPx * 1.3 + strokePx * 2);
    canvas.width = Math.max(1, Math.round(w * this.dpr));
    canvas.height = Math.max(1, Math.round(h * this.dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (spec.stroke && strokePx > 0) {
      ctx.strokeStyle = spec.stroke;
      ctx.lineWidth = strokePx;
      ctx.strokeText(text, w / 2, h / 2);
    }
    ctx.fillStyle = spec.fill;
    ctx.fillText(text, w / 2, h / 2);
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.w = w;
    slot.h = h;
    slot.t0 = now;
    slot.ms = Math.max(1, Math.min(banner ? FX_LIMITS.maxBanner : FX_LIMITS.maxText, spec.ms));
    slot.rise = rise * this.r;
    slot.banner = banner;
  }

  /** Advance particles by `dt` ms. Dead particles are swapped out; no allocation. */
  step(dt: number): void {
    const s = dt / 1000;
    let i = 0;
    while (i < this.count) {
      const age = (this.age[i] ?? 0) + dt;
      if (age >= (this.life[i] ?? 0)) {
        if ((this.flags[i] ?? 0) & 2) this.additiveLive--;
        const last = --this.count;
        if (i !== last) this.move(last, i);
        continue;
      }
      this.age[i] = age;
      if (age > 0) {
        const damp = Math.max(0, 1 - (this.drag[i] ?? 0) * s);
        const vx = (this.vx[i] ?? 0) * damp;
        const vy = (this.vy[i] ?? 0) * damp + (this.gravity[i] ?? 0) * s;
        this.vx[i] = vx;
        this.vy[i] = vy;
        this.px[i] = (this.px[i] ?? 0) + vx * s;
        this.py[i] = (this.py[i] ?? 0) + vy * s;
        this.rot[i] = (this.rot[i] ?? 0) + (this.spin[i] ?? 0) * s;
      }
      i++;
    }
  }

  private move(from: number, to: number): void {
    this.px[to] = this.px[from] ?? 0;
    this.py[to] = this.py[from] ?? 0;
    this.vx[to] = this.vx[from] ?? 0;
    this.vy[to] = this.vy[from] ?? 0;
    this.age[to] = this.age[from] ?? 0;
    this.life[to] = this.life[from] ?? 0;
    this.size[to] = this.size[from] ?? 0;
    this.rot[to] = this.rot[from] ?? 0;
    this.spin[to] = this.spin[from] ?? 0;
    this.gravity[to] = this.gravity[from] ?? 0;
    this.drag[to] = this.drag[from] ?? 0;
    this.sprite[to] = this.sprite[from] ?? 0;
    this.flags[to] = this.flags[from] ?? 0;
  }

  /** Draw particles and texts. The context must be scaled by the DPR given to `configure`. */
  draw(ctx: Ctx2D, now: number, reducedMotion: boolean): void {
    const dpr = this.dpr;
    if (this.count > 0) {
      this.drawPass(ctx, 0);
      if (this.additiveLive > 0) {
        ctx.globalCompositeOperation = 'lighter';
        this.drawPass(ctx, 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < this.texts.length; i++) {
      const slot = this.texts[i];
      if (!slot || !slot.active || !slot.canvas) continue;
      const p = (now - slot.t0) / slot.ms;
      if (p >= 1) {
        slot.active = false;
        continue;
      }
      if (p < 0) continue;
      let scale = 1;
      let alpha = 1;
      let y = slot.y;
      if (reducedMotion) {
        alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      } else if (slot.banner) {
        // Scale in with a small overshoot, hold, fade.
        scale = 0.5 + 0.5 * backOut(Math.min(1, p / 0.22));
        alpha = p < 0.72 ? Math.min(1, p / 0.1) : 1 - (p - 0.72) / 0.28;
      } else {
        const e = 1 - (1 - p) * (1 - p) * (1 - p);
        y = slot.y - slot.rise * e;
        scale = 0.6 + 0.4 * backOut(Math.min(1, p / 0.2));
        alpha = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
      }
      const w = slot.w * scale;
      const h = slot.h * scale;
      ctx.globalAlpha = alpha < 0 ? 0 : alpha;
      ctx.drawImage(slot.canvas, slot.x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  private drawPass(ctx: Ctx2D, additiveFlag: number): void {
    const dpr = this.dpr;
    const sprites = this.sprites;
    for (let i = 0; i < this.count; i++) {
      const flags = this.flags[i] ?? 0;
      if ((flags & 2) !== additiveFlag) continue;
      const age = this.age[i] ?? 0;
      if (age <= 0) continue;
      const k = age / (this.life[i] ?? 1);
      const sprite = sprites[this.sprite[i] ?? 0];
      if (!sprite) continue;
      const size = (this.size[i] ?? 0) * (flags & 1 ? 1 - k * k : 1);
      if (size <= 0.2) continue;
      // Fade over the last 40% of life.
      ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
      const rot = this.rot[i] ?? 0;
      const cos = Math.cos(rot) * dpr;
      const sin = Math.sin(rot) * dpr;
      ctx.setTransform(cos, sin, -sin, cos, (this.px[i] ?? 0) * dpr, (this.py[i] ?? 0) * dpr);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    }
  }
}
