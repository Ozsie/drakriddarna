import { describe, it, expect } from 'vitest';
import { init } from '../game';
import { shuffleEventDeck, selectNextEvent } from './EventsLogic';

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
