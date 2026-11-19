import type { AppLifecycle } from '../platform/types';
import { consoleLogger } from './log';
import type { Logger } from './log';

type Listener = () => void;

/**
 * Listener registry shared by every lifecycle adapter. Pause and resume are
 * de-duplicated: several platform signals for one transition notify once.
 */
export class LifecycleHub {
  private readonly pauseListeners: Listener[] = [];
  private readonly resumeListeners: Listener[] = [];
  private readonly backListeners: Listener[] = [];
  private paused = false;

  constructor(protected readonly log: Logger = consoleLogger) {}

  get isPaused(): boolean {
    return this.paused;
  }

  onPause(listener: Listener): void {
    this.pauseListeners.push(listener);
  }

  onResume(listener: Listener): void {
    this.resumeListeners.push(listener);
  }

  onBack(listener: Listener): void {
    this.backListeners.push(listener);
  }

  emitPause(): void {
    if (this.paused) return;
    this.paused = true;
    this.notify(this.pauseListeners, 'pause');
  }

  emitResume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.notify(this.resumeListeners, 'resume');
  }

  emitBack(): void {
    this.notify(this.backListeners, 'back');
  }

  private notify(listeners: readonly Listener[], name: string): void {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        this.log('lifecycle', `${name} listener failed`, error);
      }
    }
  }
}

/** Browser adapter: a hidden tab or an unfocused window counts as paused. No Back, no exit. */
export class WebLifecycle extends LifecycleHub implements AppLifecycle {
  constructor(doc: Document, win: Window, log: Logger = consoleLogger) {
    super(log);
    try {
      doc.addEventListener('visibilitychange', () => {
        if (doc.visibilityState === 'hidden') this.emitPause();
        else this.emitResume();
      });
      win.addEventListener('blur', () => this.emitPause());
      win.addEventListener('focus', () => {
        if (doc.visibilityState !== 'hidden') this.emitResume();
      });
      win.addEventListener('pagehide', () => this.emitPause());
    } catch (error) {
      log('lifecycle', 'subscribing to page events failed', error);
    }
  }

  exitApp(): void {
    // A web page cannot close itself.
  }
}

/** Used when there is neither a native shell nor a document. */
export class InertLifecycle extends LifecycleHub implements AppLifecycle {
  exitApp(): void {}
}

/** Test double: drive it with `emitPause()`, `emitResume()`, `emitBack()`. */
export class FakeLifecycle extends LifecycleHub implements AppLifecycle {
  exitCalls = 0;

  exitApp(): void {
    this.exitCalls += 1;
  }
}
