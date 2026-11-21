import { describe, it, expect } from 'vitest';
import {
  deepMerge,
  isObject,
  loadCampaignTranslations,
  loadContentWithGameMasters,
  loadLogsWithCampaigns,
  loadTranslations,
  t,
} from './index';
import { DifficultLevels } from '../../core';
import { armour, monsterArmour } from '../../items/armours';
import { magicItems } from '../../items/magicItems';
import { shields, monsterShields } from '../../items/shields';
import { weapons, monsterWeapons } from '../../items/weapons';

const equipment = [
  ...armour,
  ...monsterArmour,
  ...shields,
  ...monsterShields,
  ...weapons,
  ...monsterWeapons,
];

const delay = (ms: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

type TranslationModule = () => Promise<{ default: Record<string, unknown> }>;

const moduleOf =
  (value: Record<string, unknown>, delayMs = 0): TranslationModule =>
  async () => {
    if (delayMs > 0) await delay(delayMs);
    return { default: value };
  };

const effectTranslationKeys = [
  'items.armour.plateMail.effect',
  'items.armour.dragonSkinMail.effect',
  'items.weapons.twoHandedSword.effect',
  'items.weapons.halberd.effect',
  'items.magicItems.boots.effect',
  'items.magicItems.giantsGlove.effect',
  'items.magicItems.ringOfPrecision.effect',
  'items.magicItems.crownOfWisdom.effect',
  'events.timePortal.effect',
  'events.sleepingGas.effect',
  'events.dragonsBreath.effect',
  'events.elementalWeapon.effect',
  'events.weakness.effect',
];

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

  describe('discovered translation loading', () => {
    it('starts every discovered module load before waiting on any of them', async () => {
      const total = 4;
      const started: number[] = [];
      let release: () => void;
      const gate = new Promise<void>((resolvePromise) => {
        release = resolvePromise;
      });
      const modules: Record<string, TranslationModule> = {};
      for (let index = 0; index < total; index++) {
        modules[`module${index}`] = async () => {
          started.push(index);
          // The gate only opens once every loader has started; a sequential
          // implementation awaits this loader before ever calling the rest and
          // never reaches it.
          if (started.length === total) release();
          await gate;
          return { default: { index } };
        };
      }

      const merged = await loadCampaignTranslations(modules);

      expect(started.length).toBe(total);
      expect(merged).toEqual({ index: total - 1 });
    });

    it('merges resolved modules in their original order regardless of completion order', async () => {
      const modules: Record<string, TranslationModule> = {
        slowFirst: moduleOf({ title: 'slow-first', own: 'slow-first' }, 25),
        quickSecond: moduleOf({ title: 'quick-second' }),
      };

      const merged = await loadCampaignTranslations(modules);

      expect(merged).toEqual({
        title: 'quick-second',
        own: 'slow-first',
      });
    });

    it('deep-merges overlapping nested keys with the later module winning conflicts', async () => {
      const modules: Record<string, TranslationModule> = {
        first: moduleOf({ shared: { keep: 'keep', leaf: 'first' } }, 20),
        second: moduleOf({ shared: { leaf: 'second' } }),
      };

      const merged = await loadCampaignTranslations(modules);

      expect(merged).toEqual({ shared: { keep: 'keep', leaf: 'second' } });
    });

    it('rejects when a discovered module fails to load', async () => {
      const modules: Record<string, TranslationModule> = {
        fine: moduleOf({ title: 'fine' }),
        broken: () => Promise.reject(new Error('load failed')),
      };

      await expect(loadCampaignTranslations(modules)).rejects.toThrow(
        'load failed',
      );
    });

    it('rejects when a module fails after an earlier one resolved successfully', async () => {
      const modules: Record<string, TranslationModule> = {
        fine: moduleOf({ title: 'fine' }),
        slowBroken: async () => {
          await delay(10);
          throw new Error('late failure');
        },
      };

      await expect(loadCampaignTranslations(modules)).rejects.toThrow(
        'late failure',
      );
    });

    it('keeps game-master translations overriding base content regardless of resolution order', async () => {
      const baseLoader = (delayMs: number) => async () => {
        await delay(delayMs);
        return { content: { shared: 'base', baseOnly: 'base' } };
      };
      const gmModules: Record<string, TranslationModule> = {
        gm: moduleOf({ content: { shared: 'gm' } }, 10),
      };

      const [baseResolvesFirst, gmResolvesFirst] = await Promise.all([
        loadContentWithGameMasters(baseLoader(0), gmModules),
        loadContentWithGameMasters(baseLoader(25), gmModules),
      ]);

      expect(baseResolvesFirst).toEqual({
        content: { shared: 'gm', baseOnly: 'base' },
      });
      expect(gmResolvesFirst).toEqual({
        content: { shared: 'gm', baseOnly: 'base' },
      });
    });

    it('keeps campaign log translations overriding base logs regardless of resolution order', async () => {
      const baseLoader = (delayMs: number) => async () => {
        await delay(delayMs);
        return { logs: { shared: 'base', baseOnly: 'base' } };
      };
      const campaignModules: Record<string, TranslationModule> = {
        campaign: moduleOf({ logs: { shared: 'campaign' } }, 10),
      };

      const [baseResolvesFirst, campaignResolvesFirst] = await Promise.all([
        loadLogsWithCampaigns(baseLoader(0), campaignModules),
        loadLogsWithCampaigns(baseLoader(25), campaignModules),
      ]);

      expect(baseResolvesFirst).toEqual({
        logs: { shared: 'campaign', baseOnly: 'base' },
      });
      expect(campaignResolvesFirst).toEqual({
        logs: { shared: 'campaign', baseOnly: 'base' },
      });
    });
  });

  describe('game master translation loading', () => {
    it('loads and merges translations for all game masters in Swedish', async () => {
      await loadTranslations('sv');

      for (const gm of DifficultLevels) {
        const nameKey = gm.nameTranslationKey;
        expect(nameKey).toBeDefined();
        const translatedName = t.get()(nameKey);
        expect(translatedName).toBeDefined();
        expect(translatedName).not.toBe(nameKey);
        expect(typeof translatedName).toBe('string');
        expect(translatedName.length).toBeGreaterThan(0);

        const descKey = gm.descriptionTranslationKey;
        if (descKey) {
          const translatedDesc = t.get()(descKey);
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
        const translatedName = t.get()(nameKey);
        expect(translatedName).toBeDefined();
        expect(translatedName).not.toBe(nameKey);
        expect(typeof translatedName).toBe('string');
        expect(translatedName.length).toBeGreaterThan(0);

        const descKey = gm.descriptionTranslationKey;
        if (descKey) {
          const translatedDesc = t.get()(descKey);
          expect(translatedDesc).toBeDefined();
          expect(translatedDesc).not.toBe(descKey);
        }
      }
    });
  });

  describe('item and event translations', () => {
    it('resolves updated item names and effect labels in both locales', async () => {
      for (const locale of ['en', 'sv']) {
        await loadTranslations(locale);
        const translate = t.get();

        for (const item of [...equipment, ...magicItems]) {
          const nameKey = item.nameTranslationKey;
          expect(nameKey).toBeDefined();
          expect(translate(nameKey)).not.toBe(nameKey);

          const itemTranslationPrefix = nameKey!.slice(0, -'.name'.length);
          for (const field of ['description', 'thematicDescription']) {
            const fieldKey = `${itemTranslationPrefix}.${field}`;
            expect(translate(fieldKey)).not.toBe(fieldKey);
          }
        }

        for (const key of effectTranslationKeys) {
          const label = translate(key);
          expect(label).not.toBe(key);
          expect(label.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
