// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FakeLifecycle, LifecycleHub, WebLifecycle } from '../../src/services/lifecycle';

function record(hub: LifecycleHub): string[] {
  const events: string[] = [];
  hub.onPause(() => events.push('pause'));
  hub.onResume(() => events.push('resume'));
  hub.onBack(() => events.push('back'));
  return events;
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('LifecycleHub', () => {
  it('notifies every listener in order', () => {
    const hub = new LifecycleHub();
    const calls: number[] = [];
    hub.onPause(() => calls.push(1));
    hub.onPause(() => calls.push(2));
    hub.emitPause();
    expect(calls).toEqual([1, 2]);
  });

  it('de-duplicates pause and resume', () => {
    const hub = new LifecycleHub();
    const events = record(hub);
    hub.emitResume();
    hub.emitPause();
    hub.emitPause();
    expect(hub.isPaused).toBe(true);
    hub.emitResume();
    hub.emitResume();
    expect(events).toEqual(['pause', 'resume']);
  });

  it('passes every back press', () => {
    const hub = new LifecycleHub();
    const events = record(hub);
    hub.emitBack();
    hub.emitBack();
    expect(events).toEqual(['back', 'back']);
  });

  it('logs a throwing listener and still calls the rest', () => {
    const logged: string[] = [];
    const hub = new LifecycleHub((_scope, message) => logged.push(message));
    hub.onPause(() => {
      throw new Error('boom');
    });
    const events = record(hub);
    expect(() => hub.emitPause()).not.toThrow();
    expect(events).toEqual(['pause']);
    expect(logged).toEqual(['pause listener failed']);
  });
});

describe('WebLifecycle', () => {
  it('pauses when the page is hidden and resumes when it shows again', () => {
    const lifecycle = new WebLifecycle(document, window);
    const events = record(lifecycle);
    setVisibility('hidden');
    setVisibility('visible');
    expect(events).toEqual(['pause', 'resume']);
  });

  it('pauses on blur and resumes on focus, once per transition', () => {
    setVisibility('visible');
    const lifecycle = new WebLifecycle(document, window);
    const events = record(lifecycle);
    window.dispatchEvent(new Event('blur'));
    setVisibility('hidden');
    expect(events).toEqual(['pause']);
    window.dispatchEvent(new Event('focus'));
    expect(events).toEqual(['pause']);
    setVisibility('visible');
    window.dispatchEvent(new Event('focus'));
    expect(events).toEqual(['pause', 'resume']);
  });

  it('pauses on pagehide', () => {
    setVisibility('visible');
    const lifecycle = new WebLifecycle(document, window);
    const events = record(lifecycle);
    window.dispatchEvent(new Event('pagehide'));
    expect(events).toEqual(['pause']);
  });

  it('has no Back and exit is a harmless no-op', () => {
    const lifecycle = new WebLifecycle(document, window);
    const events = record(lifecycle);
    expect(() => lifecycle.exitApp()).not.toThrow();
    expect(events).toEqual([]);
  });

  it('logs when subscribing fails', () => {
    const logged: string[] = [];
    const broken = {
      addEventListener() {
        throw new Error('nope');
      },
    } as unknown as Document;
    expect(() => new WebLifecycle(broken, window, (_scope, message) => logged.push(message))).not.toThrow();
    expect(logged).toHaveLength(1);
  });
});

describe('FakeLifecycle', () => {
  it('lets a test trigger everything and counts exits', () => {
    const lifecycle = new FakeLifecycle();
    const events = record(lifecycle);
    lifecycle.emitPause();
    lifecycle.emitResume();
    lifecycle.emitBack();
    lifecycle.exitApp();
    expect(events).toEqual(['pause', 'resume', 'back']);
    expect(lifecycle.exitCalls).toBe(1);
  });
});
