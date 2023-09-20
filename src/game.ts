import type {
  Actor,
  Door,
  Dungeon,
  GameState,
  Hero,
  Item,
  Layout,
  Position,
  Weapon
} from "./types";
import {
  Colour,
  ConditionType,
  ItemType,
  Level
} from "./types";
import {
  EMPTY,
  PILLAR,
  PIT,
  WALL
} from "./dungeon/DungeonLogic";
import { campaignIceDragonTreasure } from "./campaigns/campaignIceDragonTreasure";
import { monsterActions } from "./monsters/MonsterLogic";
import {
  levelUp,
  liveHeroes,
  replaceDeadHeroes,
  resetLiveHeroes,
  rewardLiveHeroes
} from "./hero/HeroLogic";
import { testingGrounds } from "./campaigns/dungeons/testingGrounds";
import { ATTACK_BONUS, RE_ROLL_ATTACK } from "./items/magicItems";

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
  const state: GameState = {
    heroes: campaignIceDragonTreasure.heroes,
    dungeon: testingGrounds,
    currentActor: campaignIceDragonTreasure.heroes[0],
    actionLog: [
      `Playing '${campaignIceDragonTreasure.name}'`,
      'Game Initialised',
      'Each character has 2 actions. Move, Attack, Search or Pick Lock.',
      'Each character can move 3 steps per action.',
      'If another action is performed before moving 3 steps, the move is finished and both actions are consumed.',
      'The rules of this game are harsh and unfair.'
    ],
    itemDeck: shuffle(campaignIceDragonTreasure.itemDeck),
    magicItemDeck: shuffle(campaignIceDragonTreasure.magicItemDeck),
  }
  resetLiveHeroes(state);
  return state;
}

