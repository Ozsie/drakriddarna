import type { Actor, Dungeon, GameState, TurnEvent, Weapon } from '../types';
import { Colour, ItemType, Level, MonsterType, SecretType } from '../types';
import {
  isBlockedByHero,
  isBlockedByMonster,
  liveHeroes,
} from '../hero/HeroLogic';
import {
  addLog,
  findCell,
  isRoomDiscovered,
  roll,
  takeDamage,
  toArray,
} from '../game';
import { COLLAPSED, createMonster } from '../dungeon/DungeonLogic';
import { events } from './events';
import { ACTIVE, onDrop, onPickup } from '../items/ItemLogic';

export const getEventsForDungeon = (dungeon: Dungeon): TurnEvent[] => {
  if (dungeon.events) {
    return shuffleEvents(
      events.filter((event) => dungeon?.events?.includes(event.number)),
    );
  } else {
    return shuffleEvents(events);
  }
};

export const drawNextEvent = (state: GameState): TurnEvent => {
  const unUsedEvents = state.eventDeck.filter((event) => !event.used);
  if (unUsedEvents.length > 0) {
    return unUsedEvents[0];
  } else {
    shuffleEvents(state.eventDeck);
    return drawNextEvent(state);
  }
};

export const eventEffects: {
  [index: string]: (state: GameState, event: TurnEvent) => void;
} = {
  sunStone: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const maxIndex = liveHeroes(state).length - 1;
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const hero = liveHeroes(state)[randomIndex];
    const heroCell = findCell(
      state.dungeon.layout.grid,
      hero.position.x,
      hero.position.y,
    );
    state.dungeon.layout.monsters
      .filter((monster) => monster.type === MonsterType.TROLL)
      .filter(
        (monster) =>
          findCell(
            state.dungeon.layout.grid,
            monster.position.x,
            monster.position.y,
          ) === heroCell,
      )
      .forEach((monster) => {
        addLog(state, `${monster.name} was killed by the Sun Stone`);
        monster.health = 0;
      });
    event.used = true;
  },
  theHungryTroll: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    spawnRandomMonster(state, MonsterType.TROLL);
    event.used = true;
  },
  timePortal: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    state.heroes.forEach((hero) => hero.actions++);
    event.used = true;
  },
  fountainOfYouth: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => {
      if (hero.health < hero.maxHealth) {
        const hits = roll(hero.level, 3);
        hero.health += Math.min(hits, hero.maxHealth - hero.health);
      }
    });
    event.used = true;
  },
  sleepingGasCloud: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => {
      hero.actions = Math.max(1, hero.actions - 1);
    });
    event.used = true;
  },
  theLostOrch: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    spawnRandomMonster(state, MonsterType.ORCH);
    event.used = true;
  },
  theDragonsBreath: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => (hero.blinded = true));
    event.used = true;
  },
  landslide: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const discoveredCorridors = state.dungeon.layout.corridors
      .filter((corridor) => !isRoomBlocked(state, corridor))
      .filter((corridor) => isRoomDiscovered(state.dungeon, corridor));
    const maxCorridorIndex = discoveredCorridors.length - 1;
    const randomCorridorIndex = Math.floor(Math.random() * maxCorridorIndex);
    const randomCorridor = discoveredCorridors[randomCorridorIndex];
    state.dungeon.collapsedCorridor = randomCorridor;
    state.dungeon.layout.grid = state.dungeon.layout.grid.map((row) =>
      row.replaceAll(randomCorridor, COLLAPSED),
    );
    event.used = true;
  },
  foreSight: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const notDiscoveredSecret = state.dungeon.layout.secrets
      .filter(
        (secret) =>
          secret.type === SecretType.EQUIPMENT ||
          secret.type === SecretType.MAGIC_ITEM,
      )
      .filter((secret) => !secret.found)
      .filter((secret) => secret.item)
      .filter((secret) => {
        const secretRoom: string =
          findCell(
            state.dungeon.layout.grid,
            secret.position.x,
            secret.position.y,
          ) ?? '';
        return !isRoomDiscovered(state.dungeon, secretRoom);
      });
    if (notDiscoveredSecret.length > 0) {
      const secret = state.dungeon.layout.secrets.pop();
      if (secret && secret.item) {
        addLog(
          state,
          `You sense the object is close to (${secret.position.x + 2},${
            secret.position.y - 1
          })`,
        );
        state.dungeon.layout.items.push({
          item: secret.item,
          position: secret.position,
        });
      }
    }
    event.used = true;
  },
  earthquake: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const room = getRandomRoom(state);
    const earthquakeWeapon: Weapon = {
      name: 'boulder',
      type: ItemType.WEAPON,
      value: 0,
      dice: 3,
      useHearHeroes: true,
      twoHanded: false,
      range: 1,
      amountInDeck: 0,
      ignoresShield: false,
      ignoresArmour: false,
    };
    const earthQuakeActor: Actor = {
      name: 'Earthquake',
      actions: 0,
      health: 0,
      maxMovement: 0,
      position: { x: 0, y: 0 },
      weapon: earthquakeWeapon,
      level: Level.APPRENTICE,
      maxHealth: 0,
      movement: 0,
      experience: 0,
      colour: Colour.Red,
      inventory: [],
      defense: 0,
    };
    state.dungeon.layout.monsters
      .filter((monster) => monster.type === MonsterType.TROLL)
      .filter(
        (monster) =>
          findCell(
            state.dungeon.layout.grid,
            monster.position.x,
            monster.position.y,
          ) === room,
      )
      .forEach((monster) => takeDamage(state, earthQuakeActor, monster, false));
    liveHeroes(state)
      .filter(
        (hero) =>
          findCell(
            state.dungeon.layout.grid,
            hero.position.x,
            hero.position.y,
          ) === room,
      )
      .forEach((hero) => takeDamage(state, earthQuakeActor, hero, false));
    event.used = true;
  },
  theMagicStorm: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const heroesWithMagicalItems = liveHeroes(state).filter((hero) =>
      hero.inventory
        .filter((item) => !item.disabled)
        .some((item) => item.type === ItemType.MAGIC),
    );

    if (heroesWithMagicalItems.length > 0) {
      const maxHeroIndex = heroesWithMagicalItems.length - 1;
      const randomHeroIndex = Math.floor(Math.random() * maxHeroIndex);
      const hero = heroesWithMagicalItems[randomHeroIndex];
      const magicItems = hero.inventory.filter(
        (item) => item.type === ItemType.MAGIC,
      );
      if (magicItems.length > 0) {
        const magicItemMaxIndex = magicItems.length - 1;
        const randomMagicItemIndex = Math.floor(
          Math.random() * magicItemMaxIndex,
        );
        const item = magicItems[randomMagicItemIndex];
        item.disabled = true;
        if (!item.properties?.[ACTIVE] && item.pickup && item.drop) {
          onDrop[item.drop](state, item, hero);
        }
      }
    }
    event.used = true;
  },
  theElementalWeapon: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const heroes = liveHeroes(state);
    const maxHeroIndex = heroes.length - 1;
    const randomHeroIndex = Math.floor(Math.random() * maxHeroIndex);
    const hero = heroes[randomHeroIndex];
    hero.weapon.elemental = true;
    event.used = true;
  },
  theOrchDrums: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    state.dungeon.layout.monsters
      .filter((monster) => monster.type === MonsterType.ORCH)
      .forEach((monster) => (monster.actions = 3));
    event.used = true;
  },
  theSymbolOfWeakness: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => (hero.weakened = true));
    event.used = true;
  },
};

