import { describe, expect, it } from 'vitest';
import { INITIAL_STATE, isSimulating, transition, type Action, type AppState, type Effect } from '../../src/ui/state';

function run(actions: Action[], from: AppState = INITIAL_STATE): { state: AppState; effects: Effect[] } {
  let state = from;
  const effects: Effect[] = [];
  for (const action of actions) {
    const result = transition(state, action);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const types = (effects: Effect[]) => effects.map((effect) => effect.type);

describe('app state machine', () => {
  it('starts an endless run from the menu', () => {
    const { state, effects } = run([{ type: 'play' }]);
    expect(state.screen).toBe('game');
    expect(state.run).toBe('playing');
    expect(effects).toEqual([{ type: 'startRun', challengeId: null }]);
    expect(isSimulating(state)).toBe(true);
  });

  it('starts a challenge only from the challenge list', () => {
    expect(run([{ type: 'startChallenge', id: 'c1' }]).state).toEqual(INITIAL_STATE);
    const { state, effects } = run([{ type: 'openChallenges' }, { type: 'startChallenge', id: 'c1' }]);
    expect(state.run).toBe('playing');
    expect(effects).toEqual([{ type: 'startRun', challengeId: 'c1' }]);
  });

  it('pauses on focus loss and resumes through a countdown with cleared input', () => {
    const paused = run([{ type: 'play' }, { type: 'focusLost' }]);
    expect(paused.state.run).toBe('paused');
    expect(types(paused.effects)).toContain('clearInput');
    expect(isSimulating(paused.state)).toBe(false);

    const counting = run([{ type: 'resume' }], paused.state);
    expect(counting.state.run).toBe('countdown');
    expect(types(counting.effects)).toEqual(['clearInput']);
    expect(isSimulating(counting.state)).toBe(false);

    expect(run([{ type: 'countdownDone' }], counting.state).state.run).toBe('playing');
  });

  it('losing focus during the countdown goes back to pause', () => {
    const { state } = run([{ type: 'play' }, { type: 'pause' }, { type: 'resume' }, { type: 'focusLost' }]);
    expect(state.run).toBe('paused');
  });

  it('ignores countdownDone when not counting', () => {
    const { state } = run([{ type: 'play' }, { type: 'pause' }, { type: 'countdownDone' }]);
    expect(state.run).toBe('paused');
  });

  it('Back: menu exits, sub-screens return, play pauses, pause resumes, results go to the menu', () => {
    expect(types(run([{ type: 'back' }]).effects)).toEqual(['exitApp']);
    expect(run([{ type: 'openChallenges' }, { type: 'back' }]).state.screen).toBe('menu');
    expect(run([{ type: 'openSettings' }, { type: 'openAbout' }, { type: 'back' }]).state.screen).toBe('settings');
    expect(run([{ type: 'openSettings' }, { type: 'back' }]).state.screen).toBe('menu');
    expect(run([{ type: 'play' }, { type: 'back' }]).state.run).toBe('paused');
    expect(run([{ type: 'play' }, { type: 'back' }, { type: 'back' }]).state.run).toBe('countdown');
    const over = run([{ type: 'play' }, { type: 'gameOver' }, { type: 'back' }]);
    expect(over.state).toEqual(INITIAL_STATE);
    expect(types(over.effects)).toContain('endRun');
  });

  it('opens settings from pause and returns to the paused run', () => {
    const inSettings = run([{ type: 'play' }, { type: 'pause' }, { type: 'openSettings' }]);
    expect(inSettings.state.screen).toBe('settings');
    expect(inSettings.state.run).toBe('paused');
    expect(types(inSettings.effects)).not.toContain('endRun');
    const back = run([{ type: 'back' }], inSettings.state);
    expect(back.state.screen).toBe('game');
    expect(back.state.run).toBe('paused');
    // About from there still returns to settings, then to the pause panel.
    const viaAbout = run([{ type: 'openAbout' }, { type: 'back' }, { type: 'back' }], inSettings.state);
    expect(viaAbout.state.screen).toBe('game');
  });

  it('does not open settings during play', () => {
    expect(run([{ type: 'play' }, { type: 'openSettings' }]).state.screen).toBe('game');
  });

  it('stage complete waits for continue; Back opens pause and returns to the panel', () => {
    const done = run([{ type: 'play' }, { type: 'stageCompleted' }]);
    expect(done.state.run).toBe('stageComplete');
    expect(isSimulating(done.state)).toBe(false);
    expect(run([{ type: 'focusLost' }], done.state).state.run).toBe('stageComplete');

    const paused = run([{ type: 'back' }], done.state);
    expect(paused.state.run).toBe('paused');
    expect(run([{ type: 'resume' }], paused.state).state.run).toBe('stageComplete');

    const next = run([{ type: 'continue' }], done.state);
    expect(next.state.run).toBe('playing');
    expect(types(next.effects)).toEqual(['continueStage', 'clearInput']);
  });

  it('continue is ignored outside the stage panel', () => {
    expect(run([{ type: 'play' }, { type: 'continue' }]).effects).toEqual([{ type: 'startRun', challengeId: null }]);
  });

  it('game over wins over any layer and retry restarts in place', () => {
    const over = run([{ type: 'play' }, { type: 'pause' }, { type: 'gameOver' }]);
    expect(over.state.run).toBe('over');
    const again = run([{ type: 'retry' }], over.state);
    expect(again.state.run).toBe('playing');
    expect(types(again.effects)).toEqual(['restartRun', 'clearInput']);
  });

  it('retry from pause restarts, but not from play', () => {
    expect(types(run([{ type: 'play' }, { type: 'pause' }, { type: 'retry' }]).effects)).toContain('restartRun');
    expect(types(run([{ type: 'play' }, { type: 'retry' }]).effects)).not.toContain('restartRun');
  });

  it('quitting ends the run and lands on the chosen screen', () => {
    const menu = run([{ type: 'play' }, { type: 'pause' }, { type: 'quitToMenu' }]);
    expect(menu.state).toEqual(INITIAL_STATE);
    expect(types(menu.effects)).toContain('endRun');
    const list = run([{ type: 'play' }, { type: 'gameOver' }, { type: 'quitToChallenges' }]);
    expect(list.state.screen).toBe('challenges');
    expect(list.state.run).toBeNull();
  });

  it('never mutates the state it is given', () => {
    const frozen = Object.freeze({ ...INITIAL_STATE });
    expect(() => transition(frozen, { type: 'play' })).not.toThrow();
  });
});
