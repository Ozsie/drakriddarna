import type {
  Shield,
  Armour,
  Actor,
  GameState,
  Hero,
  Monster,
  Door,
  Position,
  Item,
  Weapon,
} from '../types';
import { Colour, ItemType, Level, Side } from '../types';
import { weapons } from '../items/weapons';
import {
  addLog,
  doorAsActor,
  doReRender,
  findCell,
  findNeighbouringHeroes,
  getEffectiveMaxMovement,
  i18n,
  isDiscovered,
  isNeighbouring,
  isSamePosition,
  isWalkable,
  next,
  roll,
  takeDamage,
} from '../game';
import { checkForTrapDoor, searchForSecret } from '../secrets/SecretsLogic';
import { BREAK_LOCK, onDrop, onPickup } from '../items/ItemLogic';
import { COLLAPSED, EMPTY, WALL } from '../dungeon/DungeonLogic';

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
    position: { x: -1, y: -1 },
    weapon: weapons[0],
    incapacitated: false,
    inventory: [],
    isInventoryOpen: false,
  };
};

export const act = (direction: string, state: GameState) => {
  doReRender(state);
  const hero: Hero | undefined = state.currentActor;
  if (!hero || hero.actions === 0) {
    return;
  }
  const newPosition = { x: hero.position.x, y: hero.position.y };
  switch (direction) {
    case 'UL':
      newPosition.x = hero.position.x - 1;
      newPosition.y = hero.position.y - 1;
      break;
    case 'U':
      newPosition.y = hero.position.y - 1;
      break;
    case 'UR':
      newPosition.x = hero.position.x + 1;
      newPosition.y = hero.position.y - 1;
      break;
    case 'L':
      newPosition.x = hero.position.x - 1;
      break;
    case 'R':
      newPosition.x = hero.position.x + 1;
      break;
    case 'DL':
      newPosition.x = hero.position.x - 1;
      newPosition.y = hero.position.y + 1;
      break;
    case 'D':
      newPosition.y = hero.position.y + 1;
      break;
    case 'DR':
      newPosition.x = hero.position.x + 1;
      newPosition.y = hero.position.y + 1;
      break;
  }
  const blockedByHero = isBlockedByHero(state, newPosition.x, newPosition.y);
  const blockedByWall = !isWalkable(
    state.dungeon.layout,
    newPosition.x,
    newPosition.y,
  );
  const blockedByMonster = isBlockedByMonster(
    state,
    newPosition.x,
    newPosition.y,
  );
  if (!blockedByHero && !blockedByWall) {
    const discovered = isDiscovered(
      state.dungeon,
      newPosition.x,
      newPosition.y,
    );
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
    addLog(state, 'logs.heroAction.illegalMove', { hero: i18n(hero.name) });
  }
  if (!checkForTrapDoor(state)) {
    consumeActions(hero);
  }
};

export const pickLock = (state: GameState) => {
  doReRender(state);
  const hero = state.currentActor;
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, 'logs.heroAction.blinded', { hero: i18n(hero.name) });
    return;
  }
  if (!canAct(hero)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  const door = state.dungeon.layout.doors.find(
    (door) => door.x === hero.position.x && door.y === hero.position.y,
  );
  if (door && door.locked) {
    const result = roll(hero.level, 1);
    if (result >= 1) {
      door.locked = false;
      addLog(state, 'logs.heroAction.pickedLock', { hero: i18n(hero.name) });
    } else {
      addLog(state, 'logs.heroAction.failedToPickLock', {
        hero: i18n(hero.name),
      });
    }
    if (hero.actions > 1 && hero.movement < 3) {
      hero.actions -= 2;
    } else {
      hero.actions--;
    }
    hero.movement = getEffectiveMaxMovement(hero);
    if (hero.actions == 0) {
      hero.movement = 0;
    }
  }
};

export const resetLiveHeroes = (state: GameState) => {
  doReRender(state);
  state.heroes.forEach((hero, index) => {
    hero.position = state.dungeon.startingPositions[index];
    hero.movement = getEffectiveMaxMovement(hero);
    hero.actions = 2;
    hero.health = hero.maxHealth;
  });
};

