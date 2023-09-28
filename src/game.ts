import type {
  Actor,
  Door,
  Dungeon,
  GameState,
  Hero,
  Item,
  Layout,
  Position,
  Weapon,
} from './types';
import { Colour, ConditionType, ItemType, Level } from './types';
import { COLLAPSED, EMPTY, WALL } from './dungeon/DungeonLogic';
import { campaignIceDragonTreasure } from './campaigns/campaignIceDragonTreasure';
import { monsterActions } from './monsters/MonsterLogic';
import {
  levelUp,
  liveHeroes,
  replaceDeadHeroes,
  resetLiveHeroes,
  rewardLiveHeroes,
} from './hero/HeroLogic';
import {
  ATTACK_BONUS,
  RE_ROLL_ATTACK,
  resetOnNext,
  resetOnNextDungeon,
} from './items/ItemLogic';
import {
  drawNextEvent,
  getEventsForDungeon,
  eventEffects,
  resetEventEffects,
} from './events/EventsLogic';
import { browser } from '$app/environment';

export const save = (state: GameState) => {
  state.reRender = true;
  addLog(state, 'Game saved.');
  localStorage.setItem('state', JSON.stringify(state));
};

export const load = (): GameState | undefined => {
  const stateString = localStorage.getItem('state');
  if (stateString) {
    const state: GameState = JSON.parse(stateString) as GameState;
    state.currentActor = state.heroes.find(
      (hero) => hero.name === state.currentActor?.name,
    ) as Hero | undefined;
    addLog(state, 'Game loaded.');
    state.reRender = true;
    return state;
  }
};

export const init = (): GameState => {
  const state: GameState = {
    heroes: campaignIceDragonTreasure.heroes,
    dungeon: campaignIceDragonTreasure.dungeons[0],
    currentActor: campaignIceDragonTreasure.heroes[0] as Hero | undefined,
    actionLog: [
      `Playing '${campaignIceDragonTreasure.name}'`,
      'Game Initialised',
      'Each character has 2 actions. Move, Attack, Search or Pick Lock.',
      'Each character can move 3 steps per action.',
      'If another action is performed before moving 3 steps, the move is finished and both actions are consumed.',
      'The rules of this game are harsh and unfair.',
    ],
    itemDeck: shuffle(campaignIceDragonTreasure.itemDeck),
    magicItemDeck: shuffle(campaignIceDragonTreasure.magicItemDeck),
    settings: {
      cellSize: 48,
      debug: false,
    },
    eventDeck: getEventsForDungeon(campaignIceDragonTreasure.dungeons[0]),
    reRender: true,
  };
  resetLiveHeroes(state);
  if (browser) {
    localStorage.setItem('autosave', JSON.stringify(state));
  }
  return state;
};

const shuffle = (array: Item[]): Item[] => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

export const toArray = (row: string): string[] => {
  const array: string[] = [];
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
};

export const roll = (level: Level, dice: number) => {
  let results = [];
  for (let i = 0; i < dice; i++) {
    results.push(Math.floor(Math.random() * 6) + 1);
  }
  switch (level) {
    case Level.APPRENTICE:
      results = results.filter((result) => result === 5);
      break;
    case Level.KNIGHT:
    case Level.HERO:
      results = results.filter((result) => result >= 4);
      break;
    case Level.LORD:
    case Level.MASTER:
      results = results.filter((result) => result >= 3);
      break;
  }
  return results.length;
};

export const getEffectiveMaxMovement = (actor: Actor) =>
  actor.maxMovement - (actor.armour?.movementReduction ?? 0);

export const next = (state: GameState): GameState | undefined => {
  state.reRender = true;
  checkWinConditions(state);
  if (state.currentActor === undefined) return state;
  else {
    addLog(state, `${state.currentActor.name} ended their turn`);
    const currentIndex = liveHeroes(state).indexOf(state.currentActor);
    let nextIndex = currentIndex + 1;
    if (nextIndex === liveHeroes(state).length) {
      monsterActions(state);
      nextIndex = 0;
      resetOnNext(state);
    }
    if (liveHeroes(state).length === 0) {
      return resetLevel();
    }
    if (liveHeroes(state)[nextIndex].incapacitated) {
      addLog(
        state,
        `${liveHeroes(state)[nextIndex].name} is no longer incapacitated.`,
      );
      liveHeroes(state)[nextIndex].incapacitated = false;
      nextIndex++;
    }
    state.currentActor.actions = 2;
    state.currentActor.movement = getEffectiveMaxMovement(state.currentActor);
    state.currentActor = liveHeroes(state)[nextIndex];
    if (nextIndex === 0) {
      resetEventEffects(state);
      const event = drawNextEvent(state);
      eventEffects[event.effect](state, event);
    }
    addLog(state, `${state.currentActor.name} started their turn`);
  }
  return state;
};

