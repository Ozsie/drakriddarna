import { describe, it, expect } from 'vitest';
import { deepMerge, isObject, loadTranslations, t } from './index';
import { DifficultLevels } from '../../core';

describe('translations', () => {
  describe('isObject', () => {
    it('identifies plain objects and excludes null/arrays/primitives', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('merges shallow non-overlapping objects', () => {
      const a = { x: 1 };
      const b = { y: 2 };
      expect(deepMerge(a, b)).toEqual({ x: 1, y: 2 });
    });

    it('overwrites primitive values from source', () => {
      const a = { x: 1, y: 2 };
      const b = { y: 3 };
      expect(deepMerge(a, b)).toEqual({ x: 1, y: 3 });
    });

    it('recursively merges nested objects without overwriting siblings', () => {
      const a = {
        gameMaster: {
          storyTeller: { name: 'Story Teller' },
        },
      };
      const b = {
        gameMaster: {
          tactician: { name: 'Tactician' },
        },
      };
      const c = {
        gameMaster: {
          brutalOverlord: { name: 'Brutal Overlord' },
        },
      };

      const merged = deepMerge(deepMerge(a, b), c);
      expect(merged).toEqual({
        gameMaster: {
          storyTeller: { name: 'Story Teller' },
          tactician: { name: 'Tactician' },
          brutalOverlord: { name: 'Brutal Overlord' },
        },
      });
    });
  });

  describe('game master translation loading', () => {
    it('loads and merges translations for all game masters in Swedish', async () => {
      await loadTranslations('sv');

      for (const gm of DifficultLevels) {
        const nameKey = gm.nameTranslationKey;
        expect(nameKey).toBeDefined();
        const translatedName = t.get(nameKey) as string;
        expect(translatedName).toBeDefined();
        expect(translatedName).not.toBe(nameKey);
        expect(typeof translatedName).toBe('string');
        expect(translatedName.length).toBeGreaterThan(0);

        const descKey = gm.descriptionTranslationKey;
        if (descKey) {
          const translatedDesc = t.get(descKey) as string;
          expect(translatedDesc).toBeDefined();
          expect(translatedDesc).not.toBe(descKey);
        }
      }
    });

    it('loads and merges translations for all game masters in English', async () => {
      await loadTranslations('en');

      for (const gm of DifficultLevels) {
        const nameKey = gm.nameTranslationKey;
        expect(nameKey).toBeDefined();
        const translatedName = t.get(nameKey) as string;
        expect(translatedName).toBeDefined();
        expect(translatedName).not.toBe(nameKey);
        expect(typeof translatedName).toBe('string');
        expect(translatedName.length).toBeGreaterThan(0);

        const descKey = gm.descriptionTranslationKey;
        if (descKey) {
          const translatedDesc = t.get(descKey) as string;
          expect(translatedDesc).toBeDefined();
          expect(translatedDesc).not.toBe(descKey);
        }
      }
    });
  });
});
