import { FALLBACK_LANGUAGE, LANGUAGES } from '../platform/types';
import type { I18n, LanguageCode, Message, MessageParams } from '../platform/types';
import { messages as en } from '../i18n/en';
import { messages as pl } from '../i18n/pl';
import { consoleLogger } from './log';
import type { Logger } from './log';

export type Catalogue = Readonly<Record<string, Message>>;
export type Catalogues = Readonly<Record<LanguageCode, Catalogue>>;

/** Every shipped catalogue, keyed by language. */
export const CATALOGUES: Catalogues = { pl, en };

const PLACEHOLDER = /\{(\w+)\}/g;

/** Names of the `{name}` placeholders used anywhere in a message (all plural forms). */
export function placeholdersOf(message: Message): string[] {
  const texts = typeof message === 'string' ? [message] : Object.values(message);
  const names = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(PLACEHOLDER)) names.add(match[1] ?? '');
  }
  return [...names].sort();
}

function isLanguage(code: string): code is LanguageCode {
  return (LANGUAGES as readonly string[]).includes(code);
}

/** 'pl-PL' -> 'pl'; the first device language the game ships wins, otherwise English. */
export function resolveLanguage(choice: 'system' | LanguageCode, systemLanguages: readonly string[]): LanguageCode {
  if (choice !== 'system') return isLanguage(choice) ? choice : FALLBACK_LANGUAGE;
  for (const tag of systemLanguages) {
    const primary = String(tag).toLowerCase().split(/[-_]/)[0] ?? '';
    if (isLanguage(primary)) return primary;
  }
  return FALLBACK_LANGUAGE;
}

/** Device languages in order of preference; empty when the platform does not say. */
export function readSystemLanguages(): readonly string[] {
  try {
    if (typeof navigator === 'undefined') return [];
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) return navigator.languages;
    return typeof navigator.language === 'string' ? [navigator.language] : [];
  } catch {
    return [];
  }
}

const pluralRules = new Map<LanguageCode, Intl.PluralRules>();
function rulesFor(language: LanguageCode): Intl.PluralRules {
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(language);
    pluralRules.set(language, rules);
  }
  return rules;
}

/** Picks the plural form by `params.count` (rules of `language`) and fills `{name}` placeholders. */
export function formatMessage(message: Message, language: LanguageCode, params?: MessageParams): string {
  let text: string;
  if (typeof message === 'string') {
    text = message;
  } else {
    const count = params?.count;
    const category = typeof count === 'number' ? rulesFor(language).select(count) : 'other';
    const forms: Partial<Record<Intl.LDMLPluralRule, string>> = message;
    text = forms[category] ?? message.other;
  }
  if (!params) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const value = Object.hasOwn(params, name) ? params[name] : undefined;
    return value === undefined ? whole : String(value);
  });
}

export interface I18nOptions {
  readonly catalogues?: Catalogues;
  /** Device languages, read each time 'system' is resolved. */
  readonly systemLanguages?: () => readonly string[];
  readonly log?: Logger;
}

export function createI18n(options: I18nOptions = {}): I18n {
  const catalogues = options.catalogues ?? CATALOGUES;
  const systemLanguages = options.systemLanguages ?? readSystemLanguages;
  const log = options.log ?? consoleLogger;
  const listeners: (() => void)[] = [];
  const reportedMissing = new Set<string>();
  const numberFormats = new Map<LanguageCode, Intl.NumberFormat>();
  let language = resolveLanguage('system', systemLanguages());

  function lookup(key: string): { message: Message; language: LanguageCode } | null {
    const own = catalogues[language];
    if (Object.hasOwn(own, key)) return { message: own[key] as Message, language };
    const fallback = catalogues[FALLBACK_LANGUAGE];
    if (Object.hasOwn(fallback, key)) return { message: fallback[key] as Message, language: FALLBACK_LANGUAGE };
    return null;
  }

  return {
    get language() {
      return language;
    },
    setLanguage(choice) {
      const next = resolveLanguage(choice, systemLanguages());
      if (next === language) return;
      language = next;
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          log('i18n', 'language change listener failed', error);
        }
      }
    },
    t(key, params) {
      const found = lookup(key);
      if (!found || found.language !== language) {
        const mark = `${language}:${key}`;
        if (!reportedMissing.has(mark)) {
          reportedMissing.add(mark);
          log('i18n', `missing message "${key}" for ${language}`);
        }
      }
      if (!found) return key;
      try {
        return formatMessage(found.message, found.language, params);
      } catch (error) {
        log('i18n', `formatting "${key}" failed`, error);
        return key;
      }
    },
    formatNumber(value) {
      try {
        let format = numberFormats.get(language);
        if (!format) {
          format = new Intl.NumberFormat(language);
          numberFormats.set(language, format);
        }
        return format.format(value);
      } catch (error) {
        log('i18n', 'number formatting failed', error);
        return String(value);
      }
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
