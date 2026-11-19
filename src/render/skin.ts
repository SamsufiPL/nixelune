/**
 * SKIN CONTRACT - read this whole comment before writing a skin.
 *
 * A skin is everything the player sees: how a tile is painted, the board bed, the
 * world behind the screen, the effects, and the look of the interface. The engine
 * (src/render/boardRenderer.ts, fx.ts, sprites.ts and src/ui) owns timing, pooling,
 * caching, layout, input, accessibility and budgets. A skin supplies painters and data.
 *
 * ---------------------------------------------------------------------------------
 * 1. FILES OF A SKIN
 * ---------------------------------------------------------------------------------
 *   src/render/skins/<id>/index.ts    default-exports a `Skin` (use `defineSkin`)
 *   src/render/skins/<id>/*.ts        anything else the skin needs (painters, data)
 *   src/ui/themes/<id>.css            interface theme, every rule under
 *                                     `[data-skin="<id>"]`; imported by index.ts
 *   src/assets/<id>/**                fonts or vector assets with a recorded licence
 *   tests/render/skins/<id>.test.ts   optional tests of the skin's pure parts
 *
 * The ONLY shared file a skin author edits is src/render/skins/index.ts: one line in
 * `SKINS`. Do not edit src/render/*.ts, src/ui/styles/*.css, the catalogues or any
 * other skin. If the contract cannot express what you need, say so in your report
 * instead of patching the engine. `<id>` matches /^[a-z][a-z0-9-]{0,31}$/.
 *
 *   // src/render/skins/index.ts
 *   mine: { name: { pl: 'Moja', en: 'Mine' }, load: () => import('./mine/index') },
 *
 *   // src/render/skins/mine/index.ts
 *   import '../../../ui/themes/mine.css';
 *   import { defineSkin } from '../../skin';
 *   export default defineSkin({ id: 'mine', ... });
 *
 * The module (and with it the CSS and any fonts the CSS declares) is loaded only when
 * the skin is first selected. Declare fonts with @font-face inside the theme CSS;
 * the browser fetches a font only when a rule that is in effect uses it. Fonts must
 * be bundled files (no network) with their licence added to docs/licences.md.
 *
 * ---------------------------------------------------------------------------------
 * 2. PREVIEW
 * ---------------------------------------------------------------------------------
 *   npm run dev                         then open  http://localhost:5173/?skin=<id>
 *   ?skin=<id>&fps=1                    adds a frame-time read-out on the game screen
 *   Settings -> "Wygląd / Look" and the switcher on the menu change skins live.
 *   In dev, `window.__nx` exposes { app, services, skins } for scripts.
 * Check at 360x800 (phone), 320x568 (small phone) and 1600x900 (desktop), with tile
 * marks on and off, high contrast on, and reduced motion on (Settings).
 *
 * ---------------------------------------------------------------------------------
 * 3. COORDINATES AND UNITS
 * ---------------------------------------------------------------------------------
 * Painters draw in CSS pixels; the engine has already applied the device pixel ratio
 * to the context. `r` is the hex radius of a board cell (centre to corner) in CSS px:
 * about 11-14 on a small phone, 18-22 on a phone, 28-40 on tablet and desktop. Cells
 * are pointy-top hexagons: width sqrt(3)*r, height 2r, neighbours sqrt(3)*r apart,
 * rows 1.5r apart. Sizes in effect data are in units of `r` so they scale with the
 * board. Times are milliseconds.
 *
 * ---------------------------------------------------------------------------------
 * 4. TILES (`Skin.tile`)
 * ---------------------------------------------------------------------------------
 * `tile.paint(p)` paints ONE tile centred on (p.cx, p.cy) for a state:
 *   normal   a locked tile
 *   hint1    a locked tile in a same-colour group of 3 (path forming)
 *   hint2    a locked tile in a group of 4 (one short of a path)
 *   active   a tile of the falling piece
 *   ghost    the landing preview of a falling tile (must leave the cell readable)
 *   lit      a tile of an activated path, at full light
 * The engine calls it once per colour, state and size, keeps the result as a sprite
 * and draws sprites with drawImage. So paint as richly as you like: many gradients,
 * highlights, inner shadows, facets. It costs nothing per frame. It must be a pure
 * function of `p`: no time, no randomness, no state. Lit-up is a cross-fade from the
 * normal sprite to the `lit` sprite; squash, bounce and pop are transforms of sprites.
 *
 * A sprite may be larger than its cell: `tile.overflow` says how far paint may reach
 * beyond the box of half-width r and half-height r around the centre, in units of r
 * (`x` on each side, `top`, `bottom`). Anything painted outside that is cut off. Use
 * it for thickness below the tile and for drop shadows; keep it as small as it can
 * be (sprite area is memory and fill cost). `tile.rowOrder` gives the paint order of
 * rows so overlaps come out right: 'topDown' paints upper rows first (a tile's
 * thickness or shadow is covered by the row below: the usual choice), 'bottomUp'
 * the reverse. Within a row tiles are painted left to right. The falling piece is
 * painted after all locked tiles, its own cells in the same row order.
 *
 * Never colour alone: every colour must also differ by a mark or by silhouette, in
 * every state including `ghost` at r = 11. `p.marks` is the player's "tile marks"
 * setting; with it off the skin may drop engraved marks only if silhouettes still
 * differ. `p.highContrast` asks for stronger outlines and marks. Describe the marks
 * in `meta.marks` (shape id and a name in both languages, used by the screen reader
 * summary).
 *
 * Two-colour pieces exist from stage 3: every cell of the falling piece, the ghost,
 * the next and the held piece has its own colour, and the engine paints each cell
 * with its own sprite. Do not assume a piece has one colour.
 *
 * ---------------------------------------------------------------------------------
 * 5. BOARD BED AND FORMING LINKS (`Skin.bed`, `Skin.links`)
 * ---------------------------------------------------------------------------------
 * `bed.paint(b)` paints the empty board once per size into a cached layer: sockets
 * for all cells (b.cellX / b.cellY give centres), any inner surface or pattern. The
 * outer frame is DOM (.board-frame, styled by the theme CSS); the canvas fills its
 * inside. `bed.pad` is the space kept around the grid in units of r (0.4-1.2); it is
 * also where tile overflow of the edge cells lands.
 *
 * `links` draws the connection between neighbouring tiles of a forming group (3 or 4
 * same-colour tiles), every frame that is redrawn, so keep `paintLink` to one or two
 * strokes with flat colours: no gradients, no shadows, no allocation. Set `links` to
 * null if the hint states of the tiles say enough.
 *
 * ---------------------------------------------------------------------------------
 * 6. BACKDROP (`Skin.backdrop`) - the world behind the whole screen
 * ---------------------------------------------------------------------------------
 * Either
 *   { kind: 'canvas', paint, ambient? }   `paint` draws the static scene once per
 *       size into a full-screen canvas (CSS px, DPR capped at 2). `ambient.paint`
 *       draws slow moving details on a transparent canvas above it at `ambient.fps`
 *       (1-30); the engine clears the canvas before each call, passes elapsed time,
 *       and does not call it under reduced motion, in high contrast or while the app
 *       is hidden. Ambient paint must not allocate: precompute positions and sprites
 *       in module scope or on first call. Budget: under 1.5 ms on a mid phone.
 *   { kind: 'dom', create, destroy? }     build an element (HTML or inline SVG) that
 *       fills the screen; animate it with CSS if you like, and honour
 *       `:root[data-motion="reduced"]` yourself (the shared CSS already cuts all
 *       animation and transition durations there).
 * The backdrop is behind every screen, menu included. It must not compete with the
 * board: keep contrast and detail low where the board and HUD sit.
 *
 * ---------------------------------------------------------------------------------
 * 7. EFFECTS (`Skin.effects`)
 * ---------------------------------------------------------------------------------
 * The engine turns game events into motion with one pooled particle system, per-cell
 * tweens and pooled text sprites. The skin tunes it with data and may add painters.
 *
 *   event            engine does                              skin data
 *   spawned/swapped  piece fades in                           timing.spawn
 *   moved/rotated    piece eases to the new cells             timing.step (<= 80)
 *   locked           squash-and-settle of the landed tiles,   land.squash, land.ms,
 *                    optional dust burst under them           land.dust
 *   locked (hard)    tiles travel from the piece to the cells timing.hardDrop (<= 80)
 *   settled          tiles fall with easing, then a small     timing.fall*, fall.bounce
 *                    bounce on arrival
 *   activated        tiles light up one after another along   timing.lightUp,
 *                    group.cells; light runs along the links; light.pulse, light.burst,
 *                    a score pop-up flies from the path; from light.energy, scorePop,
 *                    chain 2 a banner "x2", "x3" ...          chainBanner
 *   removed          each tile pops (scale up, vanish) and    pop.scale, timing.pop,
 *                    throws particles                         timing.popStagger, pop.burst
 *   stageCompleted   bursts across the board                  stageFlourish
 *
 * Timing against the simulation: tiles are lit for 250 ms, then removed, then the
 * rest falls. The engine fits the light-up sequence into `timing.activation`
 * (clamped to 250). Pops, particles, pop-ups and the banner are purely visual and
 * may outlive their event; the engine clamps every particle life to 900 ms, pop to
 * 400 ms, pop-ups to 1000 ms and the banner to 1200 ms. Nothing ever blocks input.
 *
 * Budgets the engine enforces, whatever the data says:
 *   - at most MAX_PARTICLES (256) live particles; a burst that does not fit is cut;
 *   - at most 24 particles per burst;
 *   - no allocation per frame in steady state (pools are fixed at start-up);
 *   - under reduced motion: no particles, no squash, bounce, pulse or travel; tiles
 *     light at once, removed tiles fade in place, pop-up and banner only fade.
 * Particles are drawn from sprites too: `paintParticle(ctx, shape, color, size)` is
 * called once per shape and colour; built-in shapes are 'dot', 'spark', 'shard',
 * 'ring' and 'star'. `particleColors(tile)` must return the same array object every
 * time for the same argument (declare the arrays as constants).
 *
 * `onEvent(event, fx, board)` is the escape hatch: it runs after the engine's own
 * handling of each event and may add bursts or text through `fx`. It runs at event
 * time, not per frame; still, do not allocate more than a few small objects in it.
 * Visual randomness comes from `fx.random()` (seeded, separate from gameplay); never
 * use Math.random in a skin and never read anything but the event and `board`.
 *
 * Effects serve the game state and never hide the board: after a pop the cells must
 * read as empty at once, the falling piece and its ghost stay on top of everything
 * but particles and text, and nothing flashes the whole screen.
 *
 * ---------------------------------------------------------------------------------
 * 8. INTERFACE THEME (`src/ui/themes/<id>.css`, `Skin.ui`)
 * ---------------------------------------------------------------------------------
 * Layout and structure are shared (src/ui/styles). A theme overrides the custom
 * properties listed in src/ui/styles/tokens.css on `[data-skin="<id>"]` (colours,
 * fonts, radii, shadows, button construction, panel and frame surfaces, entrance
 * motion) and may restyle any component with selectors that start with
 * `[data-skin="<id>"]`. It may add pseudo-elements (::before / ::after) to .btn,
 * .act__disc, .panel, .board-frame, .game__goal for bevels and gloss. It must not
 * change layout-critical properties of the game grid (grid areas, the board slot,
 * safe-area padding) and must keep: touch targets >= 48 px, a visible
 * :focus-visible ring, text in rem, contrast of text against its surface >= 4.5:1.
 * `:root[data-contrast="more"]` and `:root[data-motion="reduced"]` are set by the app;
 * give high contrast stronger text and lines.
 *
 * `ui.themeColor` colours the browser / system bar. `ui.decorate(root, screen)` is
 * called after a screen is built and whenever it is rebuilt; it may add decorative,
 * aria-hidden nodes and returns nothing. `ui.menuArt()` returns the picture between
 * the promise line and the buttons of the menu, or null.
 *
 * ---------------------------------------------------------------------------------
 * 9. PERFORMANCE RULES
 * ---------------------------------------------------------------------------------
 *   - Everything rich goes into sprites or cached layers (tile.paint, bed.paint,
 *     backdrop.paint, paintParticle). Per-frame painters (links.paintLink,
 *     effects.paintEnergy, backdrop.ambient.paint) use flat fills and strokes only.
 *   - No shadowBlur, no filter, no getImageData anywhere per frame; in sprite
 *     painters they are allowed.
 *   - No allocation in per-frame painters: no arrays, objects, closures or strings.
 *   - No CSS filter / backdrop-filter on anything that overlaps the board; no CSS
 *     animation running during play except on elements that change (score, chain).
 *   - Target: with a 3-chain in progress and 4x CPU throttling (Chromium, dev
 *     build), the board draw stays under 2 ms at p95 and 5 ms at worst, and at
 *     least 93% of frames arrive within 20 ms. Reference, measured that way at
 *     360x800 @2x: `kit` draw p50 0.3 / p95 1.2 / max 1.7 ms; `demo` (152 live
 *     particles) draw p50 0.9 / p95 1.8 / max 4.9 ms. Watch your own with ?fps=1.
 *
 * ---------------------------------------------------------------------------------
 * 10. CHECKLIST BEFORE HANDING OVER
 * ---------------------------------------------------------------------------------
 *   [ ] one line added to src/render/skins/index.ts, nothing else shared edited
 *   [ ] all six tile states painted for all five colours; ghost readable at r = 11
 *   [ ] colours differ by mark or silhouette, marks named in meta.marks (pl + en)
 *   [ ] two-colour pieces look right falling, as ghost, in next and held previews
 *   [ ] overflow and rowOrder checked on a full board (no clipped thickness/shadow)
 *   [ ] bed and backdrop readable behind HUD at 320x568, 360x800 and 1600x900
 *   [ ] every effect seen in play: land, fall, light-up, pop, score pop-up, chain
 *       banner (make a 2-chain), stage complete
 *   [ ] reduced motion: no particles or travel; high contrast: stronger outlines
 *   [ ] theme: menu, game, pause, stage, results, challenges, settings, about
 *   [ ] buttons have hover, pressed (with travel), disabled and focus-visible states
 *   [ ] fonts bundled, loaded only by this theme, licence recorded
 *   [ ] ?fps=1 during a chain: no frame over budget; no console errors
 *   [ ] `npm run typecheck`, `npm test`, `npm run build` pass
 */
