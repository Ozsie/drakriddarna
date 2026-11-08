// Visual-facing helpers over the actor animation state: monsters turn
// toward the party the moment fog of war reveals them, and heroes take
// their post at a dungeon start facing the door out of their starting
// room. Pure visual state (see setActorFacing in ActorAnimation.ts) —
// no position is recorded and no gameplay effect follows from it.
import type { Actor, Door, GameState, Layout, Position } from '../types';
import { findCell, sideOffset } from './grid';
import { facingBetween, setActorFacing } from './ActorAnimation';

const squaredDistance = (a: Position, b: Position): number =>
  (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);

// Turns the actor toward the target position: direction only, no step is
// recorded, so a directional sprite just switches its facing row.
export const faceActorToward = (actor: Actor, target: Position): void => {
  const facing = facingBetween(actor.position, target);
  if (facing) {
    setActorFacing(actor, facing);
  }
};

/**
 * Faces every live monster standing in one of the given (newly
 * discovered) room letters toward the closest live hero — the moment the
 * fog of war lifts off them, they turn to face the party that intruded.
 * Monsters that have already moved keep their facing until their room is
 * (re)discovered; letters are room/corridor grid letters, so revealed
 * corridors count too.
 */
export const faceRevealedMonsters = (
  state: GameState,
  rooms: string[],
): void => {
  const revealed = new Set(rooms);
  if (revealed.size === 0) return;
  const live = (state.heroes ?? []).filter((hero) => hero.health > 0);
  if (live.length === 0) return;
  state.dungeon.layout.monsters.forEach((monster) => {
    if (monster.health <= 0) return;
    const cell = findCell(
      state.dungeon.layout.grid,
      monster.position.x,
      monster.position.y,
    );
    if (!cell || !revealed.has(cell)) return;
    let closest = live[0];
    let best = squaredDistance(monster.position, closest.position);
    live.forEach((hero) => {
      const distance = squaredDistance(monster.position, hero.position);
      if (distance < best) {
        best = distance;
        closest = hero;
      }
    });
    faceActorToward(monster, closest.position);
  });
};

// The point a door sits at: doors live on the edge between two cells, so
// the facing aims at the edge midpoint rather than a whole cell.
const doorAnchor = (door: Door): Position => {
  const [offsetX, offsetY] = sideOffset(door.side);
  return { x: door.x + offsetX / 2, y: door.y + offsetY / 2 };
};

// Whether the door stands on an edge of the given room letter: the edge's
// cell on either side belongs to the room.
const isDoorOfRoom = (layout: Layout, door: Door, room: string): boolean => {
  const [offsetX, offsetY] = sideOffset(door.side);
  return (
    findCell(layout.grid, door.x, door.y) === room ||
    findCell(layout.grid, door.x + offsetX, door.y + offsetY) === room
  );
};

/**
 * Faces each live hero toward the closest visible door of the room they
 * stand in — at a dungeon start heroes take their positions looking out
 * of their starting room. Hidden doors are skipped so the facing does
 * not leak not-yet-found secrets; a hero without a door in their room
 * keeps the default facing.
 */
export const faceHeroesTowardClosestRoomDoor = (state: GameState): void => {
  const layout = state.dungeon.layout;
  const doors = (layout.doors ?? []).filter((door) => !door.hidden);
  (state.heroes ?? []).forEach((hero) => {
    if (hero.health <= 0) return;
    const room = findCell(layout.grid, hero.position.x, hero.position.y);
    if (!room) return;
    let closest: Door | undefined;
    let best = Infinity;
    doors.forEach((door) => {
      if (!isDoorOfRoom(layout, door, room)) return;
      const distance = squaredDistance(hero.position, doorAnchor(door));
      if (distance < best) {
        best = distance;
        closest = door;
      }
    });
    if (closest) {
      faceActorToward(hero, doorAnchor(closest));
    }
  });
};
