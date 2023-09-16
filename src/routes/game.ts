import type { Actor, Door, Dungeon, GameState, Hero, Layout, Monster, Position } from "./types";
import { Colour, ConditionType, Level, Side } from "./types";
import { EMPTY, PILLAR, PIT, WALL } from "./dungeons";
import { e1m0 } from './dungeons/e1m0';
import { weapons } from './items/weapons';
import { searchForSecret } from './secrets/SecretsLogic';


export const save = (state: GameState) => {
  addLog(state, 'Game saved.');
  localStorage.setItem("state", JSON.stringify(state));
}

export const load = (): GameState | undefined => {
  const stateString = localStorage.getItem("state")
  if (stateString) {
    const state: GameState = JSON.parse(stateString)
    state.currentActor = state.heroes.find((hero) => hero.name === state.currentActor?.name)
    addLog(state, 'Game loaded.');
    return state
  }
}

export const init = (): GameState => {
  const heroes: Hero[] = defaultHeroes;

  const state = {
    heroes: heroes,
    dungeon: e1m0,
    currentActor: heroes[0],
    actionLog: [
      'Game Initialised',
      'Each character has 2 actions. Move, Attack, Search or Pick Lock.',
      'Each character can move 3 steps per action.',
      'If another action is performed before moving 3 steps, the move is finished and both actions are consumed.',
      'The rules of this game are harsh and unfair.'
    ]
  }
  updateStartingPositions(state);
  return state;
}

const newHero = (name: string, colour: Colour): Hero => {
  weapons[0].amountInDeck--;
  return {
    name: name,
    actions: 2,
    movement: 3,
    defense: 0,
    level: Level.APPRENTICE,
    health: 7,
    maxHealth: 7,
    colour: colour,
    experience: 0,
    position: {x:-1,y:-1},
    weapon: weapons[0]
  }
}

export const defaultHeroes: Hero[] = [
  newHero('Fearik', Colour.Yellow),
  newHero('Helbran', Colour.Red),
  newHero('Siedel', Colour.Green),
  newHero('Wulf', Colour.Blue)
];

export const updateStartingPositions = (state: GameState) => {
  state.heroes.forEach((hero, index) => hero.position = state.dungeon.startingPositions[index])
}

export const toArray = (row: string): string[] => {
  let array: string[] = []
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
}

export const isBlockedByMonster = (state: GameState, newX: number, newY: number) => {
  return state.dungeon.layout.monsters.some((monster) => {
    return monster.position.x === newX &&
      monster.position.y === newY &&
      monster.health > 0;
  });
}

export const isBlockedByHero = (state: GameState, newX: number, newY: number) => {
  return liveHeroes(state).some((hero) => {
    return hero.position.x === newX && hero.position.y === newY;
  });
}

export const consumeActions = (hero: Actor) => {
  if (hero.movement === 0) {
    hero.actions--;
    if (hero.actions !== 0) {
      hero.movement = 3;
    }
  }
  if (hero.actions == 0) {
    hero.movement = 0;
  }
}

export const act = (direction: string, state: GameState) => {
  const hero: Actor | undefined = state.currentActor
  if (!hero || hero.actions === 0) {
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
  const blockedByHero = isBlockedByHero(state, newX, newY);
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
        move(hero, state, newX, newY, 1)
      }
    }
  } else {
    addLog(state, `${hero.name} could not make that move`);
  }
  consumeActions(hero);
}

const move = (hero: Actor, state: GameState, newX: number, newY: number, cost: number) => {
  hero.position.x = newX;
  hero.position.y = newY;
  const note  = state.dungeon.layout.notes.find((note) => isSamePosition(note.position, hero.position));
  if (note) {
    const onHiddenDoor = state.dungeon.layout.doors.some((door) => door.hidden && isSamePosition(note.position, { x: door.x, y: door.y }))
    if (!onHiddenDoor) addLog(state, `${hero.name} reads: ${note.message}`);
  }
  const nextToMonster = state.dungeon.layout.monsters.some((monster) => {
    return isNeighbouring(hero.position, monster.position.x, monster.position.y)
  });
  if (nextToMonster) {
    addLog(state, `${hero.name} walked by a monster and lost the momentum`);
    hero.movement = 0;
  } else {
    hero.movement -= cost;
  }
}