export const resetLevel = (): GameState | undefined => {
  const loadedRawState = localStorage.getItem('autosave');
  if (loadedRawState) {
    const state: GameState = JSON.parse(loadedRawState) as GameState;
    state.reRender = true;

    replaceDeadHeroes(state);
    resetLiveHeroes(state);
    resetOnNextDungeon(state);
    resetOnNext(state);
    scrollTo(
      {
        x: state.dungeon.startingPositions[0].x,
        y: state.dungeon.startingPositions[0].y,
      },
      state.settings['cellSize'] as number,
    );
    state.currentActor = state.heroes.find(
      (hero) => hero.name === state.currentActor?.name,
    ) as Hero | undefined;
    addLog(
      state,
      'All the heroes fell in combat. But worry not, you can try again.',
    );
    return state;
  }
};

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
        condition.fulfilled = liveHeroes(state).some(
          (hero) =>
            hero.position.x === condition.targetCell?.x &&
            hero.position.y === condition.targetCell.y,
        );
        break;
      }
      case ConditionType.KILL_ALL_OF_TYPE: {
        condition.fulfilled = state.dungeon.layout.monsters
          .filter((monster) => monster.type === condition.targetMonsterType)
          .some((monster) => monster.health > 0);
        break;
      }
      case ConditionType.OPEN_DOOR: {
        condition.fulfilled =
          state.dungeon.layout.doors.find(
            (door) =>
              door.x === condition.targetCell?.x &&
              door.y === condition.targetCell?.y,
          )?.open ?? false;
        break;
      }
      case ConditionType.KILL_AT_LEAST: {
        condition.fulfilled =
          (condition.killMinCount ? condition.killMinCount : 0) <=
          state.dungeon.killCount;
        break;
      }
    }
  });
  state.dungeon.beaten = state.dungeon.winConditions
    .map((condition) => condition.fulfilled)
    .reduce((partial, fulfilled) => partial && fulfilled, true);
  if (state.dungeon.beaten) {
    addLog(state, 'All win conditions have been fulfilled');
    addLog(state, `You have cleared ${state.dungeon.name}`);
    if (state.dungeon.nextDungeon?.name) {
      addLog(
        state,
        `Press 'Next' to move on to the next level: ${state.dungeon.nextDungeon?.name}`,
      );
    }
  }
};

