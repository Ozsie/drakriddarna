// Event card view model adapter: the only place that reads GameState for
// the event card. Deck counts, the active event's texts and the drawn
// list (already bulleted) are prebuilt here.

import type { GameState, TurnEvent } from '../../types';
import type { Translator } from '../../uikit/env';
import type {
  DrawnEventVm,
  EventCardViewModel,
} from '../../uikit/components/eventCard';
import { i18nTranslator } from '../i18nAdapter';

export const formatEventTitle = (
  event: TurnEvent,
  t: Translator = i18nTranslator,
): string => {
  const raw = event.nameTranslationKey ?? event.name;
  const name = t(raw);
  const resolvedName = name === raw ? event.name : name;
  return `${event.number}. ${resolvedName}`;
};

export const formatEventDescription = (
  event: TurnEvent,
  t: Translator = i18nTranslator,
): string => {
  const raw = event.descriptionTranslationKey ?? event.description;
  const desc = t(raw);
  return desc === raw ? event.description : desc;
};

/** The drawn events, oldest first, as bulleted row titles. */
export const drawnEventsFor = (
  state: GameState,
  t: Translator,
): DrawnEventVm[] =>
  (state.eventDeck ?? [])
    .filter((event) => event.used)
    .map((event) => ({
      number: event.number,
      title: `• ${formatEventTitle(event, t)}`,
    }));

export const toEventCardViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
): EventCardViewModel | null => {
  if (!state) return null;

  const eventDeck = state.eventDeck ?? [];
  const activeEvent = state.currentEvent;

  const remaining = eventDeck.filter((e) => !e.used).length;
  const total = eventDeck.length;
  const drawn = eventDeck.filter((e) => e.used).length;

  // The untranslated fallbacks below predate the kit; they stay verbatim.
  const rawEventCount = t('content.event.count');
  const eventWord =
    rawEventCount && rawEventCount !== 'content.event.count'
      ? rawEventCount
      : 'Events';

  const rawCurrent = t('content.event.current');
  const currentWord =
    rawCurrent === 'content.event.current'
      ? 'Current event'
      : rawCurrent || 'Current event';

  const rawDrawn = t('content.event.drawn');
  const drawnWord =
    rawDrawn && rawDrawn !== 'content.event.drawn' ? rawDrawn : 'Drawn';

  const rawNone = 'content.event.none';
  const translatedNone = t(rawNone);
  const noneText =
    translatedNone && translatedNone !== rawNone
      ? translatedNone
      : '(None drawn yet)';

  return {
    headerText: `🎴 ${eventWord} (${remaining}/${total})`,
    deckSummary: { remaining, total, drawn },
    activeEvent: activeEvent
      ? {
          header: currentWord,
          title: formatEventTitle(activeEvent, t),
          description: formatEventDescription(activeEvent, t),
        }
      : null,
    drawnEventsHeader: `${drawnWord} (${drawn}):`,
    drawnEvents: drawnEventsFor(state, t),
    emptyDrawnText: noneText,
  };
};
