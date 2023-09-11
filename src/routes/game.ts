import type { Actor, Dungeon, GameState, Hero, Layout, Position } from "./types";
import { Level, Side } from "./types";
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
    currentActor: heroes[0],
    actionLog: ['Game Initialised']
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
    colour: colour,
    experience: 0
  }
}

export const toArray = (row: string): string[] => {
  let array: string[] = []
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
}

const isBlockedByMonster = (state: GameState, newX, newY) => {
  return state.dungeon.layout.monsters.some((monster) => {
    return monster.position.x === newX &&
      monster.position?.y === newY &&
      monster.health > 0;
  });
}

export const act = (direction: string, state: GameState) => {
  const hero = state.currentActor
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
  const blockedByMonster = isBlockedByMonster(state, newX, newY)
  if (!blockedByHero && !blockedByWall) {
    const discovered = isDiscovered(state.dungeon, newX, newY)
    if (!discovered) {
      const moved = moveOverDoor(state.dungeon, hero, newX, newY)
      if (moved) {
        openDoor(hero, state, newX, newY);
      }
    } else if (discovered) {
      if (blockedByMonster) {
        attack(hero, state, newX, newY)
      } else {
        move(hero, newX, newY, 1)
      }
    }
  } else {
    state.actionLog.push(hero.name + ' could not make that move')
  }
  if (hero.movement === 0) {
    hero.actions--;
    hero.movement = 3;
  }
}

const move = (hero: Hero, newX: number, newY: number, cost: number) => {
  hero.position.x = newX;
  hero.position.y = newY;
  hero.movement -= cost;
}

const openDoor = (hero: Hero, state: GameState, newX, newY) => {
  const target = findCell(state.dungeon.layout.grid, newX, newY);
  if (target) state.dungeon.discoveredRooms.push(target);
  move(hero, hero.position.x, hero.position.y, 1);
  state.actionLog.push(hero.name + ' opened a door')
}

const attack = (hero: Hero, state: GameState, targetX: number, targetY: number) => {
  if (hero.actions === 1 && hero.movement !== 3) {
    state.actionLog.push(hero.name + ' has no actions left to attack')
    return;
  }
  const monster = state.dungeon.layout.monsters.find((monster) => monster.position.x === targetX && monster.position?.y === targetY);
  if (monster) {
    const hits = roll(hero.level, 3);
    const damage = Math.max(hits - monster.defense, 0);
    state.actionLog.push(hero.name + ' attacked ' + monster.name + ' for ' + damage + ' damage (' + hits + '-' + monster.defense + '=' + damage +')');
    monster.health -= damage;
    if (monster.health <= 0) {
      state.actionLog.push(hero.name + ' killed ' + monster.name)
      hero.experience += monster.experience
    }
    hero.actions--;
  }
}

export const roll = (level: Level, dice: number) => {
  let results = []
  for (let i = 0; i<dice; i++) {
    results.push(Math.floor(Math.random() * 6) + 1)
  }
  switch (level) {
    case Level.APPRENTICE: results = results.filter((result) => result === 6); break;
    case Level.KNIGHT:
    case Level.HERO: results = results.filter((result) => result >= 5); break;
    case Level.LORD:
    case Level.MASTER: results = results.filter((result) => result >= 4); break;
  }
  return results.length
}

export const search = (state: GameState) => {
  const hero = state.currentActor
  if (!hero || hero.actions === 0) {
    return;
  }
  const result = roll(hero.level, 1)
  if (result >= 1) {
    const secret = state.dungeon.layout.secrets.find((secret) => {
      return isNeighbouring(secret.position, hero.position.x, hero.position.y);
    })
    if (secret) {
      state.actionLog.push(hero.name + ' searched (' + result +') and found ' + secret.name);
    } else {
      state.actionLog.push(hero.name + ' searched (' + result +') but found nothing');
      console.log('found no secret')
    }
  } else {
    state.actionLog.push(hero.name + ' searched (' + result +') but found nothing');
  }
  hero.actions--;
}

export const next = (state: GameState) => {
  if (state.currentActor === undefined) return;
  else {
    state.actionLog.push(state.currentActor.name + ' ended their turn')
    let currentIndex = state.heroes.indexOf(state.currentActor!!)
    let nextIndex = currentIndex + 1;
    if (nextIndex === state.heroes.length) {
      monsterActions(state);
      nextIndex = 0;
    }
    state.currentActor.actions = 2;
    state.currentActor.movement = 3;
    state.currentActor = state.heroes[nextIndex];
    state.actionLog.push(state.currentActor.name + ' started their turn')
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

export const isNeighbouring = (position: Position, x: number, y: number) => {
  return (position.x === x && position.y === y) ||
    (position.x === x - 1 && position.y === y) ||
    (position.x === x - 1 && position.y === y - 1) ||
    (position.x === x && position.y === y - 1) ||
    (position.x === x + 1 && position.y === y - 1) ||
    (position.x === x + 1 && position.y === y) ||
    (position.x === x + 1 && position.y === y + 1) ||
    (position.x === x && position.y === y + 1) ||
    (position.x === x - 1 && position.y === y + 1);
}

const monsterActions = (state: GameState) => {
  const visibleMonsters = state.dungeon.layout.monsters.filter((monster) => {
    const cell = findCell(state.dungeon.layout.grid, monster.position?.x, monster.position.y)
    return state.dungeon.discoveredRooms.includes(cell) && monster.health > 0;
  })
  if (visibleMonsters.length === 0) {
    state.actionLog.push('No monsters can act')
  }
  visibleMonsters.forEach((monster) => (
    state.actionLog.push(monster.name + ' acted ')
  ))
}
