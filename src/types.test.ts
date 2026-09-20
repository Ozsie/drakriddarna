import { describe, it, expect } from 'vitest';
import {
  MonsterType,
  ItemType,
  SecretType,
  Colour,
  Level,
  assertNever,
  type GameAction,
  type GameEvent,
  type GameSettings,
  type ItemProperties,
  type Item,
} from './types';
import { magicItems } from './items/magicItems';
import { weapons, monsterWeapons } from './items/weapons';
import { armour, monsterArmour } from './items/armours';
import { shields, monsterShields } from './items/shields';
import { events } from './events/events';
import { executeGameEvent } from './events/EventsLogic';
import {
  createMonster,
  createSecret,
  createSecretWithItem,
  onCheckFulfilled,
} from './dungeon/DungeonLogic';
import {
  removeFoundItemFromDeck,
  removeFoundMagicItemFromDeck,
} from './secrets/SecretsLogic';
import { init } from './game';
import { dispatchAction, gameStateStore } from './store/gameStateStore';
import { get } from 'svelte/store';

describe('Type Safety & Domain Modeling', () => {
  describe('MonsterType Enum & Typo Fix', () => {
    it('MonsterType.ORC should be defined as "Orc"', () => {
      expect(MonsterType.ORC).toBe('Orc');
    });

    it('MonsterType.ORCH should provide backwards compatibility', () => {
      expect(MonsterType.ORCH).toBe('Orc');
      expect(MonsterType.ORC).toBe(MonsterType.ORCH);
    });

    it('createMonster creates an Orc with proper stats and semantic ID', () => {
      const orc = createMonster(MonsterType.ORC, Colour.Green, 2, 3);
      expect(orc.type).toBe(MonsterType.ORC);
      expect(orc.id).toBe('orc_green_2_3');
      expect(orc.name).toContain('Orc');
      expect(orc.nameTranslationKey).toBe(orc.name);
      expect(orc.health).toBe(2);
      expect(orc.level).toBe(Level.APPRENTICE);
    });
  });

  describe('Semantic Entity IDs', () => {
    it('all magic items have semantic IDs and name translation keys', () => {
      expect(magicItems.length).toBeGreaterThan(0);
      magicItems.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe('string');
        expect(item.nameTranslationKey).toBeDefined();
        expect(item.nameTranslationKey).toBe(item.name);
      });

      const necklace = magicItems.find((i) => i.id === 'necklace_of_light');
      expect(necklace).toBeDefined();
      expect(necklace?.name).toBe('items.magicItems.necklaceOfLight.name');
    });

    it('all weapons and monster weapons have semantic IDs', () => {
      weapons.forEach((weapon) => {
        expect(weapon.id).toBeDefined();
        expect(weapon.nameTranslationKey).toBe(weapon.name);
      });
      monsterWeapons.forEach((weapon) => {
        expect(weapon.id).toBeDefined();
        expect(weapon.nameTranslationKey).toBe(weapon.name);
      });
      expect(weapons.find((w) => w.id === 'sword')).toBeDefined();
      expect(monsterWeapons.find((w) => w.id === 'orc_sword')).toBeDefined();
    });

    it('all armours and shields have semantic IDs', () => {
      armour.forEach((a) => expect(a.id).toBeDefined());
      monsterArmour.forEach((a) => expect(a.id).toBeDefined());
      shields.forEach((s) => expect(s.id).toBeDefined());
      monsterShields.forEach((s) => expect(s.id).toBeDefined());

      expect(armour.find((a) => a.id === 'plate_mail')).toBeDefined();
      expect(shields.find((s) => s.id === 'large_shield')).toBeDefined();
    });

    it('createSecret and createSecretWithItem generate semantic IDs', () => {
      const secret = createSecret(SecretType.EQUIPMENT, 'test.secret', 5, 8);
      expect(secret.id).toBe('secret_equipment_5_8');
      expect(secret.nameTranslationKey).toBe('test.secret');

      const itemSecret = createSecretWithItem(
        SecretType.MAGIC_ITEM,
        3,
        4,
        magicItems[0],
      );
      expect(itemSecret.id).toBe(`secret_${magicItems[0].id}_3_4`);
      expect(itemSecret.item?.id).toBe(magicItems[0].id);
    });

    it('hasNecklaceOfLight checks item semantic id', () => {
      const state = init();
      const condition = {
        type: 0,
        fulfilled: true,
      };

      // When hero does not have necklace
      expect(onCheckFulfilled.hasNecklaceOfLight(state, condition)).toBe(false);

      // When hero has necklace by id
      const necklaceItem: Item = {
        id: 'necklace_of_light',
        name: 'Custom Translation Key or Renamed UI String',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
      };
      state.heroes[0].inventory.push(necklaceItem);

      expect(onCheckFulfilled.hasNecklaceOfLight(state, condition)).toBe(true);
    });

    it('deck removal functions use item.id', () => {
      const state = init();
      const testItem = state.itemDeck[0];
      const initialCount = state.itemDeck.length;
      const occurrencesBefore = state.itemDeck.filter((i) => i.id === testItem.id).length;

      removeFoundItemFromDeck(state, testItem);
      expect(state.itemDeck.length).toBe(initialCount - 1);
      const occurrencesAfter = state.itemDeck.filter((i) => i.id === testItem.id).length;
      expect(occurrencesAfter).toBe(occurrencesBefore - 1);

      const testMagicItem = state.magicItemDeck[0];
      const initialMagicCount = state.magicItemDeck.length;
      const magicOccurrencesBefore = state.magicItemDeck.filter((i) => i.id === testMagicItem.id).length;
      removeFoundMagicItemFromDeck(state, testMagicItem);
      expect(state.magicItemDeck.length).toBe(initialMagicCount - 1);
      const magicOccurrencesAfter = state.magicItemDeck.filter((i) => i.id === testMagicItem.id).length;
      expect(magicOccurrencesAfter).toBe(magicOccurrencesBefore - 1);
    });
  });

  describe('Type-Safe Settings & Item Properties', () => {
    it('GameSettings supports typed settings with custom fields', () => {
      const settings: GameSettings = {
        cellSize: 48,
        debug: true,
        locale: 'sv',
        customProperty: 'validValue',
      };
      expect(settings.cellSize).toBe(48);
      expect(settings.debug).toBe(true);
      expect(settings.locale).toBe('sv');
    });

    it('ItemProperties supports typed properties', () => {
      const props: ItemProperties = {
        USED: false,
        ACTIVE: true,
        ACTIONS_BONUS: 2,
        DESCRIPTION: 'items.magicItems.potionOfSpeed.description',
        RESET_ON: ['NEXT_TURN', 'TRADE'],
      };
      expect(props.USED).toBe(false);
      expect(props.ACTIONS_BONUS).toBe(2);
      expect(props.RESET_ON).toContain('NEXT_TURN');
    });
  });

  describe('Discriminated Unions for Events and Actions', () => {
    it('all turn events have defined semantic IDs, types, and translation keys', () => {
      events.forEach((event) => {
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.nameTranslationKey).toBe(event.name);
        expect(event.descriptionTranslationKey).toBe(event.description);
      });
    });

    it('executeGameEvent processes GameEvent discriminated union exhaustively', () => {
      const state = init();
      const timePortalEvent: GameEvent = {
        type: 'TIME_PORTAL',
        number: 3,
        name: 'Time Portal',
        description: 'Grants actions',
        effect: 'timePortal',
        used: false,
      };

      const initialHeroActions = state.heroes[0].actions;
      executeGameEvent(state, timePortalEvent);
      expect(state.heroes[0].actions).toBe(initialHeroActions + 1);
      expect(timePortalEvent.used).toBe(true);
    });

    it('assertNever throws error on unhandled discriminated union branch', () => {
      expect(() => {
        assertNever('UNKNOWN_TYPE' as never, 'Unhandled event');
      }).toThrowError(/Unhandled event/);
    });

    it('dispatchAction handles discriminated union GameAction', () => {
      const action: GameAction = {
        type: 'SET_DEBUG',
        debug: true,
      };

      dispatchAction(action);
      expect(get(gameStateStore).settings.debug).toBe(true);

      const moveAction: GameAction = {
        type: 'MOVE',
        direction: 'R',
      };
      expect(() => dispatchAction(moveAction)).not.toThrow();
    });
  });
});