import type { GameEvent, TileColor } from '../game/types';
import type { LanguageCode } from '../platform/types';

export type Ctx2D = CanvasRenderingContext2D;

export type LocalizedText = Readonly<Record<LanguageCode, string>>;

export type TileState = 'normal' | 'hint1' | 'hint2' | 'active' | 'ghost' | 'lit';
export const TILE_STATES: readonly TileState[] = ['normal', 'hint1', 'hint2', 'active', 'ghost', 'lit'];

/** What the player asked for; every painter receives it. */
export interface PaintEnv {
  /** The "tile marks" setting. */
  readonly marks: boolean;
  readonly highContrast: boolean;
  /** Device pixel ratio already applied to the context (for hairlines: 1 / dpr). */
  readonly dpr: number;
}

export interface TilePaint extends PaintEnv {
  readonly ctx: Ctx2D;
  readonly color: TileColor;
  readonly state: TileState;
  /** Centre of the cell in CSS px. */
  readonly cx: number;
  readonly cy: number;
  /** Hex radius of the cell in CSS px. */
  readonly r: number;
}

export interface TileSkin {
  /** How far paint may reach beyond the box (cx +- r, cy +- r), in units of r. */
  readonly overflow: { readonly x: number; readonly top: number; readonly bottom: number };
  readonly rowOrder: 'topDown' | 'bottomUp';
  paint(p: TilePaint): void;
}

