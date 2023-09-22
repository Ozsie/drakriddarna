import type {
  Actor,
  GameState,
  Hero,
  Monster,
  Door,
  Position
} from "../types";
import {
  Colour,
  Level,
  Side
} from "../types";
import { weapons } from "../items/weapons";
import {
  addLog,
  doorAsActor,
  findCell,
  findNeighbouringHeroes,
  getEffectiveMaxMovement,
  isDiscovered,
  isNeighbouring,
  isSamePosition,
  isWalkable,
  next,
  roll,
  takeDamage
} from "../game";
import {
  checkForTrapDoor,
  searchForSecret
} from "../secrets/SecretsLogic";
import { BREAK_LOCK } from "../items/magicItems";

export const newHero = (name: string, colour: Colour): Hero => {
  weapons[0].amountInDeck--;
  return {
    name: name,
    actions: 2,
    movement: 3,
    maxMovement: 3,
    defense: 0,
    level: Level.APPRENTICE,
    health: 7,
    maxHealth: 7,
    colour: colour,
    experience: 0,
    position: {x:-1,y:-1},
    weapon: weapons[0],
    incapacitated: false,
    inventory: [],
  }
}

export const act = (direction: string, state: GameState) => {
  const hero: Actor | undefined = state.currentActor
  if (!hero || hero.actions === 0) {
    return;
  }
  const newPosition = { x: hero.position.x, y: hero.position.y };
  switch (direction) {
    case 'UL': newPosition.x = hero.position.x - 1; newPosition.y = hero.position.y - 1; break;
    case 'U': newPosition.y = hero.position.y - 1; break;
    case 'UR': newPosition.x = hero.position.x + 1; newPosition.y = hero.position.y - 1; break;
    case 'L': newPosition.x = hero.position.x - 1; break;
    case 'R': newPosition.x = hero.position.x + 1; break;
    case 'DL': newPosition.x = hero.position.x - 1; newPosition.y = hero.position.y + 1; break;
    case 'D': newPosition.y = hero.position.y + 1; break;
    case 'DR': newPosition.x = hero.position.x + 1; newPosition.y = hero.position.y + 1; break;
  }
  const blockedByHero = isBlockedByHero(state, newPosition.x, newPosition.y);
  const blockedByWall = !isWalkable(state.dungeon.layout, newPosition.x, newPosition.y);
  const blockedByMonster = isBlockedByMonster(state, newPosition.x, newPosition.y);
  if (!blockedByHero && !blockedByWall) {
    const discovered = isDiscovered(state.dungeon, newPosition.x, newPosition.y);
    if (!discovered) {
      const moved = moveOverDoor(state, hero, newPosition.x, newPosition.y);
      if (moved) {
        openDoor(hero, state, newPosition.x, newPosition.y);
      }
    } else if (discovered) {
      if (blockedByMonster) {
        attack(hero, state, newPosition);
      } else {
        move(hero, state, newPosition.x, newPosition.y, 1);
      }
    }
  } else {
    addLog(state, `${hero.name} could not make that move`);
  }
  if (!checkForTrapDoor(state)) {
    consumeActions(hero);
  }
}

export const pickLock = (state: GameState) => {
  const hero = state.currentActor;
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, `${hero.name} is blinded and may not search.`);
    return
  }
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
    hero.movement = getEffectiveMaxMovement(hero);
    if(hero.actions == 0){
      hero.movement = 0
    }
  }
}

export const resetLiveHeroes = (state: GameState) => {
  state.heroes.forEach((hero, index) => {
    hero.position = state.dungeon.startingPositions[index];
    hero.movement = getEffectiveMaxMovement(hero);
    hero.actions = 2;
    hero.health = hero.maxHealth;
  });
}

export const liveHeroes = (state: GameState): Hero[] => {
  return state.heroes.filter((hero) => hero.health > 0);
}

export const endAction = (state: GameState) => {
  const hero = state.currentActor
  if (!hero) return;
  hero.actions--;
  hero.movement = getEffectiveMaxMovement(hero);
  if (hero.actions === 0) {
    next(state);
  }
}

export const canAct = (hero: Hero) => {
  if (hero.movement < getEffectiveMaxMovement(hero)) {
    return hero.actions > 1
  }
  return hero.actions > 0
}

export const openDoor = (hero: Hero, state: GameState, newX: number, newY: number) => {
  const target = findCell(state.dungeon.layout.grid, newX, newY);
  if (target) state.dungeon.discoveredRooms.push(target);
  move(hero, state, hero.position.x, hero.position.y, 1);
  addLog(state, `${hero.name} opened a door`);
}

