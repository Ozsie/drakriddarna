import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { DifficultLevels } from '../../core';
import { createMonster } from '../../dungeon/DungeonLogic';
import { createPassableGrid } from '../pathfinding';
import {
  calculateBehaviorWeight,
  evaluateBehaviors,
  getDirectorState,
  rollBowForgotten,
  selectBehavior,
} from './modifiers';
import type { BehaviorContext, MonsterBehavior } from './types';
import { ORC_BEHAVIORS } from './definitions';
import { TROLL_BEHAVIORS } from './definitions';
import { DARK_LORD_BEHAVIORS } from './definitions';
import { countHeroesInSpray } from './tactics';

const defaultWeapon: Weapon = {
  name: 'Sword',
  amountInDeck: 1,
  dice: 2,
  useHearHeroes: false,
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
): Hero => ({
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
  level: Level.APPRENTICE,
  weapon: defaultWeapon,
  inventory: [],
  isInventoryOpen: false,
  ignoredByMonsters: false,
});

const createTestState = (): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms: ['A', 'B'],
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

  const hero = createTestHero('Fearik', 1, 5);

  return {
    heroes: [hero],
    dungeon,
    currentActor: hero,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    eventDeck: [],
    settings: {},
    reRender: false,
    drawEvents: true,
  };
};

describe('Monster Behavioral Modifiers & Formulas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly calculates Director state', () => {
    // Dead hero -> EASE
    expect(getDirectorState(true, 1.0, 3)).toBe('EASE');
    // Party HP < 0.45 -> EASE
    expect(getDirectorState(false, 0.4, 3)).toBe('EASE');
    // Party HP > 0.8 and alive monsters <= 1 -> PUSH
    expect(getDirectorState(false, 0.85, 1)).toBe('PUSH');
    expect(getDirectorState(false, 0.85, 0)).toBe('PUSH');
    // More monsters -> NEUTRAL
    expect(getDirectorState(false, 0.85, 2)).toBe('NEUTRAL');
    // Average HP -> NEUTRAL
    expect(getDirectorState(false, 0.6, 1)).toBe('NEUTRAL');
  });

  it('bow forgotten rolls accurately per difficulty level definition', () => {
    // Hard difficulty should never forget bow
    for (let i = 0; i < 20; i++) {
      expect(rollBowForgotten('hard')).toBe(false);
    }

    // Easy difficulty (25%) with custom difficulty object or string
    const easyDiff = DifficultLevels.find((d) => d.id === 'easy');
    expect(easyDiff?.monsterBehavior?.bowForgottenChance).toBe(0.25);

    const normalDiff = DifficultLevels.find((d) => d.id === 'normal');
    expect(normalDiff?.monsterBehavior?.bowForgottenChance).toBe(0.15);

    const hardDiff = DifficultLevels.find((d) => d.id === 'hard');
    expect(hardDiff?.monsterBehavior?.bowForgottenChance).toBe(0);

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.2); // 0.2 < 0.25 (easy) but >= 0.15 (normal)
    expect(rollBowForgotten('easy')).toBe(true);
    expect(rollBowForgotten(easyDiff)).toBe(true);
    expect(rollBowForgotten('normal')).toBe(false);
    expect(rollBowForgotten(normalDiff)).toBe(false);
    expect(rollBowForgotten('hard')).toBe(false);
    expect(rollBowForgotten(hardDiff)).toBe(false);
    randomSpy.mockRestore();
  });

  it('applies temperament, director, and anti-stall multipliers to weights', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    const passableGrid = createPassableGrid(state);

    const testAggressiveBehavior: MonsterBehavior = {
      name: 'TestAggressive',
      slots: ['melee', 'melee'],
      tags: ['aggressive'],
      isEligible: () => true,
      getBaseWeight: () => 10,
    };

    const testDefensiveBehavior: MonsterBehavior = {
      name: 'TestDefensive',
      slots: ['move_to_cover', 'hold'],
      tags: ['defensive'],
      isEligible: () => true,
      getBaseWeight: () => 10,
    };

    // Context 1: Bold temperament, NEUTRAL director, passiveStreak = 0
    monster.temperament = 'bold';
    monster.passiveStreak = 0;
    const ctx1: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [],
      partyHpPercentage: 0.6,
      hasDeadHero: false,
      aliveMonsterCount: 2,
      directorState: 'NEUTRAL',
    };

    expect(calculateBehaviorWeight(testAggressiveBehavior, ctx1)).toBeCloseTo(
      13,
    ); // 10 * 1.3
    expect(calculateBehaviorWeight(testDefensiveBehavior, ctx1)).toBeCloseTo(7); // 10 * 0.7

    // Context 2: Wary temperament, EASE director
    monster.temperament = 'wary';
    const ctx2: BehaviorContext = {
      ...ctx1,
      directorState: 'EASE',
    };
    // Aggressive: 10 * 0.8 (wary) * 0.7 (EASE) = 5.6
    expect(calculateBehaviorWeight(testAggressiveBehavior, ctx2)).toBeCloseTo(
      5.6,
    );
    // Defensive: 10 * 1.5 (wary) * 1.3 (EASE) = 19.5
    expect(calculateBehaviorWeight(testDefensiveBehavior, ctx2)).toBeCloseTo(
      19.5,
    );

    // Context 3: Anti-stall kicks in when passiveStreak >= 2
    monster.passiveStreak = 2;
    expect(
      calculateBehaviorWeight(testDefensiveBehavior, { ...ctx2, monster }),
    ).toBe(0);
  });
});

