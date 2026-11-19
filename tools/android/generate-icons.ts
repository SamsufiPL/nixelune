/**
 * Generates the Android launcher icons and the splash icon from the brand kit SVGs.
 *
 *   node tools/android/generate-icons.ts
 *
 * Rendering is done by headless Chromium through Playwright, which must be available
 * on the machine (it is not a project dependency: the generated PNGs are committed and
 * CI never runs this script). Re-run it whenever the logo files in the brand kit change.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Density {
  readonly name: string;
  /** Pixels per dp. */
  readonly scale: number;
}

export const DENSITIES: readonly Density[] = [
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];

export type IconSource = 'app' | 'monochrome';

/**
 * How the source SVG is turned into the picture:
 * - `full`: the app icon as drawn in the kit (rounded ink square with the symbol);
 * - `round`: the same picture clipped to a circle;
 * - `symbol`: only the symbol group on a transparent canvas, scaled so that its
 *   100-unit design box takes `symbolBoxFraction` of the canvas, with the drawn
 *   geometry centred (the kit draws the symbol slightly up and left in its box).
 */
export type IconMode = 'full' | 'round' | 'symbol';

export interface IconSpec {
  /** Resource file name without extension. */
  readonly resource: string;
  /** Resource folder prefix; the density name is appended. */
  readonly folder: 'mipmap' | 'drawable';
  /** Canvas edge in dp. */
  readonly sizeDp: number;
  readonly source: IconSource;
  readonly mode: IconMode;
  readonly symbolBoxFraction?: number;
}

/** Edge of the symbol's design box in SVG user units (see the `<g>` in the kit files). */
export const SYMBOL_BOX_UNITS = 100;

/**
 * Adaptive icon layers are 108 dp with a 66 dp safe zone; the symbol's drawn extent is
 * about 86 % of its design box, so a 0.66 box keeps every node inside the safe zone.
 * The Android 12+ splash icon is 288 dp and is masked by a circle of 2/3 of that size.
 */
export const ICON_SPECS: readonly IconSpec[] = [
  { resource: 'ic_launcher', folder: 'mipmap', sizeDp: 48, source: 'app', mode: 'full' },
  { resource: 'ic_launcher_round', folder: 'mipmap', sizeDp: 48, source: 'app', mode: 'round' },
  { resource: 'ic_launcher_foreground', folder: 'mipmap', sizeDp: 108, source: 'app', mode: 'symbol', symbolBoxFraction: 0.66 },
  { resource: 'ic_launcher_monochrome', folder: 'mipmap', sizeDp: 108, source: 'monochrome', mode: 'symbol', symbolBoxFraction: 0.66 },
  { resource: 'splash_icon', folder: 'drawable', sizeDp: 288, source: 'app', mode: 'symbol', symbolBoxFraction: 0.66 },
];

export const SOURCE_FILES: Readonly<Record<IconSource, string>> = {
  app: 'docs/brand-kit/03_logo/NIXELUNE_icon_app.svg',
  monochrome: 'docs/brand-kit/03_logo/NIXELUNE_symbol_monochrome_transparent.svg',
};

export const RES_DIR = 'android/app/src/main/res';

export interface IconOutput {
  readonly spec: IconSpec;
  readonly density: Density;
  /** Path relative to the repository root. */
  readonly path: string;
  readonly sizePx: number;
}

export function iconOutputs(): IconOutput[] {
  return ICON_SPECS.flatMap((spec) =>
    DENSITIES.map((density) => ({
      spec,
      density,
      path: `${RES_DIR}/${spec.folder}-${density.name}/${spec.resource}.png`,
      sizePx: Math.round(spec.sizeDp * density.scale),
    })),
  );
}

/** Scale that maps the symbol's design box onto `boxFraction` of a square canvas. */
export function symbolScale(canvasUnits: number, boxFraction: number): number {
  return (canvasUnits * boxFraction) / SYMBOL_BOX_UNITS;
}

// --- rendering (needs Playwright) -------------------------------------------------

interface PwPage {
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  setContent(html: string): Promise<void>;
  evaluate<A>(fn: (arg: A) => void, arg: A): Promise<void>;
  screenshot(options: { omitBackground: boolean; type: 'png' }): Promise<Uint8Array>;
}
interface PwBrowser {
  newPage(options: { deviceScaleFactor: number }): Promise<PwPage>;
  close(): Promise<void>;
}
interface Pw {
  chromium: { launch(): Promise<PwBrowser> };
}

interface PrepareArgs {
  mode: IconMode;
  scale: number;
  canvasUnits: number;
}

async function render(browser: PwBrowser, svg: string, out: IconOutput): Promise<Uint8Array> {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ width: out.sizePx, height: out.sizePx });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
  );
  const canvasUnits = 1024;
  const args: PrepareArgs = {
    mode: out.spec.mode,
    scale: symbolScale(canvasUnits, out.spec.symbolBoxFraction ?? 1),
    canvasUnits,
  };
  // Runs in the page: reshape the kit SVG into the requested picture.
  await page.evaluate((a: PrepareArgs) => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) throw new Error('no <svg> in source');
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    if (a.mode === 'symbol') {
      const symbol = svgEl.querySelector<SVGGElement>(':scope > g');
      if (!symbol) throw new Error('no symbol <g> in source');
      for (const child of [...svgEl.children]) {
        if (child !== symbol && child.tagName.toLowerCase() !== 'defs') child.remove();
      }
      svgEl.setAttribute('viewBox', `0 0 ${a.canvasUnits} ${a.canvasUnits}`);
      const box = symbol.getBBox();
      const dx = a.canvasUnits / 2 - a.scale * (box.x + box.width / 2);
      const dy = a.canvasUnits / 2 - a.scale * (box.y + box.height / 2);
      symbol.setAttribute('transform', `translate(${dx} ${dy}) scale(${a.scale})`);
    } else if (a.mode === 'round') {
      svgEl.style.clipPath = 'circle(50%)';
    }
  }, args);
  const png = await page.screenshot({ omitBackground: true, type: 'png' });
  return png;
}

export async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const require = createRequire(import.meta.url);
  const pw = require('playwright') as Pw;
  const browser = await pw.chromium.launch();
  try {
    for (const out of iconOutputs()) {
      const svg = readFileSync(join(root, SOURCE_FILES[out.spec.source]), 'utf8');
      const png = await render(browser, svg, out);
      const target = join(root, out.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, png);
      console.log(`${out.path} ${out.sizePx}x${out.sizePx} ${png.byteLength} B`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
