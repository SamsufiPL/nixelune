/**
 * Canvas renderer of the board. It reads a `GameView`, receives the drained
 * `GameEvent`s and turns them into presentation effects, drawing everything with the
 * active skin (see skin.ts). All easing, lighting and particles live here and in
 * fx.ts; the simulation knows nothing about them.
 *
 * Cost model: the bed is one cached layer, tiles and particles are sprites, per-cell
 * effect state lives in typed arrays sized once per board. A frame is drawn only when
 * the view changed or an effect is running, and drawing allocates nothing.
 */
import type { Cell, ColoredCell, GameEvent, GameView, TileColor, TileGroup } from '../game/types';
import { TILE_COLORS } from '../game/types';
import { clamp01, easeInQuad, easeOutCubic, progress } from './easing';
import { FxSystem } from './fx';
import { cellX, cellY, fitBoard, type BoardMetrics } from './hex';
import {
  lightDelay,
  resolveTiming,
  type BoardInfo,
  type BurstSpec,
  type FxApi,
  type PaintEnv,
  type ResolvedTiming,
  type Skin,
  type TextSpec,
  type TileState,
} from './skin';
import { TileSprites } from './sprites';

export interface RenderOptions {
  readonly marks: boolean;
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  /** Locale-aware number formatting for score pop-ups. */
  readonly formatNumber: (value: number) => string;
}

/** Device pixel ratio is capped: beyond this the eye gains nothing and fill cost grows. */
export const MAX_DPR = 2.5;
/** Forming paths are hinted from this group size up, so pairs do not clutter the board. */
export const LINK_MIN_GROUP = 3;
/** Fade of removed tiles and texts under reduced motion, ms. */
export const REDUCED_FADE_MS = 120;

const MAX_ACTIVE = 8;
const COLOR_OF: readonly TileColor[] = TILE_COLORS;
const COLOR_INDEX: Readonly<Record<TileColor, number>> = { teal: 0, coral: 1, ice: 2, lilac: 3, amber: 4 };

export function cappedDpr(deviceDpr: number): number {
  if (!(deviceDpr > 0)) return 1;
  return Math.min(MAX_DPR, Math.max(1, deviceDpr));
}

/**
 * Squash-and-settle curve: 0 at both ends, one squash, one small stretch back.
 * Returns the vertical scale offset for progress `p` (0-1) and depth `amp`.
 */
export function squashAt(p: number, amp: number): number {
  if (p <= 0 || p >= 1) return 0;
  const decay = (1 - p) * (1 - p);
  return -amp * Math.sin(p * Math.PI * 2.2) * decay * 1.6;
}

