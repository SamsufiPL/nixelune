/**
 * Game screen controller: owns the loop, the renderer and the input layers for one
 * mounted screen. The run itself (`Session`) outlives it, so the screen can be taken
 * down for settings and rebuilt on the same game.
 */
import { TICK_MS, type Command, type GameEvent } from '../../game/types';
import { BoardRenderer, type RenderOptions } from '../../render/boardRenderer';
import { columnPitch } from '../../render/hex';
import { describeBoard } from '../a11y';
import type { AppContext, ScreenView } from '../context';
import { el } from '../dom';
import { formatCount, pointsText } from '../format';
import { keyIntent } from '../input/keyboard';
import { KeyRepeater } from '../input/keyRepeat';
import { bindBoardTouch } from '../input/touch';
import { createLoop } from '../loop';
import { createPerfProbe } from '../perfProbe';
import type { Session } from '../session';
import type { RunLayer } from '../state';
import { createHud } from './gameHud';
import { overPanel, pausePanel, stagePanel, type Panel } from './gamePanels';

export interface GameScreenHooks {
  /** A stage ended or the run is over: the shell records the result at once. */
  onResult(final: boolean): void;
  onTutorialSeen(): void;
}

export interface GameScreen extends ScreenView {
  setLayer(layer: RunLayer): void;
  /** Forget held keys and touches. */
  clearInput(): void;
  /** The session was restarted in place. */
  onRestart(): void;
}

/** Length of one countdown beat, ms. Three beats: short enough not to nag. */
export const COUNTDOWN_STEP_MS = 600;
/** Frames without anything to draw before the loop goes to sleep. */
const IDLE_FRAMES = 20;

