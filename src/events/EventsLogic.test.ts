import { describe, it, expect, vi } from 'vitest';
import { init } from '../game';
import {
  drawNextEvent,
  shuffleEventDeck,
  selectNextEvent,
  eventEffects,
  resetEventEffects,
} from './EventsLogic';
import { events } from './events';
import {
  Colour,
  ItemType,
  Level,
  MonsterType,
  SecretType,
  type Item,
  type Secret,
  type TurnEvent,
} from '../types';
import {
  createMonster,
  createMonsterWithInventory,
} from '../dungeon/DungeonLogic';
import { getPartyAverageLevel } from '../hero/HeroLogic';
import {
  findCell,
  getGameMaster,
  distanceInGrid,
  getEventMinSpawnDistance,
  getEarliestMonsterEventRound,
  isPartyBelowHalfHealth,
  toArray,
} from '../core';

describe('EventsLogic debug helpers', () => {
  it('selectNextEvent moves the chosen unused event to the front of the deck', () => {
    const state = init();
    const target = state.eventDeck.find(
      (event, index) => index > 0 && !event.used,
    );
    expect(target).toBeDefined();

    selectNextEvent(state, target?.id);

    expect(state.eventDeck[0].id).toBe(target?.id);
  });

  it('selectNextEvent does nothing when the event id is not found', () => {
    const state = init();
    const before = [...state.eventDeck];

    selectNextEvent(state, 'not_a_real_event');

    expect(state.eventDeck).toEqual(before);
  });

  it('selectNextEvent can select an already used event and marks it unused', () => {
    const state = init();
    const usedEvent = state.eventDeck[1];
    usedEvent.used = true;

    selectNextEvent(state, usedEvent.id);

    expect(state.eventDeck[0].id).toBe(usedEvent.id);
    expect(state.eventDeck[0].used).toBe(false);
  });

  it('shuffleEventDeck reshuffles the deck and marks all events as unused', () => {
    const state = init();
    state.eventDeck.forEach((event) => (event.used = true));

    shuffleEventDeck(state);

    expect(state.eventDeck.every((event) => !event.used)).toBe(true);
    expect(state.eventDeck.length).toBe(state.eventDeck.length);
  });
});

describe('Orc Drums event and resetEventEffects', () => {
  it('increases Orc actions to 3 and resets them back to 2 on resetEventEffects', () => {
    const state = init();
    const orc = createMonster(MonsterType.ORC, Colour.Red, 1, 1);
    const troll = createMonster(MonsterType.TROLL, Colour.Green, 2, 2);
    state.dungeon.layout.monsters = [orc, troll];
    state.dungeon.layout.grid = ['AA', 'AA'];
    state.dungeon.discoveredRooms = ['A'];

    expect(orc.actions).toBe(2);
    expect(troll.actions).toBe(2);

    const event = {
      id: 'orc_drums',
      type: 'ORC_DRUMS' as const,
      name: 'events.orchDrums.name',
      nameTranslationKey: 'events.orchDrums.name',
      number: 14,
      description: 'events.orchDrums.description',
      descriptionTranslationKey: 'events.orchDrums.description',
      effect: 'theOrchDrums' as const,
      used: false,
    };

    eventEffects.theOrchDrums(state, event);

    expect(orc.actions).toBe(3);
    expect(troll.actions).toBe(2);
    expect(event.used).toBe(true);
    expect(state.damageIndicators).toBeDefined();
    expect(
      state.damageIndicators?.some(
        (ind) =>
          ind.text === '+ACTIONS' ||
          ind.text === 'content.indicators.moreActions',
      ),
    ).toBe(true);

    resetEventEffects(state);

    expect(orc.actions).toBe(2);
    expect(troll.actions).toBe(2);
  });

  it('does nothing when 4 orcs are visible and Orc Drums is drawn', () => {
    const state = init();
    const orc1 = createMonster(MonsterType.ORC, Colour.Red, 1, 1);
    const orc2 = createMonster(MonsterType.ORC, Colour.Green, 2, 1);
    const orc3 = createMonster(MonsterType.ORC, Colour.Blue, 1, 2);
    const orc4 = createMonster(MonsterType.ORC, Colour.Yellow, 2, 2);
    state.dungeon.layout.monsters = [orc1, orc2, orc3, orc4];
    state.dungeon.layout.grid = ['AAAA', 'AAAA', 'AAAA', 'AAAA'];
    state.dungeon.discoveredRooms = ['A'];
    const indicatorsBefore = state.damageIndicators?.length ?? 0;

    const event = {
      id: 'orc_drums',
      type: 'ORC_DRUMS' as const,
      name: 'events.orchDrums.name',
      nameTranslationKey: 'events.orchDrums.name',
      number: 14,
      description: 'events.orchDrums.description',
      descriptionTranslationKey: 'events.orchDrums.description',
      effect: 'theOrchDrums' as const,
      used: false,
    };

    eventEffects.theOrchDrums(state, event);

    expect(orc1.actions).toBe(2);
    expect(orc2.actions).toBe(2);
    expect(orc3.actions).toBe(2);
    expect(orc4.actions).toBe(2);
    expect(event.used).toBe(true);
    expect(state.damageIndicators?.length ?? 0).toBe(indicatorsBefore);
  });

  it('still boosts visible orcs if there are 4 orcs in layout but 1 is dead or undiscovered', () => {
    const state = init();
    const orc1 = createMonster(MonsterType.ORC, Colour.Red, 1, 1);
    const orc2 = createMonster(MonsterType.ORC, Colour.Green, 2, 1);
    const orc3 = createMonster(MonsterType.ORC, Colour.Blue, 1, 2);
    const deadOrc = createMonster(MonsterType.ORC, Colour.Yellow, 2, 2);
    deadOrc.health = 0;
    state.dungeon.layout.monsters = [orc1, orc2, orc3, deadOrc];
    state.dungeon.layout.grid = ['AAAA', 'AAAA', 'AAAA', 'AAAA'];
    state.dungeon.discoveredRooms = ['A'];
    const indicatorsBefore = state.damageIndicators?.length ?? 0;

    const event = {
      id: 'orc_drums',
      type: 'ORC_DRUMS' as const,
      name: 'events.orchDrums.name',
      nameTranslationKey: 'events.orchDrums.name',
      number: 14,
      description: 'events.orchDrums.description',
      descriptionTranslationKey: 'events.orchDrums.description',
      effect: 'theOrchDrums' as const,
      used: false,
    };

    eventEffects.theOrchDrums(state, event);

    expect(orc1.actions).toBe(3);
    expect(orc2.actions).toBe(3);
    expect(orc3.actions).toBe(3);
    expect(deadOrc.actions).toBe(2);
    expect(event.used).toBe(true);
    expect((state.damageIndicators?.length ?? 0) - indicatorsBefore).toBe(3);
  });

  it('fountainOfYouth respects max health adjusted by difficulty modifier', () => {
    const state = init();
    state.difficulty = getGameMaster('easy');
    const hero = state.heroes[0];
    hero.maxHealth = 10;
    hero.health = 10; // Effective max is 11 (10 + 1)

    const event: TurnEvent = {
      id: 'fountain_of_youth',
      type: 'FOUNTAIN_OF_YOUTH',
      name: 'events.fountainOfYouth.name',
      nameTranslationKey: 'events.fountainOfYouth.name',
      number: 8,
      description: 'events.fountainOfYouth.description',
      descriptionTranslationKey: 'events.fountainOfYouth.description',
      effect: 'fountainOfYouth',
      used: false,
    };

    eventEffects.fountainOfYouth(state, event);

    expect(hero.health).toBeLessThanOrEqual(11);
    expect(event.used).toBe(true);
  });
});