export interface BedPaint extends PaintEnv {
  readonly ctx: Ctx2D;
  /** Size of the board surface in CSS px. */
  readonly width: number;
  readonly height: number;
  readonly r: number;
  readonly cols: number;
  readonly rows: number;
  /** Centre of a cell in CSS px. */
  cellX(col: number, row: number): number;
  cellY(row: number): number;
}

export interface BedSkin {
  /** Space around the grid in units of r. */
  readonly pad: number;
  paint(b: BedPaint): void;
}

export interface LinkSkin {
  /**
   * One link between the centres (ax, ay) and (bx, by) of two neighbouring tiles of a
   * forming group. `level` is 1 for a group of three, 2 for a group of four.
   * Called per frame: flat strokes only, no allocation.
   */
  paintLink(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, r: number, level: 1 | 2, env: PaintEnv): void;
  /** Optional node on a tile centre of a forming group. Same rules. */
  paintNode?(ctx: Ctx2D, x: number, y: number, r: number, level: 1 | 2, env: PaintEnv): void;
}

export type BackdropSkin =
  | {
      readonly kind: 'canvas';
      /** Static scene, painted once per size. `width`/`height` in CSS px. */
      paint(ctx: Ctx2D, width: number, height: number, env: PaintEnv): void;
      readonly ambient?: {
        /** Frames per second of the ambient layer, 1-30. */
        readonly fps: number;
        /** Draw moving details on a cleared transparent canvas. `time` in ms. No allocation. */
        paint(ctx: Ctx2D, width: number, height: number, time: number, env: PaintEnv): void;
      };
    }
  | {
      readonly kind: 'dom';
      /** Build an element that will be stretched over the whole screen. */
      create(env: PaintEnv): HTMLElement | SVGElement;
      destroy?(element: HTMLElement | SVGElement): void;
    };

