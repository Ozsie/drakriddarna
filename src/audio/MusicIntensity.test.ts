import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  type Monster,
  MonsterType,
} from '../types';
import { createMonster } from '../dungeon/DungeonLogic';
import {
  nearestVisibleMonsterDistance,
  selectMusicIntensity,
  TENSION_ENTER_RANGE,
  TENSION_EXIT_RANGE,
} from './MusicIntensity';

const createTestHero = (x: number, y: number, health = 10): Hero => ({
  name: 'Fearik',
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
  weapon: {
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
  },
  inventory: [],
  isInventoryOpen: false,
});

const createTestState = (
  monsters: Monster[],
  discoveredRooms: string[] = ['A'],
): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms,
    layout: {
      grid: [
        '################',
        '#AAAAAAAAAAAAAA#',
        '#AAAAAAAAAAAAAA#',
        '################',
      ],
      doors: [],
      monsters,
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

  const hero = createTestHero(1, 1);

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

describe('MusicIntensity', () => {
  it('stays in explore when no monsters are visible', () => {
    const state = createTestState([]);
    expect(selectMusicIntensity(state, 'explore')).toBe('explore');
    expect(nearestVisibleMonsterDistance(state)).toBe(Infinity);
  });

  it('transitions to tension when a monster is within the enter range', () => {
    // Hero at (1, 1): distance is exactly TENSION_ENTER_RANGE.
    const monster = createMonster(
      MonsterType.ORC,
      Colour.Green,
      1 + TENSION_ENTER_RANGE,
      1,
    );
    const state = createTestState([monster]);
    expect(nearestVisibleMonsterDistance(state)).toBe(TENSION_ENTER_RANGE);
    expect(selectMusicIntensity(state, 'explore')).toBe('tension');
  });

  it('stays in explore when the nearest monster is beyond the enter range', () => {
    const monster = createMonster(
      MonsterType.ORC,
      Colour.Green,
      1 + TENSION_ENTER_RANGE + 1,
      1,
    );
    const state = createTestState([monster]);
    expect(nearestVisibleMonsterDistance(state)).toBe(TENSION_ENTER_RANGE + 1);
    expect(selectMusicIntensity(state, 'explore')).toBe('explore');
  });

  it('applies hysteresis: stays in tension until the exit range is exceeded', () => {
    // Between enter and exit range the current intensity decides.
    const midMonster = createMonster(
      MonsterType.ORC,
      Colour.Green,
      1 + TENSION_ENTER_RANGE + 1,
      1,
    );
    const midState = createTestState([midMonster]);
    expect(selectMusicIntensity(midState, 'tension')).toBe('tension');

    const distantMonster = createMonster(
      MonsterType.ORC,
      Colour.Green,
      1 + TENSION_EXIT_RANGE + 1,
      1,
    );
    const distantState = createTestState([distantMonster]);
    expect(selectMusicIntensity(distantState, 'tension')).toBe('explore');
  });

  it('ignores monsters in undiscovered rooms', () => {
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    const state = createTestState([monster], []);
    expect(selectMusicIntensity(state, 'explore')).toBe('explore');
  });

  it('ignores dead monsters', () => {
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.health = 0;
    const state = createTestState([monster]);
    expect(selectMusicIntensity(state, 'explore')).toBe('explore');
  });

  it('uses the distance to the nearest of several monsters', () => {
    const far = createMonster(
      MonsterType.ORC,
      Colour.Green,
      1 + TENSION_EXIT_RANGE,
      1,
    );
    const near = createMonster(MonsterType.ORC, Colour.Green, 2, 1);
    const state = createTestState([far, near]);
    expect(nearestVisibleMonsterDistance(state)).toBe(1);
    expect(selectMusicIntensity(state, 'explore')).toBe('tension');
  });

  it('falls back to explore when all heroes are dead', () => {
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    const state = createTestState([monster]);
    state.heroes[0].health = 0;
    expect(selectMusicIntensity(state, 'explore')).toBe('explore');
    expect(selectMusicIntensity(state, 'tension')).toBe('explore');
  });
});