export const liveHeroes = (state: GameState): Hero[] =>
  state.heroes.filter((hero) => hero.health > 0).map((hero) => hero as Hero);

export const endAction = (state: GameState) => {
  doReRender(state);
  const hero = state.currentActor;
  if (!hero) return;
  hero.actions--;
  hero.movement = getEffectiveMaxMovement(hero);
  if (hero.actions === 0) {
    next(state);
  }
};

export const canAct = (hero: Actor) => {
  if (hero.movement < getEffectiveMaxMovement(hero)) {
    return hero.actions > 1;
  }
  return hero.actions > 0;
};

export const openDoor = (
  hero: Hero,
  state: GameState,
  newX: number,
  newY: number,
) => {
  doReRender(state);
  const target = findCell(state.dungeon.layout.grid, newX, newY);
  if (target && ![WALL, EMPTY, COLLAPSED].includes(target))
    state.dungeon.discoveredRooms.push(target);
  move(hero, state, hero.position.x, hero.position.y, 1);
  addLog(state, 'logs.heroAction.openedDoor', { hero: i18n(hero.name) });
};

export const attack = (hero: Hero, state: GameState, target: Position) => {
  doReRender(state);
  if (hero.actions === 1 && hero.movement < hero.maxMovement) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  if (!hero.weapon.useHearHeroes && hasNeighbouringHeroes(state, hero)) {
    addLog(state, 'logs.heroAction.notNearFriend', {
      hero: i18n(hero.name),
      weapon: i18n(hero.weapon.name),
    });
    return;
  }

  const monster = findMonsterAt(state, target);
  if (monster) {
    takeDamage(state, hero, monster, false);
    if (monster.health <= 0) {
      killMonster(state, monster, hero);
    }
    if (hero.actions > 1 && hero.movement < 3) {
      hero.actions -= 2;
    } else {
      hero.actions--;
    }
  }
};

export const search = (state: GameState) => {
  doReRender(state);
  const hero: Actor | undefined = state.currentActor;
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, 'logs.heroAction.blinded', { hero: i18n(hero.name) });
    return;
  }
  if (!canAct(hero)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  searchForSecret(state);
  if (hero.actions > 1 && hero.movement < getEffectiveMaxMovement(hero)) {
    hero.actions -= 2;
  } else {
    hero.actions--;
  }
  if (hero.actions == 0) {
    hero.movement = 0;
  }
};

export const isBlockedByMonster = (
  state: GameState,
  newX: number,
  newY: number,
) =>
  state.dungeon.layout.monsters.some(
    (monster) =>
      monster.position.x === newX &&
      monster.position.y === newY &&
      monster.health > 0,
  );

export const isBlockedByHero = (state: GameState, newX: number, newY: number) =>
  liveHeroes(state).some(
    (hero) => hero.position.x === newX && hero.position.y === newY,
  );

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
};

export const levelUp = (state: GameState) => {
  doReRender(state);
  liveHeroes(state).forEach((hero) => {
    const currentLevel = hero.level;
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
      addLog(state, 'logs.heroAction.leveledUp', {
        hero: i18n(hero.name),
        level: i18n(`content.level.${hero.level}`),
      });
    }
  });
};

export const rewardLiveHeroes = (state: GameState) => {
  liveHeroes(state).forEach((hero) => (hero.experience += 1));
};

export const replaceDeadHeroes = (state: GameState) => {
  deadHeroes(state).forEach((hero) => {
    hero.experience = 0;
    hero.health = hero.maxHealth;
    hero.movement = hero.maxMovement;
    hero.actions = 2;
  });
};

export const canOpenDoor = (hero: Hero, canBreakDoor: boolean, door: Door) =>
  !door.open &&
  !door.hidden &&
  (!door.locked || (door.locked && canBreakDoor)) &&
  hero.movement > 0;

