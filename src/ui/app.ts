/**
 * App shell: one live screen, a short fade between screens, and one place where
 * navigation, Back, focus loss, settings and saving are decided.
 */
import type { ChallengeDef } from '../game/types';
import type { Services, Settings } from '../platform/types';
import { Announcer } from './a11y';
import { createBackdropHost } from './backdrop';
import type { AppContext, ScreenView } from './context';
import { el } from './dom';
import type { LicenceEntry } from './licences';
import { readSystemPrefs, resolvePrefs, watchSystemPrefs, type Prefs } from './prefs';
import { applyResult } from './progress';
import { createAboutScreen } from './screens/about';
import { createChallengesScreen } from './screens/challenges';
import { createGameScreen, type GameScreen } from './screens/game';
import { createMenuScreen } from './screens/menu';
import { createSettingsScreen } from './screens/settings';
import { Session, type CreateGame } from './session';
import type { SkinManager } from './skinManager';
import { INITIAL_STATE, transition, type Action, type AppState, type Effect, type Screen } from './state';

export interface AppDeps {
  readonly root: HTMLElement;
  readonly services: Services;
  readonly createGame: CreateGame;
  readonly challenges: readonly ChallengeDef[];
  readonly licences: readonly LicenceEntry[];
  readonly version: string;
  readonly skins: SkinManager;
}

export interface App {
  readonly state: AppState;
  dispatch(action: Action): void;
  /** The current run, if any (used by development tools). */
  readonly session: Session | null;
}

/** Screen fade, ms. Must match --nx-dur in tokens.css. */
const FADE_MS = 180;

