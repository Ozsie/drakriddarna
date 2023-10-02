import {
  addLog,
  doorAsActor,
  doReRender,
  hasLineOfSight,
  i18n,
  isRoomDiscovered,
  isSamePosition,
  isWalkable,
  takeDamage,
} from '../game';
import type { ItemLocation, GameState, Hero, Position } from '../types';
import { ItemType, Side } from '../types';
import {
  checkForTrapDoor,
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

export const onTargetSelf = (state: GameState, target: Position) => {
  doReRender(state);
  const hero = state.currentActor as Hero;

  const itemLocation = state.dungeon.layout.items.find((item: ItemLocation) =>
    isSamePosition(item.position, hero.position),
  );
  if (itemLocation) {
    const item = itemLocation.item;
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
    return;
  }

  const door = state.dungeon.layout.doors.find(
    (door) =>
      door.x === hero.position.x && door.y === hero.position.y && !door.open,
  );
  if (door && !door.hidden) {
    const canBreakLock = hero.inventory.some(
      (item) => item.properties?.[BREAK_LOCK],
    );
    if (canOpenDoor(hero, canBreakLock, door)) {
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
    } else if (door.locked && !door.hidden) {
      if (!canAct(hero)) {
        addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
        return;
      }
      addLog(state, 'logs.heroAction.locked');
      pickLock(state);
    }
  } else {
    if (!canAct(hero)) {
      addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
      return;
    }
    search(state);
  }
};

const onTargetCell = (state: GameState, target: Position) => {
  doReRender(state);
  const hero = state.currentActor as Hero;
  if (hero.actions === 0) {
    hero.movement = 0;
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
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
      hero.position = target;
      hero.movement -= distance;
      checkForNote(state, hero);
      const nextToMonster = checkForNextToMonster(state, hero);
      if (nextToMonster) {
        hero.movement = 0;
      }
      if (checkForTrapDoor(state)) {
        return;
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
    onTargetSelf(state, { x, y });
  } else if (isRoomDiscovered(state.dungeon, cell)) {
    onTargetCell(state, { x, y });
  }
};