export const openDoor = (hero: Actor, state: GameState, newX: number, newY: number) => {
  const target = findCell(state.dungeon.layout.grid, newX, newY);
  if (target) state.dungeon.discoveredRooms.push(target);
  move(hero, state, hero.position.x, hero.position.y, 1);
  addLog(state, `${hero.name} opened a door`);
}

export const attack = (hero: Actor, state: GameState, targetX: number, targetY: number) => {
  if (hero.actions === 1 && hero.movement !== 3) {
    addLog(state, `${hero.name} has no actions left to attack`);
    return;
  }
  const monster = state.dungeon.layout.monsters.find((monster) => monster.position.x === targetX && monster.position.y === targetY);
  if (monster) {
    takeDamage(state, hero, monster);
    if (monster.health <= 0) {
      state.dungeon.layout.monsters = state.dungeon.layout.monsters.filter((m) => m != monster);
      addLog(state, `${hero.name} killed ${monster.name}`);
      state.dungeon.killCount++;
      hero.experience += monster.experience;
    }
    if (hero.actions > 1 && hero.movement < 3) {
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
    case Level.APPRENTICE: results = results.filter((result) => result === 5); break;
    case Level.KNIGHT:
    case Level.HERO: results = results.filter((result) => result >= 4); break;
    case Level.LORD:
    case Level.MASTER: results = results.filter((result) => result >= 3); break;
  }
  return results.length
}

export const pickLock = (state: GameState) => {
  const hero = state.currentActor
  if (!hero) return;
  if (!canAct(hero)) {
    addLog(state, `${hero.name} has no actions left to pick lock`);
    return;
  }
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position.x && door.y === hero.position.y)
  if (door && door.locked) {
    const result = roll(hero.level, 1)
    if (result >= 1) {
      door.locked = false;
      addLog(state, `${hero.name} managed to pick the lock`);
    } else {
      addLog(state, `${hero.name} failed to pick the lock`);
    }
    if (hero.actions > 1 && hero.movement < 3) {
      hero.actions -= 2
    } else {
      hero.actions--;
    }
    hero.movement = 3;
    if(hero.actions == 0){
      hero.movement = 0
    }
  }
}

export const search = (state: GameState) => {
  const hero: Actor | undefined = state.currentActor
  if (!hero) return;
  if (!canAct(hero)) {
    addLog(state, `${hero.name} has no actions left to search`);
    return;
  }
  searchForSecret(state);
  if (hero.actions > 1 && hero.movement < 3) {
    hero.actions -= 2
  } else {
    hero.actions--;
  }
  if(hero.actions == 0){
    hero.movement = 0
  }
}

export const next = (state: GameState) => {
  checkWinConditions(state)
  if (state.currentActor === undefined) return;
  else {
    addLog(state, `${state.currentActor.name} ended their turn`);
    let currentIndex = liveHeroes(state).indexOf(state.currentActor!!)
    let nextIndex = currentIndex + 1;
    if (nextIndex === liveHeroes(state).length) {
      monsterActions(state);
      nextIndex = 0;
    }
    state.currentActor.actions = 2;
    state.currentActor.movement = 3;
    state.currentActor = liveHeroes(state)[nextIndex];
    addLog(state, `${state.currentActor.name} started their turn`);
  }
}

const checkWinConditions = (state: GameState) => {
  state.dungeon.winConditions.forEach((condition) => {
    switch (condition.type) {
      case ConditionType.KILL_ALL: {
        const monsterHealth = state.dungeon.layout.monsters
          .map((monster) => monster.health)
          .reduce((partial, health) => partial + health, 0);
        condition.fulfilled = monsterHealth <= 0;
        break;
      }
      case ConditionType.REACH_CELL: {
        condition.fulfilled = liveHeroes(state)
          .some((hero) => {
            return hero.position.x === condition.targetCell?.x && hero.position.y === condition.targetCell.y;
          });
        break;
      }
      case ConditionType.KILL_ALL_OF_TYPE: {
        condition.fulfilled = state.dungeon.layout.monsters
          .filter((monster) => monster.type === condition.targetMonsterType)
          .some((monster) => monster.health > 0);
        break;
      }
      case ConditionType.OPEN_DOOR: {
        condition.fulfilled = state.dungeon.layout.doors
          .find((door) => {
            return door.x === condition.targetCell?.x && door.y === condition.targetCell?.y;
          })?.open ?? false;
        break;
      }
      case ConditionType.KILL_AT_LEAST: {
        condition.fulfilled = (condition.killMinCount ? condition.killMinCount : 0) <= state.dungeon.killCount;
        break;
      }
    }
  })
  state.dungeon.beaten = state.dungeon.winConditions
    .map((condition) => condition.fulfilled)
    .reduce((partial, fulfilled) => partial && fulfilled, true);
  if (state.dungeon.beaten) {
    addLog(state, "All win conditions have been fulfilled");
    addLog(state, `You have cleared ${state.dungeon.name}`);
    addLog(state, `Press 'Next' to move on to the next level: ${state.dungeon.nextDungeon?.name}`)
  }
}

