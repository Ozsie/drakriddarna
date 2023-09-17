import {
  addLog, attack, canAct, consumeActions, doorAsActor,
  isBlockedByHero,
  isBlockedByMonster,
  isWalkable,
  openDoor,
  pickLock,
  search,
  takeDamage,
} from "../routes/game";
import { Side } from '../routes/types';
import type { Position, GameState, Hero } from '../routes/types';
import { checkForTrapDoor } from '../routes/secrets/SecretsLogic';

export const distanceInGrid = (a: Position, b: Position) =>{
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
}

export const onTargetSelf = (state: GameState, x: number, y: number) => {
  const hero = state.currentActor as Hero;
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position.x && door.y === hero.position.y);
  if (door) {
    if (!door.open && !door.hidden && !door.locked) {
      door.open = true;
      if (door.trapped) {
        takeDamage(state, doorAsActor(door), hero);
      }
      switch (door.side) {
        case Side.RIGHT:
          openDoor(hero, state, x + 1, y);
          break;
        case Side.LEFT:
          openDoor(hero, state, x - 1, y);
          break;
        case Side.DOWN:
          openDoor(hero, state, x, y + 1);
          break;
        case Side.UP:
          openDoor(hero, state, x, y - 1);
          break;
      }
      consumeActions(hero);
    } else if (door.locked && !door.hidden) {
      if (!canAct(hero)) {
        addLog(state, `${hero.name} has no actions left`);
        return;
      }
      addLog(state, "Door is locked");
      pickLock(state);
      consumeActions(hero);
    }
  } else {
    if (!canAct(hero)) {
      addLog(state, `${hero.name} has no actions left`);
      return;
    }
    search(state);
  }
}

const onTargetCell = (state: GameState, x: number, y: number) => {
  const hero = state.currentActor as Hero;
  if (hero.actions === 0) {
    addLog(state, `${hero.name} has no actions left`);
    return;
  }
  const walkable = isWalkable(state.dungeon.layout, x, y);
  const distance = distanceInGrid(hero.position, { x, y });
  console.log("distance: " + distance);
  if (walkable) {
    const blockedByHero = isBlockedByHero(state, x, y);
    const blockedByMonster = isBlockedByMonster(state, x, y);
    if (!blockedByHero && !blockedByMonster && distance <= hero.movement) {
      hero.position = { x, y };
      hero.movement -= distance;
      if (checkForTrapDoor(state)) {
        return;
      }
    } else if (blockedByMonster) {
      if (distance <= hero.weapon.range) {
        attack(hero, state, x, y);
      } else {
        addLog(state, `Monster is out of range`);
      }
    }
  }
  consumeActions(hero);
}

export const doMouseLogic = (event: PointerEvent, cellSize: number, state: GameState) => {
  const hero = state.currentActor as Hero;
  const c = document.getElementById("gameBoard");
  if (!c) return;
  const rect = c.getBoundingClientRect();
  const x = Math.min(
    Math.floor((event.clientX - rect.left)/cellSize),
    state.dungeon.layout.grid[0].length - 1
  );
  const y = Math.min(
    Math.floor((event.clientY - rect.top)/cellSize),
    state.dungeon.layout.grid.length - 1
  );

  const cell = state.dungeon.layout.grid[y][x]

  if (x === hero.position.x && y === hero.position.y) {
    onTargetSelf(state, x, y);
  } else if (state.dungeon.discoveredRooms.includes(cell)) {
    onTargetCell(state, x, y);
  }
}
