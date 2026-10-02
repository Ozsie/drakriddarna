import type {
  Actor,
  GameState,
  Hero,
  InteractableCell,
  Position,
  TurnEvent,
} from '../types';
import { Colour, SecretType } from '../types';
import {
  addLog,
  clearActorAnimations,
  doReRender,
  findCell,
  i18n,
  isSamePosition,
} from '../core';
import {
  levelUp,
  newHero,
  replaceDeadHeroes,
  resetLiveHeroes,
  rewardLiveHeroes,
} from '../hero/HeroLogic';
import { resetOnNextDungeon } from '../items/ItemLogic';
import { getEventsForDungeon } from '../events/EventsLogic';

let getCampaignDeck:
  | ((campaignId: string) => TurnEvent[] | undefined)
  | undefined;

export const setCampaignDeckProvider = (
  provider: (campaignId: string) => TurnEvent[] | undefined,
): void => {
  getCampaignDeck = provider;
};

export const NEXT_DUNGEON = 'nextDungeon';

export type InteractableEffectHandler = (
  state: GameState,
  interactable: InteractableCell,
  actor?: Actor | Hero,
) => void | boolean;

export const interactableEffects: Record<string, InteractableEffectHandler> = {
  addHero: (
    state: GameState,
    interactable: InteractableCell,
    actor?: Actor | Hero,
  ) => {
    const args = interactable.args ?? {};
    let heroToAdd: Hero | Actor;

    if (args.hero && typeof args.hero === 'object') {
      heroToAdd = args.hero as Hero | Actor;
    } else {
      const heroName =
        (args.name as string) ?? (args.heroName as string) ?? 'Allied Hero';
      const heroColour =
        (args.colour as Colour) ?? (args.color as Colour) ?? Colour.Yellow;
      heroToAdd = newHero(heroName, heroColour);
    }

    const targetPos: Position = (args.position as Position) ?? {
      x: interactable.position.x,
      y: interactable.position.y,
    };

    heroToAdd.position = { ...targetPos };

    const exists = state.heroes.some(
      (h) =>
        (heroToAdd.id && h.id === heroToAdd.id) || h.name === heroToAdd.name,
    );
    if (!exists) {
      state.heroes.push(heroToAdd);
    }

    addLog(state, 'logs.heroAction.heroJoined', {
      hero: i18n(actor?.name ?? ''),
      newHero: i18n(heroToAdd.name),
    });

    return true;
  },

  removeTrapsInRoom: (
    state: GameState,
    interactable: InteractableCell,
    actor?: Actor | Hero,
  ) => {
    const args = interactable.args ?? {};
    const room =
      (args.room as string) ??
      findCell(
        state.dungeon.layout.grid,
        interactable.position.x,
        interactable.position.y,
      );

    if (!room) return false;

    // Remove traps from all doors in/around the room
    state.dungeon.layout.doors.forEach((door) => {
      const doorRoom = findCell(state.dungeon.layout.grid, door.x, door.y);
      if (doorRoom === room && door.trapped) {
        door.trapped = false;
        door.trapAttacks = 0;
      }
    });

    // Remove or reveal/disarm trap doors (secrets) in the room
    state.dungeon.layout.secrets
      .filter((secret) => secret.type === SecretType.TRAP_DOOR)
      .forEach((secret) => {
        const secretRoom = findCell(
          state.dungeon.layout.grid,
          secret.position.x,
          secret.position.y,
        );
        if (secretRoom === room) {
          secret.found = true;
        }
      });

    addLog(state, 'logs.heroAction.trapsRemoved', {
      hero: i18n(actor?.name ?? ''),
      room,
    });

    return true;
  },

  nextDungeon: (state: GameState, interactable: InteractableCell) => {
    state.dungeon.beaten = true;
    addLog(state, 'logs.clearedDungeon', { name: i18n(state.dungeon.name) });

    const nextDungeon =
      (interactable.args?.nextDungeon as typeof state.dungeon | undefined) ??
      state.dungeon.nextDungeon;

    if (!nextDungeon) {
      addLog(state, 'logs.allConditionsFulfilled');
      return true;
    }

    addLog(state, 'logs.moveToNext', {
      name: i18n(nextDungeon.name),
    });

    clearActorAnimations();
    state.dungeon = nextDungeon;
    state.actionLog = [
      {
        key: 'logs.youHaveReached',
        properties: { name: i18n(state.dungeon.name) },
        turn: 0,
      },
    ];

    const campaignDeck =
      state.campaignId && getCampaignDeck
        ? getCampaignDeck(state.campaignId)
        : undefined;
    state.eventDeck = getEventsForDungeon(state.dungeon, campaignDeck);
    state.turnCount = 0;
    doReRender(state);
    rewardLiveHeroes(state);
    levelUp(state);
    replaceDeadHeroes(state);
    resetLiveHeroes(state);
    resetOnNextDungeon(state);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('autosave', JSON.stringify(state));
    }

    return true;
  },
};

interactableEffects['NEXT_SCENARIO'] = interactableEffects.nextDungeon;

export const registerInteractableEffect = (
  name: string,
  handler: InteractableEffectHandler,
): void => {
  interactableEffects[name] = handler;
};

export const getInteractableEffect = (
  name: string,
): InteractableEffectHandler | undefined => interactableEffects[name];

export const triggerInteractable = (
  state: GameState,
  interactable: InteractableCell,
  actor?: Actor | Hero,
): boolean => {
  if (interactable.secret) {
    return false;
  }
  if (interactable.oneTime && interactable.interacted) {
    return false;
  }

  const handler = getInteractableEffect(interactable.effect);
  if (!handler) {
    return false;
  }

  interactable.interacted = true;
  handler(state, interactable, actor);
  return true;
};

export const findInteractableAtHero = (
  state: GameState,
  hero: Hero,
): InteractableCell | undefined =>
  state.dungeon.layout.interactables?.find(
    (item) =>
      isSamePosition(item.position, hero.position) &&
      (!item.oneTime || !item.interacted) &&
      !item.secret,
  );

export const findInteractablesAt = (
  state: GameState,
  x: number,
  y: number,
): InteractableCell[] =>
  (state.dungeon.layout.interactables ?? []).filter(
    (item) => item.position.x === x && item.position.y === y,
  );

export const checkForInteractable = (
  state: GameState,
  hero: Hero,
  trigger: 'step' | 'interact' = 'interact',
): boolean => {
  const interactable = findInteractableAtHero(state, hero);
  if (!interactable) return false;

  const triggerMode = interactable.triggerOn ?? 'interact';
  if (
    triggerMode === trigger ||
    triggerMode === 'both' ||
    (trigger === 'interact' && triggerMode === 'interact')
  ) {
    return triggerInteractable(state, interactable, hero);
  }

  return false;
};
