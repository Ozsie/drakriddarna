import type {
  GameState,
  Hero,
  Door,
  Item,
  ItemLocation,
  InteractableCell,
} from '../types';
import { isSamePosition, canAct, distanceInGrid } from '../core';
import { canOpenDoor, liveHeroes } from './HeroLogic';
import {
  ACTIVE,
  BREAK_LOCK,
  USED,
  USED_HEROES,
  USED_ON,
  isTargetAnyHero,
} from '../items/ItemLogic';
import { findInteractableAtHero } from '../interactables/InteractableLogic';

export enum RadialAction {
  SEARCH = 'SEARCH',
  PICK_LOCK = 'PICK_LOCK',
  OPEN_DOOR = 'OPEN_DOOR',
  PICK_UP_ITEM = 'PICK_UP_ITEM',
  INTERACT = 'INTERACT',
  USE_ITEM = 'USE_ITEM',
  NEXT = 'NEXT',
}

export type RadialMenuEntry = {
  action: RadialAction;
  door?: Door;
  interactable?: InteractableCell;
  item?: Item;
  targetHero?: Hero;
};

export const findDoorAtHero = (
  state: GameState,
  hero: Hero,
): Door | undefined =>
  state.dungeon.layout.doors.find(
    (door) => door.x === hero.position.x && door.y === hero.position.y,
  );

export const findDoorsAtHero = (state: GameState, hero: Hero): Door[] =>
  state.dungeon.layout.doors.filter(
    (door) => door.x === hero.position.x && door.y === hero.position.y,
  );

export const findItemAtHero = (
  state: GameState,
  hero: Hero,
): ItemLocation | undefined =>
  state.dungeon.layout.items.find((item) =>
    isSamePosition(item.position, hero.position),
  );

export const getAvailableRadialActionsForTarget = (
  state: GameState,
  hero: Hero,
  targetHero: Hero,
): RadialMenuEntry[] => {
  const entries: RadialMenuEntry[] = [];
  const isNeighbor = distanceInGrid(hero.position, targetHero.position) <= 1;

  if (!isNeighbor) {
    return entries;
  }

  const activeItems = (hero.inventory ?? []).filter(
    (item) =>
      item &&
      item.properties?.[ACTIVE] &&
      !item.properties?.[USED] &&
      !item.disabled,
  );

  for (const item of activeItems) {
    if (isTargetAnyHero(item)) {
      const rawUsedOn =
        (item.properties?.[USED_ON] as string[]) ??
        (item.properties?.USED_ON as string[]) ??
        (item.properties?.[USED_HEROES] as string[]) ??
        (item.properties?.USED_HEROES as string[]) ??
        [];
      const usedOn = Array.isArray(rawUsedOn) ? rawUsedOn : [];
      if (!usedOn.includes(targetHero.name)) {
        entries.push({
          action: RadialAction.USE_ITEM,
          item,
          targetHero,
        });
      }
    } else if (targetHero === hero || targetHero.name === hero.name) {
      entries.push({
        action: RadialAction.USE_ITEM,
        item,
        targetHero: hero,
      });
    }
  }

  return entries;
};

export const getAvailableRadialActions = (
  state: GameState,
  hero: Hero,
): RadialMenuEntry[] => {
  const entries: RadialMenuEntry[] = [];
  const doors = findDoorsAtHero(state, hero);
  const canBreakLock = hero.inventory.some(
    (item) => item && item.properties?.[BREAK_LOCK],
  );

  if (findItemAtHero(state, hero)) {
    entries.push({ action: RadialAction.PICK_UP_ITEM });
  }

  const interactable = findInteractableAtHero(state, hero);
  if (interactable && canAct(hero)) {
    entries.push({ action: RadialAction.INTERACT, interactable });
  }

  const activeItems = (hero.inventory ?? []).filter(
    (item) =>
      item &&
      item.properties?.[ACTIVE] &&
      !item.properties?.[USED] &&
      !item.disabled,
  );

  for (const item of activeItems) {
    if (isTargetAnyHero(item)) {
      const rawUsedOn =
        (item.properties?.[USED_ON] as string[]) ??
        (item.properties?.USED_ON as string[]) ??
        (item.properties?.[USED_HEROES] as string[]) ??
        (item.properties?.USED_HEROES as string[]) ??
        [];
      const usedOn = Array.isArray(rawUsedOn) ? rawUsedOn : [];
      const alive = liveHeroes(state);
      const targetHeroes = (alive.length > 0 ? alive : [hero]).filter(
        (targetHero) =>
          !usedOn.includes(targetHero.name) &&
          distanceInGrid(hero.position, targetHero.position) <= 1,
      );
      for (const targetHero of targetHeroes) {
        entries.push({
          action: RadialAction.USE_ITEM,
          item,
          targetHero,
        });
      }
    } else {
      entries.push({
        action: RadialAction.USE_ITEM,
        item,
        targetHero: hero,
      });
    }
  }

  for (const door of doors) {
    if (!door.open && canOpenDoor(hero, canBreakLock, door)) {
      entries.push({ action: RadialAction.OPEN_DOOR, door });
    }

    if (
      door.locked &&
      !door.hidden &&
      !door.open &&
      !hero.blinded &&
      canAct(hero)
    ) {
      entries.push({ action: RadialAction.PICK_LOCK, door });
    }
  }

  if (!hero.blinded && canAct(hero)) {
    entries.push({ action: RadialAction.SEARCH });
  }

  entries.push({ action: RadialAction.NEXT });

  return entries;
};
