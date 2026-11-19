import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DENSITIES,
  ICON_SPECS,
  RES_DIR,
  SOURCE_FILES,
  iconOutputs,
  symbolScale,
} from '../../../tools/android/generate-icons';

const root = resolve(import.meta.dirname, '../../..');

/** Width and height from the IHDR chunk, plus the colour type (6 = RGBA). */
function pngHeader(path: string): { width: number; height: number; colourType: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colourType: bytes.readUInt8(25) };
}

describe('icon plan', () => {
  it('covers every density for every resource', () => {
    expect(iconOutputs()).toHaveLength(ICON_SPECS.length * DENSITIES.length);
  });

  it('uses the Android sizes: 48 dp legacy, 108 dp adaptive layers, 288 dp splash', () => {
    const sizes = Object.fromEntries(ICON_SPECS.map((spec) => [spec.resource, spec.sizeDp]));
    expect(sizes).toEqual({
      ic_launcher: 48,
      ic_launcher_round: 48,
      ic_launcher_foreground: 108,
      ic_launcher_monochrome: 108,
      splash_icon: 288,
    });
    const xxxhdpi = iconOutputs().filter((out) => out.density.name === 'xxxhdpi');
    expect(xxxhdpi.map((out) => out.sizePx)).toEqual([192, 192, 432, 432, 1152]);
  });

  it('keeps the symbol inside the adaptive safe zone and the splash mask', () => {
    for (const spec of ICON_SPECS.filter((s) => s.mode === 'symbol')) {
      // 66 dp of 108 dp for adaptive layers; 2/3 of the canvas for the splash icon.
      expect(spec.symbolBoxFraction, spec.resource).toBeLessThanOrEqual(2 / 3);
    }
    expect(symbolScale(1024, 0.5)).toBeCloseTo(5.12);
  });

  it('reads sources that exist in the brand kit', () => {
    for (const path of Object.values(SOURCE_FILES)) {
      expect(existsSync(resolve(root, path)), path).toBe(true);
    }
  });
});

describe('committed icon resources', () => {
  it('exist with the planned pixel size and an alpha channel', () => {
    for (const out of iconOutputs()) {
      const header = pngHeader(resolve(root, out.path));
      expect([header.width, header.height], out.path).toEqual([out.sizePx, out.sizePx]);
      expect(header.colourType, out.path).toBe(6);
    }
  });

  it('are wired into an adaptive icon with background, foreground and monochrome layers', () => {
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      const xml = readFileSync(resolve(root, RES_DIR, `mipmap-anydpi-v26/${name}.xml`), 'utf8');
      expect(xml).toContain('<background android:drawable="@color/ic_launcher_background"/>');
      expect(xml).toContain('<foreground android:drawable="@mipmap/ic_launcher_foreground"/>');
      expect(xml).toContain('<monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>');
    }
  });
});
