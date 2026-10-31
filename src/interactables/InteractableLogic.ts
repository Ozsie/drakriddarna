import type {
  Actor,
  GameState,
  Hero,
  InteractableCell,
  Position,
  RoomFogOptions,
  TerrainOptions,
  TurnEvent,
} from '../types';
import { Colour, SecretType, TerrainType } from '../types';
import {
  addLog,
  clearActorAnimations,
  doReRender,
  findCell,
  getDifficulty,
  i18n,
  isNeighbouring,
  isSamePosition,
} from '../core';
import {
  levelUp,
  liveHeroes,
  newHero,
  replaceDeadHeroes,
  resetLiveHeroes,
  rewardLiveHeroes,
} from '../hero/HeroLogic';
import { resetOnNextDungeon } from '../items/ItemLogic';
import { getEventsForDungeon } from '../events/EventsLogic';
import { fillRoomFog } from '../dungeon/RoomFogLogic';
import {
  parsePosition,
  type DeclarativePosition,
} from '../dungeon/dungeonParser';
import { applyTerrainEnterEffects, terrainAt } from '../dungeon/TerrainLogic';
import { createShake } from '../combat';
import { soundEffectManager } from '../audio';

let getCampaignDeck:
  | ((campaignId: string) => TurnEvent[] | undefined)
  | undefined;

export const setCampaignDeckProvider = (
  provider: (campaignId: string) => TurnEvent[] | undefined,
): void => {
  getCampaignDeck = provider;
};

let nextDungeonTransition: ((state: GameState) => void) | undefined;

export const setNextDungeonTransitionProvider = (
  provider: (state: GameState) => void,
): void => {
  nextDungeonTransition = provider;
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
      heroToAdd = newHero(heroName, heroColour, getDifficulty(state));
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

    state.dungeon.nextDungeon = nextDungeon;
    if (nextDungeonTransition) {
      nextDungeonTransition(state);
    } else {
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
      state.currentEvent = undefined;
      state.drawEvents = true;
      state.roundActionsDelta = 0;
      state.turnCount = 0;
      doReRender(state);
      rewardLiveHeroes(state);
      levelUp(state);
      replaceDeadHeroes(state);
      resetLiveHeroes(state);
      resetOnNextDungeon(state);
      state.currentActor = liveHeroes(state)[0] ?? state.heroes[0];

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('autosave', JSON.stringify(state));
      }
    }

    return true;
  },
};

interactableEffects['NEXT_SCENARIO'] = interactableEffects.nextDungeon;

// Toggles light sources: the interactable's own `light` (a brazier, a
// torch), and/or a light placed in the dungeon layout identified by
// `args.lightId` (a lever that lights a distant brazier). Use
// `oneTime: false` so the light can be toggled back and forth.
interactableEffects.toggleLight = (
  state: GameState,
  interactable: InteractableCell,
): boolean => {
  const args = interactable.args ?? {};
  const lightId = args.lightId as string | undefined;
  let toggled = false;

  if (lightId) {
    state.dungeon.layout.lights?.forEach((light) => {
      if (light.id === lightId) {
        light.enabled = !(light.enabled ?? true);
        toggled = true;
      }
    });
  }

  if (interactable.light) {
    interactable.light.enabled = !(interactable.light.enabled ?? true);
    toggled = true;
  }

  return toggled;
};

// Fills a room or corridor with fog: `args.room` (default: the room the
// interactable stands in) and `args.options` (RoomFogOptions). The fog
// becomes part of the layout and so persists in the save — a burst pipe
// keeps flooding the room.
interactableEffects.fillRoomFog = (
  state: GameState,
  interactable: InteractableCell,
  actor?: Actor | Hero,
): boolean => {
  const args = interactable.args ?? {};
  const room =
    (args.room as string | undefined) ??
    findCell(
      state.dungeon.layout.grid,
      interactable.position.x,
      interactable.position.y,
    );
  if (!room) return false;

  const options = (args.options as RoomFogOptions | undefined) ?? {};
  fillRoomFog(state, room, options);
  addLog(state, 'logs.heroAction.fogFilled', {
    hero: i18n(actor?.name ?? ''),
    room,
  });
  return true;
};