describe('Orc Behaviors Evaluation', () => {
  it('Orc selects Brawl when hero is adjacent', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 2);
    monster.temperament = 'bold';
    const hero = createTestHero('Fearik', 2, 3);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [hero],
      visibleHeroes: [hero],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(ORC_BEHAVIORS, ctx);
    const brawl = evaluated.find((b) => b.name === 'Brawl');
    expect(brawl?.eligible).toBe(true);
    expect(brawl?.finalWeight).toBeCloseTo(13); // 10 * 1.3 bold
  });

  it('Orc Charge increases weight when hero HP <= 50%', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.temperament = 'bold';
    // Hero 2 steps away with health 4/10 (<= 50%)
    const hero = createTestHero('Fearik', 1, 3, 10);
    hero.health = 4;
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero],
      partyHpPercentage: 0.4,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(ORC_BEHAVIORS, ctx);
    const charge = evaluated.find((b) => b.name === 'Charge');
    expect(charge?.eligible).toBe(true);
    // Base weight is 8 + 3 = 11. Bold multiplier 1.3 -> 14.3
    expect(charge?.baseWeight).toBe(11);
    expect(charge?.finalWeight).toBeCloseTo(14.3);
  });

  it('Orc Charge accounts for difficulty health modifier when checking <= 50%', () => {
    const state = createTestState();
    state.difficulty = DifficultLevels.find((d) => d.id === 'hard');
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.temperament = 'bold';
    // Base maxHealth is 10, with modifier -1 effective max is 9.
    // Hero with health 5 would be <= 50% of base 10 (5 <= 5), but > 50% of effective 9 (5 > 4.5).
    const hero = createTestHero('Fearik', 1, 3, 10);
    hero.health = 5;
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero],
      partyHpPercentage: 5 / 9,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(ORC_BEHAVIORS, ctx);
    const charge = evaluated.find((b) => b.name === 'Charge');
    expect(charge?.eligible).toBe(true);
    // Base weight should be 8 (not 11) because 5 > 9 / 2 (4.5)
    expect(charge?.baseWeight).toBe(8);

    // If hero health is 4 (<= 9 / 2 = 4.5), base weight becomes 11
    hero.health = 4;
    const evaluated2 = evaluateBehaviors(ORC_BEHAVIORS, ctx);
    const charge2 = evaluated2.find((b) => b.name === 'Charge');
    expect(charge2?.baseWeight).toBe(11);
  });

  it('disqualifies shoot behaviors when bow is forgotten this turn', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.forgotBowThisTurn = true;
    const hero = createTestHero('Fearik', 1, 4, 10);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(ORC_BEHAVIORS, ctx);
    const volley = evaluated.find((b) => b.name === 'Volley and advance');
    const repo = evaluated.find((b) => b.name === 'Reposition and shoot');
    expect(volley?.eligible).toBe(false);
    expect(volley?.ineligibleReason).toBe('Bow forgotten this turn');
    expect(repo?.eligible).toBe(false);
  });
});