/** Inclusive range [min, max]. */
export type Range = readonly [number, number];

export type ParticleShape = 'dot' | 'spark' | 'shard' | 'ring' | 'star' | (string & {});

export interface BurstSpec {
  /** Particles per burst (the engine caps it at 24 and at the free pool space). */
  readonly count: number;
  readonly shape: ParticleShape;
  /** Particle size (diameter) in units of r. */
  readonly size: Range;
  /** Initial speed in r per second. */
  readonly speed: Range;
  /** Direction in radians, 0 = right, PI/2 = down. Default: full circle. */
  readonly angle?: Range;
  /** Life in ms (clamped to 900). */
  readonly life: Range;
  /** Downward acceleration in r per second squared. Default 0. */
  readonly gravity?: number;
  /** Velocity lost per second, 0-10. Default 0. */
  readonly drag?: number;
  /** Spin in radians per second. Default none. */
  readonly spin?: Range;
  /** Shrink to nothing over the life. Default true. */
  readonly shrink?: boolean;
  /** Additive blending (light on dark). Default false. */
  readonly additive?: boolean;
  /** Start within this distance of the origin, in r. Default 0. */
  readonly spread?: number;
}

export interface TextSpec {
  /** CSS font family (must be loaded by the theme) and weight. */
  readonly family: string;
  readonly weight: number;
  /** Cap height driver: font size in units of r. */
  readonly size: number;
  readonly fill: string;
  /** Outline for legibility over tiles, or null. */
  readonly stroke: string | null;
  /** Outline width in units of the font size. */
  readonly strokeWidth?: number;
  /** Life in ms. */
  readonly ms: number;
}