export const triggerTrap = (door: Door, hero: Actor, state: GameState) => {
  const hits = roll(Level.APPRENTICE, door.trapAttacks);
  const damage = Math.max(hits - hero.defense, 0);
  addLog(state, `Door was trapped. ${hero.name} took ${getDamageString(damage, hits, hero)}`);
  takeDamage(state, doorAsActor(door), hero);
}

const doorAsActor = (door: Door): Actor => {
  return {
    health: 0,
    position: { x: door.x, y: door.y },
    defense: 0,
    experience: 0,
    actions: 0,
    movement: 0,
    colour: Colour.Red,
    maxHealth: 0,
    name: "Door",
    level: Level.APPRENTICE,
    weapon: {
      name: "Trap",
      amountInDeck: 0,
      dice: door.trapAttacks,
      useHearHeroes: true,
      twoHanded: false,
      range: 1
    }
  };
}

const moveOverDoor = (state: GameState, hero: Actor, newX: number, newY: number) => {
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position.x && door.y === hero.position.y)

  if (door && !door.locked) {
    const side = openSide(hero.position.x, hero.position.y, newX, newY)
    if (door.side === side) {
      door.open = true;
      if (door.trapped) {
        triggerTrap(door, hero, state);
      }
      return true
    }
  }
  if (door && door.locked) {
    addLog(state, 'Door is locked');
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

export const isWalkable = (layout: Layout, x: number, y: number): boolean => {
  let walkable = true;
  if (x < 0 || x >= layout.grid[0].length || y < 0 || y >= layout.grid.length) {
    walkable = false;
  } else {
    const cell = findCell(layout.grid, x, y)
    if (cell === PIT || cell === PILLAR || cell === EMPTY || cell === WALL) {
      walkable = false;
    }
  }
  return walkable;
}

export const isDiscovered = (dungeon: Dungeon, x: number, y: number) => {
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
    const cell = findCell(state.dungeon.layout.grid, monster.position.x, monster.position.y)
    return cell && state.dungeon.discoveredRooms.includes(cell) && monster.health > 0;
  })
  if (visibleMonsters.length === 0) {
    addLog(state, 'No monsters can act');
  }
  visibleMonsters.forEach((monster) => {
    const maxActions = monster.actions
    addLog(state, `${monster.name} acted `);
    while (monster.actions > 0) {
      const neighbouringHeroes: Hero[] = liveHeroes(state).filter((hero: Hero) => isNeighbouring(monster.position, hero.position.x, hero.position.y));
      if (neighbouringHeroes.length > 0) {
        const target = Math.floor(Math.random() * neighbouringHeroes.length);
        monsterAttack(state, monster, neighbouringHeroes[target]);
      } else {
        while (monster.movement > 0) {
          monsterMove(state, monster);
        }
        monster.actions--;
        monster.movement = 3;
      }
    }
    monster.actions = maxActions;
    monster.movement = 3;
  })
}

export const getDist = (a: Position, b: Position) => {
  return Math.sqrt(
    Math.pow(a.x - b?.x, 2) +
    Math.pow(a.y - b?.y, 2)
  );
}

const monsterMove = (state: GameState, monster: Monster) => {
  const closestHeroAndDistance = liveHeroes(state).map((hero) => {
    return {
      hero,
      dist: getDist(hero.position, monster.position)
    }
  }).sort((a, b) => {
    return a.dist - b.dist
  })[0]

  if (closestHeroAndDistance.dist > 1) {
    const possibleMoves = findPossibleMoves(state, monster.position);
    if (possibleMoves.length > 0) {
      const newPosition = possibleMoves.map((pos) => {
        return {
          pos,
          dist: getDist(pos, closestHeroAndDistance.hero.position)
        };
      }).sort((a, b) => {
        return a.dist - b.dist;
      })[0].pos;
      monster.position = newPosition;
      addLog(state, `${monster.name} moved towards ${closestHeroAndDistance.hero.name} (${newPosition.x},${newPosition.y})`);
    } else {
      addLog(state, `${monster.name} could not move`);
    }
  }
  monster.movement--;
}