const restoreDisabledItems = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.weapon.elemental)) {
    addLog(state, 'The magic storm calmed down');
    liveHeroes(state).forEach((hero) => {
      hero.inventory.forEach((item) => {
        if (!item.properties?.[ACTIVE] && item.pickup) {
          onPickup[item.pickup](state, item, hero);
        }
        item.disabled = false;
      });
    });
  }
};

export const resetEventEffects = (state: GameState) => {
  const unUsedEvents = state.eventDeck.filter((event) => !event.used);
  if (unUsedEvents.length === 0) {
    restoreElementalWeapon(state);
    restoreCorridor(state);
    restoreDisabledItems(state);
  }
  restoreWeakened(state);
  restoreBlinded(state);
};

const restoreCorridor = (state: GameState) => {
  const collapsed = state.dungeon.collapsedCorridor;
  if (collapsed) {
    addLog(state, 'The collapsed corridor cleared up.');
    state.dungeon.layout.grid = state.dungeon.layout.grid.map((row) =>
      row.replaceAll(COLLAPSED, collapsed),
    );
    state.dungeon.collapsedCorridor = undefined;
  }
};

const restoreBlinded = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.blinded)) {
    addLog(state, 'You light your torches again.');
    liveHeroes(state).forEach((hero) => (hero.blinded = false));
  }
};

const restoreElementalWeapon = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.weapon.elemental)) {
    addLog(state, 'The elemental magic died off.');
    liveHeroes(state).forEach((hero) => (hero.weapon.elemental = false));
  }
};

const restoreWeakened = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.weakened)) {
    addLog(state, 'Your strength returns to you.');
    liveHeroes(state).forEach((hero) => (hero.weakened = false));
  }
};

const getRandomRoom = (state: GameState) => {
  const maxRoomIndex = state.dungeon.discoveredRooms.length - 1;
  const randomIndex = Math.floor(Math.random() * maxRoomIndex);
  return state.dungeon.discoveredRooms[randomIndex];
};

const spawnRandomMonster = (state: GameState, monsterType: MonsterType) => {
  const activeMonsters = state.dungeon.layout.monsters.filter(
    (monster) => monster.type === monsterType,
  );
  const monsterCount = activeMonsters.length;
  if (monsterCount === 4) return;
  const randomRoom = getRandomRoom(state);
  const colours = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Blue];
  activeMonsters.forEach((monster) => {
    const colourIndex = colours.indexOf(monster.colour);
    if (colourIndex !== -1) colours.splice(colourIndex, 1);
  });
  let hasSpawned = false;
  for (let y = 0; y < state.dungeon.layout.grid.length; y++) {
    const row = toArray(state.dungeon.layout.grid[y]);
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === randomRoom) {
        if (!isBlockedByHero(state, x, y) && !isBlockedByMonster(state, x, y)) {
          state.dungeon.layout.monsters.push(
            createMonster(monsterType, colours[0], x, y),
          );
          hasSpawned = true;
          break;
        }
      }
    }
    if (hasSpawned) break;
  }
};

const eventDescriptionLog = (state: GameState, event: TurnEvent) => {
  addLog(state, `${event.description}`);
  addLog(state, `${event.number}. ${event.name}`);
};

const shuffleEvents = (array: TurnEvent[]): TurnEvent[] => {
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
  array.forEach((event) => (event.used = false));
  return array;
};

const isRoomBlocked = (state: GameState, roomKey: string) => {
  const isBlocked: boolean[] = [];
  state.dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell, x) => {
      if (cell === roomKey) {
        isBlocked.push(
          isBlockedByHero(state, x, y) || isBlockedByMonster(state, x, y),
        );
      }
    });
  });
  return isBlocked.some((blocked) => blocked);
};