export const attack = (hero: Actor, state: GameState, target: Position) => {
  if (hero.actions === 1 && hero.movement !== 3) {
    addLog(state, `${hero.name} has no actions left to attack`);
    return;
  }
  if (!hero.weapon.useHearHeroes && hasNeighbouringHeroes(state, hero)) {
    addLog(state, `${hero.name} could not use ${hero.weapon.name} near a friend.`);
    return;
  }

  const monster = findMonsterAt(state, target);
  if (monster) {
    takeDamage(state, hero, monster, false);
    if (monster.health <= 0) {
      killMonster(state, monster, hero);
    }
    if (hero.actions > 1 && hero.movement < 3) {
      hero.actions -= 2
    } else {
      hero.actions--;
    }
  }
}

export const search = (state: GameState) => {
  const hero: Actor | undefined = state.currentActor
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, `${hero.name} is blinded and may not search.`);
    return
  }
  if (!canAct(hero)) {
    addLog(state, `${hero.name} has no actions left to search`);
    return;
  }
  searchForSecret(state);
  if (hero.actions > 1 && hero.movement < getEffectiveMaxMovement(hero)) {
    hero.actions -= 2
  } else {
    hero.actions--;
  }
  if(hero.actions == 0){
    hero.movement = 0
  }
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
      hero.movement = getEffectiveMaxMovement(hero);
    }
  }
  if (hero.actions == 0) {
    hero.movement = 0;
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

export const rewardLiveHeroes = (state: GameState) => {
  liveHeroes(state).forEach((hero) => hero.experience += 4);
}

export const replaceDeadHeroes = (state: GameState) => {
  deadHeroes(state).forEach((hero) => {
    hero.experience = 0;
    hero.health = hero.maxHealth;
    hero.movement = hero.maxMovement;
    hero.actions = 2;
  });
}

export const canOpenDoor = (hero: Hero, canBreakDoor: boolean, door: Door) => {
  return !door.open && !door.hidden && (!door.locked || (door.locked && canBreakDoor)) && hero.movement > 0;
}

const move = (hero: Hero, state: GameState, newX: number, newY: number, cost: number) => {
  hero.position.x = newX;
  hero.position.y = newY;
  const note = state.dungeon.layout.notes.find((note) => isSamePosition(note.position, hero.position));
  if (note) {
    const onHiddenDoor = state.dungeon.layout.doors.some((door) => door.hidden && isSamePosition(note.position, {
      x: door.x,
      y: door.y
    }));
    if (!onHiddenDoor) addLog(state, `${hero.name} reads: ${note.message}`);
  }
  const nextToMonster = state.dungeon.layout.monsters.some((monster) => {
    return isNeighbouring(hero.position, monster.position.x, monster.position.y);
  });
  if (nextToMonster) {
    addLog(state, `${hero.name} walked by a monster and lost the momentum`);
    hero.movement = 0;
  } else {
    hero.movement -= cost;
  }
}

const moveOverDoor = (state: GameState, hero: Actor, newX: number, newY: number) => {
  const door = state.dungeon.layout.doors.find((door) => door.x === hero.position.x && door.y === hero.position.y);
  const canBreakLock = hero.inventory.some((item) => item.properties?.[BREAK_LOCK]);

  if (door && canOpenDoor(hero, canBreakLock, door)) {
    if (door.locked && canBreakLock) addLog(state, `${hero.name} broke the locked door`);
    const side = openSide(hero.position.x, hero.position.y, newX, newY);
    if (door.side === side) {
      door.open = true;
      if (door.trapped) {
        takeDamage(state, doorAsActor(door), hero, false);
      }
      return true;
    }
  }
  if (door && door.locked) {
    addLog(state, 'Door is locked');
  }
  return false;
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

const killMonster = (state: GameState, monster: Monster, hero: Hero) => {
  state.dungeon.layout.monsters = state.dungeon.layout.monsters.filter((m) => m != monster);
  addLog(state, `${hero.name} killed ${monster.name}`);
  state.dungeon.killCount++;
  hero.experience += monster.experience;
}

const findMonsterAt = (state: GameState, target: Position) => {
  return state.dungeon.layout.monsters.find((monster) => isSamePosition(monster.position, target));
}

const hasNeighbouringHeroes = (state: GameState, hero: Actor) => {
  return findNeighbouringHeroes(state, hero)
    .filter((other) => other !== hero).length > 0;
}

const deadHeroes = (state: GameState): Hero[] => {
  return state.heroes.filter((hero) => hero.health <= 0);
}