let findPossibleMoves = (state: GameState, position: Position): Position[] => {
  const x = position.x;
  const y = position.y;

  const targets: Position[] = []
  for (let tX = x-1; tX <= x+1; tX++) {
    for (let tY = y-1; tY <= y+1; tY++) {
      if (tX === x && tY === y) continue;
      if (isWalkable(state.dungeon.layout, tX, tY) && isDiscovered(state.dungeon, tX, tY)) {
        targets.push({x:tX,y:tY});
      }
    }
  }

  return targets.filter((pos) => {
    return !liveHeroes(state).find((hero) => hero.position.x === pos.x && hero.position.y === pos.y);
  }).filter((pos) => {
    const blocker = state.dungeon.layout.monsters.find((m) => m.position.x === pos.x && m.position.y === pos.y)
    return !blocker
  })
}

export const getDamageString = (damage: number, hits: number, target: Actor) => {
  const defense = target.armour?.defense ?? target.defense
  return `${damage} damage (${hits}-${defense}=${damage})`;
}

const monsterAttack = (state: GameState, monster: Monster, hero: Hero) => {
  if (monster.actions === 1 && monster.movement !== 3) {
    addLog(state, `${hero.name} has no actions left to attack`);
    return;
  }
  if (hero) {
    takeDamage(state, monster, hero);
    if (monster?.actions > 1 && monster?.movement < 3) {
      monster.actions -= 2
    } else {
      monster.actions--;
    }
  }
}

export const canAct = (hero: Hero) => {
  if (hero.movement < 3) {
    return hero.actions > 1
  }
  return hero.actions > 0
}

const isSamePosition = (a: Position, b: Position) => {
  return a.x === b.x && a.y === b.y;
}

export const addLog = (state: GameState, logMessage: string) => {
  state.actionLog = [logMessage, ...state.actionLog];
}

export const liveHeroes = (state: GameState): Hero[] => {
  return state.heroes.filter((hero) => hero.health > 0);
}

export const deadHeroes = (state: GameState): Hero[] => {
  return state.heroes.filter((hero) => hero.health <= 0);
}

export const takeDamage = (state: GameState, source: Actor, target: Actor) => {
  const defense = target.armour?.defense ?? target.defense
  const hits = roll(source.level, source.weapon.dice);
  const damage = Math.max(hits - defense, 0);
  target.health -= damage;
  addLog(state, `${source.name} attacked ${target.name} with ${source.weapon.name} for ${getDamageString(damage, hits, target)}`);
  if (target.health <= 0) {
    addLog(state, `${source.name} killed ${target.name}`);
    target.health = 0;
    target.level = Level.APPRENTICE;
  }
}

export const levelUp = (state: GameState) => {
  liveHeroes(state).forEach((hero) => {
    const currentLevel = hero.level
    if (hero.experience >= 28) {
      hero.level = Level.MASTER;
    } else if (hero.experience >= 18) {
      hero.level = Level.LORD;
    } else if (hero.experience >= 10) {
      hero.level = Level.HERO;
    } else if (hero.experience >= 4) {
      hero.level = Level.KNIGHT;
    }
    if (currentLevel !== hero.level) {
      addLog(state, `${hero.name} leveled up to ${hero.level}`);
    }
  });
}

const rewardLiveHeroes = (state: GameState) => {
  liveHeroes(state).forEach((hero) => hero.experience += 4);
}

const replaceDeadHeroes = (state: GameState) => {
  deadHeroes(state).forEach((hero) => {
    hero.experience = 0;
    hero.health = hero.maxHealth;
    hero.actions = 2;
  });
}

export const hasWon = (state: GameState) => {
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    state.dungeon = state.dungeon.nextDungeon;
    state.actionLog = ['You have reached ' + state.dungeon.name];
    rewardLiveHeroes(state);
    levelUp(state);
    replaceDeadHeroes(state);
    updateStartingPositions(state);
  }
}