const shuffle = (array: Item[]): Item[] => {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

export const toArray = (row: string): string[] => {
  let array: string[] = []
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
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

export const getEffectiveMaxMovement = (actor: Actor) => {
  return actor.maxMovement - (actor.armour?.movementReduction ?? 0);
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
    if (liveHeroes(state)[nextIndex].incapacitated) {
      addLog(state, `${liveHeroes(state)[nextIndex].name} is no longer incapacitated.`);
      liveHeroes(state)[nextIndex].incapacitated = false;
      nextIndex++;
    }
    state.currentActor.actions = 2;
    state.currentActor.movement = getEffectiveMaxMovement(state.currentActor);
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

export const doorAsActor = (door: Door): Actor => {
  return {
    health: 0,
    position: { x: door.x, y: door.y },
    defense: 0,
    experience: 0,
    actions: 0,
    movement: 0,
    maxMovement: 0,
    colour: Colour.Red,
    maxHealth: 0,
    name: "Door",
    level: Level.APPRENTICE,
    incapacitated: false,
    weapon: {
      name: "Trap",
      amountInDeck: 0,
      dice: door.trapAttacks,
      useHearHeroes: true,
      twoHanded: false,
      range: 1,
      type: ItemType.WEAPON,
      value: 0,
      ignoresShield: true,
      ignoresArmour: false,
    },
    inventory: [],
  };
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

export const getDamageString = (damage: number, hits: number, shield: number, target: Actor) => {
  const defense = target.armour?.defense ?? target.defense;
  return `${damage} damage (${hits}-(${defense}+${shield})=${damage})`;
}

export const isSamePosition = (a: Position, b: Position) => {
  return a.x === b.x && a.y === b.y;
}

export const addLog = (state: GameState, logMessage: string) => {
  state.actionLog = [logMessage, ...state.actionLog];
}

export const takeDamage = (state: GameState, source: Actor & { rangedWeapon?: Weapon }, target: Actor, ranged: boolean) => {
  let weapon = source.weapon;
  if (ranged && source.rangedWeapon) {
    weapon = source.rangedWeapon;
  }
  let defense = 0;
  let shield = 0;
  if (!weapon.ignoresArmour) {
    defense = target.armour?.defense ?? target.defense;
  } else if (target.armour) {
    addLog(state, `${target.name}'s armour was useless against ${weapon.name} `);
  }
  if (!weapon.ignoresShield) {
    shield = roll(target.level, target.shield?.dice ?? 0);
  } else if (target.shield) {
    addLog(state, `${target.name}'s shield was useless against ${weapon.name} `);
  }
  const canReRoll = source.inventory.some((item) => {
    addLog(state, `${source.name} used the effect of ${item.name} when attacking`);
    return item.properties?.[RE_ROLL_ATTACK];
  });
  const attackBonus = source.inventory
    .filter((item) => item?.properties?.[ATTACK_BONUS])
    .map((item) => {
      addLog(state, `${source.name} used the effect of ${item.name} when attacking`);
      return item.properties?.[ATTACK_BONUS] as number;
    })
    .reduce((partial, bonus) => partial + bonus, 0)
  const hits = roll(source.level, weapon.dice + attackBonus);
  let damage = Math.max(hits - (defense + shield), 0);
  if (damage === 0 && canReRoll) {
    addLog(state, `${source.name} missed but got another chance`);
    damage = Math.max(hits - (defense + shield), 0);
  }
  target.health -= damage;
  addLog(state, `${source.name} attacked ${target.name} with ${weapon.name} for ${getDamageString(damage, hits, shield, target)}`);
  if (target.health <= 0) {
    addLog(state, `${source.name} killed ${target.name}`);
    target.health = 0;
    target.level = Level.APPRENTICE;
  }
}

export const hasWon = (state: GameState) => {
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    state.dungeon = state.dungeon.nextDungeon;
    state.actionLog = ['You have reached ' + state.dungeon.name];
    rewardLiveHeroes(state);
    levelUp(state);
    replaceDeadHeroes(state);
    resetLiveHeroes(state);
  }
}

export const getDist = (a: Position, b: Position) => {
  return Math.sqrt(
    Math.pow(a.x - b?.x, 2) +
    Math.pow(a.y - b?.y, 2)
  );
}

export const stepAlongLine = (startPixelPos: Position, source: Position, targetPixelPos: Position, target: Position, state: GameState, seenCells: Position[]): boolean => {
  const nextPixelPosition = normaliseVector(startPixelPos, targetPixelPos);
  const nextCellPosition = { x: Math.round((nextPixelPosition.x + 24)/48), y: Math.round((nextPixelPosition.y + 24) / 48) };
  const nextCell = findCell(state.dungeon.layout.grid, nextCellPosition.x, nextCellPosition.y);
  if (nextCellPosition.x === target.x && nextCellPosition.y === target.y) {
    seenCells.push(nextCellPosition);
    return true;
  } else if (nextCell === WALL || nextCell === PILLAR) {
    return false;
  } else {
    if (!(nextCellPosition.x === source.x && nextCellPosition.y === source.y)) {
      if (!seenCells.some((c) => c.x === nextCellPosition.x && c.y === nextCellPosition.y)) {
        seenCells.push(nextCellPosition);
      }
    }
    return stepAlongLine(nextPixelPosition, source, targetPixelPos, target, state, seenCells);
  }
}

export const normaliseVector = (start: Position, target: Position): Position => {
  const xOffset = start.x;
  const yOffset = start.y;
  const x = (target.x-xOffset);
  const y = (target.y-yOffset);
  const nX = x/Math.pow(Math.pow(x,2) + Math.pow(y,2), (1/2));
  const nY = y/Math.pow(Math.pow(x,2) + Math.pow(y,2), (1/2));

  let newX = Math.round(nX + xOffset);
  let newY = Math.round(nY + yOffset);

  return { x: newX, y: newY };
}

export const findNeighbouringHeroes = (state: GameState, actor: Actor): Hero[] => {
  return liveHeroes(state).filter((hero: Hero) => isNeighbouring(actor.position, hero.position.x, hero.position.y));
}
