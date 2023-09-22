import type { Campaign, Dungeon, GameState, TurnEvent } from "../types";
import { Colour, MonsterType } from "../types";
import { isBlockedByHero, isBlockedByMonster, liveHeroes } from "../hero/HeroLogic";
import { addLog, findCell, roll, toArray } from "../game";
import { createMonster } from "../dungeon/DungeonLogic";

export const getEventsForDungeon = (campaign: Campaign, dungeon: Dungeon): TurnEvent[] => {
  if (dungeon.events) {
    return shuffleEvents(
      campaign.eventDeck.filter((event) => dungeon?.events?.includes(event.number))
    );
  } else {
    return shuffleEvents(campaign.eventDeck);
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
