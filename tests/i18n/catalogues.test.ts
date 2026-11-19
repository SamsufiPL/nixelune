import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../../src/platform/types';
import type { LanguageCode, Message } from '../../src/platform/types';
import { CATALOGUES, placeholdersOf } from '../../src/services/i18n';

/** Plural categories a language distinguishes for cardinal numbers (CLDR). */
const REQUIRED_PLURALS: Record<LanguageCode, readonly string[]> = {
  pl: ['one', 'few', 'many', 'other'],
  en: ['one', 'other'],
};

const reference = LANGUAGES[0] as LanguageCode;
const referenceKeys = Object.keys(CATALOGUES[reference]).sort();

function forms(message: Message): [string, string][] {
  return typeof message === 'string' ? [['text', message]] : Object.entries(message);
}

describe('message catalogues', () => {
  it('covers every language of the game', () => {
    expect(Object.keys(CATALOGUES).sort()).toEqual([...LANGUAGES].sort());
    expect(Object.keys(REQUIRED_PLURALS).sort()).toEqual([...LANGUAGES].sort());
  });

  it('the plural table matches what Intl.PluralRules reports', () => {
    for (const language of LANGUAGES) {
      const reported = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
      expect([...reported].sort(), language).toEqual([...REQUIRED_PLURALS[language]].sort());
    }
  });

  it('has at least one message', () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  for (const language of LANGUAGES) {
    const catalogue = CATALOGUES[language];

    describe(language, () => {
      it(`has exactly the keys of ${reference}`, () => {
        const keys = Object.keys(catalogue).sort();
        const missing = referenceKeys.filter((key) => !Object.hasOwn(catalogue, key));
        const extra = keys.filter((key) => !Object.hasOwn(CATALOGUES[reference], key));
        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
      });

      it(`uses the same placeholders as ${reference} in every message`, () => {
        const different: Record<string, { expected: string[]; actual: string[] }> = {};
        for (const key of Object.keys(catalogue)) {
          const other = CATALOGUES[reference][key];
          if (other === undefined) continue;
          const expected = placeholdersOf(other);
          const actual = placeholdersOf(catalogue[key] as Message);
          if (expected.join(',') !== actual.join(',')) different[key] = { expected, actual };
        }
        expect(different).toEqual({});
      });

      it('gives every plural message all the forms the language needs', () => {
        const incomplete: Record<string, string[]> = {};
        for (const [key, message] of Object.entries(catalogue)) {
          if (typeof message === 'string') continue;
          const present = message as Partial<Record<string, string>>;
          const missing = REQUIRED_PLURALS[language].filter((category) => typeof present[category] !== 'string');
          if (missing.length > 0) incomplete[key] = missing;
        }
        expect(incomplete).toEqual({});
      });

      it('has no empty or blank text', () => {
        const empty: string[] = [];
        for (const [key, message] of Object.entries(catalogue)) {
          for (const [form, text] of forms(message)) {
            if (typeof text !== 'string' || text.trim() === '') empty.push(`${key} (${form})`);
          }
        }
        expect(empty).toEqual([]);
      });

      it('has no empty keys', () => {
        expect(Object.keys(catalogue).filter((key) => key.trim() === '')).toEqual([]);
      });
    });
  }
});