export const doorAsActor = (door: Door): Actor => ({
  health: 0,
  position: { x: door.x, y: door.y },
  defense: 0,
  experience: 0,
  actions: 0,
  movement: 0,
  maxMovement: 0,
  colour: Colour.Red,
  maxHealth: 0,
  name: 'Door',
  level: Level.APPRENTICE,
  incapacitated: false,
  weapon: {
    name: 'Trap',
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
});

export const isWalkable = (layout: Layout, x: number, y: number): boolean => {
  let walkable = true;
  if (x < 0 || x >= layout.grid[0].length || y < 0 || y >= layout.grid.length) {
    walkable = false;
  } else {
    const pit = layout.pits?.some((pit) => isSamePosition(pit, { x, y }));
    const pillar = layout.pillars?.some((pit) => isSamePosition(pit, { x, y }));
    const cell = findCell(layout.grid, x, y);
    if (pit || pillar || cell === EMPTY || cell === WALL) {
      walkable = false;
    }
  }
  return walkable;
};

export const isDiscovered = (dungeon: Dungeon, x: number, y: number) => {
  const cell = findCell(dungeon.layout.grid, x, y);
  if (!cell) return false;
  else return isRoomDiscovered(dungeon, cell);
};

export const isRoomDiscovered = (dungeon: Dungeon, cell: string) =>
  dungeon.discoveredRooms.includes(cell);

export const findCell = (grid: string[], x: number, y: number): string => {
  let c = '';
  grid.forEach((row, gY) => {
    toArray(row).forEach((cell, gX) => {
      if (gY === y && gX === x) c = cell;
    });
  });
  return c;
};

export const isNeighbouring = (position: Position, x: number, y: number) =>
  (position.x === x && position.y === y) ||
  (position.x === x - 1 && position.y === y) ||
  (position.x === x - 1 && position.y === y - 1) ||
  (position.x === x && position.y === y - 1) ||
  (position.x === x + 1 && position.y === y - 1) ||
  (position.x === x + 1 && position.y === y) ||
  (position.x === x + 1 && position.y === y + 1) ||
  (position.x === x && position.y === y + 1) ||
  (position.x === x - 1 && position.y === y + 1);

export const getDamageString = (
  damage: number,
  hits: number,
  shield: number,
  target: Actor,
) => {
  const defense = target.armour?.defense ?? target.defense;
  return `${damage} damage (${hits}-(${defense}+${shield})=${damage})`;
};

export const isSamePosition = (a: Position, b: Position) =>
  a.x === b.x && a.y === b.y;

export const addLog = (state: GameState, logMessage: string) => {
  state.actionLog = [logMessage, ...state.actionLog];
  state.reRender = true;
};

export const takeDamage = (
  state: GameState,
  source: Actor & { rangedWeapon?: Weapon },
  target: Actor,
  ranged: boolean,
) => {
  let weapon = source.weapon;
  if (ranged && source.rangedWeapon) {
    weapon = source.rangedWeapon;
  }
  let defense = 0;
  let shield = 0;
  if (!weapon.ignoresArmour) {
    defense = target.armour?.defense ?? target.defense;
  } else if (target.armour) {
    addLog(
      state,
      `${target.name}'s armour was useless against ${weapon.name} `,
    );
  }
  if (!weapon.ignoresShield) {
    shield = roll(target.level, target.shield?.dice ?? 0);
  } else if (target.shield) {
    addLog(
      state,
      `${target.name}'s shield was useless against ${weapon.name} `,
    );
  }
  const canReRoll = source.inventory
    .filter((item) => item?.properties?.[RE_ROLL_ATTACK])
    .some((item) => {
      addLog(
        state,
        `${source.name} used the effect of ${item.name} when attacking`,
      );
      return item.properties?.[RE_ROLL_ATTACK];
    });
  const attackBonus = source.inventory
    .filter((item) => item?.properties?.[ATTACK_BONUS])
    .map((item) => {
      addLog(
        state,
        `${source.name} used the effect of ${item.name} when attacking`,
      );
      return item.properties?.[ATTACK_BONUS] as number;
    })
    .reduce((partial, bonus) => partial + bonus, 0);
  const blindedSubtraction = source.blinded ? 1 : 0;
  const weakenedSubtraction = source.weakened ? 1 : 0;
  const elementalAddition = source.weapon.elemental ? 1 : 0;
  const buff = attackBonus + elementalAddition;
  const deBuff = blindedSubtraction + weakenedSubtraction;
  const hits = roll(source.level, weapon.dice + buff - deBuff);
  let damage = Math.max(hits - (defense + shield), 0);
  if (damage === 0 && canReRoll) {
    addLog(state, `${source.name} missed but got another chance`);
    damage = Math.max(hits - (defense + shield), 0);
  }
  target.health -= damage;
  addLog(
    state,
    `${source.name} attacked ${target.name} with ${
      weapon.name
    } for ${getDamageString(damage, hits, shield, target)}`,
  );
  if (target.health <= 0) {
    addLog(state, `${source.name} killed ${target.name}`);
    target.health = 0;
    target.level = Level.APPRENTICE;
  }
};

const scrollTo = (pos: Position, cellSize: number) => {
  const container = document.getElementById('gameBoardContainer');
  const canvas = document.getElementById('gameBoard');
  if (container && canvas) {
    const x = pos.x * cellSize;
    const y = pos.y * cellSize;
    const xMax = canvas.offsetWidth;
    const yMax = canvas.offsetHeight;
    container.scrollLeft = Math.round(x / xMax);
    container.scrollTop = Math.round(y / yMax);
  }
};

export const hasWon = (state: GameState) => {
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    state.dungeon = state.dungeon.nextDungeon;
    state.actionLog = ['You have reached ' + state.dungeon.name];
    state.eventDeck = getEventsForDungeon(state.dungeon);
    state.reRender = true;
    rewardLiveHeroes(state);
    levelUp(state);
    replaceDeadHeroes(state);
    resetLiveHeroes(state);
    resetOnNextDungeon(state);
    scrollTo(
      {
        x: state.dungeon.startingPositions[0].x,
        y: state.dungeon.startingPositions[0].y,
      },
      state.settings['cellSize'] as number,
    );
    localStorage.setItem('autosave', JSON.stringify(state));
  }
};