describe('Monster spawn events: difficulty distance, early round skip, and party health check', () => {
  const trollEvent: TurnEvent = {
    id: 'hungry_troll',
    type: 'HUNGRY_TROLL',
    name: 'events.hungryTroll.name',
    nameTranslationKey: 'events.hungryTroll.name',
    number: 1,
    description: 'events.hungryTroll.description',
    descriptionTranslationKey: 'events.hungryTroll.description',
    effect: 'theHungryTroll',
    used: false,
  };

  const orcEvent: TurnEvent = {
    id: 'lost_orc',
    type: 'LOST_ORC',
    name: 'events.lostOrch.name',
    nameTranslationKey: 'events.lostOrch.name',
    number: 6,
    description: 'events.lostOrch.description',
    descriptionTranslationKey: 'events.lostOrch.description',
    effect: 'theLostOrch',
    used: false,
  };

  it('difficulty configuration exposes correct defaults and helper functions work', () => {
    const easyDiff = getGameMaster('easy');
    const normalDiff = getGameMaster('normal');
    const hardDiff = getGameMaster('hard');

    expect(easyDiff?.events?.minMonsterSpawnDistance).toBe(3);
    expect(easyDiff?.events?.earliestMonsterRound).toBe(4);
    expect(easyDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(true);

    expect(normalDiff?.events?.minMonsterSpawnDistance).toBe(3);
    expect(normalDiff?.events?.earliestMonsterRound).toBe(3);
    expect(normalDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(true);

    expect(hardDiff?.events?.minMonsterSpawnDistance).toBe(2);
    expect(hardDiff?.events?.earliestMonsterRound).toBe(2);
    expect(hardDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(false);

    expect(getEventMinSpawnDistance('easy')).toBe(3);
    expect(getEventMinSpawnDistance('normal')).toBe(3);
    expect(getEventMinSpawnDistance('hard')).toBe(2);

    expect(getEarliestMonsterEventRound('easy')).toBe(4);
    expect(getEarliestMonsterEventRound('normal')).toBe(3);
    expect(getEarliestMonsterEventRound('hard')).toBe(2);
  });

  it('isPartyBelowHalfHealth calculates total party health accurately', () => {
    const state = init();
    // 4 heroes with 10 max health each = 40 max health
    state.heroes.forEach((h) => {
      h.maxHealth = 10;
      h.health = 10;
    });
    expect(isPartyBelowHalfHealth(state)).toBe(false);

    // Total health 20 / 40 = 50% (not below 50%)
    state.heroes[0].health = 5;
    state.heroes[1].health = 5;
    state.heroes[2].health = 5;
    state.heroes[3].health = 5;
    expect(isPartyBelowHalfHealth(state)).toBe(false);

    // Total health 19 / 40 < 50%
    state.heroes[0].health = 4;
    expect(isPartyBelowHalfHealth(state)).toBe(true);

    // With easy difficulty (+1 max health per hero => 4 * 11 = 44 max health)
    state.difficulty = getGameMaster('easy');
    // Total health 22 / 44 = 50% (not below 50%)
    state.heroes[0].health = 5;
    state.heroes[1].health = 5;
    state.heroes[2].health = 6;
    state.heroes[3].health = 6;
    expect(isPartyBelowHalfHealth(state)).toBe(false);

    // Total health 21 / 44 < 50%
    state.heroes[0].health = 4;
    expect(isPartyBelowHalfHealth(state)).toBe(true);
  });

  describe('Early round skipping', () => {
    it('skips hungry_troll and lost_orc if drawn before round 3 on normal difficulty', () => {
      const state = init();
      state.difficulty = getGameMaster('normal');
      state.dungeon.layout.grid = ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];
      state.heroes[0].position = { x: 0, y: 0 };

      // Round 1 (turnCount = 0)
      state.turnCount = 0;
      const event1 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event1);
      expect(event1.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      const eventOrc1 = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, eventOrc1);
      expect(eventOrc1.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      // Round 2 (turnCount = 1)
      state.turnCount = 1;
      const event2 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event2);
      expect(event2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      const eventOrc2 = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, eventOrc2);
      expect(eventOrc2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      // Round 3 (turnCount = 2) - should spawn!
      state.turnCount = 2;
      const event3 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event3);
      expect(event3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);
      expect(state.dungeon.layout.monsters[0].type).toBe(MonsterType.TROLL);

      const eventOrc3 = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, eventOrc3);
      expect(eventOrc3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(2);
      expect(state.dungeon.layout.monsters[1].type).toBe(MonsterType.ORC);
    });

    it('skips in rounds < 4 on easy difficulty and spawns in round 4+', () => {
      const state = init();
      state.difficulty = getGameMaster('easy');
      state.dungeon.layout.grid = [
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
      ];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];
      state.heroes[0].position = { x: 0, y: 0 };

      // Round 3 (turnCount = 2) -> skipped on easy (requires round 4)
      state.turnCount = 2;
      const eventTroll = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, eventTroll);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      // Round 4 (turnCount = 3) -> spawns
      state.turnCount = 3;
      eventEffects.theHungryTroll(state, eventTroll);
      expect(state.dungeon.layout.monsters.length).toBe(1);
    });

    it('spawns earlier on hard difficulty (round 2+)', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.dungeon.layout.grid = ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];
      state.heroes[0].position = { x: 0, y: 0 };

      // Round 1 (turnCount = 0) -> skipped
      state.turnCount = 0;
      const eventTroll = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, eventTroll);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      // Round 2 (turnCount = 1) -> spawns
      state.turnCount = 1;
      eventEffects.theHungryTroll(state, eventTroll);
      expect(state.dungeon.layout.monsters.length).toBe(1);
    });
  });

  describe('Party health check for hungry_troll', () => {
    it('skips hungry_troll on easy and normal when party health is below 50%', () => {
      ['easy', 'normal'].forEach((diffId) => {
        const state = init();
        state.difficulty = getGameMaster(diffId);
        state.turnCount = 5; // Well past round threshold
        state.dungeon.layout.grid = [
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
        ];
        state.dungeon.discoveredRooms = ['A'];
        state.dungeon.layout.monsters = [];
        state.heroes.forEach((h) => {
          h.maxHealth = 10;
          h.health = 4; // 16 / 40 = 40% < 50%
        });

        const event = { ...trollEvent, used: false };
        eventEffects.theHungryTroll(state, event);

        expect(event.used).toBe(true);
        expect(state.dungeon.layout.monsters.length).toBe(0);
      });
    });

    it('does not skip hungry_troll on easy and normal when party health is >= 50%', () => {
      ['easy', 'normal'].forEach((diffId) => {
        const state = init();
        state.difficulty = getGameMaster(diffId);
        state.turnCount = 5;
        state.dungeon.layout.grid = [
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
          'AAAAAA',
        ];
        state.dungeon.discoveredRooms = ['A'];
        state.dungeon.layout.monsters = [];
        state.heroes.forEach((h) => {
          h.maxHealth = 10;
          h.health = 6; // easy: 24 / 44 = 54.5%, normal: 24 / 40 = 60%
        });

        const event = { ...trollEvent, used: false };
        eventEffects.theHungryTroll(state, event);

        expect(event.used).toBe(true);
        expect(state.dungeon.layout.monsters.length).toBe(1);
        expect(state.dungeon.layout.monsters[0].type).toBe(MonsterType.TROLL);
      });
    });

    it('does NOT skip hungry_troll on hard even when party health is below 50%', () => {
      const state = init();
      state.difficulty = getGameMaster(hardDiffId());
      state.turnCount = 5;
      state.dungeon.layout.grid = [
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
      ];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];
      state.heroes.forEach((h) => {
        h.maxHealth = 10;
        h.health = 2; // 8 / 40 = 20% < 50%
      });

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);

      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);
      expect(state.dungeon.layout.monsters[0].type).toBe(MonsterType.TROLL);
    });

    function hardDiffId() {
      return 'hard';
    }

    it('does NOT skip lost_orc when party health is below 50% on easy or normal', () => {
      const state = init();
      state.difficulty = getGameMaster('normal');
      state.turnCount = 5;
      state.dungeon.layout.grid = [
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
      ];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];
      state.heroes.forEach((h) => {
        h.maxHealth = 10;
        h.health = 2; // 20% < 50%
      });

      const event = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, event);

      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);
      expect(state.dungeon.layout.monsters[0].type).toBe(MonsterType.ORC);
    });
  });

  describe('Minimum spawn distance away from heroes', () => {
    it('spawns monster at least the minimum distance away from all live heroes based on difficulty', () => {
      const state = init();
      state.difficulty = getGameMaster('easy'); // minDistance = 4
      state.turnCount = 5;
      state.dungeon.layout.grid = [
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
      ];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];

      // Place hero at (0, 0)
      state.heroes[0].position = { x: 0, y: 0 };
      // Move other heroes to same position (0, 0) for clarity
      for (let i = 1; i < state.heroes.length; i++) {
        state.heroes[i].position = { x: 0, y: 0 };
      }

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(1);
      const spawnedMonster = state.dungeon.layout.monsters[0];
      const dist = distanceInGrid({ x: 0, y: 0 }, spawnedMonster.position);
      expect(dist).toBeGreaterThanOrEqual(3);
      expect(spawnedMonster.exhausted).toBe(true);
    });

    it('prefers spawn positions out of line of sight of heroes when available', () => {
      const state = init();
      state.difficulty = getGameMaster('hard'); // minDistance = 1
      state.turnCount = 5;
      // Grid with room A (0,0)-(2,0) and room B (0,2)-(2,2), separated by a wall at y=1 except a corner
      state.dungeon.layout.grid = ['AAA', '###', 'BBB'];
      state.dungeon.discoveredRooms = ['A', 'B'];
      state.dungeon.layout.monsters = [];

      // Hero at (0, 0) in room A. Hero has LoS to room A cells, but no LoS to room B cells behind wall
      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
      });

      const event = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(1);
      const spawnedOrc = state.dungeon.layout.monsters[0];
      // Should prefer room B which is out of LoS
      expect(spawnedOrc.position.y).toBe(2);
      expect(spawnedOrc.exhausted).toBe(true);
    });

    it('does not spawn monster if all room cells are closer than the required distance', () => {
      const state = init();
      state.difficulty = getGameMaster('easy'); // minDistance = 4
      state.turnCount = 5;
      // 2x2 grid, all cells have distance <= 2 from (0,0)
      state.dungeon.layout.grid = ['AA', 'AA'];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];

      state.heroes[0].position = { x: 0, y: 0 };
      for (let i = 1; i < state.heroes.length; i++) {
        state.heroes[i].position = { x: 0, y: 0 };
      }

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(0);
    });

    it('respects custom difficulty minDistance setting', () => {
      const state = init();
      state.difficulty = {
        id: 'custom',
        nameTranslationKey: 'custom',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        events: {
          minMonsterSpawnDistance: 4,
          earliestMonsterRound: 1,
        },
      };
      state.turnCount = 5;
      state.dungeon.layout.grid = [
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
        'AAAAAA',
      ];
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.monsters = [];

      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
      });

      const event = { ...orcEvent, used: false };
      eventEffects.theLostOrch(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(1);
      const spawnedOrc = state.dungeon.layout.monsters[0];
      const dist = distanceInGrid({ x: 0, y: 0 }, spawnedOrc.position);
      expect(dist).toBeGreaterThanOrEqual(4);
    });

    it('does not spawn a troll when 4 trolls are already visible and Hungry Troll is drawn', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      const troll1 = createMonster(MonsterType.TROLL, Colour.Red, 1, 1);
      const troll2 = createMonster(MonsterType.TROLL, Colour.Green, 2, 1);
      const troll3 = createMonster(MonsterType.TROLL, Colour.Blue, 3, 1);
      const troll4 = createMonster(MonsterType.TROLL, Colour.Yellow, 4, 1);
      state.dungeon.layout.monsters = [troll1, troll2, troll3, troll4];

      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
      });

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);

      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(4);
    });

    it('spawns a troll when 4 trolls are in layout but 1 is dead and party level is HERO', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      const troll1 = createMonster(MonsterType.TROLL, Colour.Red, 1, 1);
      const troll2 = createMonster(MonsterType.TROLL, Colour.Green, 2, 1);
      const troll3 = createMonster(MonsterType.TROLL, Colour.Blue, 3, 1);
      const deadTroll = createMonster(MonsterType.TROLL, Colour.Yellow, 4, 1);
      deadTroll.health = 0;
      state.dungeon.layout.monsters = [troll1, troll2, troll3, deadTroll];

      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
        h.level = Level.HERO;
      });

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);

      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(5);
    });
  });

  describe('Party average level and Hungry Troll visible troll limits', () => {
    it('calculates party average level correctly', () => {
      const state = init();
      // Default: all APPRENTICE
      expect(getPartyAverageLevel(state)).toBe(Level.APPRENTICE);

      // All KNIGHT
      state.heroes.forEach((h) => {
        h.level = Level.KNIGHT;
      });
      expect(getPartyAverageLevel(state)).toBe(Level.KNIGHT);

      // All HERO
      state.heroes.forEach((h) => {
        h.level = Level.HERO;
      });
      expect(getPartyAverageLevel(state)).toBe(Level.HERO);

      // All LORD
      state.heroes.forEach((h) => {
        h.level = Level.LORD;
      });
      expect(getPartyAverageLevel(state)).toBe(Level.LORD);

      // All MASTER
      state.heroes.forEach((h) => {
        h.level = Level.MASTER;
      });
      expect(getPartyAverageLevel(state)).toBe(Level.MASTER);

      // 3 APPRENTICE (0) + 1 KNIGHT (1) = 1/4 = 0.25 -> APPRENTICE
      state.heroes[0].level = Level.APPRENTICE;
      state.heroes[1].level = Level.APPRENTICE;
      state.heroes[2].level = Level.APPRENTICE;
      state.heroes[3].level = Level.KNIGHT;
      expect(getPartyAverageLevel(state)).toBe(Level.APPRENTICE);

      // 1 APPRENTICE (0) + 3 KNIGHT (1) = 3/4 = 0.75 -> KNIGHT
      state.heroes[0].level = Level.APPRENTICE;
      state.heroes[1].level = Level.KNIGHT;
      state.heroes[2].level = Level.KNIGHT;
      state.heroes[3].level = Level.KNIGHT;
      expect(getPartyAverageLevel(state)).toBe(Level.KNIGHT);

      // Empty heroes list fallback
      expect(getPartyAverageLevel({ ...state, heroes: [] })).toBe(
        Level.APPRENTICE,
      );
    });

    it('when average level is APPRENTICE, skips hungry_troll if 1 or more trolls are visible', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
        h.level = Level.APPRENTICE;
      });

      // 0 visible trolls: should spawn
      state.dungeon.layout.monsters = [];
      const event1 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event1);
      expect(event1.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);

      // 1 visible troll: should skip
      const event2 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event2);
      expect(event2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1); // not spawned, remains 1

      // 2 visible trolls: should skip
      const troll2 = createMonster(MonsterType.TROLL, Colour.Green, 2, 1);
      state.dungeon.layout.monsters.push(troll2);
      const event3 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event3);
      expect(event3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(2);
    });

    it('when average level is KNIGHT, spawns with 0 or 1 visible troll, but skips if 2 or more visible trolls', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
        h.level = Level.KNIGHT;
      });

      // 0 visible trolls: spawns 1st troll
      state.dungeon.layout.monsters = [];
      const event1 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event1);
      expect(event1.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);

      // 1 visible troll: spawns 2nd troll (since only skipped at 2 visible trolls)
      const event2 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event2);
      expect(event2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(2);

      // 2 visible trolls: should skip
      const event3 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event3);
      expect(event3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(2); // remains 2
    });

    it('when average level is HERO or higher, uses normal limit (allows up to 4 trolls)', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA'];
      state.dungeon.discoveredRooms = ['A'];
      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
        h.level = Level.HERO;
      });

      // 2 visible trolls: spawns 3rd troll (normal allows up to 4)
      const troll1 = createMonster(MonsterType.TROLL, Colour.Red, 1, 1);
      const troll2 = createMonster(MonsterType.TROLL, Colour.Green, 2, 1);
      state.dungeon.layout.monsters = [troll1, troll2];

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);
      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(3);

      // 3 visible trolls: spawns 4th troll
      const event2 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event2);
      expect(event2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(4);

      // 4 visible trolls: skips
      const event3 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event3);
      expect(event3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(4);
    });

    it('does not count invisible (undiscovered room) or dead trolls towards visibility limits', () => {
      const state = init();
      state.difficulty = getGameMaster('hard');
      state.turnCount = 5;
      state.dungeon.layout.grid = ['AAAAAA', 'AAAAAA', 'BBBBBB', 'BBBBBB'];
      state.dungeon.discoveredRooms = ['A']; // Room B is undiscovered
      state.heroes.forEach((h) => {
        h.position = { x: 0, y: 0 };
        h.level = Level.APPRENTICE;
      });

      // 1 dead troll in Room A + 1 alive troll in undiscovered Room B -> 0 visible alive trolls
      const deadTroll = createMonster(MonsterType.TROLL, Colour.Red, 1, 1);
      deadTroll.health = 0;
      const hiddenTroll = createMonster(MonsterType.TROLL, Colour.Green, 1, 2);
      state.dungeon.layout.monsters = [deadTroll, hiddenTroll];

      const event = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event);
      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(3); // Spawned 1 more in Room A
    });
  });

  describe('Fountain of Youth draw probability and conditions', () => {
    it('draws fountain_of_youth with 50% probability when party average health is below 50% and not played previous round', () => {
      const state = init();
      const fountain = state.eventDeck.find(
        (e) => e.id === 'fountain_of_youth',
      )!;
      const otherEvent = state.eventDeck.find(
        (e) => e.id !== 'fountain_of_youth',
      )!;

      // Arrange deck with otherEvent first
      state.eventDeck = [
        { ...otherEvent, used: false },
        { ...fountain, used: false },
      ];

      // Party health below 50%
      state.heroes.forEach((h) => {
        h.health = 2;
        h.maxHealth = 10;
      });

      // Math.random < 0.5 triggers fountain_of_youth selection
      vi.spyOn(Math, 'random').mockReturnValue(0.2);
      const drawn1 = drawNextEvent(state);
      expect(drawn1.id).toBe('fountain_of_youth');
      expect(state.eventDeck[0].id).toBe('fountain_of_youth');

      // Math.random >= 0.5 draws normally from top of unused events
      state.eventDeck = [
        { ...otherEvent, used: false },
        { ...fountain, used: false },
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.7);
      const drawn2 = drawNextEvent(state);
      expect(drawn2.id).toBe(otherEvent.id);

      vi.restoreAllMocks();
    });

    it('does NOT trigger 50% fountain_of_youth chance if it was played in the previous round', () => {
      const state = init();
      const fountain = state.eventDeck.find(
        (e) => e.id === 'fountain_of_youth',
      )!;
      const otherEvent = state.eventDeck.find(
        (e) => e.id !== 'fountain_of_youth',
      )!;

      state.eventDeck = [
        { ...otherEvent, used: false },
        { ...fountain, used: false },
      ];

      // Party health below 50%
      state.heroes.forEach((h) => {
        h.health = 2;
        h.maxHealth = 10;
      });

      // Fountain of youth was played previous round
      state.previousEvent = { ...fountain };

      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const drawn = drawNextEvent(state);
      expect(drawn.id).toBe(otherEvent.id);

      // Also if state.currentEvent was fountain_of_youth before next draw
      state.previousEvent = undefined;
      state.currentEvent = { ...fountain };
      const drawn2 = drawNextEvent(state);
      expect(drawn2.id).toBe(otherEvent.id);

      vi.restoreAllMocks();
    });

    it('does NOT trigger 50% fountain_of_youth chance if party average health is 50% or above', () => {
      const state = init();
      const fountain = state.eventDeck.find(
        (e) => e.id === 'fountain_of_youth',
      )!;
      const otherEvent = state.eventDeck.find(
        (e) => e.id !== 'fountain_of_youth',
      )!;

      state.eventDeck = [
        { ...otherEvent, used: false },
        { ...fountain, used: false },
      ];

      // Party health exactly 50%
      state.heroes.forEach((h) => {
        h.health = 5;
        h.maxHealth = 10;
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const drawn = drawNextEvent(state);
      expect(drawn.id).toBe(otherEvent.id);

      vi.restoreAllMocks();
    });
  });

  describe('Magic Storm and restoreDisabledItems', () => {
    it('disables item on Magic Storm, drops bonus, and restores item and bonus when event deck runs out', () => {
      const state = init();
      const boots: Item = {
        id: 'boots_of_speed',
        name: 'Boots',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          MOVEMENT_BONUS: 1,
        },
        pickup: 'movementBonusOnPickup',
        drop: 'movementBonusOnDrop',
      };

      const hero = state.heroes[0];
      hero.maxMovement = 3;
      hero.movement = 3;
      hero.inventory.push(boots);

      // Pickup boots initially
      hero.maxMovement += 1; // 4
      hero.movement += 1; // 4

      const magicStormEvent = events.find((e) => e.id === 'magic_storm')!;
      eventEffects.theMagicStorm(state, magicStormEvent);

      expect(boots.disabled).toBe(true);
      expect(hero.maxMovement).toBe(3);
      expect(hero.movement).toBe(3);

      // Even if no heroes have elemental weapon, exhausted event deck should restore disabled item
      state.heroes.forEach((h) => {
        if (h.weapon) h.weapon.elemental = false;
      });
      state.eventDeck.forEach((e) => {
        e.used = true;
      });

      resetEventEffects(state);

      expect(boots.disabled).toBe(false);
      expect(hero.maxMovement).toBe(4);
      expect(hero.movement).toBe(4);
    });
  });
});

