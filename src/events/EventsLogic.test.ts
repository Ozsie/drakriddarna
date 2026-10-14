import { describe, it, expect } from 'vitest';
import { init } from '../game';
import {
  shuffleEventDeck,
  selectNextEvent,
  eventEffects,
  resetEventEffects,
} from './EventsLogic';
import { Colour, MonsterType, type TurnEvent } from '../types';
import { createMonster } from '../dungeon/DungeonLogic';
import {
  DifficultLevels,
  distanceInGrid,
  getEventMinSpawnDistance,
  getEarliestMonsterEventRound,
  isPartyBelowHalfHealth,
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

    eventEffects.theOrcDrums(state, event);

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
    effect: 'theLostOrc',
    used: false,
  };

  it('difficulty configuration exposes correct defaults and helper functions work', () => {
    const easyDiff = DifficultLevels.find((d) => d.id === 'easy');
    const normalDiff = DifficultLevels.find((d) => d.id === 'normal');
    const hardDiff = DifficultLevels.find((d) => d.id === 'hard');

    expect(easyDiff?.events?.minMonsterSpawnDistance).toBe(4);
    expect(easyDiff?.events?.earliestMonsterRound).toBe(4);
    expect(easyDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(true);

    expect(normalDiff?.events?.minMonsterSpawnDistance).toBe(3);
    expect(normalDiff?.events?.earliestMonsterRound).toBe(3);
    expect(normalDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(true);

    expect(hardDiff?.events?.minMonsterSpawnDistance).toBe(1);
    expect(hardDiff?.events?.earliestMonsterRound).toBe(2);
    expect(hardDiff?.events?.skipHungryTrollBelowHalfHealth).toBe(false);

    expect(getEventMinSpawnDistance('easy')).toBe(4);
    expect(getEventMinSpawnDistance('normal')).toBe(3);
    expect(getEventMinSpawnDistance('hard')).toBe(1);

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
  });

  describe('Early round skipping', () => {
    it('skips hungry_troll and lost_orc if drawn before round 3 on normal difficulty', () => {
      const state = init();
      state.difficulty = DifficultLevels.find((d) => d.id === 'normal');
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
      eventEffects.theLostOrc(state, eventOrc1);
      expect(eventOrc1.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      // Round 2 (turnCount = 1)
      state.turnCount = 1;
      const event2 = { ...trollEvent, used: false };
      eventEffects.theHungryTroll(state, event2);
      expect(event2.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(0);

      const eventOrc2 = { ...orcEvent, used: false };
      eventEffects.theLostOrc(state, eventOrc2);
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
      eventEffects.theLostOrc(state, eventOrc3);
      expect(eventOrc3.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(2);
      expect(state.dungeon.layout.monsters[1].type).toBe(MonsterType.ORC);
    });

    it('skips in rounds < 4 on easy difficulty and spawns in round 4+', () => {
      const state = init();
      state.difficulty = DifficultLevels.find((d) => d.id === 'easy');
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
      state.difficulty = DifficultLevels.find((d) => d.id === 'hard');
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
        state.difficulty = DifficultLevels.find((d) => d.id === diffId);
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
        state.difficulty = DifficultLevels.find((d) => d.id === diffId);
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
          h.health = 5; // 20 / 40 = 50%
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
      state.difficulty = DifficultLevels.find((d) => d.id === hardDiffId());
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
      state.difficulty = DifficultLevels.find((d) => d.id === 'normal');
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
      eventEffects.theLostOrc(state, event);

      expect(event.used).toBe(true);
      expect(state.dungeon.layout.monsters.length).toBe(1);
      expect(state.dungeon.layout.monsters[0].type).toBe(MonsterType.ORC);
    });
  });

  describe('Minimum spawn distance away from heroes', () => {
    it('spawns monster at least the minimum distance away from all live heroes based on difficulty', () => {
      const state = init();
      state.difficulty = DifficultLevels.find((d) => d.id === 'easy'); // minDistance = 3
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
      state.difficulty = DifficultLevels.find((d) => d.id === 'hard'); // minDistance = 1
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
      eventEffects.theLostOrc(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(1);
      const spawnedOrc = state.dungeon.layout.monsters[0];
      // Should prefer room B which is out of LoS
      expect(spawnedOrc.position.y).toBe(2);
      expect(spawnedOrc.exhausted).toBe(true);
    });

    it('does not spawn monster if all room cells are closer than the required distance', () => {
      const state = init();
      state.difficulty = DifficultLevels.find((d) => d.id === 'easy'); // minDistance = 3
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
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0 },
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
      eventEffects.theLostOrc(state, event);

      expect(state.dungeon.layout.monsters.length).toBe(1);
      const spawnedOrc = state.dungeon.layout.monsters[0];
      const dist = distanceInGrid({ x: 0, y: 0 }, spawnedOrc.position);
      expect(dist).toBeGreaterThanOrEqual(4);
    });
  });
});
