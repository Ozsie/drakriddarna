import {
  addLog,
  doorAsActor,
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
  checkForNote,
  consumeActions,
  isBlockedByHero,
  isBlockedByMonster,
  openDoor,
  pickLock,
  search,
} from '../hero/HeroLogic';
import { BREAK_LOCK, onPickup } from '../items/magicItems';

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
    addLog(state, `${hero.name} picked up ${item.name}`);
    hero.inventory.push(item);
    if (item.pickup) {
      const pickup = onPickup[item.pickup];
      pickup(state, item, hero);
    }
    return;
  }

  const door = state.dungeon.layout.doors.find(
    (door) => door.x === hero.position.x && door.y === hero.position.y,
  );
  if (door && !door.hidden) {
    const canBreakLock = hero.inventory.some(
      (item) => item.properties?.[BREAK_LOCK],
    );
    if (canOpenDoor(hero, canBreakLock, door)) {
      if (door.locked && canBreakLock)
        addLog(state, `${hero.name} broke the locked door`);
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
        addLog(state, `${hero.name} has no actions left`);
        return;
      }
      addLog(state, 'Door is locked');
      pickLock(state);
    }
  } else {
    if (!canAct(hero)) {
      addLog(state, `${hero.name} has no actions left`);
      return;
    }
    search(state);
  }
};

const onTargetCell = (state: GameState, target: Position) => {
  const hero = state.currentActor as Hero;
  if (hero.actions === 0) {
    addLog(state, `${hero.name} has no actions left`);
    return;
  }
  const walkable = isWalkable(state.dungeon.layout, target.x, target.y);
  const distance = distanceInGrid(hero.position, target);
  if (walkable) {
    const blockedByHero = isBlockedByHero(state, target.x, target.y);
    const blockedByMonster = isBlockedByMonster(state, target.x, target.y);
    if (!blockedByHero && !blockedByMonster && distance <= hero.movement) {
      hero.position = target;
      hero.movement -= distance;
      checkForNote(state, hero);
      if (checkForTrapDoor(state)) {
        return;
      }
    } else if (blockedByMonster) {
      if (distance <= hero.weapon.range) {
        attack(hero, state, target);
      } else {
        addLog(state, 'Monster is out of range');
      }
    }
  }
  consumeActions(hero);
};

export const doMouseLogic = (
  event: PointerEvent,
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
  } else if (state.dungeon.discoveredRooms.includes(cell)) {
    onTargetCell(state, { x, y });
  }
};