export interface EffectsSkin {
  readonly timing: {
    /** Piece step easing, ms (clamped to 80). */
    readonly step: number;
    /** Piece fade-in, ms. */
    readonly spawn: number;
    /** Travel of hard-dropped tiles, ms (clamped to 80). */
    readonly hardDrop: number;
    /** Fall after a removal: base + perRow * rows, capped at max (clamped to 260). */
    readonly fallBase: number;
    readonly fallPerRow: number;
    readonly fallMax: number;
    /** One tile's light-up cross-fade, ms. */
    readonly lightUp: number;
    /** Whole light-up sequence of a path, ms (clamped to 250). */
    readonly activation: number;
    /** One tile's pop, ms (clamped to 400). */
    readonly pop: number;
    /** Delay between the first and the last pop of one removal, ms (clamped to 200). */
    readonly popStagger: number;
  };
  readonly land: {
    /** Squash depth 0-0.35 (share of the tile height). */
    readonly squash: number;
    readonly ms: number;
    readonly dust: BurstSpec | null;
  };
  /** Squash depth of the small bounce when a falling tile arrives, 0-0.25. */
  readonly fall: { readonly bounce: number; readonly ms: number };
  readonly light: {
    /** Extra scale at the peak of the light-up, 0-0.3. */
    readonly pulse: number;
    /** Burst at each tile as it lights, or null. */
    readonly burst: BurstSpec | null;
    /** The light that runs along the links. Width in units of r. */
    readonly energy: { readonly color: string; readonly width: number; readonly alpha: number } | null;
  };
  readonly pop: {
    /** Peak scale of a removed tile before it vanishes, 1-1.6. */
    readonly scale: number;
    readonly burst: BurstSpec | null;
  };
  /** "+1 200" flying up from an activated path. `rise` in units of r. */
  readonly scorePop: (TextSpec & { readonly rise: number }) | null;
  /** "x3" over the board from `minChain` up. */
  readonly chainBanner: (TextSpec & { readonly minChain: number; readonly burst: BurstSpec | null }) | null;
  /** Bursts across the board on stage complete: `bursts` of them over `ms`. */
  readonly stageFlourish: { readonly burst: BurstSpec; readonly bursts: number; readonly ms: number } | null;
  /**
   * Colours of particles thrown by a tile of this colour (`null`: no tile, e.g. the
   * chain banner or the stage flourish). Return the same array object every time.
   */
  particleColors(tile: TileColor | null): readonly string[];
  /**
   * Paint a particle sprite of `size` CSS px centred in a `size` x `size` box at the
   * origin (0..size). Called once per shape and colour. Return false to use the
   * engine's built-in shape of that name.
   */
  paintParticle?(ctx: Ctx2D, shape: ParticleShape, color: string, size: number): boolean;
  /**
   * Replace the light running along one link; `progress` 0-1 from a to b.
   * Per frame: flat strokes only, no allocation.
   */
  paintEnergy?(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, progress: number, r: number): void;
  /** Extra effects for an event, after the engine's own. See section 7. */
  onEvent?(event: GameEvent, fx: FxApi, board: BoardInfo): void;
}