// Lets lava erupt from the floor: `args.cells` (a list of [x, y] tuples
// or positions, default: the interactable's own cell), `args.options`
// (TerrainOptions without the type — it is always lava), and an optional
// `args.shake` (max jitter in pixels) for the eruption's tremor. Anyone
// standing on a flooded cell takes the lava's damage on enter
// immediately. The lava persists in the layout like any terrain.
interactableEffects.spawnLava = (
  state: GameState,
  interactable: InteractableCell,
  actor?: Actor | Hero,
): boolean => {
  const args = interactable.args ?? {};
  // `args.cells` accepts both [x, y] tuples and {x, y} positions.
  const rawCells = (args.cells as DeclarativePosition[] | undefined) ?? [
    interactable.position,
  ];
  const cells = rawCells.map(parsePosition);
  const options = (args.options as Omit<TerrainOptions, 'type'>) ?? {};
  const damage = options.damageOnEnter ?? 1;
  // The created cell must carry the damage the eruption log reports:
  // without it, standing victims take the terrain default instead of
  // the resolved value. An explicitly provided option still wins.
  const lavaOptions = { damageOnEnter: damage, ...options };

  cells.forEach((cell) => {
    if (terrainAt(state.dungeon.layout, cell)) return;
    state.dungeon.layout.terrain = [
      ...(state.dungeon.layout.terrain ?? []),
      {
        position: { x: cell.x, y: cell.y },
        type: TerrainType.LAVA,
        ...lavaOptions,
      },
    ];
    // The floor erupting under an actor hurts right away.
    [...state.heroes, ...state.dungeon.layout.monsters].forEach((victim) => {
      if (
        victim.health > 0 &&
        victim.position.x === cell.x &&
        victim.position.y === cell.y
      ) {
        applyTerrainEnterEffects(state, victim);
      }
    });
  });

  const shakeAmplitude = args.shake as number | undefined;
  if (shakeAmplitude !== 0) {
    state.shakeEffects = [
      ...(state.shakeEffects ?? []),
      createShake({
        epicenter: cells[0],
        amplitude: shakeAmplitude ?? 8,
        durationMs: 500,
      }),
    ];
  }
  addLog(state, 'logs.heroAction.lavaErupted', {
    hero: i18n(actor?.name ?? ''),
    damage: `${damage}`,
  });
  return true;
};

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
  soundEffectManager.playInteractSound(interactable);
  handler(state, interactable, actor);
  return true;
};

export const findInteractableAtHero = (
  state: GameState,
  hero: Hero,
): InteractableCell | undefined => {
  const activeInteractables = (state.dungeon.layout.interactables ?? []).filter(
    (item) =>
      (!item.oneTime || !item.interacted) &&
      !item.secret &&
      item.triggerOn !== 'step',
  );

  return (
    activeInteractables.find((item) =>
      isSamePosition(item.position, hero.position),
    ) ??
    activeInteractables.find((item) =>
      isNeighbouring(item.position, hero.position.x, hero.position.y),
    )
  );
};

export const checkForInteractable = (
  state: GameState,
  hero: Hero,
  trigger: 'step' | 'interact' = 'interact',
): boolean => {
  if (trigger === 'step') {
    const interactable = state.dungeon.layout.interactables?.find(
      (item) =>
        isSamePosition(item.position, hero.position) &&
        (!item.oneTime || !item.interacted) &&
        !item.secret,
    );
    if (!interactable) return false;

    const triggerMode = interactable.triggerOn ?? 'interact';
    if (triggerMode === 'step' || triggerMode === 'both') {
      return triggerInteractable(state, interactable, hero);
    }
    return false;
  }

  const interactable = findInteractableAtHero(state, hero);
  if (!interactable) return false;

  const triggerMode = interactable.triggerOn ?? 'interact';
  if (triggerMode === 'interact' || triggerMode === 'both') {
    return triggerInteractable(state, interactable, hero);
  }

  return false;
};