export function createApp(deps: AppDeps): App {
  const { services, root } = deps;
  const { i18n, save } = services;

  let state: AppState = INITIAL_STATE;
  let session: Session | null = null;
  let current: ScreenView | null = null;
  let currentScreen: Screen | null = null;
  let gameScreen: GameScreen | null = null;
  let prefs: Prefs = resolvePrefs(save.data.settings, readSystemPrefs());

  // --- Static shell --------------------------------------------------------------

  const stage = el('div', { class: 'stage' });
  const live = el('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  root.classList.add('app');
  const backdrop = createBackdropHost();
  root.replaceChildren(backdrop.root, stage, live);
  const announcer = new Announcer(live);

  function applyPrefs(): void {
    prefs = resolvePrefs(save.data.settings, readSystemPrefs());
    const html = document.documentElement;
    html.lang = i18n.language;
    if (prefs.highContrast) html.dataset.contrast = 'more';
    else delete html.dataset.contrast;
    if (prefs.reducedMotion) html.dataset.motion = 'reduced';
    else delete html.dataset.motion;
    backdrop.set(deps.skins.skin, prefs);
  }

  /** Everything outside the screens that follows the active skin. */
  function applySkin(): void {
    const skin = deps.skins.skin;
    document.documentElement.dataset.skin = skin.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', skin.ui.themeColor);
    backdrop.set(skin, prefs);
  }

  function decorate(view: ScreenView, screen: Screen): void {
    deps.skins.skin.ui.decorate?.(view.root, screen);
  }

  function persist(mutate: Parameters<typeof save.update>[0]): void {
    // Saving never blocks play; the service logs and survives its own failures.
    void save.update(mutate).catch(() => undefined);
  }

  const ctx: AppContext = {
    services,
    i18n,
    challenges: deps.challenges,
    licences: deps.licences,
    version: deps.version,
    announcer,
    skins: deps.skins,
    skin: () => deps.skins.skin,
    selectSkin(id) {
      void deps.skins.select(id).then((changed) => {
        if (changed) persist((draft) => {
          draft.settings.skin = id;
        });
      });
    },
    dispatch,
    prefs: () => prefs,
    settings: () => save.data.settings,
    updateSettings(mutate) {
      const before = save.data.settings.language;
      persist((draft) => mutate(draft.settings));
      const settings: Settings = save.data.settings;
      services.audio.setVolume(settings.soundVolume);
      services.haptics.setEnabled(settings.haptics);
      applyPrefs();
      const shown = i18n.language;
      if (settings.language !== before) i18n.setLanguage(settings.language);
      // A language switch refreshes the screen through i18n.onChange; do not do it twice.
      if (i18n.language === shown) current?.refresh();
    },
  };

  // --- Run bookkeeping -----------------------------------------------------------

  function recordResult(final: boolean): void {
    const run = session;
    if (!run) return;
    const view = run.game.view;
    const countGame = final && !run.counted;
    if (countGame) run.counted = true;
    const result = { mode: run.mode, score: view.score, stage: view.stage, outcome: view.outcome, countGame };
    persist((draft) => applyResult(draft, result));
  }

  function runEffect(effect: Effect): void {
    switch (effect.type) {
      case 'startRun': {
        const challenge = effect.challengeId
          ? (deps.challenges.find((item) => item.id === effect.challengeId) ?? null)
          : null;
        session = new Session(deps.createGame, challenge, save.data.bestScore);
        break;
      }
      case 'restartRun':
        if (session) {
          if (session.game.view.phase !== 'over') recordResult(true);
          session.restart(save.data.bestScore);
          gameScreen?.onRestart();
        }
        break;
      case 'endRun':
        if (session && session.game.view.phase !== 'over') recordResult(true);
        session = null;
        break;
      case 'continueStage':
        session?.game.apply('continue');
        break;
      case 'clearInput':
        gameScreen?.clearInput();
        break;
      case 'exitApp':
        if (services.isNative) services.lifecycle.exitApp();
        break;
    }
  }

  // --- Screens -------------------------------------------------------------------

  function build(screen: Screen): ScreenView {
    switch (screen) {
      case 'menu':
        return createMenuScreen(ctx);
      case 'challenges':
        return createChallengesScreen(ctx);
      case 'settings':
        return createSettingsScreen(ctx);
      case 'about':
        return createAboutScreen(ctx);
      case 'game': {
        if (!session) session = new Session(deps.createGame, null, save.data.bestScore);
        gameScreen = createGameScreen(ctx, session, {
          onResult: recordResult,
          onTutorialSeen: () =>
            persist((draft) => {
              draft.tutorialSeen = true;
            }),
        });
        return gameScreen;
      }
    }
  }

  function show(screen: Screen): void {
    const leaving = current;
    if (leaving) {
      if (leaving === gameScreen) gameScreen = null;
      leaving.dispose();
      const node = leaving.root.parentElement;
      if (node) {
        node.dataset.state = 'leaving';
        node.inert = true;
        window.setTimeout(() => node.remove(), prefs.reducedMotion ? 0 : FADE_MS);
      }
    }
    const view = build(screen);
    decorate(view, screen);
    // The entrance is a CSS animation on .screen, tuned per skin through variables.
    const holder = el('div', { class: 'screen', 'data-screen': screen }, view.root);
    stage.append(holder);
    current = view;
    currentScreen = screen;
    view.focus();
  }

  function sync(previous: AppState): void {
    if (state.screen !== currentScreen) show(state.screen);
    if (state.screen === 'game' && gameScreen && state.run) {
      if (previous.screen !== 'game' || previous.run !== state.run) {
        gameScreen.setLayer(state.run);
        if (state.run === 'paused' && previous.run !== 'paused') announcer.announce(i18n.t('a11y.paused'));
      }
    }
  }

  function dispatch(action: Action): void {
    const previous = state;
    const result = transition(state, action);
    state = result.state;
    // Effects that create or replace the run come before the screen is built on it.
    for (const effect of result.effects) runEffect(effect);
    sync(previous);
  }

  // --- Global input --------------------------------------------------------------

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!event.repeat) dispatch({ type: 'back' });
      event.preventDefault();
      return;
    }
    current?.onKey?.(event, true);
  });
  window.addEventListener('keyup', (event) => current?.onKey?.(event, false));
  services.lifecycle.onBack(() => dispatch({ type: 'back' }));
  services.lifecycle.onPause(() => dispatch({ type: 'focusLost' }));
  window.addEventListener('blur', () => dispatch({ type: 'focusLost' }));

  // Sound needs a user gesture; interface taps get their quiet tick from one listener.
  const unlock = (): void => services.audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  stage.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target && !target.hasAttribute('data-quiet')) services.audio.play('uiTap');
  });
  // No context menu on long press; this is a game surface, not a document.
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  i18n.onChange(() => {
    document.documentElement.lang = i18n.language;
    current?.refresh();
  });
  watchSystemPrefs(() => {
    applyPrefs();
    current?.refresh();
  });

  deps.skins.onChange(() => {
    applySkin();
    current?.refresh();
    if (current && currentScreen) decorate(current, currentScreen);
  });

  applyPrefs();
  applySkin();
  show(state.screen);

  return {
    get state() {
      return state;
    },
    dispatch,
    get session() {
      return session;
    },
  };
}
