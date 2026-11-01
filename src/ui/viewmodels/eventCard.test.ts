import { describe, expect, it } from 'vitest';
import { toEventCardViewModel } from './eventCard';
import type { GameState, TurnEvent } from '../../types';

const identityT = (key: string) => key;

const event = (
  number: number,
  used: boolean,
  name = `Event ${number}`,
): TurnEvent => ({
  id: `e${number}`,
  number,
  name,
  description: `Desc ${number}`,
  effect: 'theMagicStorm',
  used,
});

const createState = (
  eventDeck: TurnEvent[],
  currentEvent?: TurnEvent,
): GameState =>
  ({
    eventDeck,
    currentEvent,
  }) as unknown as GameState;

describe('event card view model', () => {
  it('summarizes the deck and keeps the untranslated header fallback', () => {
    const vm = toEventCardViewModel(
      createState([event(1, true), event(2, false), event(3, false)]),
      identityT,
    );
    expect(vm?.deckSummary).toEqual({ remaining: 2, total: 3, drawn: 1 });
    expect(vm?.headerText).toBe('🎴 Events (2/3)');
    expect(vm?.drawnEventsHeader).toBe('Drawn (1):');
  });

  it('returns null without state and empty-handed for an empty deck', () => {
    expect(toEventCardViewModel(null, identityT)).toBeNull();
    const vm = toEventCardViewModel(createState([]), identityT);
    expect(vm?.deckSummary.total).toBe(0);
    expect(vm?.activeEvent).toBeNull();
    expect(vm?.emptyDrawnText).toBe('(None drawn yet)');
  });

  it('prebuilds the active event texts and bulleted drawn rows', () => {
    const active = event(2, true, 'The Sun Stone');
    const vm = toEventCardViewModel(
      createState([event(1, true, 'The Hungry Troll'), event(2, true)], active),
      identityT,
    );
    expect(vm?.activeEvent?.title).toBe('2. The Sun Stone');
    expect(vm?.activeEvent?.description).toBe('Desc 2');
    expect(vm?.drawnEvents.map((row) => row.title)).toEqual([
      '• 1. The Hungry Troll',
      '• 2. Event 2',
    ]);
    expect(vm?.drawnEvents.map((row) => row.number)).toEqual([1, 2]);
  });
});