/** Geometry a skin may read in `onEvent`. */
export interface BoardInfo {
  readonly width: number;
  readonly height: number;
  readonly r: number;
  readonly cols: number;
  readonly rows: number;
  cellX(col: number, row: number): number;
  cellY(row: number): number;
}

/** The shared effect system as seen by a skin. All calls are no-ops under reduced motion. */
export interface FxApi {
  /** Throw a burst at (x, y) CSS px after `delay` ms, in the particle colours of `tile`. */
  burst(spec: BurstSpec, x: number, y: number, tile: TileColor | null, delay?: number): void;
  /** Show a short text at (x, y) that rises by `rise` r and fades. */
  text(spec: TextSpec, text: string, x: number, y: number, rise: number): void;
  /** Seeded visual randomness in [0, 1). */
  random(): number;
  readonly reducedMotion: boolean;
}

/** Ids of the screens passed to `ui.decorate`. */
export type SkinScreen = 'menu' | 'challenges' | 'settings' | 'about' | 'game';

export interface UiSkin {
  /** Colour of the system / browser bar. */
  readonly themeColor: string;
  /** Add decorative, aria-hidden nodes to a freshly built screen. */
  decorate?(root: HTMLElement, screen: SkinScreen): void;
  /** Picture for the menu, between the promise and the buttons; null for none. */
  menuArt?(): HTMLElement | SVGElement | null;
}

export interface SkinMeta {
  /** How each colour is told apart without colour: a shape id and its spoken name. */
  readonly marks: Readonly<Record<TileColor, { readonly shape: string; readonly name: LocalizedText }>>;
}

export interface Skin {
  /** Same as the folder name, the theme file name and the registry key. */
  readonly id: string;
  readonly meta: SkinMeta;
  readonly tile: TileSkin;
  readonly bed: BedSkin;
  readonly links: LinkSkin | null;
  readonly backdrop: BackdropSkin;
  readonly effects: EffectsSkin;
  readonly ui: UiSkin;
}

/** Identity helper that gives a skin literal full type checking. */
export function defineSkin(skin: Skin): Skin {
  return skin;
}

/** Hard limits of the effect engine. */
export const FX_LIMITS = {
  maxParticles: 256,
  maxBurst: 24,
  maxParticleLife: 900,
  maxPop: 400,
  maxPopStagger: 200,
  maxText: 1000,
  maxBanner: 1200,
  maxStep: 80,
  maxFall: 260,
  /** The simulation keeps a path lit for 250 ms; the light-up sequence must fit. */
  maxActivation: 250,
} as const;

export interface ResolvedTiming {
  readonly step: number;
  readonly spawn: number;
  readonly hardDrop: number;
  readonly fallBase: number;
  readonly fallPerRow: number;
  readonly fallMax: number;
  readonly lightUp: number;
  readonly activation: number;
  readonly pop: number;
  readonly popStagger: number;
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

/** Skin timing with the engine's limits applied. */
export function resolveTiming(timing: EffectsSkin['timing']): ResolvedTiming {
  const activation = clamp(timing.activation, 0, FX_LIMITS.maxActivation);
  return {
    step: clamp(timing.step, 0, FX_LIMITS.maxStep),
    spawn: clamp(timing.spawn, 0, 200),
    hardDrop: clamp(timing.hardDrop, 0, FX_LIMITS.maxStep),
    fallBase: clamp(timing.fallBase, 0, FX_LIMITS.maxFall),
    fallPerRow: clamp(timing.fallPerRow, 0, 100),
    fallMax: clamp(timing.fallMax, 0, FX_LIMITS.maxFall),
    lightUp: clamp(timing.lightUp, 1, Math.max(1, activation)),
    activation,
    pop: clamp(timing.pop, 0, FX_LIMITS.maxPop),
    popStagger: clamp(timing.popStagger, 0, FX_LIMITS.maxPopStagger),
  };
}

/** Light-up delay of the i-th of n tiles so the last one is fully lit at `activation`. */
export function lightDelay(index: number, count: number, timing: ResolvedTiming): number {
  if (count <= 1) return 0;
  return (index / (count - 1)) * Math.max(0, timing.activation - timing.lightUp);
}
