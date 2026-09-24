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

export const findDoorAtHero = (
  state: GameState,
  hero: Hero,
): Door | undefined =>
  state.dungeon.layout.doors.find(
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
): RadialAction[] => {
  const actions: RadialAction[] = [];
  const door = findDoorAtHero(state, hero);
  const canBreakLock = hero.inventory.some(
    (item) => item && item.properties?.[BREAK_LOCK],
  );

  if (findItemAtHero(state, hero)) {
    actions.push(RadialAction.PICK_UP_ITEM);
  }

  if (door && !door.open && canOpenDoor(hero, canBreakLock, door)) {
    actions.push(RadialAction.OPEN_DOOR);
  }

  if (
    door &&
    door.locked &&
    !door.hidden &&
    !door.open &&
    !hero.blinded &&
    canAct(hero)
  ) {
    actions.push(RadialAction.PICK_LOCK);
  }

  if (!hero.blinded && canAct(hero)) {
    actions.push(RadialAction.SEARCH);
  }

  actions.push(RadialAction.NEXT);

  return actions;
};
