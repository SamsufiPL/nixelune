import { describe, expect, it } from 'vitest';
import type { Message } from '../../src/platform/types';
import { createI18n, formatMessage, placeholdersOf, resolveLanguage } from '../../src/services/i18n';
import type { Catalogues } from '../../src/services/i18n';
import type { Logger } from '../../src/services/log';

const tiles: Message = { one: '{count} tile', other: '{count} tiles' };
const catalogues: Catalogues = {
  en: {
    hello: 'Hello, {name}!',
    tiles,
    onlyEnglish: 'English only',
    plain: 'Plain',
  },
  pl: {
    hello: 'Cześć, {name}!',
    tiles: { one: '{count} kafel', few: '{count} kafle', many: '{count} kafli', other: '{count} kafla' },
    plain: 'Zwykły',
  },
};

function make(system: readonly string[] = [], logged: string[] = []) {
  const log: Logger = (_scope, message) => logged.push(message);
  return createI18n({ catalogues, systemLanguages: () => system, log });
}

describe('resolveLanguage', () => {
  it('returns an explicit choice', () => {
    expect(resolveLanguage('pl', ['en-US'])).toBe('pl');
    expect(resolveLanguage('en', ['pl-PL'])).toBe('en');
  });

  it('takes the first supported device language, ignoring region and case', () => {
    expect(resolveLanguage('system', ['de-DE', 'pl-PL', 'en-US'])).toBe('pl');
    expect(resolveLanguage('system', ['PL'])).toBe('pl');
    expect(resolveLanguage('system', ['en_GB'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(resolveLanguage('system', [])).toBe('en');
    expect(resolveLanguage('system', ['de', 'fr-FR'])).toBe('en');
    expect(resolveLanguage('xx' as 'pl', ['pl'])).toBe('en');
  });
});

describe('formatMessage', () => {
  it('replaces placeholders and leaves unknown ones visible', () => {
    expect(formatMessage('a {x} b {y}', 'en', { x: 1 })).toBe('a 1 b {y}');
    expect(formatMessage('a {x}', 'en')).toBe('a {x}');
    expect(formatMessage('{toString}', 'en', {})).toBe('{toString}');
  });

  it('selects Polish plural forms', () => {
    const message = catalogues.pl.tiles as Message;
    expect(formatMessage(message, 'pl', { count: 1 })).toBe('1 kafel');
    expect(formatMessage(message, 'pl', { count: 2 })).toBe('2 kafle');
    expect(formatMessage(message, 'pl', { count: 4 })).toBe('4 kafle');
    expect(formatMessage(message, 'pl', { count: 5 })).toBe('5 kafli');
    expect(formatMessage(message, 'pl', { count: 12 })).toBe('12 kafli');
    expect(formatMessage(message, 'pl', { count: 22 })).toBe('22 kafle');
    expect(formatMessage(message, 'pl', { count: 0 })).toBe('0 kafli');
    expect(formatMessage(message, 'pl', { count: 1.5 })).toBe('1.5 kafla');
  });

  it('selects English plural forms', () => {
    expect(formatMessage(tiles, 'en', { count: 1 })).toBe('1 tile');
    expect(formatMessage(tiles, 'en', { count: 0 })).toBe('0 tiles');
    expect(formatMessage(tiles, 'en', { count: 7 })).toBe('7 tiles');
  });

  it('uses "other" without a numeric count or when a form is missing', () => {
    expect(formatMessage(tiles, 'en')).toBe('{count} tiles');
    expect(formatMessage({ other: 'x' }, 'pl', { count: 1 })).toBe('x');
  });
});

describe('placeholdersOf', () => {
  it('collects names from all forms, sorted and unique', () => {
    expect(placeholdersOf('{b} {a} {b}')).toEqual(['a', 'b']);
    expect(placeholdersOf({ one: 'one', other: '{count} of {total}' })).toEqual(['count', 'total']);
    expect(placeholdersOf('none')).toEqual([]);
  });
});

describe('createI18n', () => {
  it('starts in the device language', () => {
    expect(make(['pl-PL']).language).toBe('pl');
    expect(make(['fr-FR']).language).toBe('en');
  });

  it('translates with parameters and plurals', () => {
    const i18n = make(['pl']);
    expect(i18n.t('hello', { name: 'Ada' })).toBe('Cześć, Ada!');
    expect(i18n.t('tiles', { count: 3 })).toBe('3 kafle');
    i18n.setLanguage('en');
    expect(i18n.t('tiles', { count: 3 })).toBe('3 tiles');
  });

  it('falls back to English, then to the key, logging each gap once', () => {
    const logged: string[] = [];
    const i18n = make(['pl'], logged);
    expect(i18n.t('onlyEnglish')).toBe('English only');
    expect(i18n.t('onlyEnglish')).toBe('English only');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
    expect(i18n.t('toString')).toBe('toString');
    expect(logged.filter((line) => line.includes('onlyEnglish'))).toHaveLength(1);
    expect(logged.filter((line) => line.includes('no.such.key'))).toHaveLength(1);
  });

  it('notifies listeners only when the language really changes', () => {
    const i18n = make(['pl']);
    let calls = 0;
    i18n.onChange(() => {
      calls += 1;
    });
    i18n.setLanguage('pl');
    i18n.setLanguage('system');
    expect(calls).toBe(0);
    i18n.setLanguage('en');
    expect(calls).toBe(1);
    expect(i18n.language).toBe('en');
    i18n.setLanguage('system');
    expect(calls).toBe(2);
    expect(i18n.language).toBe('pl');
  });

  it('survives a throwing listener', () => {
    const logged: string[] = [];
    const i18n = make([], logged);
    let reached = false;
    i18n.onChange(() => {
      throw new Error('boom');
    });
    i18n.onChange(() => {
      reached = true;
    });
    expect(() => i18n.setLanguage('pl')).not.toThrow();
    expect(reached).toBe(true);
    expect(logged.some((line) => line.includes('listener'))).toBe(true);
  });

  it('formats numbers for the language', () => {
    const i18n = make([]);
    expect(i18n.formatNumber(1234567)).toBe('1,234,567');
    i18n.setLanguage('pl');
    expect(i18n.formatNumber(1234567).replace(/\s/g, ' ')).toBe('1 234 567');
  });
});
