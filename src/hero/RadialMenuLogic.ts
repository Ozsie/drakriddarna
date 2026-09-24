import type { GameState, Hero, Door, ItemLocation } from '../types';
import { isSamePosition } from '../core';
import { canAct } from '../core';
import { canOpenDoor } from './HeroLogic';
import { BREAK_LOCK } from '../items/ItemLogic';

export enum RadialAction {
  SEARCH = 'SEARCH',
  PICK_LOCK = 'PICK_LOCK',
  OPEN_DOOR = 'OPEN_DOOR',
  PICK_UP_ITEM = 'PICK_UP_ITEM',
  NEXT = 'NEXT',
}

export type RadialMenuEntry = {
  action: RadialAction;
  door?: Door;
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
