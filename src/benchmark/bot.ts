import type { GameState, Door, Position, MoveDirection } from '../types';
import { Side } from '../types';
import {
  canAct,
  isWalkable,
  isSamePosition,
  findCell,
  hasLineOfSight,
  getDifficulty,
  isDiscovered,
  isDoorEdge,
  isNeighbouring,
  canSearchThrough,
} from '../core';
import { act, attack, pickLock, search } from '../hero/HeroLogic';
import { useItem } from '../items/ItemLogic';

const DIRECTIONS: { dir: MoveDirection; dx: number; dy: number }[] = [
  { dir: 'U', dx: 0, dy: -1 },
  { dir: 'D', dx: 0, dy: 1 },
  { dir: 'L', dx: -1, dy: 0 },
  { dir: 'R', dx: 1, dy: 0 },
  { dir: 'UL', dx: -1, dy: -1 },
  { dir: 'UR', dx: 1, dy: -1 },
  { dir: 'DL', dx: -1, dy: 1 },
  { dir: 'DR', dx: 1, dy: 1 },
];

export const getDirection = (
  from: Position,
  to: Position,
): MoveDirection | null => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  for (const d of DIRECTIONS) {
    if (d.dx === dx && d.dy === dy) return d.dir;
  }
  return null;
};

export const getDoorTargetCell = (door: Door): Position => {
  switch (door.side) {
    case Side.UP:
      return { x: door.x, y: door.y - 1 };
    case Side.DOWN:
      return { x: door.x, y: door.y + 1 };
    case Side.LEFT:
      return { x: door.x - 1, y: door.y };
    case Side.RIGHT:
      return { x: door.x + 1, y: door.y };
  }
};

/**
 * Breadth-first search pathfinding on the grid
 */
export const findPath = (
  state: GameState,
  start: Position,
  isGoal: (pos: Position) => boolean,
  allowThroughOtherHeroes = false,
): Position[] | null => {
  const queue: { pos: Position; path: Position[] }[] = [
    { pos: start, path: [start] },
  ];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (isGoal(current.pos) && !isSamePosition(current.pos, start)) {
      return current.path;
    }

    for (const d of DIRECTIONS) {
      const nextPos = { x: current.pos.x + d.dx, y: current.pos.y + d.dy };
      const key = `${nextPos.x},${nextPos.y}`;
      if (visited.has(key)) continue;

      // Check walkable
      if (!isWalkable(state.dungeon.layout, nextPos.x, nextPos.y)) continue;

      // Check door passage restrictions
      const edgeDoor = isDoorEdge(
        state.dungeon.layout,
        current.pos.x,
        current.pos.y,
        nextPos.x,
        nextPos.y,
      );
      if (edgeDoor && !edgeDoor.open) {
        // Can only cross a closed door if it is not hidden, not locked, and moving from door tile to target cell
        const isFromDoorTile = isSamePosition(
          { x: edgeDoor.x, y: edgeDoor.y },
          current.pos,
        );
        const targetCell = getDoorTargetCell(edgeDoor);
        const isToTarget = isSamePosition(targetCell, nextPos);
        if (edgeDoor.hidden || !isFromDoorTile || !isToTarget) {
          continue;
        }
      }

      // Check undiscovered rooms: can only step into undiscovered room if crossing an openable door
      const nextDiscovered = isDiscovered(state.dungeon, nextPos.x, nextPos.y);
      if (!nextDiscovered) {
        const doorAtCurrent = state.dungeon.layout.doors.find((door) =>
          isSamePosition(door, current.pos),
        );
        if (
          !doorAtCurrent ||
          doorAtCurrent.hidden ||
          !isSamePosition(getDoorTargetCell(doorAtCurrent), nextPos)
        ) {
          continue;
        }
      }

      // Check monster blocking (can only step into if it's the goal or we are checking reach)
      const monsterOnCell = state.dungeon.layout.monsters.find((m) =>
        isSamePosition(m.position, nextPos),
      );
      if (monsterOnCell && !isGoal(nextPos)) continue;

      // Check hero blocking
      if (!allowThroughOtherHeroes) {
        const heroOnCell = state.heroes.find(
          (h) => h.health > 0 && isSamePosition(h.position, nextPos),
        );
        if (heroOnCell && !isSamePosition(nextPos, start) && !isGoal(nextPos))
          continue;
      }

      visited.add(key);
      queue.push({ pos: nextPos, path: [...current.path, nextPos] });
    }
  }

  return null;
};

/**
 * Execute a single turn for the current hero bot
 */
