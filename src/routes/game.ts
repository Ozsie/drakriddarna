import { Level, Side } from "./types";
import type {
  Dungeon,
  Layout,
  Actor,
  GameState,
  Hero,
} from "./types";
import { EMPTY, PILLAR, PIT, tutorial } from "./dungeons";


export const init = (): GameState => {
  const heroes: Actor[] = [
    newHero('Fearik', 'orange'),
    newHero('Helbran', 'red'),
    newHero('Siedel', 'green'),
    newHero('Wulf', 'lightblue')
  ]

  const dungeon = tutorial

  heroes.forEach((hero, index) => hero.position = dungeon.startingPositions[index])

  return {
    heroes: heroes,
    dungeon: tutorial,
    currentActor: heroes[0]
  }
}

const newHero = (name: string, colour: string): Hero => {
  return {
    name: name,
    actions: 2,
    movement: 3,
    defense: 0,
    level: Level.APPRENTICE,
    health: 7,
    colour: colour
  }
}

export const toArray = (row: string): string[] => {
  let array: string[] = []
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
}

export const move = (hero: Hero, direction: string, state: GameState) => {
  if (hero.movement === 0) {
    hero.actions--;
    hero.movement = 3;
  }
  if (hero.actions === 0) {
    return;
  }
  let newX = hero.position.x
  let newY = hero.position.y
  switch (direction) {
    case 'UL': newX = hero.position.x - 1; newY = hero.position.y - 1; break;
    case 'U': newY = hero.position.y - 1; break;
    case 'UR': newX = hero.position.x + 1; newY = hero.position.y - 1; break;
    case 'L': newX = hero.position.x - 1; break;
    case 'R': newX = hero.position.x + 1; break;
    case 'DL': newX = hero.position.x - 1; newY = hero.position.y + 1; break;
    case 'D': newY = hero.position.y + 1; break;
    case 'DR': newX = hero.position.x + 1; newY = hero.position.y + 1; break;
  }
  const blockedByHero = state.heroes.some((hero) => {
    return hero.position.x === newX && hero.position.y === newY
  });
  const blockedByWall = !isWalkable(state.dungeon.layout, newX, newY)
  if (!blockedByHero && !blockedByWall) {
    const discovered = isDiscovered(state.dungeon, newX, newY)
    if (!discovered) {
      const moved = moveOverDoor(state.dungeon, hero, newX, newY)
      if (moved) {
        if (hero.movement >= 2) {
          const target = findCell(state.dungeon.layout.grid, newX, newY);
          if (target) state.dungeon.discoveredRooms.push(target);
          hero.position.x = newX;
          hero.position.y = newY;
          hero.movement -= 2;
        } else if (hero.movement === 1) {
          const target = findCell(state.dungeon.layout.grid, newX, newY);
          if (target) state.dungeon.discoveredRooms.push(target);
          hero.movement--;
        }
      }
    } else if (discovered) {
      hero.position.x = newX;
      hero.position.y = newY;
      hero.movement--;
    }
  } else {
    console.log('blocked')
  }
  console.log("m: " + hero.movement);
  console.log("a: " + hero.actions);
}

export const next = (state: GameState) => {
  if (state.currentActor === undefined) return;
  else {
    let currentIndex = state.heroes.indexOf(state.currentActor!!)
    console.log(currentIndex)
    let nextIndex = currentIndex + 1;
    if (nextIndex === state.heroes.length) {
      nextIndex = 0;
      console.log(nextIndex)
    }
    state.currentActor.actions = 2;
    state.currentActor.movement = 3;
    state.currentActor = state.heroes[nextIndex];
  }
}

const moveOverDoor = (dungeon: Dungeon, hero: Hero, newX: number, newY: number) => {
  const door = dungeon.layout.doors.find((door) => door.x === hero.position?.x && door.y === hero.position.y)

  if (door) {
    const side = openSide(hero.position.x, hero.position?.y, newX, newY)
    if (door.side === side) {
      door.open = true;
      return true
    }
  }
  return false
}

const openSide = (fromX: number, fromY: number, toX: number, toY: number): Side | undefined => {
  if (fromX === toX) {
    if (fromY > toY) return Side.UP
    if (fromY < toY) return Side.DOWN
  }
  if (fromY === toY) {
    if (fromX > toX) return Side.LEFT
    if (fromX < toX) return Side.RIGHT
  }
}

const isWalkable = (layout: Layout, x: number, y: number): boolean => {
  let walkable = true;
  if (x < 0 || x >= layout.grid[0].length || y < 0 || y >= layout.grid.length) {
    walkable = false;
  } else {
    const cell = findCell(layout.grid, x, y)
    if (cell === PIT || cell === PILLAR || cell === EMPTY) {
      walkable = false;
    }
  }
  return walkable;
}

const isDiscovered = (dungeon: Dungeon, x: number, y: number) => {
  const cell = findCell(dungeon.layout.grid, x, y)
  if (!cell) return false
  else return dungeon.discoveredRooms.includes(cell)
}

export const findCell = (grid: string[], x: number, y: number): string | undefined => {
  let c
  grid.forEach((row, gY) => {
    toArray(row).forEach((cell, gX) => {
      if (gY === y && gX === x) c = cell
    })
  })
  return c
}
