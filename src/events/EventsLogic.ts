import type {
  Dungeon,
  GameState,
  TurnEvent
} from "../types";
import {
  Colour,
  MonsterType,
  SecretType
} from "../types";
import {
  isBlockedByHero,
  isBlockedByMonster,
  liveHeroes
} from "../hero/HeroLogic";
import {
  addLog,
  findCell,
  roll,
  toArray
} from "../game";
import {
  COLLAPSED,
  createMonster
} from "../dungeon/DungeonLogic";
import { events } from "../events/events";

export const getEventsForDungeon = (dungeon: Dungeon): TurnEvent[] => {
  if (dungeon.events) {
    return shuffleEvents(
      events.filter((event) => dungeon?.events?.includes(event.number))
    );
  } else {
    return shuffleEvents(events);
  }
}

export const drawNextEvent = (state: GameState): TurnEvent => {
  const unUsedEvents = state.eventDeck.filter((event) => !event.used);
  if (unUsedEvents.length > 0) {
    return unUsedEvents[0];
  } else {
    shuffleEvents(state.eventDeck);
    return drawNextEvent(state);
  }
}

export const eventEffects: {[index: string]: (state: GameState, event: TurnEvent) => void} = {
  sunStone: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const maxIndex = liveHeroes(state).length - 1;
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const hero = liveHeroes(state)[randomIndex];
    const heroCell = findCell(state.dungeon.layout.grid, hero.position.x, hero.position.y);
    state.dungeon.layout.monsters
      .filter((monster) => monster.type === MonsterType.TROLL)
      .filter((monster) => findCell(state.dungeon.layout.grid, monster.position.x, monster.position.y) === heroCell)
      .forEach((monster) => {
        addLog(state, `${monster.name} was killed by the Sun Stone`)
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
    liveHeroes(state).forEach((hero) => hero.blinded = true);
    event.used = true;
  },
  landslide: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const discoveredCorridors = state.dungeon.layout.corridors
      .filter((corridor) => !isRoomBlocked(state, corridor))
      .filter((corridor) => state.dungeon.discoveredRooms.includes(corridor));
    const maxCorridorIndex = discoveredCorridors.length - 1;
    const randomCorridor = state.dungeon.layout.corridors[maxCorridorIndex];
    state.dungeon.collapsedCorridor = randomCorridor;
    state.dungeon.layout.grid = state.dungeon.layout.grid
      .map((row) => row.replaceAll(randomCorridor, COLLAPSED));
    event.used = true;
  },
  foreSight: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const notDiscoveredSecret = state.dungeon.layout.secrets
      .filter((secret) => secret.type === SecretType.EQUIPMENT || secret.type === SecretType.MAGIC_ITEM)
      .filter((secret) => !secret.found)
      .filter((secret) => secret.item)
      .filter((secret) => {
        const secretRoom: string = findCell(state.dungeon.layout.grid, secret.position.x, secret.position.y) ?? '';
        return !state.dungeon.discoveredRooms.includes(secretRoom);
      });
    if (notDiscoveredSecret.length > 0) {
      const secret = state.dungeon.layout.secrets.pop();
      if (secret && secret.item) {
        addLog(state, `You sense the object is close to (${secret.position.x+2},${secret.position.y-1})`)
        state.dungeon.layout.items.push({
          item: secret.item,
          position: secret.position
        });
      }
    }
    event.used = true;
  }
}

const spawnRandomMonster = (state: GameState, monsterType: MonsterType) => {
  const activeMonsters = state.dungeon.layout.monsters
    .filter((monster) => monster.type === monsterType);
  const monsterCount = activeMonsters.length;
  if (monsterCount === 4) return;
  const maxRoomIndex = state.dungeon.discoveredRooms.length - 1;
  const randomIndex = Math.floor(Math.random() * maxRoomIndex);
  const randomRoom = state.dungeon.discoveredRooms[randomIndex];
  const colours = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Blue];
  activeMonsters.forEach((monster) => {
    const colourIndex = colours.indexOf(monster.colour);
    if (colourIndex !== -1) colours.splice(colourIndex, 1);
  });
  let hasSpawned = false;
  for (let y: number = 0; y < state.dungeon.layout.grid.length; y++) {
    const row = toArray(state.dungeon.layout.grid[y]);
    for (let x: number = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === randomRoom) {
        if (!isBlockedByHero(state, x, y) && !isBlockedByMonster(state,  x, y)) {
          state.dungeon.layout.monsters.push(
            createMonster(monsterType, colours[0], x, y)
          )
          hasSpawned = true;
          break;
        }
      }
    }
    if (hasSpawned) break;
  }
}

const eventDescriptionLog = (state: GameState, event: TurnEvent) => {
  addLog(state, `${event.description}`);
  addLog(state, `${event.number}. ${event.name}`);
}

const shuffleEvents = (array: TurnEvent[]): TurnEvent[] => {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  array.forEach((event) => event.used = false);
  return array;
}

const isRoomBlocked = (state: GameState, roomKey: string) => {
  const isBlocked: boolean[] = [];
  state.dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell, x) => {
      if (cell === roomKey) {
        isBlocked.push(isBlockedByHero(state, x, y) || isBlockedByMonster(state, x, y));
      }
    });
  });
  return isBlocked.some((blocked) => blocked);
}
