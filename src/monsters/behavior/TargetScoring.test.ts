/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, it, vi } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  MonsterType,
  type Weapon,
} from '../../types';
import { createMonster } from '../../dungeon/DungeonLogic';
import { createPassableGrid, findBestPathToHeroes } from '../pathfinding';
import {
  getHitRate,
  getMonsterExpectedDamage,
  resetRoundTargetCounters,
  scoreHero,
  selectScoredTarget,
} from './scoring';
import { logMonsterTargetSelection } from './logger';
import {
  monsterActions,
  monsterAttack,
  selectMeleeTarget,
  selectRangedTarget,
} from '../MonsterLogic';
import { attack } from '../../hero/HeroLogic';
import { takeDamage } from '../../core';

const defaultWeapon: Weapon = {
  name: 'Sword',
  amountInDeck: 1,
  dice: 3,
  useHearHeroes: true,
  twoHanded: false,
  range: 1,
  type: ItemType.WEAPON,
  value: 10,
  ignoresShield: false,
  ignoresArmour: false,
};

const createTestHero = (
  name: string,
  x: number,
  y: number,
  health = 10,
  id?: string,
): Hero => ({
  id: id ?? name.toLowerCase(),
  name,
  health,
  maxHealth: health,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x, y },
  experience: 0,
  level: Level.KNIGHT,
  weapon: defaultWeapon,
  inventory: [],
  isInventoryOpen: false,
  ignoredByMonsters: false,
  roundTargetCount: 0,
});

const createTestState = (): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms: ['A'],
    layout: {
      grid: [
        '#######',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#######',
      ],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      pits: [],
      pillars: [],
    },
    killCount: 0,
    events: [],
  };

  const hero1 = createTestHero('Fearik', 1, 2, 10);
  const hero2 = createTestHero('Helga', 1, 3, 5);

  return {
    heroes: [hero1, hero2],
    dungeon,
    currentActor: hero1,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    eventDeck: [],
    settings: {},
    reRender: false,
    drawEvents: true,
  };
};