export class BoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private skin: Skin;
  private options: RenderOptions;
  private timing: ResolvedTiming;
  private env: PaintEnv;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private metrics: BoardMetrics = { r: 0, originX: 0, originY: 0, cols: 0, rows: 0 };
  private bedLayer: HTMLCanvasElement | null = null;
  private sprites: TileSprites | null = null;
  private readonly fx: FxSystem;
  private readonly fxApi: FxApi;
  private readonly boardInfo: BoardInfo;
  private dirty = true;
  private lastNow = -1;
  private fxNow = 0;

  // Per-cell effect state, indexed like `view.cells`. NaN start time = not running.
  private mvT0 = new Float64Array(0);
  private mvDur = new Float32Array(0);
  private mvFromX = new Float32Array(0);
  private mvFromY = new Float32Array(0);
  private mvHard = new Uint8Array(0);
  private sqT0 = new Float64Array(0);
  private sqAmp = new Float32Array(0);
  private sqDur = new Float32Array(0);
  private litAt = new Float64Array(0);
  private hint = new Uint8Array(0);
  private moving = 0;
  private squashing = 0;

  // Removed tiles popping: fixed pool, one per cell at most.
  private popX = new Float32Array(0);
  private popY = new Float32Array(0);
  private popT0 = new Float64Array(0);
  private popColor = new Uint8Array(0);
  private pops = 0;

  private activationGroups: readonly TileGroup[] = [];
  private activationEnd = 0;
  private fadingLinks: readonly TileGroup[] = [];
  private linkFadeT0 = -1;

  // Active piece easing.
  private activeSig = -1;
  private activeCount = 0;
  private readonly visX = new Float64Array(MAX_ACTIVE);
  private readonly visY = new Float64Array(MAX_ACTIVE);
  private readonly offX = new Float64Array(MAX_ACTIVE);
  private readonly offY = new Float64Array(MAX_ACTIVE);
  private readonly order = new Uint8Array(MAX_ACTIVE);
  private stepT0 = -1;
  private spawnT0 = -1;
  private teleport = true;

  /** Time spent in the last `draw`, ms (for the ?fps read-out and perf tests). */
  lastDrawMs = 0;

  constructor(canvas: HTMLCanvasElement, skin: Skin, options: RenderOptions) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.canvas = canvas;
    this.ctx = ctx;
    this.skin = skin;
    this.options = options;
    this.timing = resolveTiming(skin.effects.timing);
    this.env = { marks: options.marks, highContrast: options.highContrast, dpr: 1 };
    this.fx = new FxSystem(skin.effects, canvas.ownerDocument);
    const self = this;
    this.boardInfo = {
      get width() {
        return self.width;
      },
      get height() {
        return self.height;
      },
      get r() {
        return self.metrics.r;
      },
      get cols() {
        return self.metrics.cols;
      },
      get rows() {
        return self.metrics.rows;
      },
      cellX: (col, row) => self.px(col, row),
      cellY: (row) => self.py(row),
    };
    this.fxApi = {
      burst: (spec, x, y, tile, delay) => {
        if (!self.options.reducedMotion) self.fx.burst(spec, x, y, tile, delay ?? 0);
      },
      text: (spec, text, x, y, rise) => self.fx.text(spec, text, x, y, rise, self.fxNow, false),
      random: () => self.fx.random(),
      get reducedMotion() {
        return self.options.reducedMotion;
      },
    };
  }

  get boardMetrics(): BoardMetrics {
    return this.metrics;
  }

  get liveParticles(): number {
    return this.fx.liveParticles;
  }

  /** Padding of the active skin's bed, for the CSS frame ratio. */
  get bedPad(): number {
    return this.skin.bed.pad;
  }

  setSkin(skin: Skin): void {
    if (skin === this.skin) return;
    this.skin = skin;
    this.timing = resolveTiming(skin.effects.timing);
    this.relayout();
  }

  setOptions(options: RenderOptions): void {
    const rebuild = options.marks !== this.options.marks || options.highContrast !== this.options.highContrast;
    this.options = options;
    if (rebuild) this.rebuildLayers();
    if (options.reducedMotion) this.clearEffects();
    this.dirty = true;
  }

  /** Match the canvas backing store to its CSS box. Call when the box or the DPR changes. */
  resize(cssWidth: number, cssHeight: number, deviceDpr: number, cols: number, rows: number): void {
    const dpr = cappedDpr(deviceDpr);
    if (
      cssWidth === this.width &&
      cssHeight === this.height &&
      dpr === this.dpr &&
      cols === this.metrics.cols &&
      rows === this.metrics.rows
    ) {
      return;
    }
    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    const n = cols * rows;
    if (this.litAt.length !== n) {
      this.mvT0 = new Float64Array(n);
      this.mvDur = new Float32Array(n);
      this.mvFromX = new Float32Array(n);
      this.mvFromY = new Float32Array(n);
      this.mvHard = new Uint8Array(n);
      this.sqT0 = new Float64Array(n);
      this.sqAmp = new Float32Array(n);
      this.sqDur = new Float32Array(n);
      this.litAt = new Float64Array(n);
      this.hint = new Uint8Array(n);
      this.popX = new Float32Array(n);
      this.popY = new Float32Array(n);
      this.popT0 = new Float64Array(n);
      this.popColor = new Uint8Array(n);
    }
    this.metrics = { r: 0, originX: 0, originY: 0, cols, rows };
    this.relayout();
  }

  private relayout(): void {
    const { cols, rows } = this.metrics;
    if (cols > 0 && this.width > 0) {
      this.metrics = fitBoard(this.width, this.height, cols, rows, this.skin.bed.pad);
    }
    // Pixel positions held by running effects are stale now.
    this.clearEffects();
    this.rebuildLayers();
  }

  invalidate(): void {
    this.dirty = true;
  }

  /** Drop every running effect, e.g. when a new run starts on the same canvas. */
  clearEffects(): void {
    this.mvT0.fill(NaN);
    this.sqT0.fill(NaN);
    this.litAt.fill(NaN);
    this.moving = 0;
    this.squashing = 0;
    this.pops = 0;
    this.activationGroups = [];
    this.fadingLinks = [];
    this.linkFadeT0 = -1;
    this.stepT0 = -1;
    this.spawnT0 = -1;
    this.teleport = true;
    this.fx.clear();
    this.dirty = true;
  }

  private rebuildLayers(): void {
    const { r, cols, rows } = this.metrics;
    this.env = { marks: this.options.marks, highContrast: this.options.highContrast, dpr: this.dpr };
    this.fx.configure(this.skin.effects, r, this.dpr);
    this.dirty = true;
    if (r <= 0 || this.width <= 0) {
      this.bedLayer = null;
      this.sprites = null;
      return;
    }
    const doc = this.canvas.ownerDocument;
    this.sprites = new TileSprites(this.skin.tile, r, this.env, doc);
    this.sprites.warm();
    const layer = doc.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const g = layer.getContext('2d');
    if (g) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.skin.bed.paint({
        ctx: g,
        width: this.width,
        height: this.height,
        r,
        cols,
        rows,
        cellX: (col, row) => this.px(col, row),
        cellY: (row) => this.py(row),
        ...this.env,
      });
    }
    this.bedLayer = layer;
  }

  private px(col: number, row: number): number {
    return this.metrics.originX + cellX(col, row, this.metrics.r);
  }

  private py(row: number): number {
    return this.metrics.originY + cellY(row, this.metrics.r);
  }

  private index(cell: Cell): number {
    return cell.row * this.metrics.cols + cell.col;
  }

  // --- Events -------------------------------------------------------------------

  /** Feed the events drained this frame. `now` is the presentation clock in ms. */
  handleEvents(events: readonly GameEvent[], now: number): void {
    if (events.length === 0) return;
    this.dirty = true;
    this.fxNow = now;
    const still = this.options.reducedMotion;
    const effects = this.skin.effects;
    for (const event of events) {
      switch (event.type) {
        case 'spawned':
        case 'swapped':
          this.teleport = true;
          if (!still) this.spawnT0 = now;
          break;
        case 'locked':
          if (!still) this.startLanding(event.cells, event.hard, now);
          this.teleport = true;
          break;
        case 'settled':
          if (!still) {
            for (const move of event.moves) this.startFall(move.from, move.to, now);
          } else {
            this.mvT0.fill(NaN);
            this.moving = 0;
          }
          break;
        case 'activated':
          this.startActivation(event.groups, event.chain, event.points, now);
          break;
        case 'removed':
          this.startPops(event.cells, now);
          break;
        case 'stageStarted':
          this.mvT0.fill(NaN);
          this.moving = 0;
          break;
        case 'stageCompleted':
          this.startFlourish();
          break;
        default:
          break;
      }
      effects.onEvent?.(event, this.fxApi, this.boardInfo);
    }
  }

  private setMove(index: number, fromX: number, fromY: number, t0: number, dur: number, hard: boolean): void {
    if (this.mvT0[index] !== this.mvT0[index]) this.moving++;
    this.mvT0[index] = t0;
    this.mvDur[index] = dur;
    this.mvFromX[index] = fromX;
    this.mvFromY[index] = fromY;
    this.mvHard[index] = hard ? 1 : 0;
  }

  private clearMove(index: number): void {
    if (this.mvT0[index] === this.mvT0[index]) {
      this.mvT0[index] = NaN;
      this.moving--;
    }
  }

  private setSquash(index: number, t0: number, amp: number, dur: number): void {
    if (amp <= 0 || dur <= 0) return;
    if (this.sqT0[index] !== this.sqT0[index]) this.squashing++;
    this.sqT0[index] = t0;
    this.sqAmp[index] = Math.min(0.35, amp);
    this.sqDur[index] = dur;
  }

  private clearSquash(index: number): void {
    if (this.sqT0[index] === this.sqT0[index]) {
      this.sqT0[index] = NaN;
      this.squashing--;
    }
  }

  private startLanding(cells: readonly ColoredCell[], hard: boolean, now: number): void {
    const land = this.skin.effects.land;
    const travel = hard ? this.timing.hardDrop : 0;
    const r = this.metrics.r;
    const matched = cells.length === this.activeCount;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const index = this.index(cell);
      const x = this.px(cell.col, cell.row);
      const y = this.py(cell.row);
      if (hard && matched) {
        // The locked tiles travel from where the piece was last drawn.
        const fromX = this.visX[i] ?? x;
        const fromY = this.visY[i] ?? y;
        if (Math.abs(fromY - y) > 0.5 || Math.abs(fromX - x) > 0.5) this.setMove(index, fromX, fromY, now, travel, true);
      }
      this.setSquash(index, now + travel, land.squash, land.ms);
      if (land.dust) this.fx.burst(land.dust, x, y + r * 0.8, cell.color, travel);
    }
  }

  private moveProgress(index: number, now: number): number {
    const p = progress(now, this.mvT0[index] ?? 0, this.mvDur[index] ?? 0);
    return this.mvHard[index] ? easeInQuad(p) : easeOutCubic(p);
  }

  private startFall(from: Cell, to: Cell, now: number): void {
    const fromIndex = this.index(from);
    const toIndex = this.index(to);
    let fromX = this.px(from.col, from.row);
    let fromY = this.py(from.row);
    let hard = false;
    let t0 = now;
    if (this.mvT0[fromIndex] === this.mvT0[fromIndex]) {
      // Chain from wherever the tile is drawn right now.
      const p = this.moveProgress(fromIndex, now);
      const sx = this.mvFromX[fromIndex] ?? fromX;
      const sy = this.mvFromY[fromIndex] ?? fromY;
      fromX = sx + (fromX - sx) * p;
      fromY = sy + (fromY - sy) * p;
      hard = this.mvHard[fromIndex] === 1;
      t0 = Math.min(now, this.mvT0[fromIndex] ?? now);
      this.clearMove(fromIndex);
    }
    this.clearSquash(fromIndex);
    const timing = this.timing;
    const rowsFallen = Math.abs(this.py(to.row) - fromY) / (1.5 * Math.max(1, this.metrics.r));
    const dur = hard ? timing.hardDrop : Math.min(timing.fallMax, timing.fallBase + timing.fallPerRow * rowsFallen);
    this.setMove(toIndex, fromX, fromY, t0, dur, hard);
    const fall = this.skin.effects.fall;
    const land = this.skin.effects.land;
    this.setSquash(toIndex, t0 + dur, hard ? land.squash : fall.bounce, hard ? land.ms : fall.ms);
  }

  private startActivation(groups: readonly TileGroup[], chain: number, points: number, now: number): void {
    const still = this.options.reducedMotion;
    const timing = this.timing;
    const effects = this.skin.effects;
    this.activationGroups = groups;
    this.fadingLinks = [];
    this.linkFadeT0 = -1;
    this.activationEnd = still ? now : now + timing.activation;
    let sumX = 0;
    let sumY = 0;
    let n = 0;
    let top = Infinity;
    let firstColor: TileColor | null = null;
    for (const group of groups) {
      const count = group.cells.length;
      firstColor ??= group.color;
      for (let i = 0; i < count; i++) {
        const cell = group.cells[i];
        if (!cell) continue;
        const delay = still ? 0 : lightDelay(i, count, timing);
        this.litAt[this.index(cell)] = still ? now - timing.lightUp : now + delay;
        const x = this.px(cell.col, cell.row);
        const y = this.py(cell.row);
        sumX += x;
        sumY += y;
        n++;
        if (y < top) top = y;
        if (!still && effects.light.burst) this.fx.burst(effects.light.burst, x, y, group.color, delay + timing.lightUp * 0.5);
      }
    }
    if (n === 0) return;
    const r = this.metrics.r;
    if (effects.scorePop && points > 0) {
      const margin = r * 2;
      const x = Math.min(this.width - margin, Math.max(margin, sumX / n));
      const y = Math.max(r * 1.6, sumY / n - r * 0.4);
      this.fx.text(effects.scorePop, `+${this.options.formatNumber(points)}`, x, y, effects.scorePop.rise, now, false);
    }
    const banner = effects.chainBanner;
    if (banner && chain >= banner.minChain) {
      const y = Math.max(r * 2.2, Math.min(top - r * 2.4, this.height * 0.38));
      this.fx.text(banner, `×${chain}`, this.width / 2, y, 0, now, true);
      if (!still && banner.burst) this.fx.burst(banner.burst, this.width / 2, y, firstColor, 60);
    }
  }

  private startPops(cells: readonly ColoredCell[], now: number): void {
    const still = this.options.reducedMotion;
    const timing = this.timing;
    const burst = this.skin.effects.pop.burst;
    const count = cells.length;
    for (let i = 0; i < count; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const index = this.index(cell);
      this.litAt[index] = NaN;
      this.clearMove(index);
      this.clearSquash(index);
      if (this.pops >= this.popT0.length) continue;
      const delay = still || count <= 1 ? 0 : (i / (count - 1)) * timing.popStagger;
      const slot = this.pops++;
      const x = this.px(cell.col, cell.row);
      const y = this.py(cell.row);
      this.popX[slot] = x;
      this.popY[slot] = y;
      this.popT0[slot] = now + delay;
      this.popColor[slot] = COLOR_INDEX[cell.color];
      if (!still && burst) this.fx.burst(burst, x, y, cell.color, delay + timing.pop * 0.35);
    }
    if (!still && this.activationGroups.length > 0) {
      this.fadingLinks = this.activationGroups;
      this.linkFadeT0 = now;
    }
    this.activationGroups = [];
  }

  private startFlourish(): void {
    const flourish = this.skin.effects.stageFlourish;
    if (!flourish || this.options.reducedMotion) return;
    const rnd = this.fx.random;
    const n = Math.min(12, Math.max(0, Math.floor(flourish.bursts)));
    for (let i = 0; i < n; i++) {
      const x = this.width * (0.12 + 0.76 * rnd());
      const y = this.height * (0.12 + 0.6 * rnd());
      this.fx.burst(flourish.burst, x, y, null, (i / Math.max(1, n - 1)) * Math.min(600, flourish.ms));
    }
  }

  // --- Frame --------------------------------------------------------------------

  /** True while any effect still needs frames. */
  private animating(now: number): boolean {
    return (
      this.moving > 0 ||
      this.squashing > 0 ||
      this.pops > 0 ||
      this.fx.busy ||
      (this.stepT0 >= 0 && now - this.stepT0 < this.timing.step) ||
      (this.spawnT0 >= 0 && now - this.spawnT0 < this.timing.spawn) ||
      (this.activationGroups.length > 0 && now < this.activationEnd + 16) ||
      this.linkFadeT0 >= 0
    );
  }

  private signature(active: readonly ColoredCell[] | null): number {
    if (!active) return -1;
    let sig = active.length;
    for (let i = 0; i < active.length; i++) {
      const cell = active[i];
      if (cell) sig = (sig * 31 + cell.col * 64 + cell.row + 1) | 0;
    }
    return sig >>> 0;
  }

  /** Draw a frame if needed. Returns true when it drew. */
  render(view: GameView, now: number): boolean {
    const dt = this.lastNow < 0 ? 0 : Math.min(100, Math.max(0, now - this.lastNow));
    this.lastNow = now;
    this.fxNow = now;
    const sig = this.signature(view.active);
    if (sig !== this.activeSig) this.onActiveChanged(view.active, sig, now);
    if (!this.dirty && !this.animating(now)) return false;
    this.dirty = false;
    this.fx.step(dt);
    const t = performance.now();
    this.draw(view, now);
    this.lastDrawMs = performance.now() - t;
    return true;
  }

  private onActiveChanged(active: readonly ColoredCell[] | null, sig: number, now: number): void {
    this.dirty = true;
    this.activeSig = sig;
    const count = active ? Math.min(active.length, MAX_ACTIVE) : 0;
    const r = this.metrics.r;
    let ease = !this.teleport && !this.options.reducedMotion && count === this.activeCount && count > 0;
    if (ease && active) {
      for (let i = 0; i < count; i++) {
        const cell = active[i];
        if (!cell) continue;
        const dx = (this.visX[i] ?? 0) - this.px(cell.col, cell.row);
        const dy = (this.visY[i] ?? 0) - this.py(cell.row);
        // A jump of more than a few cells is not a step; do not smear it across the board.
        if (Math.abs(dx) > 3.6 * r || Math.abs(dy) > 3.6 * r) ease = false;
        this.offX[i] = dx;
        this.offY[i] = dy;
      }
    }
    this.stepT0 = ease ? now : -1;
    this.activeCount = count;
    this.teleport = false;
  }

  private computeHints(view: GameView): void {
    this.hint.fill(0);
    const groups = view.groups;
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group) continue;
      const size = group.cells.length;
      if (size < LINK_MIN_GROUP) continue;
      const level = size > LINK_MIN_GROUP ? 2 : 1;
      for (let c = 0; c < size; c++) {
        const cell = group.cells[c];
        if (cell) this.hint[this.index(cell)] = level;
      }
    }
  }

  private draw(view: GameView, now: number): void {
    const ctx = this.ctx;
    const sprites = this.sprites;
    const { cols, rows, r } = this.metrics;
    const dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!sprites || !this.bedLayer || r <= 0) return;
    ctx.drawImage(this.bedLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const still = this.options.reducedMotion;
    const timing = this.timing;
    const light = this.skin.effects.light;

    // Removed tiles go underneath, so tiles falling into their cells pass over them.
    this.drawPops(now);

    // Locked tiles, rows in the order the skin asks for.
    this.computeHints(view);
    const cells = view.cells;
    const topDown = this.skin.tile.rowOrder === 'topDown';
    const usableRows = Math.min(rows, Math.floor(cells.length / Math.max(1, cols)));
    for (let k = 0; k < usableRows; k++) {
      const row = topDown ? k : usableRows - 1 - k;
      const y0 = this.py(row);
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const color = cells[i];
        if (!color) continue;
        let x = this.px(col, row);
        let y = y0;
        let inMotion = false;
        const mv = this.mvT0[i] ?? NaN;
        if (mv === mv) {
          const p = this.moveProgress(i, now);
          if (p >= 1) {
            this.clearMove(i);
          } else {
            const fx = this.mvFromX[i] ?? x;
            const fy = this.mvFromY[i] ?? y;
            x = fx + (x - fx) * p;
            y = fy + (y - fy) * p;
            inMotion = true;
          }
        }
        let sy = 1;
        const sq = this.sqT0[i] ?? NaN;
        if (sq === sq) {
          const p = progress(now, sq, this.sqDur[i] ?? 0);
          if (p >= 1) this.clearSquash(i);
          else if (p > 0) sy = 1 + squashAt(p, this.sqAmp[i] ?? 0);
        }
        const hint = this.hint[i] ?? 0;
        const base: TileState = hint === 2 ? 'hint2' : hint === 1 ? 'hint1' : 'normal';
        const litStart = this.litAt[i] ?? NaN;
        if (litStart === litStart) {
          const lp = progress(now, litStart, timing.lightUp);
          if (lp <= 0) {
            sprites.draw(ctx, color, base, x, y);
          } else if (lp >= 1 || still) {
            sprites.draw(ctx, color, 'lit', x, y);
          } else {
            const scale = 1 + light.pulse * Math.sin(lp * Math.PI);
            sprites.drawCentered(ctx, color, base, x, y, scale);
            ctx.globalAlpha = lp;
            sprites.drawCentered(ctx, color, 'lit', x, y, scale);
            ctx.globalAlpha = 1;
          }
        } else if (sy !== 1) {
          // Volume is kept: what the tile loses in height it gains in width.
          sprites.drawScaled(ctx, color, base, x, y, 1 + (1 - sy) * 0.55, sy);
        } else if (inMotion) {
          sprites.drawScaled(ctx, color, base, x, y, 1, 1);
        } else {
          sprites.draw(ctx, color, base, x, y);
        }
      }
    }

    this.drawFormingLinks(view);
    this.drawEnergy(now);

    // Ghost, then the falling piece above everything it may pass.
    const active = view.active;
    const ghost = view.ghost;
    if (ghost && active && view.phase === 'falling') {
      for (let i = 0; i < ghost.length; i++) {
        const cell = ghost[i];
        if (!cell || this.covers(active, cell)) continue;
        sprites.draw(ctx, cell.color, 'ghost', this.px(cell.col, cell.row), this.py(cell.row));
      }
    }
    if (active) {
      const stepping = this.stepT0 >= 0;
      const k = stepping ? 1 - easeOutCubic(progress(now, this.stepT0, timing.step)) : 0;
      if (stepping && k <= 0) this.stepT0 = -1;
      const spawnP = this.spawnT0 >= 0 ? progress(now, this.spawnT0, timing.spawn) : 1;
      if (spawnP >= 1) this.spawnT0 = -1;
      ctx.globalAlpha = spawnP;
      const count = Math.min(active.length, MAX_ACTIVE);
      this.sortActive(active, count, topDown);
      for (let n = 0; n < count; n++) {
        const i = this.order[n] ?? 0;
        const cell = active[i];
        if (!cell) continue;
        const x = this.px(cell.col, cell.row) + (this.offX[i] ?? 0) * k;
        const y = this.py(cell.row) + (this.offY[i] ?? 0) * k;
        this.visX[i] = x;
        this.visY[i] = y;
        if (k > 0) sprites.drawScaled(ctx, cell.color, 'active', x, y, 1, 1);
        else sprites.draw(ctx, cell.color, 'active', x, y);
      }
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx, now, still);
  }

  /** Order the cells of the falling piece by row (insertion sort on at most 8 items). */
  private sortActive(active: readonly ColoredCell[], count: number, topDown: boolean): void {
    const order = this.order;
    for (let i = 0; i < count; i++) order[i] = i;
    for (let i = 1; i < count; i++) {
      const item = order[i] ?? 0;
      const row = active[item]?.row ?? 0;
      let j = i - 1;
      while (j >= 0) {
        const other = active[order[j] ?? 0]?.row ?? 0;
        if (topDown ? other <= row : other >= row) break;
        order[j + 1] = order[j] ?? 0;
        j--;
      }
      order[j + 1] = item;
    }
  }

  private covers(active: readonly ColoredCell[], cell: Cell): boolean {
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      if (a && a.col === cell.col && a.row === cell.row) return true;
    }
    return false;
  }

  private isBusy(cell: Cell): boolean {
    const i = this.index(cell);
    const mv = this.mvT0[i] ?? NaN;
    const lit = this.litAt[i] ?? NaN;
    return mv === mv || lit === lit;
  }

  /** Links through same-colour groups that are on their way to a path, painted by the skin. */
  private drawFormingLinks(view: GameView): void {
    const links = this.skin.links;
    if (!links) return;
    const ctx = this.ctx;
    const r = this.metrics.r;
    const env = this.env;
    const groups = view.groups;
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group || group.cells.length < LINK_MIN_GROUP) continue;
      const level = group.cells.length > LINK_MIN_GROUP ? 2 : 1;
      for (let l = 0; l < group.links.length; l++) {
        const link = group.links[l];
        if (!link) continue;
        const a = link[0];
        const b = link[1];
        if (this.isBusy(a) || this.isBusy(b)) continue;
        links.paintLink(ctx, this.px(a.col, a.row), this.py(a.row), this.px(b.col, b.row), this.py(b.row), r, level, env);
      }
      if (links.paintNode) {
        for (let c = 0; c < group.cells.length; c++) {
          const cell = group.cells[c];
          if (!cell || this.isBusy(cell)) continue;
          links.paintNode(ctx, this.px(cell.col, cell.row), this.py(cell.row), r, level, env);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Light runs along the links from tile to tile while a path is lit. */
  private drawEnergy(now: number): void {
    const effects = this.skin.effects;
    const energy = effects.light.energy;
    const custom = effects.paintEnergy;
    if (!energy && !custom) {
      if (this.linkFadeT0 >= 0) this.linkFadeT0 = -1;
      return;
    }
    const ctx = this.ctx;
    const r = this.metrics.r;
    const timing = this.timing;
    let groups = this.activationGroups;
    let alpha = energy ? energy.alpha : 1;
    if (groups.length === 0) {
      if (this.linkFadeT0 < 0) return;
      const fade = progress(now, this.linkFadeT0, Math.max(1, timing.pop * 0.6));
      if (fade >= 1) {
        this.linkFadeT0 = -1;
        this.fadingLinks = [];
        return;
      }
      groups = this.fadingLinks;
      alpha *= 1 - fade;
    }
    ctx.globalAlpha = alpha;
    if (!custom && energy) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = energy.color;
      ctx.lineWidth = Math.max(1.5, r * energy.width);
      ctx.beginPath();
    }
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group) continue;
      for (let l = 0; l < group.links.length; l++) {
        const link = group.links[l];
        if (!link) continue;
        const a = link[0];
        const b = link[1];
        const ta = this.litAt[this.index(a)] ?? NaN;
        const tb = this.litAt[this.index(b)] ?? NaN;
        let p = 1;
        if (ta === ta && tb === tb) p = clamp01((now - ta) / Math.max(1, tb + timing.lightUp * 0.5 - ta));
        if (p <= 0) continue;
        const ax = this.px(a.col, a.row);
        const ay = this.py(a.row);
        const bx = this.px(b.col, b.row);
        const by = this.py(b.row);
        if (custom) {
          custom(ctx, ax, ay, bx, by, p, r);
        } else {
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - ax) * p, ay + (by - ay) * p);
        }
      }
    }
    if (!custom && energy) ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Removed tiles pop: a quick swell, then gone. Under reduced motion: a short fade. */
  private drawPops(now: number): void {
    const sprites = this.sprites;
    if (!sprites || this.pops === 0) return;
    const ctx = this.ctx;
    const still = this.options.reducedMotion;
    const dur = still ? REDUCED_FADE_MS : Math.max(1, this.timing.pop);
    const peak = Math.min(1.6, Math.max(1, this.skin.effects.pop.scale));
    let write = 0;
    for (let i = 0; i < this.pops; i++) {
      const t0 = this.popT0[i] ?? 0;
      const p = (now - t0) / dur;
      if (p >= 1) continue;
      const x = this.popX[i] ?? 0;
      const y = this.popY[i] ?? 0;
      const color = COLOR_OF[this.popColor[i] ?? 0] ?? 'teal';
      if (p <= 0) {
        sprites.draw(ctx, color, 'lit', x, y);
      } else if (still) {
        ctx.globalAlpha = 1 - p;
        sprites.draw(ctx, color, 'lit', x, y);
      } else {
        // Swell to the peak in the first 40%, then shrink and fade.
        const swell = p < 0.4 ? p / 0.4 : 1;
        const out = p < 0.4 ? 0 : (p - 0.4) / 0.6;
        const scale = (1 + (peak - 1) * easeOutCubic(swell)) * (1 - 0.55 * out * out);
        ctx.globalAlpha = 1 - out;
        sprites.drawCentered(ctx, color, 'lit', x, y, scale);
      }
      if (write !== i) {
        this.popX[write] = x;
        this.popY[write] = y;
        this.popT0[write] = t0;
        this.popColor[write] = this.popColor[i] ?? 0;
      }
      write++;
    }
    this.pops = write;
    ctx.globalAlpha = 1;
  }

  /** For skins' effect previews and tests: throw a burst directly. */
  debugBurst(spec: BurstSpec, x: number, y: number, tile: TileColor | null): void {
    this.fx.burst(spec, x, y, tile, 0);
    this.dirty = true;
  }

  /** For tests: show a text directly. */
  debugText(spec: TextSpec, text: string, x: number, y: number, banner: boolean): void {
    this.fx.text(spec, text, x, y, 0, this.fxNow, banner);
    this.dirty = true;
  }
}
