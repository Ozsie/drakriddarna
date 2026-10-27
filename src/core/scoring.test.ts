import { describe, it, expect } from 'vitest';
import { init } from '../game';
import { killMonster, pickupItem } from '../hero/HeroLogic';
import { Colour, ItemType, Level, SecretType } from '../types';
import type { GameState, Hero, Item, Monster, Weapon } from '../types';
import {
  awardScenarioScore,
  computeScenarioScore,
  itemPickupScore,
  SCORE_MAGIC_ITEM_POINTS,
  SCORE_PENALTY_PER_ROUND,
  SCORE_POINTS_PER_HP,
  SCORE_POINTS_PER_ITEM_VALUE,
  SCORE_POINTS_PER_MONSTER_XP,
  SCORE_POINTS_PER_SECRET,
} from './scoring';

const defaultWeapon: Weapon = {
  name: 'test-weapon',
  amountInDeck: 0,
  type: ItemType.WEAPON,
  value: 0,
  dice: 1,
  range: 1,
  twoHanded: false,
  useHearHeroes: false,
  ignoresShield: false,
  ignoresArmour: false,
};

const createTestMonster = (experience: number): Monster => ({
  name: 'test-monster',
  type: 'Orc',
  health: 1,
  maxHealth: 1,
  defense: 0,
  actions: 1,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Red,
  experience,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: defaultWeapon,
  inventory: [],
});

describe('itemPickupScore', () => {
  it('scores regular items by 25 points per item value', () => {
    const item = {
      name: 'test-item',
      amountInDeck: 0,
      type: ItemType.WEAPON,
      value: 3,
    } as Item;
    expect(itemPickupScore(item)).toBe(3 * SCORE_POINTS_PER_ITEM_VALUE);
  });

  it('scores magic items with a flat bonus regardless of value', () => {
    const item = {
      name: 'test-magic-item',
      amountInDeck: 0,
      type: ItemType.MAGIC,
      value: 0,
    } as Item;
    expect(itemPickupScore(item)).toBe(SCORE_MAGIC_ITEM_POINTS);
  });
});

describe('computeScenarioScore', () => {
  it('breaks the score down into health, kills, loot, secrets and rounds', () => {
    const state = init();
    state.heroes.forEach((hero) => {
      hero.health = 3;
    });
    const totalHealth = state.heroes.length * 3;
    state.dungeon.killedMonsterXp = 5;
    state.dungeon.pickedUpItemPoints = 75;
    state.dungeon.layout.secrets = [
      {
        name: 'found-secret',
        type: SecretType.EQUIPMENT,
        position: { x: 1, y: 1 },
        found: true,
      },
      {
        name: 'unfound-secret',
        type: SecretType.EQUIPMENT,
        position: { x: 2, y: 2 },
        found: false,
      },
    ];
    state.turnCount = 10;

    const score = computeScenarioScore(state);

    expect(score.healthPoints).toBe(totalHealth * SCORE_POINTS_PER_HP);
    expect(score.killPoints).toBe(5 * SCORE_POINTS_PER_MONSTER_XP);
    expect(score.itemPoints).toBe(75);
    expect(score.secretPoints).toBe(SCORE_POINTS_PER_SECRET);
    expect(score.roundPenalty).toBe(-10 * SCORE_PENALTY_PER_ROUND);
    expect(score.total).toBe(
      score.healthPoints +
        score.killPoints +
        score.itemPoints +
        score.secretPoints +
        score.roundPenalty,
    );
  });

  it('defaults to zero tracking when nothing was killed or picked up', () => {
    const state = init();
    state.dungeon.layout.secrets = [];
    state.turnCount = 0;
    const score = computeScenarioScore(state);
    expect(score.killPoints).toBe(0);
    expect(score.itemPoints).toBe(0);
    expect(score.secretPoints).toBe(0);
    expect(score.roundPenalty).toBe(0);
  });
});

describe('awardScenarioScore', () => {
  it('snapshots the score on the dungeon and adds it to the campaign total', () => {
    const state = init();
    state.dungeon.layout.secrets = [];
    state.turnCount = 0;

    const score = awardScenarioScore(state);

    expect(state.dungeon.score).toEqual(score);
    expect(state.score).toBe(score.total);
  });

  it('records per-scenario statistics for the campaign-complete screen', () => {
    const state = init();
    state.dungeon.layout.secrets = [];
    state.turnCount = 4;
    state.dungeon.killCount = 3;

    awardScenarioScore(state);

    expect(state.scenarioScores?.length).toBe(1);
    expect(state.scenarioScores?.[0].dungeonName).toBe(state.dungeon.name);
    expect(state.scenarioScores?.[0].rounds).toBe(4);
    expect(state.scenarioScores?.[0].kills).toBe(3);
    expect(state.scenarioScores?.[0].score.total).toBe(state.score);
  });
});

describe('scenario score tracking during play', () => {
  it('killMonster accumulates the slain monster experience on the dungeon', () => {
    const state = init();
    const hero = state.heroes[0] as Hero;
    const monster = createTestMonster(2);

    killMonster(state, monster, hero);
    killMonster(state, createTestMonster(3), hero);

    expect(state.dungeon.killedMonsterXp).toBe(5);
  });

  it('killMonster counts the slay per hero', () => {
    const state = init();
    const hero0 = state.heroes[0] as Hero;
    const hero1 = state.heroes[1] as Hero;

    killMonster(state, createTestMonster(2), hero0);
    killMonster(state, createTestMonster(3), hero0);
    killMonster(state, createTestMonster(1), hero1);

    expect(hero0.kills).toBe(2);
    expect(hero1.kills).toBe(1);
  });

  it('pickupItem accumulates item points on the dungeon', () => {
    const state: GameState = init();
    const hero = state.heroes[0] as Hero;
    const item = {
      name: 'test-item',
      amountInDeck: 0,
      type: ItemType.WEAPON,
      value: 2,
    } as Item;

    pickupItem(state, item, hero);

    expect(state.dungeon.pickedUpItemPoints).toBe(
      2 * SCORE_POINTS_PER_ITEM_VALUE,
    );
  });
});