describe('Target Scoring System', () => {
  describe('getHitRate', () => {
    it('returns correct hit rates for levels', () => {
      expect(getHitRate(Level.APPRENTICE)).toBeCloseTo(2 / 6);
      expect(getHitRate(Level.KNIGHT)).toBeCloseTo(3 / 6);
      expect(getHitRate(Level.HERO)).toBeCloseTo(3 / 6);
      expect(getHitRate(Level.LORD)).toBeCloseTo(4 / 6);
      expect(getHitRate(Level.MASTER)).toBeCloseTo(4 / 6);
    });
  });

  describe('getMonsterExpectedDamage', () => {
    it('calculates raw expected hits correctly based on weapon dice and monster level', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      monster.level = Level.MASTER; // 4/6 hit rate
      monster.weapon.dice = 3; // 3 * (4/6) = 2.0
      expect(getMonsterExpectedDamage(monster)).toBeCloseTo(2.0);
    });

    it('accounts for blinded and weakened debuffs on monster', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      monster.level = Level.MASTER;
      monster.weapon.dice = 3;
      monster.blinded = true; // 2 dice * (4/6) = 1.333
      expect(getMonsterExpectedDamage(monster)).toBeCloseTo(4 / 3);

      monster.weakened = true; // 1 die * (4/6) = 0.667
      expect(getMonsterExpectedDamage(monster)).toBeCloseTo(2 / 3);
    });

    it('subtracts target defense and expected shield from damage', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      monster.level = Level.MASTER; // 4/6
      monster.weapon.dice = 4; // 4 * (4/6) = 2.6667

      const hero = createTestHero('Fearik', 1, 2);
      hero.defense = 1;
      hero.shield = {
        name: 'Shield',
        dice: 2,
        amountInDeck: 1,
        type: ItemType.SHIELD,
        value: 1,
      };
      hero.level = Level.KNIGHT; // 3/6 = 0.5 per die -> 2 * 0.5 = 1.0 expected shield

      // Net expected: 2.6667 - 1 - 1 = 0.6667
      expect(getMonsterExpectedDamage(monster, hero)).toBeCloseTo(2.6667 - 2);
    });
  });

  describe('scoreHero formula rules', () => {
    it('computes baseline score of 10 for 0 steps with no modifiers and 0 random bonus', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = createTestHero('Fearik', 1, 1, 10);
      const scored = scoreHero(hero, {
        monster,
        stepsNeeded: 0,
        noticeRoll: 0.9,
        randomVal: 0,
      });

      expect(scored.score).toBe(10);
      expect(scored.stepsNeeded).toBe(0);
      expect(scored.isLastAttacker).toBe(false);
      expect(scored.targetedTimes).toBe(0);
      expect(scored.noticedKill).toBe(false);
      expect(scored.randomBonus).toBe(0);
    });

    it('subtracts 3 per step needed to reach attack position', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = createTestHero('Fearik', 1, 1, 10);

      const step1 = scoreHero(hero, {
        monster,
        stepsNeeded: 1,
        noticeRoll: 0.9,
        randomVal: 0,
      });
      expect(step1.score).toBe(7); // 10 - 3 = 7

      const step2 = scoreHero(hero, {
        monster,
        stepsNeeded: 2,
        noticeRoll: 0.9,
        randomVal: 0,
      });
      expect(step2.score).toBe(4); // 10 - 6 = 4

      const step3 = scoreHero(hero, {
        monster,
        stepsNeeded: 3,
        noticeRoll: 0.9,
        randomVal: 0,
      });
      expect(step3.score).toBe(1); // 10 - 9 = 1
    });

    it('adds 3 if hero was the last to attack this monster', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = createTestHero('Fearik', 1, 1, 10);

      // Not last attacker
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(10);

      // Last attacker via lastAttackedBy = hero.name
      monster.lastAttackedBy = 'Fearik';
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(13);

      // Last attacker via lastAttackedBy = hero.id
      monster.lastAttackedBy = 'fearik';
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(13);

      // Last attacker via lastAttackedByHero
      monster.lastAttackedBy = undefined;
      monster.lastAttackedByHero = hero;
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(13);
    });

    it('subtracts 4 if hero has already been targeted 2+ times this round', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = createTestHero('Fearik', 1, 1, 10);

      // Targeted 0 times -> penalty 0
      hero.roundTargetCount = 0;
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(10);

      // Targeted 1 time -> penalty 0
      hero.roundTargetCount = 1;
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(10);

      // Targeted 2 times -> penalty -4
      hero.roundTargetCount = 2;
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(6);

      // Targeted 3 times -> penalty -4
      hero.roundTargetCount = 3;
      expect(
        scoreHero(hero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.9,
          randomVal: 0,
        }).score,
      ).toBe(6);
    });

    it('adds 2 with 50% chance if hero HP is at or below monster expected damage', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      monster.level = Level.MASTER;
      monster.weapon.dice = 3; // expected damage = 2.0

      const lowHpHero = createTestHero('Fearik', 1, 1, 2); // HP 2 <= 2.0
      const highHpHero = createTestHero('Helga', 1, 1, 5); // HP 5 > 2.0

      // Low HP + roll < 0.5 (success) -> +2
      expect(
        scoreHero(lowHpHero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.3,
          randomVal: 0,
        }).score,
      ).toBe(12);

      // Low HP + roll >= 0.5 (fail) -> +0
      expect(
        scoreHero(lowHpHero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.7,
          randomVal: 0,
        }).score,
      ).toBe(10);

      // High HP + roll < 0.5 -> +0 (does not notice kill because HP > expected damage)
      expect(
        scoreHero(highHpHero, {
          monster,
          stepsNeeded: 0,
          noticeRoll: 0.1,
          randomVal: 0,
        }).score,
      ).toBe(10);
    });

    it('adds a random value in [0, 3]', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = createTestHero('Fearik', 1, 1, 10);

      const scored0 = scoreHero(hero, {
        monster,
        stepsNeeded: 0,
        noticeRoll: 0.9,
        randomVal: 0.0,
      });
      expect(scored0.score).toBe(10.0);

      const scoredMid = scoreHero(hero, {
        monster,
        stepsNeeded: 0,
        noticeRoll: 0.9,
        randomVal: 1.75,
      });
      expect(scoredMid.score).toBe(11.75);

      const scored3 = scoreHero(hero, {
        monster,
        stepsNeeded: 0,
        noticeRoll: 0.9,
        randomVal: 3.0,
      });
      expect(scored3.score).toBe(13.0);
    });
  });

  describe('selectScoredTarget & HP Independence', () => {
    it('picks highest scored hero rather than lowest or highest HP', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      monster.level = Level.MASTER;
      monster.weapon.dice = 3;

      // Hero A: 12 HP (highest HP), 0 steps away, last attacker (+3)
      // Score = 10 - 0 + 3 + 0 + 0 = 13
      const heroA = createTestHero('HeroA', 1, 2, 12);
      monster.lastAttackedBy = 'HeroA';

      // Hero B: 1 HP (lowest HP), 2 steps away (-6), targeted 2 times (-4)
      // Score = 10 - 6 + 0 - 4 + 2 (notices kill) + 0 = 2
      const heroB = createTestHero('HeroB', 1, 4, 1);
      heroB.roundTargetCount = 2;

      const selected = selectScoredTarget([heroA, heroB], {
        monster,
        stepsByHero: (h) => (h === heroA ? 0 : 2),
        noticeRoll: 0.1,
        randomVal: 0,
      });

      // Must pick Hero A due to higher score, despite having MUCH higher HP
      expect(selected).toBe(heroA);
    });

    it('selectMeleeTarget and selectRangedTarget pick by score', () => {
      const state = createTestState();
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);

      const hero1 = state.heroes[0] as Hero; // 10 HP
      const hero2 = state.heroes[1] as Hero; // 5 HP

      // Set hero1 as last attacker (+3) and hero2 targeted 2 times (-4)
      monster.lastAttackedBy = hero1.name;
      hero2.roundTargetCount = 2;

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // no kill notice, deterministic random
      const selectedMelee = selectMeleeTarget(
        [hero1, hero2],
        monster,
        state,
        () => 0.5,
      );
      expect(selectedMelee).toBe(hero1);

      const selectedRanged = selectRangedTarget(
        [hero1, hero2],
        monster,
        state,
        () => 0.5,
      );
      expect(selectedRanged).toBe(hero1);
      randomSpy.mockRestore();
    });
  });

  describe('findBestPathToHeroes scoring integration', () => {
    it('scores candidates by distance/steps and modifiers rather than health sorting', () => {
      const state = createTestState();
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      state.dungeon.layout.monsters = [monster];

      // hero1 at (1, 3) is 2 steps away (needs 1 step move to be adjacent)
      // hero2 at (1, 5) is 4 steps away (needs 3 step move to be adjacent)
      state.heroes[0].position = { x: 1, y: 3 };
      state.heroes[1].position = { x: 1, y: 5 };

      const grid = createPassableGrid(state);
      const best = findBestPathToHeroes(state, monster, grid, () => 0.1);

      expect(best).not.toBeNull();
      expect(best?.hero.name).toBe('Fearik');
    });
  });

  describe('Turn tracking and reset', () => {
    it('resetRoundTargetCounters resets roundTargetCount on heroes and clears state dict', () => {
      const state = createTestState();
      state.heroes[0].roundTargetCount = 3;
      state.heroes[1].roundTargetCount = 2;
      state.roundTargetCounts = { Fearik: 3, Helga: 2 };

      resetRoundTargetCounters(state);

      expect(state.heroes[0].roundTargetCount).toBe(0);
      expect(state.heroes[1].roundTargetCount).toBe(0);
      expect(state.roundTargetCounts).toEqual({});
    });

    it('monsterAttack increments roundTargetCount on hero and state', () => {
      const state = createTestState();
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const hero = state.heroes[0] as Hero;

      expect(hero.roundTargetCount).toBe(0);
      monsterAttack(state, monster, hero, false);
      expect(hero.roundTargetCount).toBe(1);
      expect(state.roundTargetCounts?.[hero.id ?? hero.name]).toBe(1);

      monsterAttack(state, monster, hero, false);
      expect(hero.roundTargetCount).toBe(2);
      expect(state.roundTargetCounts?.[hero.id ?? hero.name]).toBe(2);
    });

    it('monsterActions resets round target counters at the start of each GM turn', async () => {
      const state = createTestState();
      const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 2);
      state.dungeon.layout.monsters = [monster];

      state.heroes[0].roundTargetCount = 5;
      state.heroes[1].roundTargetCount = 4;
      state.roundTargetCounts = { Fearik: 5, Helga: 4 };

      await monsterActions(state, {
        delayBetweenActions: 0,
        delayBetweenMonsters: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      // At start of monsterActions, counters were reset (heroes might be attacked during the turn)
      // But initial 5 and 4 were wiped.
      expect(state.heroes[1].roundTargetCount).toBeLessThan(4);
    });

    it('records lastAttackedBy on monster when hero attacks in combat', () => {
      const state = createTestState();
      const hero = state.heroes[0] as Hero;
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 3);
      state.dungeon.layout.monsters = [monster];

      expect(monster.lastAttackedBy).toBeUndefined();
      takeDamage(state, hero, monster, false);

      expect(monster.lastAttackedBy).toBe(hero.id ?? hero.name);
      expect(monster.lastAttackedByHero).toBe(hero);
    });

    it('records lastAttackedBy when hero executes attack action', () => {
      const state = createTestState();
      const hero = state.heroes[0] as Hero;
      hero.position = { x: 1, y: 2 };
      state.heroes[1].position = { x: 5, y: 5 };
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 3);
      state.dungeon.layout.monsters = [monster];

      attack(hero, state, { x: 1, y: 3 });
      expect(monster.lastAttackedBy).toBe(hero.id ?? hero.name);
      expect(monster.lastAttackedByHero).toBe(hero);
    });
  });

  describe('AI Console Logging for Target Selection', () => {
    it('logs target evaluation table and chosen target when debug is true', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const heroA = createTestHero('HeroA', 1, 2, 10);
      const heroB = createTestHero('HeroB', 1, 3, 8);

      const groupSpy = vi
        .spyOn(console, 'groupCollapsed')
        .mockImplementation(() => {});
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const groupEndSpy = vi
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});

      logMonsterTargetSelection({
        monster,
        candidates: [
          {
            hero: heroA,
            score: 13,
            stepsNeeded: 0,
            expectedDamage: 2,
            isLastAttacker: true,
            targetedTimes: 0,
            noticedKill: false,
            randomBonus: 0,
          },
          {
            hero: heroB,
            score: 7,
            stepsNeeded: 1,
            expectedDamage: 2,
            isLastAttacker: false,
            targetedTimes: 0,
            noticedKill: false,
            randomBonus: 0,
          },
        ],
        selectedHero: heroA,
        actionType: 'melee',
        debug: true,
      });

      expect(groupSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AI Target] Orc (Green) (Melee Target)'),
      );
      expect(tableSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Hero: 'HeroA',
            Score: '13.00',
            'Last Attacker': '+3',
          }),
          expect.objectContaining({
            Hero: 'HeroB',
            Score: '7.00',
            Steps: '-3 (1 steps)',
          }),
        ]),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('>> Target Selected: %cHeroA%c (Score: 13.00)'),
        expect.any(String),
        expect.any(String),
      );
      expect(groupEndSpy).toHaveBeenCalled();

      groupSpy.mockRestore();
      tableSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });

    it('does not log target selection when debug mode is inactive', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const heroA = createTestHero('HeroA', 1, 2, 10);

      const groupSpy = vi
        .spyOn(console, 'groupCollapsed')
        .mockImplementation(() => {});
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const groupEndSpy = vi
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});

      logMonsterTargetSelection({
        monster,
        candidates: [
          {
            hero: heroA,
            score: 13,
            stepsNeeded: 0,
            expectedDamage: 2,
            isLastAttacker: false,
            targetedTimes: 0,
            noticedKill: false,
            randomBonus: 0,
          },
        ],
        selectedHero: heroA,
        actionType: 'melee',
      });

      expect(groupSpy).not.toHaveBeenCalled();
      expect(tableSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(groupEndSpy).not.toHaveBeenCalled();

      groupSpy.mockRestore();
      tableSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });

    it('selectScoredTarget logs only when debug mode is active via options or state', () => {
      const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
      const heroA = createTestHero('HeroA', 1, 2, 10);
      const heroB = createTestHero('HeroB', 1, 3, 8);

      const groupSpy = vi
        .spyOn(console, 'groupCollapsed')
        .mockImplementation(() => {});
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

      // Without debug mode
      selectScoredTarget([heroA, heroB], {
        monster,
        noticeRoll: 0.9,
        randomVal: 0,
      });

      expect(groupSpy).not.toHaveBeenCalled();
      expect(tableSpy).not.toHaveBeenCalled();

      // With debug flag in options
      selectScoredTarget([heroA, heroB], {
        monster,
        noticeRoll: 0.9,
        randomVal: 0,
        debug: true,
      });

      expect(groupSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AI Target] Orc'),
      );
      expect(tableSpy).toHaveBeenCalled();

      groupSpy.mockClear();
      tableSpy.mockClear();

      // With debug setting in state
      const stateWithDebug = createTestState();
      stateWithDebug.settings['debug'] = true;
      selectScoredTarget([heroA, heroB], {
        monster,
        noticeRoll: 0.9,
        randomVal: 0,
        state: stateWithDebug,
      });

      expect(groupSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AI Target] Orc'),
      );
      expect(tableSpy).toHaveBeenCalled();

      groupSpy.mockRestore();
      tableSpy.mockRestore();
    });
  });
});
