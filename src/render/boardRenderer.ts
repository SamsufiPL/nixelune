/**
 * Canvas renderer of the board. It reads a `GameView`, receives the drained
 * `GameEvent`s and turns them into short presentation effects. All easing, lighting
 * and dispersal lives here; the simulation knows nothing about it.
 *
 * Layers: the empty grid is cached in an offscreen canvas, tiles are sprites, and a
 * frame is drawn only when the view changed or an effect is still running.
 */
import type { Cell, ColoredCell, GameEvent, GameView, TileColor, TileGroup } from '../game/types';
import { clamp01, easeInQuad, easeOutCubic, progress } from './easing';
import { cellX, cellY, fitBoard, type BoardMetrics } from './hex';
import { TEAL, TEXT } from './palette';
import { drawEmptyCell, drawGhost, TileSprites, type TileStyle } from './tile';

export interface RenderOptions extends TileStyle {
  readonly reducedMotion: boolean;
}

/** Board padding around the grid, in hex radii. Shared with the CSS frame ratio. */
export const BOARD_PAD = 0.62;
/** Device pixel ratio is capped: beyond this the eye gains nothing and fill cost grows. */
export const MAX_DPR = 2.5;

/** Durations in ms. The activation total stays inside the kit's 200-260 ms window. */
export const TIMING = {
  step: 70,
  spawn: 110,
  hardDrop: 80,
  settleBase: 110,
  settlePerRow: 24,
  settleMax: 200,
  activation: 240,
  lightUp: 70,
  disperse: 150,
  disperseStagger: 60,
} as const;

/** Forming paths are drawn from this group size up, so pairs do not clutter the board. */
export const LINK_MIN_GROUP = 3;

/** With tile marks on, a link starts this fraction of the way between two tile centres. */
export const LINK_BRIDGE_INSET = 0.3;

const MAX_ACTIVE = 8;

interface TileAnim {
  fromX: number;
  fromY: number;
  t0: number;
  dur: number;
  hard: boolean;
}

interface Dispersal {
  x: number;
  y: number;
  color: TileColor;
  t0: number;
}

export function cappedDpr(deviceDpr: number): number {
  if (!(deviceDpr > 0)) return 1;
  return Math.min(MAX_DPR, Math.max(1, deviceDpr));
}

/** Light-up delay of the i-th of n tiles so the last one is fully lit at TIMING.activation. */
export function lightDelay(index: number, count: number): number {
  if (count <= 1) return 0;
  return (index / (count - 1)) * (TIMING.activation - TIMING.lightUp);
}

