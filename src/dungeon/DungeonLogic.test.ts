import { describe, expect, it } from 'vitest';
import { Colour, ItemType, MonsterType } from '../types';
import type { GameState, Hero, Item } from '../types';
import { applyFallbackItems, createMonster } from './DungeonLogic';
import { getMonsterTemplate } from '../monsters/MonsterRegistry';
import {
  MID_TIER_MONSTER_A,
  MID_TIER_MONSTER_B,
} from '../campaigns/brogue/monsters/templates';
import enMonsters from '../lib/translations/en/monsters.json';
import svMonsters from '../lib/translations/sv/monsters.json';
import brogueEn from '../campaigns/brogue/translations/en.json';
import brogueSv from '../campaigns/brogue/translations/sv.json';

const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const localeKeys = (locale: 'en' | 'sv') => {
  const shared = new Set(
    flattenKeys(
      (locale === 'en' ? enMonsters : svMonsters) as Record<string, unknown>,
      'monsters.',
    ),
  );
  const brogue = new Set(
    flattenKeys(
      (locale === 'en' ? brogueEn : brogueSv) as Record<string, unknown>,
      'campaign.',
    ),
  );
  return { shared, brogue };
};

const builtInTypes = [
  MonsterType.ORC,
  MonsterType.TROLL,
  MonsterType.GREEN_DARK_LORD,
  MonsterType.BLUE_DARK_LORD,
  MonsterType.RED_DARK_LORD,
  MonsterType.YELLOW_DARK_LORD,
];

const customTypes = [MID_TIER_MONSTER_A, MID_TIER_MONSTER_B];

describe('createMonster translation keys', () => {
  it('composes the display name key from the template and colour', () => {
    const orc = createMonster(MonsterType.ORC, Colour.Green, 1, 2);
    expect(orc.name).toBe('monsters.orc.green');
    expect(orc.nameTranslationKey).toBe('monsters.orc.green');
  });

  it('gives all dark lord types the shared darkLord key', () => {
    const lord = createMonster(MonsterType.RED_DARK_LORD, Colour.Red, 3, 4);
    expect(lord.name).toBe('monsters.darkLord.red');
    expect(lord.health).toBe(4);
    expect(lord.experience).toBe(4);

    const green = createMonster(MonsterType.GREEN_DARK_LORD, Colour.Blue, 0, 0);
    expect(green.name).toBe('monsters.darkLord.blue');
  });

  it('uses campaign translation keys for campaign-registered monsters', () => {
    const knight = createMonster(MID_TIER_MONSTER_A, Colour.Blue, 5, 6);
    expect(knight.name).toBe('campaign.brogue.monsters.darkKnight.blue');
  });

  it('falls back to the raw display name for unregistered types', () => {
    const monster = createMonster('Ice Golem', Colour.Yellow, 0, 0);
    expect(monster.name).toBe('Ice Golem (Yellow)');
    expect(monster.nameTranslationKey).toBe('Ice Golem (Yellow)');
  });
});

describe('monster name translation coverage', () => {
  it.each([...builtInTypes, ...customTypes])(
    'has both English and Swedish names for every colour of %s',
    (type) => {
      const baseKey = getMonsterTemplate(type)?.nameTranslationKey;
      expect(baseKey).toBeDefined();
      const isShared = baseKey?.startsWith('monsters.');
      Object.values(Colour).forEach((colour) => {
        const monster = createMonster(type, colour, 0, 0);
        (['en', 'sv'] as const).forEach((locale) => {
          const { shared, brogue } = localeKeys(locale);
          const keys = isShared ? shared : brogue;
          expect(keys.has(monster.name)).toBe(true);
        });
      });
    },
  );
});

describe('applyFallbackItems', () => {
  const glove: Item = {
    id: 'giants_glove',
    name: "Giant's Glove",
    type: ItemType.MAGIC,
    amountInDeck: 1,
    value: 0,
  };
  const sword: Item = {
    id: 'some_sword',
    name: 'Sword',
    type: ItemType.WEAPON,
    amountInDeck: 1,
    value: 0,
  };

  const createState = (hero: Hero): GameState =>
    ({
      heroes: [hero],
      dungeon: {
        name: 'test-dungeon',
        layout: {
          items: [
            { item: glove, position: { x: 1, y: 1 }, onlyIfNotCarried: true },
            { item: sword, position: { x: 2, y: 2 } },
          ],
        },
      },
    }) as unknown as GameState;

  it('removes a fallback item when a hero already carries it', () => {
    const hero = { inventory: [glove] } as unknown as Hero;
    const state = createState(hero);

    applyFallbackItems(state);

    expect(state.dungeon.layout.items).toEqual([
      { item: sword, position: { x: 2, y: 2 } },
    ]);
  });

  it('keeps a fallback item when nobody carries it', () => {
    const hero = { inventory: [sword] } as unknown as Hero;
    const state = createState(hero);

    applyFallbackItems(state);

    expect(state.dungeon.layout.items).toHaveLength(2);
    expect(state.dungeon.layout.items).toContainEqual({
      item: glove,
      position: { x: 1, y: 1 },
      onlyIfNotCarried: true,
    });
  });
});