export function createGameScreen(ctx: AppContext, session: Session, hooks: GameScreenHooks): GameScreen {
  const { services, i18n } = ctx;
  const renderOptions = (): RenderOptions => {
    const prefs = ctx.prefs();
    return {
      marks: prefs.marks,
      highContrast: prefs.highContrast,
      reducedMotion: prefs.reducedMotion,
      formatNumber: (value) => formatCount(i18n, value),
    };
  };

  const hud = createHud(ctx, session.challenge !== null, renderOptions());
  const root = el('div', { class: 'game-screen' }, hud.root);
  const renderer = new BoardRenderer(hud.canvas, ctx.skin(), renderOptions());
  const repeater = new KeyRepeater();
  const perf = createPerfProbe(root);
  let layer: RunLayer = 'playing';
  let panel: Panel | null = null;
  let countdownNode: HTMLElement | null = null;
  let countdownTimer = 0;
  let idleFrames = 0;
  let disposed = false;

  // --- Commands ------------------------------------------------------------------

  const send = (command: Command): void => {
    if (layer !== 'playing') return;
    session.game.apply(command);
    idleFrames = 0;
  };

  const touch = bindBoardTouch(hud.canvas, send);

  const press = (button: HTMLButtonElement, command: Command): void => {
    // Pointer down acts at once for fingers; click covers mouse, keyboard and switch access.
    let handledAt = -Infinity;
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'mouse' || button.disabled) return;
        handledAt = event.timeStamp;
        send(command);
      },
      { passive: true },
    );
    button.addEventListener('click', (event) => {
      if (event.timeStamp - handledAt > 700) send(command);
    });
  };
  press(hud.rotate, 'rotateCw');
  press(hud.drop, 'drop');
  press(hud.swap, 'swap');
  hud.pause.addEventListener('click', () => ctx.dispatch({ type: 'pause' }));
  hud.describe.addEventListener('click', () => {
    const summary = describeBoard(session.game.view, i18n, ctx.skin().meta.marks);
    hud.fallback.textContent = summary;
    ctx.announcer.announce(summary, true);
  });

  // --- First-run hints -----------------------------------------------------------

  let tutorialStep = session.challenge || services.save.data.tutorialSeen ? 0 : 1;
  const showTutorial = (): void => {
    hud.setHint(tutorialStep === 1 ? 'tutorial.join' : tutorialStep === 2 ? 'tutorial.rotate' : null);
  };
  const advanceTutorial = (): void => {
    if (tutorialStep === 0) return;
    tutorialStep = tutorialStep === 1 ? 2 : 0;
    showTutorial();
    if (tutorialStep === 0) hooks.onTutorialSeen();
  };
  showTutorial();

  // --- Events to sound, touch feedback, speech and state -------------------------

  function route(events: readonly GameEvent[]): void {
    const { audio, haptics } = services;
    for (const event of events) {
      switch (event.type) {
        case 'moved':
          audio.play('move');
          haptics.fire('tick');
          break;
        case 'rotated':
          audio.play('rotate');
          haptics.fire('tick');
          break;
        case 'blocked':
          audio.play('blocked');
          break;
        case 'swapped':
          audio.play('swap');
          haptics.fire('tick');
          break;
        case 'locked':
          audio.play('land');
          haptics.fire('land');
          advanceTutorial();
          break;
        case 'activated':
          audio.play('activate', { step: event.chain });
          haptics.fire('activate');
          if (event.chain <= 1) ctx.announcer.announce(pointsText(i18n, 'a11y.activated', event.points));
          break;
        case 'chainEnded':
          if (event.length >= 2) {
            ctx.announcer.announce(
              i18n.t('a11y.chain', { count: event.points, value: formatCount(i18n, event.points), length: event.length }),
              true,
            );
          }
          break;
        case 'stageCompleted':
          audio.play('stageComplete');
          session.stageBonus = event.bonus;
          session.completedStage = event.stage;
          hooks.onResult(false);
          ctx.announcer.announce(
            `${i18n.t('stage.subtitle', { stage: event.stage })}. ${pointsText(i18n, 'stage.bonus', event.bonus)}`,
            true,
          );
          ctx.dispatch({ type: 'stageCompleted' });
          break;
        case 'over':
          audio.play('over');
          haptics.fire('over');
          hooks.onResult(true);
          ctx.announcer.announce(i18n.t('a11y.over', { value: formatCount(i18n, event.score) }), true);
          ctx.dispatch({ type: 'gameOver' });
          break;
        default:
          break;
      }
    }
  }

  // --- Loop ----------------------------------------------------------------------

  const loop = createLoop(TICK_MS, {
    simulating: () => layer === 'playing',
    tick: () => session.game.tick(),
    frame: (now) => {
      if (layer === 'playing') {
        const steps = repeater.due(performance.now());
        const dir = repeater.current;
        if (dir) for (let i = 0; i < steps; i++) send(dir);
      }
      const game = session.game;
      const events = game.drainEvents();
      if (events.length > 0) {
        renderer.handleEvents(events, now);
        route(events);
      }
      const view = game.view;
      hud.update(view);
      const drew = renderer.render(view, now);
      perf?.sample(drew, renderer.lastDrawMs, renderer.liveParticles);
      // Nothing moves outside play: let the loop rest once the last effect has finished.
      if (layer === 'playing' || drew || events.length > 0) idleFrames = 0;
      else if (++idleFrames > IDLE_FRAMES) loop.stop();
    },
  });

  const wake = (): void => {
    idleFrames = 0;
    if (!disposed) loop.start();
  };

  // --- Board size ----------------------------------------------------------------

  const fit = (): void => {
    const view = session.game.view;
    const width = hud.canvas.clientWidth;
    const height = hud.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.resize(width, height, window.devicePixelRatio || 1, view.cols, view.rows);
    touch.setColumnPx(columnPitch(renderer.boardMetrics.r));
    // Draw in the same task as the resize so the canvas never shows a blank frame.
    renderer.render(view, loop.now);
    wake();
  };
  const observer = new ResizeObserver(fit);
  observer.observe(hud.canvas);

  // --- Layers --------------------------------------------------------------------

  function closePanel(): void {
    panel?.root.remove();
    panel = null;
    hud.root.inert = false;
  }

  function openPanel(next: Panel): void {
    panel = next;
    hud.root.inert = true;
    root.append(next.root);
    next.primary.focus({ preventScroll: true });
  }

  function stopCountdown(): void {
    window.clearTimeout(countdownTimer);
    countdownNode?.remove();
    countdownNode = null;
  }

  function startCountdown(): void {
    const node = el('div', { class: 'countdown', 'aria-hidden': 'true' });
    countdownNode = node;
    hud.frame.append(node);
    let left = 3;
    const beat = (): void => {
      if (left === 0) {
        stopCountdown();
        ctx.dispatch({ type: 'countdownDone' });
        return;
      }
      node.replaceChildren(el('span', null, String(left)));
      left--;
      countdownTimer = window.setTimeout(beat, COUNTDOWN_STEP_MS);
    };
    beat();
  }

  function clearInput(): void {
    repeater.reset();
    touch.reset();
  }

  function setLayer(next: RunLayer): void {
    layer = next;
    closePanel();
    stopCountdown();
    clearInput();
    switch (next) {
      case 'playing':
        hud.canvas.focus({ preventScroll: true });
        break;
      case 'countdown':
        startCountdown();
        break;
      case 'paused':
        openPanel(pausePanel(ctx, session));
        break;
      case 'stageComplete':
        openPanel(stagePanel(ctx, session));
        break;
      case 'over':
        openPanel(overPanel(ctx, session, session.game.view));
        break;
    }
    wake();
  }

  // --- Keyboard ------------------------------------------------------------------

  function onKey(event: KeyboardEvent, down: boolean): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const intent = keyIntent(event.code, event.key);
    if (!intent) return;
    if (layer !== 'playing') {
      // Panels are driven by their own buttons; two shortcuts from the instructions remain.
      if (!down || event.repeat) return;
      if (intent.kind === 'pause' && layer === 'paused') ctx.dispatch({ type: 'resume' });
      else if (intent.kind === 'restart' && (layer === 'paused' || layer === 'over')) ctx.dispatch({ type: 'retry' });
      return;
    }
    // In play the keys belong to the game, whatever element has focus.
    event.preventDefault();
    if (intent.kind === 'move') {
      if (!down) repeater.release(intent.dir, performance.now());
      else if (repeater.press(intent.dir, performance.now())) send(intent.dir);
      return;
    }
    if (!down || event.repeat) return;
    if (intent.kind === 'command') send(intent.command);
    else if (intent.kind === 'pause') ctx.dispatch({ type: 'pause' });
  }

  return {
    root,
    setLayer,
    clearInput,
    onRestart() {
      renderer.clearEffects();
      session.game.drainEvents();
      tutorialStep = session.challenge || services.save.data.tutorialSeen ? 0 : 1;
      showTutorial();
      wake();
    },
    refresh() {
      const options = renderOptions();
      // A skin switch changes the bed padding, and with it the frame's proportions.
      renderer.setSkin(ctx.skin());
      renderer.setOptions(options);
      hud.restyle(options);
      hud.relabel(session.game.view);
      // An open panel is rebuilt in the new language.
      if (panel) setLayer(layer);
      wake();
    },
    focus() {
      if (panel) panel.primary.focus({ preventScroll: true });
      else hud.canvas.focus({ preventScroll: true });
    },
    onKey,
    dispose() {
      disposed = true;
      perf?.dispose();
      loop.stop();
      observer.disconnect();
      touch.dispose();
      stopCountdown();
    },
  };
}