export const getDist = (a: Position, b: Position) =>
  Math.sqrt(Math.pow(a.x - b?.x, 2) + Math.pow(a.y - b?.y, 2));

export const hasLineOfSight = (
  startPosition: Position,
  targetPosition: Position,
  resolution: number,
  state: GameState,
  walking: boolean,
): boolean => {
  const startPixelPos = {
    x: startPosition.x * resolution - Math.floor(resolution / 2),
    y: startPosition.y * resolution - Math.floor(resolution / 2),
  };
  const targetPixelPos = {
    x: targetPosition.x * resolution - Math.floor(resolution / 2),
    y: targetPosition.y * resolution - Math.floor(resolution / 2),
  };
  return stepAlongLine(
    startPixelPos,
    startPosition,
    targetPixelPos,
    targetPosition,
    resolution,
    state,
    walking,
    [],
  );
};

export const stepAlongLine = (
  startPixelPos: Position,
  source: Position,
  targetPixelPos: Position,
  target: Position,
  resolution: number,
  state: GameState,
  walking: boolean,
  seenCells: Position[],
): boolean => {
  if (isNaN(startPixelPos.x) || isNaN(startPixelPos.y)) {
    return false;
  }
  const nextPixelPosition = normaliseVector(startPixelPos, targetPixelPos);
  const nextCellPosition = {
    x: Math.round(
      (nextPixelPosition.x + Math.floor(resolution / 2)) / resolution,
    ),
    y: Math.round(
      (nextPixelPosition.y + Math.floor(resolution / 2)) / resolution,
    ),
  };
  if (
    isNaN(nextCellPosition.x) ||
    isNaN(nextCellPosition.y) ||
    isNaN(nextPixelPosition.x) ||
    isNaN(nextPixelPosition.y)
  ) {
    return false;
  }
  const nextCell = findCell(
    state.dungeon.layout.grid,
    nextCellPosition.x,
    nextCellPosition.y,
  );
  const pit = state.dungeon.layout.pits?.some((pit) =>
    isSamePosition(pit, nextCellPosition),
  );
  const pillar = state.dungeon.layout.pillars?.some((pit) =>
    isSamePosition(pit, nextCellPosition),
  );
  const monster = state.dungeon.layout.monsters.some((monster) =>
    isSamePosition(monster.position, nextCellPosition),
  );
  const hero = liveHeroes(state)
    .filter((hero) => !isSamePosition(hero.position, source))
    .some((hero) => isSamePosition(hero.position, nextCellPosition));
  if (nextCellPosition.x === target.x && nextCellPosition.y === target.y) {
    seenCells.push(nextCellPosition);
    return true;
  } else if (
    pillar ||
    monster ||
    (!walking && hero) ||
    nextCell === WALL ||
    nextCell === COLLAPSED ||
    (walking && (pit || nextCell === EMPTY))
  ) {
    return false;
  } else {
    if (!(nextCellPosition.x === source.x && nextCellPosition.y === source.y)) {
      if (
        !seenCells.some(
          (c) => c.x === nextCellPosition.x && c.y === nextCellPosition.y,
        )
      ) {
        seenCells.push(nextCellPosition);
      }
    }
    return stepAlongLine(
      nextPixelPosition,
      source,
      targetPixelPos,
      target,
      resolution,
      state,
      walking,
      seenCells,
    );
  }
};

export const normaliseVector = (
  start: Position,
  target: Position,
): Position => {
  const xOffset = start.x;
  const yOffset = start.y;
  const x = target.x - xOffset;
  const y = target.y - yOffset;
  const nX = x / Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 1 / 2);
  const nY = y / Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 1 / 2);

  const newX = Math.round(nX + xOffset);
  const newY = Math.round(nY + yOffset);

  return { x: newX, y: newY };
};

export const findNeighbouringHeroes = (
  state: GameState,
  actor: Actor,
): Hero[] =>
  liveHeroes(state).filter((hero: Hero) =>
    isNeighbouring(actor.position, hero.position.x, hero.position.y),
  );