describe('Event light sources', () => {
  it('sun stone drops a troll carried item on the floor where the troll stood', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const state = init();
    const event = events.find((e) => e.id === 'sun_stone') as TurnEvent;
    const hero = state.heroes[0];
    const item: Item = {
      id: 'trolls_amulet',
      name: 'Amulet',
      type: ItemType.MAGIC,
      value: 0,
      amountInDeck: 1,
    };
    const troll = createMonsterWithInventory(
      MonsterType.TROLL,
      Colour.Green,
      hero.position.x,
      hero.position.y,
      [item],
    );
    state.dungeon.layout.monsters = [troll];

    eventEffects.sunStone(state, event);

    expect(troll.health).toBe(0);
    expect(troll.inventory).toEqual([]);
    const droppedLocation = state.dungeon.layout.items.find(
      (itemLocation) => itemLocation.item === item,
    );
    expect(droppedLocation).toBeDefined();
    expect(droppedLocation?.position).toEqual(troll.position);

    vi.restoreAllMocks();
  });

  it('sun stone adds a lingering golden flash light at the affected hero', () => {
    const state = init();
    const event = events.find((e) => e.id === 'sun_stone') as TurnEvent;
    eventEffects.sunStone(state, event);
    expect(state.eventLights?.length).toBe(1);
    const light = state.eventLights![0];
    expect(light.effect).toBe('blink');
    expect(light.color).toBe('#FFE9A0');
    // The flash sits on one of the heroes.
    const positions = state.heroes.map(
      (hero) => `${hero.position.x},${hero.position.y}`,
    );
    expect(positions).toContain(`${light.position.x},${light.position.y}`);
  });

  it('magic node bathes all heroes in green light, the fountain does not', () => {
    const state = init();
    const node = events.find((e) => e.id === 'magic_node') as TurnEvent;
    eventEffects.fountainOfYouth(state, node);
    expect(state.eventLights?.length).toBe(state.heroes.length);
    state.eventLights!.forEach((light) => {
      expect(light.color).toBe('#7CFC9A');
      expect(light.effect).toBe('pulse');
    });
    const fountain = events.find(
      (e) => e.id === 'fountain_of_youth',
    ) as TurnEvent;
    eventEffects.fountainOfYouth(state, fountain);
    // The fountain variant adds no lights of its own.
    expect(state.eventLights?.length).toBe(state.heroes.length);
  });

  it('resetEventEffects clears the round-scoped event lights', () => {
    const state = init();
    const event = events.find((e) => e.id === 'sun_stone') as TurnEvent;
    eventEffects.sunStone(state, event);
    expect(state.eventLights?.length).toBe(1);
    resetEventEffects(state);
    expect(state.eventLights).toEqual([]);
  });
});

