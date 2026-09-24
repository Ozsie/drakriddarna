import { addLog, doReRender, i18n, recordActorStep } from '../core';
import {
  cellsAlongLine,
  findCell,
  hasLineOfSight,
  isRoomDiscovered,
  isSamePosition,
  isWalkable,
} from '../core';
import { doorAsActor, takeDamage } from '../core';
import type { ItemLocation, GameState, Hero, Position, Door } from '../types';
import { ItemType, Side } from '../types';
import {
  checkForTrapDoor,
  randomItem,
  removeFoundItemFromDeck,
  removeFoundMagicItemFromDeck,
} from '../secrets/SecretsLogic';
import {
  attack,
  canAct,
  canOpenDoor,
  checkForNextToMonster,
  checkForNote,
  consumeActions,
  isBlockedByHero,
  isBlockedByMonster,
  openDoor,
  pickLock,
  pickupItem,
  search,
} from './HeroLogic';

import { BREAK_LOCK } from '../items/ItemLogic';
import {
  RadialAction,
  findDoorAtHero,
  findDoorsAtHero,
  findItemAtHero,
  getAvailableRadialActions,
} from './RadialMenuLogic';
import { radialMenuStore } from '../store/radialMenuStore';
import { next } from '../game';
import {
  gameStateStore,
  isTurnInProgress,
  nextTurn,
} from '../store/gameStateStore';
import { get } from 'svelte/store';

export const distanceInGrid = (a: Position, b: Position) => {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);

  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);

  const diagonalSteps = min;
  const straightSteps = max - min;
  let factor = Math.sqrt(2);
  if (straightSteps === 0) {
    factor = 1;
  }

  return Math.floor(factor * diagonalSteps + straightSteps);
};

const pickUpItemAtHero = (
  state: GameState,
  hero: Hero,
  itemLocation: ItemLocation,
) => {
  const item = itemLocation.item ?? randomItem(state);
  if (item.type === ItemType.MAGIC) {
    removeFoundMagicItemFromDeck(state, item);
  } else {
    removeFoundItemFromDeck(state, item);
  }
  const index = state.dungeon.layout.items.indexOf(itemLocation);
  state.dungeon.layout.items.splice(index, 1);
  addLog(state, 'logs.heroAction.pickUp', {
    hero: i18n(hero.name),
    item: i18n(item.name),
  });
  pickupItem(state, item, hero);
};

const openDoorAtHero = (
  state: GameState,
  hero: Hero,
  target: Position,
  door?: Door,
) => {
  door = door ?? findDoorAtHero(state, hero);
  if (!door || door.open) return;
  const canBreakLock = hero.inventory.some(
    (item) => item && item.properties?.[BREAK_LOCK],
  );
  if (!canOpenDoor(hero, canBreakLock, door)) return;
  if (door.locked && canBreakLock)
    addLog(state, 'logs.heroAction.brokeLock', { hero: i18n(hero.name) });
  door.open = true;
  if (door.trapped) {
    takeDamage(state, doorAsActor(door), hero, false);
  }
  switch (door.side) {
    case Side.RIGHT:
      openDoor(hero, state, target.x + 1, target.y);
      break;
    case Side.LEFT:
      openDoor(hero, state, target.x - 1, target.y);
      break;
    case Side.DOWN:
      openDoor(hero, state, target.x, target.y + 1);
      break;
    case Side.UP:
      openDoor(hero, state, target.x, target.y - 1);
      break;
  }
  consumeActions(hero);
};

export const onTargetSelf = (state: GameState, target: Position) => {
  doReRender(state);
  const hero = state.currentActor as Hero;

  const itemLocation = findItemAtHero(state, hero);
  if (itemLocation) {
    pickUpItemAtHero(state, hero, itemLocation);
    return;
  }

  const doors = findDoorsAtHero(state, hero);
  const door = doors.length === 1 ? doors[0] : undefined;
  if (doors.length > 1) {
    onHeroClicked(state, hero);
    return;
  }
  if (door && !door.open && !door.hidden) {
    const canBreakLock = hero.inventory.some(
      (item) => item && item.properties?.[BREAK_LOCK],
    );
    if (canOpenDoor(hero, canBreakLock, door)) {
      openDoorAtHero(state, hero, target, door);
    } else if (door.locked && !door.hidden) {
      if (!canAct(hero)) {
        addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
        return;
      }
      addLog(state, 'logs.heroAction.locked');
      pickLock(state, door);
    }
  } else {
    if (!canAct(hero)) {
      addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
      return;
    }
    search(state);
  }
};

