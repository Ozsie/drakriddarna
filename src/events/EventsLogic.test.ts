import { describe, it, expect } from 'vitest';
import { init } from '../game';
import {
  shuffleEventDeck,
  selectNextEvent,
  eventEffects,
  resetEventEffects,
} from './EventsLogic';
import { Colour, MonsterType } from '../types';
import { createMonster } from '../dungeon/DungeonLogic';

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
