/**
 * The app state machine. Pure: `transition` maps a state and an action to the next
 * state plus the side effects the shell must carry out. Every navigation, including
 * Back, goes through here, so there is one place that decides what a key press means.
 */

export type Screen = 'menu' | 'challenges' | 'settings' | 'about' | 'game';

/** What is on top of the board while the game screen (or a run) exists. */
export type RunLayer = 'playing' | 'paused' | 'countdown' | 'stageComplete' | 'over';

export interface AppState {
  readonly screen: Screen;
  /** Non-null while a run exists, also when settings are opened from the pause panel. */
  readonly run: RunLayer | null;
  /** Where the pause panel returns to. */
  readonly pausedFrom: 'playing' | 'stageComplete';
  /** Where settings return to. */
  readonly settingsFrom: 'menu' | 'pause';
}

export const INITIAL_STATE: AppState = {
  screen: 'menu',
  run: null,
  pausedFrom: 'playing',
  settingsFrom: 'menu',
};

export type Action =
  | { readonly type: 'play' }
  | { readonly type: 'openChallenges' }
  | { readonly type: 'startChallenge'; readonly id: string }
  | { readonly type: 'openSettings' }
  | { readonly type: 'openAbout' }
  | { readonly type: 'back' }
  | { readonly type: 'pause' }
  /** The app lost focus or went to the background. */
  | { readonly type: 'focusLost' }
  | { readonly type: 'resume' }
  | { readonly type: 'countdownDone' }
  | { readonly type: 'stageCompleted' }
  | { readonly type: 'continue' }
  | { readonly type: 'gameOver' }
  | { readonly type: 'retry' }
  | { readonly type: 'quitToMenu' }
  | { readonly type: 'quitToChallenges' };

export type Effect =
  | { readonly type: 'startRun'; readonly challengeId: string | null }
  | { readonly type: 'restartRun' }
  /** Leave the run; the shell records its result before dropping it. */
  | { readonly type: 'endRun' }
  | { readonly type: 'continueStage' }
  | { readonly type: 'clearInput' }
  | { readonly type: 'exitApp' };

export interface Transition {
  readonly state: AppState;
  readonly effects: readonly Effect[];
}

const NONE: readonly Effect[] = [];

function stay(state: AppState): Transition {
  return { state, effects: NONE };
}

function pauseRun(state: AppState): Transition {
  if (state.screen !== 'game') return stay(state);
  if (state.run === 'playing' || state.run === 'countdown') {
    return { state: { ...state, run: 'paused', pausedFrom: 'playing' }, effects: [{ type: 'clearInput' }] };
  }
  if (state.run === 'stageComplete') {
    return { state: { ...state, run: 'paused', pausedFrom: 'stageComplete' }, effects: NONE };
  }
  return stay(state);
}

function resumeRun(state: AppState): Transition {
  if (state.screen !== 'game' || state.run !== 'paused') return stay(state);
  if (state.pausedFrom === 'stageComplete') return { state: { ...state, run: 'stageComplete' }, effects: NONE };
  return { state: { ...state, run: 'countdown' }, effects: [{ type: 'clearInput' }] };
}

function back(state: AppState): Transition {
  switch (state.screen) {
    case 'menu':
      return { state, effects: [{ type: 'exitApp' }] };
    case 'challenges':
      return stay({ ...state, screen: 'menu' });
    case 'about':
      return stay({ ...state, screen: 'settings' });
    case 'settings':
      return state.settingsFrom === 'pause' && state.run
        ? stay({ ...state, screen: 'game', run: 'paused' })
        : stay({ ...state, screen: 'menu', settingsFrom: 'menu' });
    case 'game':
      switch (state.run) {
        case 'playing':
        case 'countdown':
        case 'stageComplete':
          return pauseRun(state);
        case 'paused':
          return resumeRun(state);
        case 'over':
        default:
          return { state: { ...INITIAL_STATE }, effects: [{ type: 'endRun' }] };
      }
  }
}

export function transition(state: AppState, action: Action): Transition {
  switch (action.type) {
    case 'play':
      if (state.screen !== 'menu') return stay(state);
      return {
        state: { ...INITIAL_STATE, screen: 'game', run: 'playing' },
        effects: [{ type: 'startRun', challengeId: null }],
      };
    case 'openChallenges':
      return state.screen === 'menu' ? stay({ ...state, screen: 'challenges' }) : stay(state);
    case 'startChallenge':
      if (state.screen !== 'challenges') return stay(state);
      return {
        state: { ...INITIAL_STATE, screen: 'game', run: 'playing' },
        effects: [{ type: 'startRun', challengeId: action.id }],
      };
    case 'openSettings':
      if (state.screen === 'menu') return stay({ ...state, screen: 'settings', settingsFrom: 'menu' });
      if (state.screen === 'game' && state.run === 'paused') {
        return stay({ ...state, screen: 'settings', settingsFrom: 'pause' });
      }
      return stay(state);
    case 'openAbout':
      return state.screen === 'settings' ? stay({ ...state, screen: 'about' }) : stay(state);
    case 'back':
      return back(state);
    case 'pause':
    case 'focusLost':
      // Losing focus never opens the pause panel over the stage or result panels.
      if (action.type === 'focusLost' && state.run === 'stageComplete') return stay(state);
      return pauseRun(state);
    case 'resume':
      return resumeRun(state);
    case 'countdownDone':
      return state.screen === 'game' && state.run === 'countdown' ? stay({ ...state, run: 'playing' }) : stay(state);
    case 'stageCompleted':
      return state.run === 'playing' ? stay({ ...state, run: 'stageComplete' }) : stay(state);
    case 'continue':
      if (state.screen !== 'game' || state.run !== 'stageComplete') return stay(state);
      return { state: { ...state, run: 'playing' }, effects: [{ type: 'continueStage' }, { type: 'clearInput' }] };
    case 'gameOver':
      // The simulation decides; the panel follows whatever layer was showing.
      return state.run && state.run !== 'over' ? stay({ ...state, run: 'over' }) : stay(state);
    case 'retry':
      if (state.screen !== 'game' || (state.run !== 'over' && state.run !== 'paused')) return stay(state);
      return {
        state: { ...state, run: 'playing', pausedFrom: 'playing' },
        effects: [{ type: 'restartRun' }, { type: 'clearInput' }],
      };
    case 'quitToMenu':
      if (state.screen !== 'game') return stay(state);
      return { state: { ...INITIAL_STATE }, effects: [{ type: 'endRun' }] };
    case 'quitToChallenges':
      if (state.screen !== 'game') return stay(state);
      return { state: { ...INITIAL_STATE, screen: 'challenges' }, effects: [{ type: 'endRun' }] };
  }
}

/** True when the simulation should be ticking. */
export function isSimulating(state: AppState): boolean {
  return state.screen === 'game' && state.run === 'playing';
}