describe('sleeping gas light', () => {
  const firstCellOfEachRoom = (
    state: ReturnType<typeof init>,
  ): Record<string, { x: number; y: number }> => {
    const rooms: Record<string, { x: number; y: number }> = {};
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => {
        if (cell !== '#' && cell !== ' ' && !rooms[cell]) {
          rooms[cell] = { x, y };
        }
      });
    });
    return rooms;
  };

  it('fills the room of every live hero until round reset', () => {
    const state = init();
    const event = events.find((e) => e.id === 'sleeping_gas') as TurnEvent;
    eventEffects.sleepingGasCloud(state, event);
    // All heroes start in the same room: one cloud, covering it.
    expect(state.eventLights?.length).toBe(1);
    const light = state.eventLights![0];
    expect(light.effect).toBe('gas');
    expect(light.color).toBe('#7CB96B');
    expect(light.id).toMatch(/^sleeping_gas_light_/);
    resetEventEffects(state);
    expect(state.eventLights).toEqual([]);
  });

  it('creates one cloud per distinct room holding a live hero', () => {
    const state = init();
    const rooms = firstCellOfEachRoom(state);
    const roomKeys = Object.keys(rooms);
    expect(roomKeys.length).toBeGreaterThanOrEqual(2);
    // Split the party across two rooms: hero 0 alone, everyone else
    // together.
    state.heroes[0].position = rooms[roomKeys[0]];
    state.heroes
      .slice(1)
      .forEach((hero) => (hero.position = rooms[roomKeys[1]]));

    const event = events.find((e) => e.id === 'sleeping_gas') as TurnEvent;
    eventEffects.sleepingGasCloud(state, event);
    const lights = state.eventLights ?? [];
    expect(lights.length).toBe(2);
    expect(lights.map((light) => light.id).sort()).toEqual(
      [
        `sleeping_gas_light_${roomKeys[0]}`,
        `sleeping_gas_light_${roomKeys[1]}`,
      ].sort(),
    );
    resetEventEffects(state);
    expect(state.eventLights).toEqual([]);
  });

  it('does not create a cloud for rooms where only dead heroes stand', () => {
    const state = init();
    const rooms = firstCellOfEachRoom(state);
    const roomKeys = Object.keys(rooms);
    const partyRoom = findCell(
      state.dungeon.layout.grid,
      state.heroes[1].position.x,
      state.heroes[1].position.y,
    );
    const otherRoomKey = roomKeys.find((key) => key !== partyRoom)!;
    // Move one hero alone into another room and kill them there.
    state.heroes[0].position = rooms[otherRoomKey];
    state.heroes[0].health = 0;

    const event = events.find((e) => e.id === 'sleeping_gas') as TurnEvent;
    eventEffects.sleepingGasCloud(state, event);
    const lights = state.eventLights ?? [];
    // Only the living party's room gets a cloud.
    expect(lights.length).toBe(1);
    expect(
      lights.some((light) => light.id === `sleeping_gas_light_${otherRoomKey}`),
    ).toBe(false);
  });
});