describe('Troll Behaviors Evaluation', () => {
  it('Troll Brawl gives 10 base weight when adjacent to hero', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.TROLL, Colour.Green, 1, 1);
    const hero = createTestHero('Fearik', 2, 1);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [hero],
      visibleHeroes: [hero],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(TROLL_BEHAVIORS, ctx);
    const brawl = evaluated.find((b) => b.name === 'Brawl');
    expect(brawl?.eligible).toBe(true);
    expect(brawl?.baseWeight).toBe(10);
  });
});

describe('Dark Lord Behaviors Evaluation', () => {
  it('Dark Lord Spray scales weight with extra heroes caught in spray', () => {
    const state = createTestState();
    const monster = createMonster(
      MonsterType.YELLOW_DARK_LORD,
      Colour.Yellow,
      3,
      3,
    );
    // Yellow Dark Lord has diagonalFireAttack. Heroes at (1,1) and (5,5)
    const hero1 = createTestHero('Fearik', 1, 1);
    const hero2 = createTestHero('Helbran', 5, 5);
    state.heroes = [hero1, hero2];

    expect(countHeroesInSpray(state, monster, monster.position)).toBe(2);

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero1, hero2],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(DARK_LORD_BEHAVIORS, ctx);
    const spray = evaluated.find((b) => b.name === 'Spray');
    expect(spray?.eligible).toBe(true);
    // Base weight: 8 + 2 * (2 - 1) = 10
    expect(spray?.baseWeight).toBe(10);
  });

  it('Dark Lord chooses Spray and does NOT choose Line up when already lined up', () => {
    const state = createTestState();
    const monster = createMonster(
      MonsterType.YELLOW_DARK_LORD,
      Colour.Yellow,
      3,
      3,
    );
    const hero = createTestHero('Fearik', 1, 1);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(DARK_LORD_BEHAVIORS, ctx);
    const spray = evaluated.find((b) => b.name === 'Spray');
    const lineUp = evaluated.find((b) => b.name === 'Line up');
    const advance = evaluated.find((b) => b.name === 'Advance');

    expect(spray?.eligible).toBe(true);
    expect(lineUp?.eligible).toBe(false);
    expect(advance?.eligible).toBe(false);
  });

  it('Dark Lord chooses Line up when not currently in spray but reachable tile aligns', () => {
    const state = createTestState();
    const monster = createMonster(
      MonsterType.YELLOW_DARK_LORD,
      Colour.Yellow,
      1,
      1,
    );
    // Hero at (4, 2) is not diagonal from (1, 1), but reachable within 3 steps
    const hero = createTestHero('Fearik', 4, 2);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [hero],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(DARK_LORD_BEHAVIORS, ctx);
    const spray = evaluated.find((b) => b.name === 'Spray');
    const lineUp = evaluated.find((b) => b.name === 'Line up');
    const advance = evaluated.find((b) => b.name === 'Advance');

    expect(spray?.eligible).toBe(false);
    expect(lineUp?.eligible).toBe(true);
    expect(advance?.eligible).toBe(false);
  });

  it('Dark Lord chooses Advance when unable to spray or align with heroes', () => {
    const state = createTestState();
    const monster = createMonster(
      MonsterType.YELLOW_DARK_LORD,
      Colour.Yellow,
      1,
      1,
    );
    // Hero is far away in another part of map / blocked so no tile within 3 steps aligns
    const hero = createTestHero('Fearik', 20, 20);
    state.heroes = [hero];

    const passableGrid = createPassableGrid(state);
    const ctx: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes: [],
      visibleHeroes: [],
      partyHpPercentage: 1,
      hasDeadHero: false,
      aliveMonsterCount: 1,
      directorState: 'NEUTRAL',
    };

    const evaluated = evaluateBehaviors(DARK_LORD_BEHAVIORS, ctx);
    const spray = evaluated.find((b) => b.name === 'Spray');
    const lineUp = evaluated.find((b) => b.name === 'Line up');
    const brawl = evaluated.find((b) => b.name === 'Brawl');
    const advance = evaluated.find((b) => b.name === 'Advance');

    expect(spray?.eligible).toBe(false);
    expect(lineUp?.eligible).toBe(false);
    expect(brawl?.eligible).toBe(false);
    expect(advance?.eligible).toBe(true);

    const { chosenBehavior } = selectBehavior(DARK_LORD_BEHAVIORS, ctx);
    expect(chosenBehavior.name).toBe('Advance');
    expect(chosenBehavior.slots).toEqual(['move', 'move']);
  });
});