export const checkForNote = (state: GameState, hero: Hero) => {
  const note = state.dungeon.layout.notes.find((note) =>
    isSamePosition(note.position, hero.position),
  );
  if (note) {
    const onHiddenDoor = state.dungeon.layout.doors.some(
      (door) =>
        door.hidden &&
        isSamePosition(note.position, {
          x: door.x,
          y: door.y,
        }),
    );
    if (!onHiddenDoor) {
      addLog(state, 'logs.heroAction.reads', {
        hero: i18n(hero.name),
        note: i18n(note.message),
      });
      note.found = true;
      note.foundOn = state.turnCount;
    }
  }
};

export const checkForNextToMonster = (
  state: GameState,
  hero: Hero,
): boolean => {
  const nextToMonster = state.dungeon.layout.monsters.some((monster) =>
    isNeighbouring(hero.position, monster.position.x, monster.position.y),
  );
  if (nextToMonster) {
    addLog(state, 'logs.heroAction.walkedByMonster', { hero: i18n(hero.name) });
  }
  return nextToMonster;
};

export const dropItem = (state: GameState, item: Item, actor: Actor) => {
  addLog(state, 'logs.heroAction.drop', {
    hero: i18n(actor.name),
    item: i18n(item.name),
  });
  state.dungeon.layout.items.push({
    item,
    position: actor.position,
  });
  if (item && item.drop) {
    onDrop[item.drop](state, item, actor);
  }
};

export const pickupItem = (state: GameState, item: Item, hero: Hero) => {
  switch (item.type) {
    case ItemType.ARMOUR:
      if (hero.armour) dropItem(state, hero.armour, hero);
      hero.armour = item as Armour;
      break;
    case ItemType.SHIELD:
      if (hero.shield) dropItem(state, hero.shield, hero);
      hero.shield = item as Shield;
      break;
    case ItemType.WEAPON:
      if (hero.weapon) dropItem(state, hero.weapon, hero);
      hero.weapon = item as Weapon;
      break;
    default:
      hero.inventory.push(item);
      break;
  }
  if (item && item.pickup) {
    const pickup = onPickup[item.pickup];
    pickup(state, item, hero);
  }
};

const move = (
  hero: Hero,
  state: GameState,
  newX: number,
  newY: number,
  cost: number,
) => {
  hero.position.x = newX;
  hero.position.y = newY;
  checkForNote(state, hero);
  const nextToMonster = checkForNextToMonster(state, hero);
  if (nextToMonster) {
    hero.movement = 0;
  } else {
    hero.movement -= cost;
  }
};

const moveOverDoor = (
  state: GameState,
  hero: Hero,
  newX: number,
  newY: number,
) => {
  const door = state.dungeon.layout.doors.find(
    (door) => door.x === hero.position.x && door.y === hero.position.y,
  );
  const canBreakLock = hero.inventory.some(
    (item) => item && item.properties?.[BREAK_LOCK],
  );

  if (door && canOpenDoor(hero, canBreakLock, door)) {
    if (door.locked && canBreakLock)
      addLog(state, 'logs.heroAction.brokeLock', { hero: i18n(hero.name) });
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
    addLog(state, 'logs.heroAction.locked');
  }
  return false;
};

const openSide = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Side | undefined => {
  if (fromX === toX) {
    if (fromY > toY) return Side.UP;
    if (fromY < toY) return Side.DOWN;
  }
  if (fromY === toY) {
    if (fromX > toX) return Side.LEFT;
    if (fromX < toX) return Side.RIGHT;
  }
};

const killMonster = (state: GameState, monster: Monster, hero: Hero) => {
  state.dungeon.layout.monsters = state.dungeon.layout.monsters.filter(
    (m) => m != monster,
  );
  state.dungeon.killCount++;
  hero.experience += monster.experience;
};

const findMonsterAt = (state: GameState, target: Position) =>
  state.dungeon.layout.monsters.find((monster) =>
    isSamePosition(monster.position, target),
  );

const hasNeighbouringHeroes = (state: GameState, hero: Actor) =>
  findNeighbouringHeroes(state, hero).filter((other) => other !== hero).length >
  0;

const deadHeroes = (state: GameState): Hero[] =>
  state.heroes.filter((hero) => hero.health <= 0).map((hero) => hero as Hero);
