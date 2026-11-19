/**
 * Capacitor adapters. Loaded only inside the native shell (dynamic import from index.ts),
 * so the web bundle and the tests never need the plugins at start-up.
 */
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import type { AppLifecycle, KeyValueStore } from '../platform/types';
import type { HapticDriver } from './haptics';
import { LifecycleHub } from './lifecycle';
import { consoleLogger } from './log';
import type { Logger } from './log';

/** Capacitor Preferences (SharedPreferences on Android, UserDefaults on iOS). Rejections reach SaveService, which handles them. */
export class PreferencesStore implements KeyValueStore {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return typeof value === 'string' ? value : null;
  }

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

const IMPACT_STYLE = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy } as const;
const NOTIFICATION_TYPE = {
  success: NotificationType.Success,
  warning: NotificationType.Warning,
  error: NotificationType.Error,
} as const;

export const nativeHapticDriver: HapticDriver = (pattern) => {
  const request = pattern.native;
  return request.kind === 'impact'
    ? Haptics.impact({ style: IMPACT_STYLE[request.style] })
    : Haptics.notification({ type: NOTIFICATION_TYPE[request.type] });
};

/** App plugin: activity pause / resume, Android hardware Back, exit. */
export class NativeLifecycle extends LifecycleHub implements AppLifecycle {
  constructor(log: Logger = consoleLogger) {
    super(log);
    this.subscribe('appStateChange', () =>
      App.addListener('appStateChange', (state) => {
        if (state.isActive) this.emitResume();
        else this.emitPause();
      }),
    );
    // Registering this listener also turns off Capacitor's default Back handling: the game decides.
    this.subscribe('backButton', () => App.addListener('backButton', () => this.emitBack()));
  }

  exitApp(): void {
    try {
      App.exitApp().catch((error: unknown) => this.log('lifecycle', 'exitApp failed', error));
    } catch (error) {
      this.log('lifecycle', 'exitApp failed', error);
    }
  }

  private subscribe(name: string, add: () => Promise<unknown>): void {
    try {
      add().catch((error: unknown) => this.log('lifecycle', `listening to ${name} failed`, error));
    } catch (error) {
      this.log('lifecycle', `listening to ${name} failed`, error);
    }
  }
}