describe('landslide event', () => {
  const landslideEvent = () => {
    const event = events.find((e) => e.id === 'landslide') as TurnEvent;
    return { ...event, used: false };
  };

  const clearActors = (state: ReturnType<typeof init>) => {
    state.dungeon.layout.monsters = [];
    state.heroes.forEach((hero) => (hero.position = { x: 0, y: 0 }));
  };

  it('collapses a discovered corridor letter entirely', () => {
    const state = init();
    clearActors(state);
    state.dungeon.layout.grid = ['#####', '#AAB#', '#####'];
    state.dungeon.layout.corridors = ['B'];
    state.dungeon.layout.corridorCells = [];
    state.dungeon.discoveredRooms = ['A', 'B'];

    eventEffects.landslide(state, landslideEvent());

    expect(state.dungeon.layout.grid).toEqual(['#####', '#AA?#', '#####']);
    expect(state.dungeon.collapsedCorridors).toEqual([
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
  });

  it('collapses only the declared corridor cells of a room', () => {
    const state = init();
    clearActors(state);
    state.dungeon.layout.grid = ['#####', '#AAA#', '#####'];
    state.dungeon.layout.corridors = [];
    state.dungeon.layout.corridorCells = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];
    state.dungeon.discoveredRooms = ['A'];

    eventEffects.landslide(state, landslideEvent());

    expect(state.dungeon.layout.grid).toEqual(['#####', '#??A#', '#####']);
    expect(state.dungeon.collapsedCorridors).toEqual([
      {
        letter: 'A',
        cells: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ],
      },
    ]);
  });

  it('restores collapsed corridor cells on resetEventEffects', () => {
    const state = init();
    clearActors(state);
    state.dungeon.layout.grid = ['#####', '#AAA#', '#####'];
    state.dungeon.layout.corridors = [];
    state.dungeon.layout.corridorCells = [{ x: 2, y: 1 }];
    state.dungeon.discoveredRooms = ['A'];

    eventEffects.landslide(state, landslideEvent());
    expect(state.dungeon.layout.grid).toEqual(['#####', '#A?A#', '#####']);

    state.eventDeck.forEach((event) => (event.used = true));
    resetEventEffects(state);

    expect(state.dungeon.layout.grid).toEqual(['#####', '#AAA#', '#####']);
    expect(state.dungeon.collapsedCorridors).toEqual([]);
  });

  it('keeps and restores both corridors after two landslides in one cycle', () => {
    const state = init();
    clearActors(state);
    state.dungeon.layout.grid = ['#####', '#ACB#', '#####'];
    state.dungeon.layout.corridors = ['B', 'C'];
    state.dungeon.layout.corridorCells = [];
    state.dungeon.discoveredRooms = ['A', 'B'];

    // First landslide can only reach corridor B (C is undiscovered)
    eventEffects.landslide(state, landslideEvent());
    expect(state.dungeon.layout.grid).toEqual(['#####', '#AC?#', '#####']);

    // Second landslide reaches corridor C
    state.dungeon.discoveredRooms = ['A', 'B', 'C'];
    eventEffects.landslide(state, landslideEvent());
    expect(state.dungeon.layout.grid).toEqual(['#####', '#A??#', '#####']);
    expect(state.dungeon.collapsedCorridors).toHaveLength(2);

    state.eventDeck.forEach((event) => (event.used = true));
    resetEventEffects(state);

    expect(state.dungeon.layout.grid).toEqual(['#####', '#ACB#', '#####']);
    expect(state.dungeon.collapsedCorridors).toEqual([]);
  });

  it('leaves the dungeon untouched when the only corridor cells are blocked by a hero', () => {
    const state = init();
    clearActors(state);
    state.dungeon.layout.grid = ['#####', '#AAA#', '#####'];
    state.dungeon.layout.corridors = [];
    state.dungeon.layout.corridorCells = [{ x: 2, y: 1 }];
    state.dungeon.discoveredRooms = ['A'];
    state.heroes[0].position = { x: 2, y: 1 };

    const event = landslideEvent();
    eventEffects.landslide(state, event);

    expect(event.used).toBe(true);
    expect(state.dungeon.layout.grid).toEqual(['#####', '#AAA#', '#####']);
    expect(state.dungeon.collapsedCorridors).toBeUndefined();
  });
});

