import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  getNextLevelInfo,
  getLevelMeaning,
  openBetweenDungeons,
  setBetweenDungeonsStep,
  selectTradeItem,
  tradeItem,
  completeBetweenDungeonsAndStartNext,
} from './BetweenDungeonsLogic';
import { Level, Colour, ItemType, type GameState, type Hero, type Item } from '../types';
import { init } from '../game';

const createMockHero = (name: string, xp = 0, level = Level.APPRENTICE): Hero => ({
  name,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  defense: 0,
  health: 7,
  maxHealth: 7,
  colour: Colour.Red,
  experience: xp,
  position: { x: 0, y: 0 },
  level,
  weapon: { name: 'Sword', dice: 2 },
  inventory: [],
  isInventoryOpen: false,
});

describe('BetweenDungeonsLogic', () => {
  describe('calculateLevel', () => {
    it('returns APPRENTICE for xp < 4', () => {
      expect(calculateLevel(0)).toBe(Level.APPRENTICE);
      expect(calculateLevel(3)).toBe(Level.APPRENTICE);
    });

    it('returns KNIGHT for 4 <= xp < 10', () => {
      expect(calculateLevel(4)).toBe(Level.KNIGHT);
      expect(calculateLevel(9)).toBe(Level.KNIGHT);
    });

    it('returns HERO for 10 <= xp < 18', () => {
      expect(calculateLevel(10)).toBe(Level.HERO);
      expect(calculateLevel(17)).toBe(Level.HERO);
    });

    it('returns LORD for 18 <= xp < 28', () => {
      expect(calculateLevel(18)).toBe(Level.LORD);
      expect(calculateLevel(27)).toBe(Level.LORD);
    });

    it('returns MASTER for xp >= 28', () => {
      expect(calculateLevel(28)).toBe(Level.MASTER);
      expect(calculateLevel(50)).toBe(Level.MASTER);
    });
  });

  describe('getNextLevelInfo', () => {
    it('returns next level and remaining xp needed', () => {
      expect(getNextLevelInfo(2)).toEqual({
        nextLevel: Level.KNIGHT,
        xpNeeded: 2,
      });
      expect(getNextLevelInfo(4)).toEqual({
        nextLevel: Level.HERO,
        xpNeeded: 6,
      });
      expect(getNextLevelInfo(28)).toEqual({});
    });
  });

  describe('getLevelMeaning', () => {
    it('returns meaning string for each level', () => {
      expect(getLevelMeaning(Level.APPRENTICE)).toBeDefined();
      expect(getLevelMeaning(Level.KNIGHT)).toBeDefined();
      expect(getLevelMeaning(Level.HERO)).toBeDefined();
      expect(getLevelMeaning(Level.LORD)).toBeDefined();
      expect(getLevelMeaning(Level.MASTER)).toBeDefined();
    });
  });

  describe('openBetweenDungeons', () => {
    it('rewards live heroes with +1 XP and records level progression', () => {
      const state = init();
      state.heroes = [
        createMockHero('Hero1', 3, Level.APPRENTICE),
        createMockHero('Hero2', 0, Level.APPRENTICE),
      ];

      const bd = openBetweenDungeons(state);

      expect(bd.step).toBe('levelUp');
      expect(bd.levelUps).toHaveLength(2);

      // Hero1: 3 XP -> 4 XP (Leveled up to KNIGHT)
      expect(bd.levelUps[0].heroName).toBe('Hero1');
      expect(bd.levelUps[0].previousExperience).toBe(3);
      expect(bd.levelUps[0].newExperience).toBe(4);
      expect(bd.levelUps[0].previousLevel).toBe(Level.APPRENTICE);
      expect(bd.levelUps[0].newLevel).toBe(Level.KNIGHT);
      expect(bd.levelUps[0].leveledUp).toBe(true);

      // Hero2: 0 XP -> 1 XP (Still APPRENTICE)
      expect(bd.levelUps[1].heroName).toBe('Hero2');
      expect(bd.levelUps[1].previousExperience).toBe(0);
      expect(bd.levelUps[1].newExperience).toBe(1);
      expect(bd.levelUps[1].previousLevel).toBe(Level.APPRENTICE);
      expect(bd.levelUps[1].newLevel).toBe(Level.APPRENTICE);
      expect(bd.levelUps[1].leveledUp).toBe(false);
    });
  });

  describe('setBetweenDungeonsStep', () => {
    it('switches between levelUp and trade steps', () => {
      const state = init();
      openBetweenDungeons(state);

      expect(state.betweenDungeons?.step).toBe('levelUp');
      setBetweenDungeonsStep(state, 'trade');
      expect(state.betweenDungeons?.step).toBe('trade');
      setBetweenDungeonsStep(state, 'levelUp');
      expect(state.betweenDungeons?.step).toBe('levelUp');
    });
  });

  describe('selectTradeItem and tradeItem', () => {
    it('selects and deselects trade items', () => {
      const state = init();
      openBetweenDungeons(state);

      selectTradeItem(state, 0, 1);
      expect(state.betweenDungeons?.selectedTradeItem).toEqual({ heroIndex: 0, slot: 1, itemIndex: 1 });

      // Selecting the same item deselects it
      selectTradeItem(state, 0, 1);
      expect(state.betweenDungeons?.selectedTradeItem).toBeNull();

      // Selecting equipment slot
      selectTradeItem(state, 0, 'weapon');
      expect(state.betweenDungeons?.selectedTradeItem).toEqual({ heroIndex: 0, slot: 'weapon', itemIndex: undefined });
    });

    it('transfers an inventory item from one hero to another', () => {
      const state = init();
      const item1: Item = { id: 'torch', name: 'Torch', reset: undefined };
      const hero0 = createMockHero('Hero0');
      const hero1 = createMockHero('Hero1');
      hero0.inventory = [item1];
      hero1.inventory = [];
      state.heroes = [hero0, hero1];

      openBetweenDungeons(state);
      setBetweenDungeonsStep(state, 'trade');
      selectTradeItem(state, 0, 0);

      const success = tradeItem(state, 0, 1, 0);
      expect(success).toBe(true);
      expect(hero0.inventory).toHaveLength(0);
      expect(hero1.inventory).toEqual([item1]);
      expect(state.betweenDungeons?.selectedTradeItem).toBeNull();
    });

    it('transfers weapons, armour, and shields between heroes', () => {
      const state = init();
      const hero0 = createMockHero('Hero0');
      const hero1 = createMockHero('Hero1');
      hero0.weapon = { id: 'two_handed_sword', name: 'Two-Handed Sword', dice: 4, type: ItemType.WEAPON, range: 1, twoHanded: true, useHearHeroes: false, amountInDeck: 1, value: 3, ignoresShield: false, ignoresArmour: false };
      hero0.armour = { id: 'chainmail', name: 'Chainmail', defense: 2, type: ItemType.ARMOUR, amountInDeck: 1, value: 2 };
      hero0.shield = { id: 'wooden_shield', name: 'Wooden Shield', dice: 1, type: ItemType.SHIELD, amountInDeck: 1, value: 1 };

      hero1.weapon = { id: 'sword', name: 'Sword', dice: 3, type: ItemType.WEAPON, range: 1, twoHanded: false, useHearHeroes: true, amountInDeck: 0, value: 0, ignoresShield: false, ignoresArmour: false };
      hero1.armour = undefined;
      hero1.shield = undefined;
      state.heroes = [hero0, hero1];

      openBetweenDungeons(state);
      setBetweenDungeonsStep(state, 'trade');

      // Trade weapon: hero0 weapon -> hero1
      tradeItem(state, 0, 1, 'weapon');
      expect(hero1.weapon.id).toBe('two_handed_sword');
      expect(hero0.weapon.id).toBe('sword'); // resets to starter sword

      // Trade armour: hero0 armour -> hero1 (empty slot, equips)
      tradeItem(state, 0, 1, 'armour');
      expect(hero0.armour).toBeUndefined();
      expect(hero1.armour?.id).toBe('chainmail');

      // Trade shield: hero0 shield -> hero1 (empty slot, equips)
      tradeItem(state, 0, 1, 'shield');
      expect(hero0.shield).toBeUndefined();
      expect(hero1.shield?.id).toBe('wooden_shield');
    });

    it('does not allow trading to the same hero', () => {
      const state = init();
      const item1: Item = { id: 'torch', name: 'Torch' };
      const hero0 = createMockHero('Hero0');
      hero0.inventory = [item1];
      state.heroes = [hero0];

      openBetweenDungeons(state);
      const success = tradeItem(state, 0, 0, 0);
      expect(success).toBe(false);
      expect(hero0.inventory).toHaveLength(1);
    });
  });

  describe('completeBetweenDungeonsAndStartNext', () => {
    it('transitions to the next dungeon when completed', () => {
      const state = init();
      const nextDungeon = {
        ...state.dungeon,
        name: 'Next Dungeon',
        startingPositions: [{ x: 2, y: 3 }],
      };
      state.dungeon.nextDungeon = nextDungeon;

      openBetweenDungeons(state);
      expect(state.betweenDungeons).toBeDefined();

      completeBetweenDungeonsAndStartNext(state);
      expect(state.betweenDungeons).toBeUndefined();
      expect(state.dungeon.name).toBe('Next Dungeon');
      expect(state.turnCount).toBe(0);
      expect(state.currentActor).toBeDefined();
    });
  });
});