export class BoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private options: RenderOptions;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private metrics: BoardMetrics = { r: 0, originX: 0, originY: 0, cols: 0, rows: 0 };
  private gridLayer: HTMLCanvasElement | null = null;
  private sprites: TileSprites | null = null;
  private dirty = true;

  // Effects.
  private readonly tileAnims = new Map<number, TileAnim>();
  private readonly dispersals: Dispersal[] = [];
  /** Time each cell starts to light up; NaN when not lit. Indexed like `view.cells`. */
  private litAt = new Float64Array(0);
  private activationGroups: readonly TileGroup[] = [];
  private activationEnd = 0;
  private linkFadeT0 = -1;
  private fadingLinks: readonly TileGroup[] = [];

  // Active piece easing.
  private activeSig = -1;
  private activeCount = 0;
  private readonly visX = new Float64Array(MAX_ACTIVE);
  private readonly visY = new Float64Array(MAX_ACTIVE);
  private readonly offX = new Float64Array(MAX_ACTIVE);
  private readonly offY = new Float64Array(MAX_ACTIVE);
  private stepT0 = -1;
  private spawnT0 = -1;
  private teleport = true;

  constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.canvas = canvas;
    this.ctx = ctx;
    this.options = options;
  }

  get boardMetrics(): BoardMetrics {
    return this.metrics;
  }

  setOptions(options: RenderOptions): void {
    const rebuild =
      options.marks !== this.options.marks || options.highContrast !== this.options.highContrast;
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
    this.metrics = fitBoard(cssWidth, cssHeight, cols, rows, BOARD_PAD);
    if (this.litAt.length !== cols * rows) {
      this.litAt = new Float64Array(cols * rows).fill(NaN);
    }
    // Pixel positions held by running effects are stale after a resize.
    this.clearEffects();
    this.rebuildLayers();
    this.dirty = true;
  }

  invalidate(): void {
    this.dirty = true;
  }

  /** Drop every running effect, e.g. when a new run starts on the same canvas. */
  clearEffects(): void {
    this.tileAnims.clear();
    this.dispersals.length = 0;
    this.litAt.fill(NaN);
    this.activationGroups = [];
    this.fadingLinks = [];
    this.linkFadeT0 = -1;
    this.stepT0 = -1;
    this.spawnT0 = -1;
    this.teleport = true;
    this.dirty = true;
  }

  private rebuildLayers(): void {
    const { r, cols, rows } = this.metrics;
    if (r <= 0 || this.width <= 0) {
      this.gridLayer = null;
      this.sprites = null;
      return;
    }
    const doc = this.canvas.ownerDocument;
    this.sprites = new TileSprites(r, this.dpr, this.options, doc);
    const layer = doc.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const g = layer.getContext('2d');
    if (g) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          drawEmptyCell(g, this.px(col, row), this.py(row), r, this.options.highContrast);
        }
      }
    }
    this.gridLayer = layer;
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

  /** Feed the events drained this frame. `now` is the presentation clock in ms. */
  handleEvents(events: readonly GameEvent[], now: number): void {
    if (events.length === 0) return;
    this.dirty = true;
    const still = this.options.reducedMotion;
    for (const event of events) {
      switch (event.type) {
        case 'spawned':
        case 'swapped':
          this.teleport = true;
          if (!still) this.spawnT0 = now;
          break;
        case 'locked':
          if (!still && event.hard) this.startDrop(event.cells, now);
          this.teleport = true;
          break;
        case 'settled':
          if (!still) {
            for (const move of event.moves) this.startSettle(move.from, move.to, now);
          } else {
            this.tileAnims.clear();
          }
          break;
        case 'activated':
          this.startActivation(event.groups, now);
          break;
        case 'removed':
          this.startDispersal(event.cells, now);
          break;
        case 'stageStarted':
          this.tileAnims.clear();
          break;
        default:
          break;
      }
    }
  }

  private startDrop(cells: readonly ColoredCell[], now: number): void {
    // The locked tiles travel from where the piece was last drawn.
    if (cells.length !== this.activeCount) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const fromX = this.visX[i] ?? 0;
      const fromY = this.visY[i] ?? 0;
      if (Math.abs(fromY - this.py(cell.row)) < 0.5 && Math.abs(fromX - this.px(cell.col, cell.row)) < 0.5) continue;
      this.tileAnims.set(this.index(cell), { fromX, fromY, t0: now, dur: TIMING.hardDrop, hard: true });
    }
  }

  private startSettle(from: Cell, to: Cell, now: number): void {
    const fromIndex = this.index(from);
    const running = this.tileAnims.get(fromIndex);
    let fromX = this.px(from.col, from.row);
    let fromY = this.py(from.row);
    let hard = false;
    if (running) {
      // Chain from wherever the tile is drawn right now.
      const p = this.animProgress(running, now);
      fromX = running.fromX + (fromX - running.fromX) * p;
      fromY = running.fromY + (fromY - running.fromY) * p;
      hard = running.hard;
      this.tileAnims.delete(fromIndex);
    }
    const rowsFallen = Math.abs(this.py(to.row) - fromY) / (1.5 * Math.max(1, this.metrics.r));
    const dur = hard
      ? TIMING.hardDrop
      : Math.min(TIMING.settleMax, TIMING.settleBase + TIMING.settlePerRow * rowsFallen);
    this.tileAnims.set(this.index(to), { fromX, fromY, t0: now, dur, hard });
  }

  private animProgress(anim: TileAnim, now: number): number {
    const p = progress(now, anim.t0, anim.dur);
    return anim.hard ? easeInQuad(p) : easeOutCubic(p);
  }

  private startActivation(groups: readonly TileGroup[], now: number): void {
    const still = this.options.reducedMotion;
    this.activationGroups = groups;
    this.fadingLinks = [];
    this.linkFadeT0 = -1;
    this.activationEnd = still ? now : now + TIMING.activation;
    for (const group of groups) {
      const count = group.cells.length;
      for (let i = 0; i < count; i++) {
        const cell = group.cells[i];
        if (!cell) continue;
        this.litAt[this.index(cell)] = still ? now - TIMING.lightUp : now + lightDelay(i, count);
      }
    }
  }

  private startDispersal(cells: readonly ColoredCell[], now: number): void {
    const still = this.options.reducedMotion;
    const count = cells.length;
    for (let i = 0; i < count; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const index = this.index(cell);
      this.litAt[index] = NaN;
      this.tileAnims.delete(index);
      if (still) continue;
      this.dispersals.push({
        x: this.px(cell.col, cell.row),
        y: this.py(cell.row),
        color: cell.color,
        t0: now + (count > 1 ? (i / (count - 1)) * TIMING.disperseStagger : 0),
      });
    }
    if (!still && this.activationGroups.length > 0) {
      this.fadingLinks = this.activationGroups;
      this.linkFadeT0 = now;
    }
    this.activationGroups = [];
  }

  /** True while any effect still needs frames. */
  private animating(now: number): boolean {
    return (
      this.tileAnims.size > 0 ||
      this.dispersals.length > 0 ||
      (this.stepT0 >= 0 && now - this.stepT0 < TIMING.step) ||
      (this.spawnT0 >= 0 && now - this.spawnT0 < TIMING.spawn) ||
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
    const sig = this.signature(view.active);
    if (sig !== this.activeSig) this.onActiveChanged(view.active, sig, now);
    if (!this.dirty && !this.animating(now)) return false;
    this.dirty = false;
    this.draw(view, now);
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

  private draw(view: GameView, now: number): void {
    const ctx = this.ctx;
    const sprites = this.sprites;
    const { cols, rows, r } = this.metrics;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!sprites || !this.gridLayer || r <= 0) return;
    ctx.drawImage(this.gridLayer, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Fading tiles go underneath, so tiles settling into their cells pass over them.
    this.drawDispersals(now);

    // Locked tiles.
    const cells = view.cells;
    const total = Math.min(cells.length, cols * rows);
    for (let i = 0; i < total; i++) {
      const color = cells[i];
      if (!color) continue;
      const col = i % cols;
      const row = (i - col) / cols;
      let x = this.px(col, row);
      let y = this.py(row);
      const anim = this.tileAnims.get(i);
      const moving = anim !== undefined;
      if (anim) {
        const p = this.animProgress(anim, now);
        if (p >= 1) {
          this.tileAnims.delete(i);
        } else {
          x = anim.fromX + (x - anim.fromX) * p;
          y = anim.fromY + (y - anim.fromY) * p;
        }
      }
      const litStart = this.litAt[i];
      if (litStart !== undefined && litStart === litStart) {
        const lp = progress(now, litStart, TIMING.lightUp);
        if (lp <= 0) {
          sprites.draw(ctx, color, 'locked', x, y, 1, !moving);
        } else if (lp >= 1) {
          sprites.draw(ctx, color, 'lit', x, y);
        } else {
          sprites.draw(ctx, color, 'locked', x, y);
          ctx.globalAlpha = lp;
          sprites.draw(ctx, color, 'lit', x, y);
          ctx.globalAlpha = 1;
        }
      } else {
        sprites.draw(ctx, color, 'locked', x, y, 1, !moving);
      }
    }

    this.drawFormingLinks(view);
    this.drawEnergy(now);

    // Ghost, then the active piece above everything it may pass.
    const active = view.active;
    const ghost = view.ghost;
    if (ghost && active && view.phase === 'falling') {
      for (let i = 0; i < ghost.length; i++) {
        const cell = ghost[i];
        if (!cell || this.covers(active, cell)) continue;
        drawGhost(ctx, this.px(cell.col, cell.row), this.py(cell.row), r, this.options.highContrast);
      }
    }
    if (active) {
      const stepping = this.stepT0 >= 0;
      const k = stepping ? 1 - easeOutCubic(progress(now, this.stepT0, TIMING.step)) : 0;
      if (stepping && k <= 0) this.stepT0 = -1;
      const spawnP = this.spawnT0 >= 0 ? progress(now, this.spawnT0, TIMING.spawn) : 1;
      if (spawnP >= 1) this.spawnT0 = -1;
      ctx.globalAlpha = spawnP;
      const count = Math.min(active.length, MAX_ACTIVE);
      for (let i = 0; i < count; i++) {
        const cell = active[i];
        if (!cell) continue;
        const x = this.px(cell.col, cell.row) + (this.offX[i] ?? 0) * k;
        const y = this.py(cell.row) + (this.offY[i] ?? 0) * k;
        this.visX[i] = x;
        this.visY[i] = y;
        sprites.draw(ctx, cell.color, 'active', x, y, 1, k <= 0);
      }
      ctx.globalAlpha = 1;
    }
  }

  private covers(active: readonly ColoredCell[], cell: Cell): boolean {
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      if (a && a.col === cell.col && a.row === cell.row) return true;
    }
    return false;
  }

  /**
   * Quiet teal links through same-colour groups that are on their way to a path.
   * Without tile marks they are drawn as in the mockup: a line through the tile
   * centres with small node dots. With marks on, the mark is the node, so the link
   * is only a short bridge across the joint between two tiles and never overprints it.
   */
  private drawFormingLinks(view: GameView): void {
    const ctx = this.ctx;
    const r = this.metrics.r;
    const strong = this.options.highContrast;
    const bridges = this.options.marks;
    const inset = bridges ? LINK_BRIDGE_INSET : 0;
    const groups = view.groups;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group || group.cells.length < LINK_MIN_GROUP) continue;
      const first = group.cells[0];
      if (first && this.isLit(first)) continue;
      // One short of a path reads a little stronger than a group of three.
      const near = group.cells.length > LINK_MIN_GROUP;
      ctx.globalAlpha = strong ? 1 : near ? 0.9 : 0.6;
      ctx.strokeStyle = strong ? TEXT : TEAL;
      ctx.lineWidth = Math.max(1.25, r * (strong ? 0.13 : bridges ? 0.11 : 0.1));
      ctx.beginPath();
      for (let l = 0; l < group.links.length; l++) {
        const link = group.links[l];
        if (!link) continue;
        const a = link[0];
        const b = link[1];
        if (this.tileAnims.has(this.index(a)) || this.tileAnims.has(this.index(b))) continue;
        const ax = this.px(a.col, a.row);
        const ay = this.py(a.row);
        const dx = this.px(b.col, b.row) - ax;
        const dy = this.py(b.row) - ay;
        ctx.moveTo(ax + dx * inset, ay + dy * inset);
        ctx.lineTo(ax + dx * (1 - inset), ay + dy * (1 - inset));
      }
      ctx.stroke();
      if (!bridges && (near || strong)) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = TEXT;
        ctx.beginPath();
        for (let c = 0; c < group.cells.length; c++) {
          const cell = group.cells[c];
          if (!cell || this.tileAnims.has(this.index(cell))) continue;
          const x = this.px(cell.col, cell.row);
          const y = this.py(cell.row);
          ctx.moveTo(x + r * 0.098, y);
          ctx.arc(x, y, r * 0.098, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private isLit(cell: Cell): boolean {
    const t = this.litAt[this.index(cell)];
    return t !== undefined && t === t;
  }

  /** The signature moment: light runs along the links from tile to tile. */
  private drawEnergy(now: number): void {
    const ctx = this.ctx;
    const r = this.metrics.r;
    let groups = this.activationGroups;
    let alpha = 0.92;
    if (groups.length === 0) {
      if (this.linkFadeT0 < 0) return;
      const fade = progress(now, this.linkFadeT0, TIMING.disperse * 0.6);
      if (fade >= 1) {
        this.linkFadeT0 = -1;
        this.fadingLinks = [];
        return;
      }
      groups = this.fadingLinks;
      alpha *= 1 - fade;
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group) continue;
      for (let l = 0; l < group.links.length; l++) {
        const link = group.links[l];
        if (!link) continue;
        const a = link[0];
        const b = link[1];
        const ta = this.litAt[this.index(a)];
        const tb = this.litAt[this.index(b)];
        let p = 1;
        if (ta !== undefined && tb !== undefined && ta === ta && tb === tb) {
          const span = Math.max(1, tb + TIMING.lightUp * 0.5 - ta);
          p = clamp01((now - ta) / span);
        }
        if (p <= 0) continue;
        const ax = this.px(a.col, a.row);
        const ay = this.py(a.row);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (this.px(b.col, b.row) - ax) * p, ay + (this.py(b.row) - ay) * p);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Removed tiles fade and draw in slightly. No particles, no flash. */
  private drawDispersals(now: number): void {
    const sprites = this.sprites;
    if (!sprites) return;
    const ctx = this.ctx;
    const list = this.dispersals;
    let write = 0;
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      if (!d) continue;
      const p = progress(now, d.t0, TIMING.disperse);
      if (p >= 1) continue;
      const e = easeOutCubic(p);
      ctx.globalAlpha = 1 - e;
      sprites.draw(ctx, d.color, 'lit', d.x, d.y, 1 - 0.16 * e);
      list[write++] = d;
    }
    list.length = write;
    ctx.globalAlpha = 1;
  }
}