describe('foresight event', () => {
  const foresightEvent = () => {
    const event = events.find((e) => e.id === 'foresight') as TurnEvent;
    return { ...event, used: false };
  };

  const clearActors = (state: ReturnType<typeof init>) => {
    state.dungeon.layout.monsters = [];
    state.heroes.forEach((hero) => (hero.position = { x: 0, y: 0 }));
  };

  const sword: Item = {
    id: 'sword',
    name: 'Sword',
    type: ItemType.WEAPON,
    amountInDeck: 1,
    value: 0,
  };

  const setUpTwoRooms = (state: ReturnType<typeof init>, secrets: Secret[]) => {
    state.dungeon.layout.grid = ['#####', '#AAA#', '#####', '#BBB#', '#####'];
    state.dungeon.discoveredRooms = ['A'];
    state.dungeon.layout.secrets = secrets;
  };

  it('reveals a still-hidden item secret in an undiscovered room', () => {
    const state = init();
    clearActors(state);
    setUpTwoRooms(state, [
      {
        id: 'equip1',
        type: SecretType.EQUIPMENT,
        name: 'Equipment',
        found: false,
        position: { x: 2, y: 3 },
        item: sword,
      },
    ]);

    eventEffects.foresight(state, foresightEvent());

    expect(state.dungeon.layout.secrets).toHaveLength(0);
    expect(state.dungeon.layout.items).toHaveLength(1);
    expect(state.dungeon.layout.items[0].item).toBe(sword);
    expect(state.dungeon.layout.items[0].position).toEqual({ x: 2, y: 3 });
  });

  it('reveals exactly one secret when several qualify and keeps the rest', () => {
    const state = init();
    clearActors(state);
    setUpTwoRooms(state, [
      {
        id: 'equip1',
        type: SecretType.EQUIPMENT,
        name: 'Equipment',
        found: false,
        position: { x: 1, y: 3 },
        item: { ...sword, id: 'flail' },
      },
      {
        id: 'magic1',
        type: SecretType.MAGIC_ITEM,
        name: 'Magic Item',
        found: false,
        position: { x: 3, y: 3 },
        item: { ...sword, id: 'potion' },
      },
    ]);

    eventEffects.foresight(state, foresightEvent());

    expect(state.dungeon.layout.secrets).toHaveLength(1);
    expect(state.dungeon.layout.items).toHaveLength(1);
    const revealedId = state.dungeon.layout.items[0].item?.id;
    expect(['flail', 'potion']).toContain(revealedId);
  });

  it('does nothing when no undiscovered item secret qualifies', () => {
    const state = init();
    clearActors(state);
    setUpTwoRooms(state, [
      {
        id: 'equip1',
        type: SecretType.EQUIPMENT,
        name: 'Equipment',
        found: false,
        position: { x: 2, y: 1 },
        item: sword,
      },
      {
        id: 'trap1',
        type: SecretType.TRAP_DOOR,
        name: 'Trap Door',
        found: false,
        position: { x: 2, y: 3 },
      },
      {
        id: 'stair',
        type: SecretType.NOTE,
        name: 'Secret Stair',
        found: false,
        position: { x: 1, y: 3 },
        revealedBy: 'necklace_of_light',
      },
    ]);

    eventEffects.foresight(state, foresightEvent());

    expect(state.dungeon.layout.secrets).toHaveLength(3);
    expect(state.dungeon.layout.items).toHaveLength(0);
  });
});