export const playHeroTurn = (state: GameState): boolean => {
  const hero = state.currentActor;
  if (!hero || hero.health <= 0 || hero.incapacitated) return false;

  const movementMod = getDifficulty(state).modifiers.movement;
  let actionTaken = false;
  let guard = 0;

  while (canAct(hero, movementMod) && guard < 20) {
    guard++;

    // 1. Check if low health and has healing items
    if (hero.health <= 3) {
      const potion = hero.inventory.find(
        (item) => item && item.effect && !item.disabled,
      );
      if (potion) {
        useItem(state, potion);
        actionTaken = true;
        continue;
      }
    }

    // 2. Check if any monster is in melee or ranged attack reach
    const reachableMonster = state.dungeon.layout.monsters.find((m) => {
      const dist = Math.max(
        Math.abs(m.position.x - hero.position.x),
        Math.abs(m.position.y - hero.position.y),
      );
      if (dist <= (hero.weapon?.range ?? 1)) {
        return (
          dist === 1 ||
          hasLineOfSight(
            hero.position,
            m.position,
            hero.weapon?.range ?? 1,
            state,
            true,
          )
        );
      }
      return false;
    });

    if (reachableMonster) {
      const beforeMonstersCount = state.dungeon.layout.monsters.length;
      const monsterHp = reachableMonster.health;
      attack(hero, state, reachableMonster.position);
      actionTaken = true;
      // If attack did nothing or couldn't act, avoid infinite loop
      if (
        state.dungeon.layout.monsters.length === beforeMonstersCount &&
        reachableMonster.health === monsterHp &&
        !canAct(hero, movementMod)
      ) {
        break;
      }
      continue;
    }

    // 3. Check if hero can search for an undiscovered hidden door or secret from current tile
    const canFindHiddenDoor = state.dungeon.layout.doors.some(
      (d) =>
        d.hidden &&
        !d.open &&
        ((d.x === hero.position.x && d.y === hero.position.y) ||
          !!isDoorEdge(
            state.dungeon.layout,
            hero.position.x,
            hero.position.y,
            d.x,
            d.y,
          )),
    );

    const canFindSecret = state.dungeon.layout.secrets.some(
      (s) =>
        !s.found &&
        isNeighbouring(s.position, hero.position.x, hero.position.y) &&
        canSearchThrough(state.dungeon.layout, hero.position, s.position),
    );

    if (canFindHiddenDoor || canFindSecret) {
      search(state);
      actionTaken = true;
      continue;
    }

    // Check if hero is at a closed visible door tile and needs to open / unlock it
    const doorAtHero = state.dungeon.layout.doors.find(
      (d) => isSamePosition(d, hero.position) && !d.open && !d.hidden,
    );
    if (doorAtHero) {
      if (doorAtHero.locked) {
        pickLock(state, doorAtHero);
        actionTaken = true;
        continue;
      } else {
        const targetCell = getDoorTargetCell(doorAtHero);
        const dir = getDirection(hero.position, targetCell);
        if (dir) {
          act(dir, state);
          actionTaken = true;
          continue;
        }
      }
    }

    // 4. Find path to nearest target:
    // Priority A: Discovered monsters
    const discoveredMonsters = state.dungeon.layout.monsters.filter((m) => {
      const cell = findCell(
        state.dungeon.layout.grid,
        m.position.x,
        m.position.y,
      );
      return cell && state.dungeon.discoveredRooms.includes(cell);
    });

    if (discoveredMonsters.length > 0) {
      // Find path to an adjacent cell of any discovered monster
      const path = findPath(state, hero.position, (pos) =>
        discoveredMonsters.some(
          (m) =>
            Math.max(
              Math.abs(m.position.x - pos.x),
              Math.abs(m.position.y - pos.y),
            ) === 1 || isSamePosition(m.position, pos),
        ),
      );

      if (path && path.length > 1) {
        const nextStep = path[1];
        const dir = getDirection(hero.position, nextStep);
        if (dir) {
          act(dir, state);
          actionTaken = true;
          continue;
        }
      }
    }

    // Priority B: Closed / unexplored doors (including hidden and locked)
    const unopenedDoors = state.dungeon.layout.doors.filter((d) => !d.open);
    if (unopenedDoors.length > 0) {
      const pathToDoor = findPath(state, hero.position, (pos) =>
        unopenedDoors.some((d) => isSamePosition(d, pos)),
      );

      if (pathToDoor && pathToDoor.length > 1) {
        const nextStep = pathToDoor[1];
        const dir = getDirection(hero.position, nextStep);
        if (dir) {
          act(dir, state);
          actionTaken = true;
          continue;
        }
      }
    }

    // Priority C: Unfound secrets in discovered rooms
    const unfoundSecrets = state.dungeon.layout.secrets.filter((s) => !s.found);
    if (unfoundSecrets.length > 0) {
      const pathToSecret = findPath(state, hero.position, (pos) =>
        unfoundSecrets.some((s) => isNeighbouring(s.position, pos.x, pos.y)),
      );

      if (pathToSecret && pathToSecret.length > 1) {
        const nextStep = pathToSecret[1];
        const dir = getDirection(hero.position, nextStep);
        if (dir) {
          act(dir, state);
          actionTaken = true;
          continue;
        }
      }
    }

    // Priority D: Undiscovered rooms / general exploration
    const pathToUndiscovered = findPath(state, hero.position, (pos) => {
      const cell = findCell(state.dungeon.layout.grid, pos.x, pos.y);
      return Boolean(cell && !state.dungeon.discoveredRooms.includes(cell));
    });

    if (pathToUndiscovered && pathToUndiscovered.length > 1) {
      const nextStep = pathToUndiscovered[1];
      const dir = getDirection(hero.position, nextStep);
      if (dir) {
        act(dir, state);
        actionTaken = true;
        continue;
      }
    }

    // Priority E: If blocked by friendly heroes, attempt pathfinding allowing through friendly heroes
    const fallbackPath = findPath(
      state,
      hero.position,
      (pos) =>
        state.dungeon.layout.monsters.some(
          (m) =>
            Math.max(
              Math.abs(m.position.x - pos.x),
              Math.abs(m.position.y - pos.y),
            ) <= 1,
        ) || unopenedDoors.some((d) => isSamePosition(d, pos)),
      true,
    );
    if (fallbackPath && fallbackPath.length > 1) {
      const nextStep = fallbackPath[1];
      const occupied = state.heroes.some(
        (h) => h.health > 0 && isSamePosition(h.position, nextStep),
      );
      if (!occupied) {
        const dir = getDirection(hero.position, nextStep);
        if (dir) {
          act(dir, state);
          actionTaken = true;
          continue;
        }
      }
    }

    // No further meaningful action could be taken this turn
    break;
  }

  return actionTaken;
};
