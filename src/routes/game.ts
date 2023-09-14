import type { Dungeon, GameState, Hero, Layout, Position, Monster } from "./types";
import { ConditionType, Level, Side } from "./types";
import { EMPTY, PILLAR, PIT, tutorial } from "./dungeons";


export const init = (): GameState => {
  const heroes: Hero[] = [
    newHero('Fearik', 'orange'),
    newHero('Helbran', 'red'),
    newHero('Siedel', 'green'),
    newHero('Wulf', 'lightblue')
  ];

  updateStartingPositions(heroes, tutorial);

  return {
    heroes: heroes,
    dungeon: tutorial,
    currentActor: heroes[0],
    actionLog: [
      'Game Initialised',
      'Each character has 2 actions. Move, Attack, Search or Pick Lock.',
      'Each character can move 3 steps per action.',
      'If another action is performed before moving 3 steps, the move is finished and both actions are consumed.',
      'The rules of this game are harsh and unfair.'
    ]
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

export const updateStartingPositions = (heroes: Hero[], dungeon: Dungeon) => {
  heroes.forEach((hero, index) => hero.position = dungeon.startingPositions[index])
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
      const moved = moveOverDoor(state, hero, newX, newY)
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
    if (hero?.actions > 1 && hero?.movement < 3) {
      hero.actions -= 2
    } else {
      hero.actions--;
    }
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

export const pickLock = (state: GameState) => {
  const hero = state.currentActor
  if (!canAct(hero)) {
    state.actionLog.push(hero.name + ' has no actions left to pick lock')
    return;
  }
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position.x && door.y === hero.position.y)
  if (door && door.locked) {
    const result = roll(hero.level, 1)
    if (result >= 1) {
      door.locked = false;
      state.actionLog.push(hero.name + ' managed to pick the lock')
    } else {
      state.actionLog.push(hero.name + ' failed to pick the lock')
    }
    if (hero?.actions > 1 && hero?.movement < 3) {
      hero.actions -= 2
    } else {
      hero.actions--;
    }
    hero.movement = 3;
  }
}

export const search = (state: GameState) => {
  const hero = state.currentActor
  if (!canAct(hero)) {
    state.actionLog.push(hero.name + ' has no actions left to search')
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
  if (hero?.actions > 1 && hero?.movement < 3) {
    hero.actions -= 2
  } else {
    hero.actions--;
  }
  hero.movement = 3;
}

export const next = (state: GameState) => {
  checkWinConditions(state)
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

const checkWinConditions = (state: GameState) => {
  state.dungeon.winConditions.forEach((condition) => {
    switch (condition.type) {
      case ConditionType.KILL_ALL: const monsterHealth = state.dungeon.layout.monsters
        .map((monster) => monster.health)
        .reduce((partial, health) => partial + health, 0);
        condition.fulfilled = monsterHealth <= 0;
        break;
      case ConditionType.REACH_CELL: condition.fulfilled = state.heroes
        .some((hero) => {
          hero.position.x === condition.targetCell?.x && hero.position.y === condition.targetCell.y
        });
        break;
      case ConditionType.KILL_ONE: const target = state.dungeon.layout.monsters
        .find((monster) => monster.name === condition.targetMonster)
        condition.fulfilled = target.health === 0;
        break;
    }
  })
  state.dungeon.beaten = state.dungeon.winConditions
    .map((condition) => condition.fulfilled)
    .reduce((partial, fulfilled) => partial && fulfilled, true);
  if (state.dungeon.beaten) state.actionLog.push('All win conditions have been fulfilled');
}

const moveOverDoor = (state: GameState, hero: Hero, newX: number, newY: number) => {
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position?.x && door.y === hero.position.y)

  if (door && !door.locked) {
    const side = openSide(hero.position.x, hero.position?.y, newX, newY)
    if (door.side === side) {
      door.open = true;
      return true
    }
  }
  if (door.locked) {
    state.actionLog.push('Door is locked')
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
  visibleMonsters.forEach((monster) => {
    state.actionLog.push(monster.name + " acted ");
    const neighbouringHeroes: Hero[] = state.heroes.filter((hero: Hero) => isNeighbouring(monster.position, hero.position?.x, hero.position.y))
    if (neighbouringHeroes.length > 0) {
      const target = Math.floor(Math.random() * neighbouringHeroes.length)
      monsterAttack(state, monster, neighbouringHeroes[target])
    }
  })
}

const monsterAttack = (state: GameState, monster: Monster, hero: Hero) => {
  if (monster.actions === 1 && monster.movement !== 3) {
    state.actionLog.push(hero.name + ' has no actions left to attack')
    return;
  }
  if (hero) {
    const hits = roll(monster.level, 3);
    const damage = Math.max(hits - hero.defense, 0);
    state.actionLog.push(monster.name + ' attacked ' + hero.name + ' for ' + damage + ' damage (' + hits + '-' + hero.defense + '=' + damage +')');
    hero.health -= damage;
    if (hero.health <= 0) {
      state.actionLog.push(monster.name + ' killed ' + hero.name)
      state.heroes = state.heroes.filter((h) => h !== hero)
    }
    if (monster?.actions > 1 && monster?.movement < 3) {
      monster.actions -= 2
    } else {
      monster.actions--;
    }
  }
}

const canAct = (hero: Hero) => {
  if (hero.movement < 3) {
    return hero.actions > 1
  }
  return hero.actions > 0
}
