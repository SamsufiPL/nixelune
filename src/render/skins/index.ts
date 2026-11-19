/**
 * Skin registry. THE ONLY SHARED FILE A SKIN AUTHOR EDITS: add one line to `SKINS`.
 * The key is the skin id (folder name under src/render/skins/, theme file name under
 * src/ui/themes/). `name` is shown in the temporary look picker. Modules are loaded
 * on demand, so a skin that is not selected costs nothing at start-up.
 */
import type { LocalizedText, Skin } from '../skin';

export interface SkinEntry {
  readonly name: LocalizedText;
  load(): Promise<{ default: Skin }>;
}

export const SKINS: Readonly<Record<string, SkinEntry>> = {
  kit: { name: { pl: 'Kit', en: 'Kit' }, load: () => import('./kit/index') },
  demo: { name: { pl: 'Demo (próbny)', en: 'Demo (rough)' }, load: () => import('./demo/index') },
  lampiony: { name: { pl: 'Lampiony', en: 'Lanterns' }, load: () => import('./lampiony/index') },
  klejnoty: { name: { pl: 'Klejnoty', en: 'Jewels' }, load: () => import('./klejnoty/index') },
  szklarnia: { name: { pl: 'Szklarnia', en: 'Glasshouse' }, load: () => import('./szklarnia/index') },
};

/** Skin used when neither the URL nor the save names one that exists. */
export const DEFAULT_SKIN = 'szklarnia';
