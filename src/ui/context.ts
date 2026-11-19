/** What every screen gets from the app shell. */
import type { ChallengeDef } from '../game/types';
import type { I18n, Services, Settings } from '../platform/types';
import type { Announcer } from './a11y';
import type { LicenceEntry } from './licences';
import type { Skin } from '../render/skin';
import type { Prefs } from './prefs';
import type { SkinManager } from './skinManager';
import type { Action } from './state';

export interface AppContext {
  readonly services: Services;
  readonly i18n: I18n;
  readonly challenges: readonly ChallengeDef[];
  readonly licences: readonly LicenceEntry[];
  readonly version: string;
  readonly announcer: Announcer;
  readonly skins: SkinManager;
  /** The active skin. Screens read it again in `refresh`, which runs after a switch. */
  skin(): Skin;
  /** Choose a skin: applied live, stored in the save. */
  selectSkin(id: string): void;
  dispatch(action: Action): void;
  /** Effective presentation preferences (settings resolved against the system). */
  prefs(): Prefs;
  settings(): Settings;
  /** Change settings: applied at once, persisted in the background. */
  updateSettings(mutate: (settings: Settings) => void): void;
}

export interface ScreenView {
  readonly root: HTMLElement;
  /** Language or preferences changed: re-read everything shown. */
  refresh(): void;
  dispose(): void;
  /** Move keyboard / screen reader focus to the start of the screen. */
  focus(): void;
  onKey?(event: KeyboardEvent, down: boolean): void;
}