export const onHeroClicked = (state: GameState, hero: Hero) => {
  doReRender(state);
  const entries = getAvailableRadialActions(state, hero);
  if (entries.length === 0) {
    radialMenuStore.set(null);
    return;
  }
  radialMenuStore.set({ x: hero.position.x, y: hero.position.y, entries });
};

export const executeRadialAction = (
  state: GameState,
  action: RadialAction,
  door?: Door,
) => {
  const hero = state.currentActor as Hero;
  switch (action) {
    case RadialAction.SEARCH:
      search(state);
      break;
    case RadialAction.PICK_LOCK:
      addLog(state, 'logs.heroAction.locked');
      pickLock(state, door);
      break;
    case RadialAction.OPEN_DOOR:
      openDoorAtHero(state, hero, hero.position, door);
      break;
    case RadialAction.PICK_UP_ITEM: {
      const itemLocation = findItemAtHero(state, hero);
      if (itemLocation) {
        pickUpItemAtHero(state, hero, itemLocation);
      }
      break;
    }
    case RadialAction.NEXT: {
      if (get(isTurnInProgress)) return;
      nextTurn().then((newState) => {
        gameStateStore.set(newState);
      });
      break;
    }
  }
  radialMenuStore.set(null);
};

export const onTargetCell = (state: GameState, target: Position) => {
  doReRender(state);
  const hero = state.currentActor as Hero;
  if (hero.actions === 0) {
    hero.movement = 0;
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  const portal = state.dungeon.portal;
  if (portal && isSamePosition(hero.position, portal)) {
    const targetRoom = findCell(state.dungeon.layout.grid, target.x, target.y);
    if (
      targetRoom &&
      isRoomDiscovered(state.dungeon, targetRoom) &&
      !isBlockedByHero(state, target.x, target.y) &&
      !isBlockedByMonster(state, target.x, target.y) &&
      !isSamePosition(hero.position, target)
    ) {
      recordActorStep(hero, target);
      hero.position = target;
      hero.movement = 0;
      checkForNote(state, hero);
      checkForNextToMonster(state, hero);
      addLog(state, 'logs.events.hexagramTeleport', { hero: i18n(hero.name) });
      if (checkForTrapDoor(state)) {
        return;
      }
      consumeActions(hero);
      return;
    }
  }
  const walkable = isWalkable(state.dungeon.layout, target.x, target.y);
  if (walkable) {
    const blockedByHero = isBlockedByHero(state, target.x, target.y);
    const blockedByMonster = isBlockedByMonster(state, target.x, target.y);
    const distance = distanceInGrid(hero.position, target);
    const los = hasLineOfSight(hero.position, target, 2, state, true);
    if (
      !blockedByHero &&
      !blockedByMonster &&
      distance <= hero.movement &&
      los
    ) {
      const path = cellsAlongLine(hero.position, target);
      hero.movement -= distance;
      for (const cell of path) {
        recordActorStep(hero, cell);
        hero.position = cell;
        checkForNote(state, hero);
        const nextToMonster = checkForNextToMonster(state, hero);
        if (nextToMonster) {
          hero.movement = 0;
        }
        if (checkForTrapDoor(state)) {
          return;
        }
      }
    } else if (blockedByMonster) {
      if (distance <= hero.weapon.range) {
        attack(hero, state, target);
      } else {
        addLog(state, 'logs.heroAction.monsterOutOfRange');
      }
    }
  }
  consumeActions(hero);
};

export const doMouseLogic = (
  event: MouseEvent,
  cellSize: number,
  state: GameState,
) => {
  const c = document.getElementById('gameBoard');
  if (!c) return;

  const rect = c.getBoundingClientRect();
  const x = Math.min(
    Math.floor((event.clientX - rect.left) / cellSize),
    state.dungeon.layout.grid[0].length - 1,
  );
  const y = Math.min(
    Math.floor((event.clientY - rect.top) / cellSize),
    state.dungeon.layout.grid.length - 1,
  );

  const cell = state.dungeon.layout.grid[y][x];

  const hero = state.currentActor as Hero;
  if (x === hero.position.x && y === hero.position.y) {
    onHeroClicked(state, hero);
  } else if (isRoomDiscovered(state.dungeon, cell)) {
    radialMenuStore.set(null);
    onTargetCell(state, { x, y });
  }
};
