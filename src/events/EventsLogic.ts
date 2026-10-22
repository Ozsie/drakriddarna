import type {
  Actor,
  Dungeon,
  GameEvent,
  GameState,
  TurnEvent,
  Weapon,
} from '../types';
import {
  assertNever,
  CellAlignment,
  Colour,
  ItemType,
  Level,
  LightEffect,
  MonsterType,
  SecretType,
} from '../types';
import {
  isBlockedByHero,
  isBlockedByMonster,
  liveHeroes,
  getPartyAverageLevel,
} from '../hero/HeroLogic';
import {
  addLog,
  createIndicator,
  distanceInGrid,
  getDifficulty,
  getEarliestMonsterEventRound,
  getEffectiveMaxHealth,
  getEventMinSpawnDistance,
  hasLineOfSight,
  i18n,
  isPartyBelowHalfHealth,
} from '../core';
import { roll } from '../core';
import { findCell, isRoomDiscovered, toArray } from '../core';
import { takeDamage } from '../core';
import { COLLAPSED, createLight, createMonster } from '../dungeon/DungeonLogic';
import { events } from './events';
import { ACTIVE, onDrop, onPickup } from '../items/ItemLogic';
import { findVisibleMonsters } from '../monsters/MonsterLogic';
import { getMonsterTemplate } from '../monsters/MonsterRegistry';
import { soundEffectManager } from '../audio';

export const getEventsForDungeon = (
  dungeon: Dungeon,
  campaignEvents: TurnEvent[] = [],
): TurnEvent[] => {
  const eventPool = [...events, ...campaignEvents];
  if (dungeon.events) {
    return shuffleEvents(
      eventPool.filter((event) => dungeon?.events?.includes(event.number)),
    );
  } else {
    return shuffleEvents(eventPool);
  }
};

export const drawNextEvent = (state: GameState): TurnEvent => {
  const unUsedEvents = state.eventDeck.filter((event) => !event.used);
  if (unUsedEvents.length === 0) {
    shuffleEvents(state.eventDeck);
    return drawNextEvent(state);
  }

  const difficulty = getDifficulty(state);
  if (difficulty?.events?.onEventDrawn) {
    const customResult = difficulty.events.onEventDrawn(unUsedEvents[0], state);
    if (customResult !== null && customResult !== undefined) {
      return customResult;
    }
    // If hook returned null, mark current event as skipped/used or skip to next event if available
    if (customResult === null) {
      unUsedEvents[0].used = true;
      return drawNextEvent(state);
    }
  }

  const wasPlayedPreviousRound =
    state.previousEvent?.id === 'fountain_of_youth' ||
    (!state.previousEvent && state.currentEvent?.id === 'fountain_of_youth');

  if (isPartyBelowHalfHealth(state) && !wasPlayedPreviousRound) {
    const hasFountain = state.eventDeck.some(
      (event) => event.id === 'fountain_of_youth',
    );
    if (hasFountain && Math.random() < 0.5) {
      selectNextEvent(state, 'fountain_of_youth');
      return state.eventDeck[0];
    }
  }

  return unUsedEvents[0];
};

export const shuffleEventDeck = (state: GameState): void => {
  shuffleEvents(state.eventDeck);
};

export const selectNextEvent = (
  state: GameState,
  eventId: string | undefined,
): void => {
  const selectedIndex = state.eventDeck.findIndex(
    (event) => event.id === eventId,
  );
  if (selectedIndex === -1) return;
  const [selectedEvent] = state.eventDeck.splice(selectedIndex, 1);
  selectedEvent.used = false;
  state.eventDeck.unshift(selectedEvent);
};

export const eventEffects: Record<
  string,
  (state: GameState, event: TurnEvent) => void
> = {
  sunStone: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const maxIndex = liveHeroes(state).length;
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const hero = liveHeroes(state)[randomIndex];
    const heroCell = findCell(
      state.dungeon.layout.grid,
      hero.position.x,
      hero.position.y,
    );
    // Blinding golden flash, lingering until the round is reset.
    state.eventLights = [
      ...(state.eventLights ?? []),
      createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
        id: 'sun_stone_light',
        color: '#FFE9A0',
        radius: 3,
        intensity: 0.6,
        softness: 0.4,
        effect: LightEffect.BLINK,
        rate: 1,
        enabled: true,
      }),
    ];
    findVisibleMonsters(state)
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
        addLog(state, 'logs.events.sunStone', { monster: i18n(monster.name) });
        const remainingHealth = monster.health;
        monster.health = 0;
        if (!state.damageIndicators) {
          state.damageIndicators = [];
        }
        state.damageIndicators.push(
          createIndicator(remainingHealth, monster.position, {
            effect: 'crit',
          }),
        );
      });
    event.used = true;
  },
  theHungryTroll: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const earliestRound = getEarliestMonsterEventRound(state);
    const currentRound = (state.turnCount ?? 0) + 1;
    if (currentRound < earliestRound) {
      event.used = true;
      return;
    }
    const difficulty = getDifficulty(state);
    const skipLowHealth =
      difficulty?.events?.skipHungryTrollBelowHalfHealth ??
      (difficulty?.id === 'easy' || difficulty?.id === 'normal');
    if (skipLowHealth && isPartyBelowHalfHealth(state)) {
      event.used = true;
      return;
    }
    const avgLevel = getPartyAverageLevel(state);
    const visibleTrolls = findVisibleMonsters(state).filter(
      (monster) => monster.type === MonsterType.TROLL,
    );
    let maxVisibleTrolls = 4;
    if (avgLevel === Level.APPRENTICE) {
      maxVisibleTrolls = 1;
    } else if (avgLevel === Level.KNIGHT) {
      maxVisibleTrolls = 2;
    }
    if (visibleTrolls.length >= maxVisibleTrolls) {
      event.used = true;
      return;
    }
    spawnRandomMonster(state, MonsterType.TROLL);
    event.used = true;
  },
  timePortal: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    if (state.currentActor) {
      state.currentActor.actions++;
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(
          i18n('content.indicators.plusAction', { actions: '1' }),
          state.currentActor.position,
          {
            color: '#7373ec',
            effect: 'float',
          },
        ),
      );
    }
    state.roundActionsDelta = (state.roundActionsDelta ?? 0) + 1;
    event.used = true;
  },
  fountainOfYouth: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    // The magic node bathes the whole party in a green glow, lingering
    // until the round is reset.
    if (event.type === 'MAGIC_NODE') {
      state.eventLights = [
        ...(state.eventLights ?? []),
        ...liveHeroes(state).map((hero) =>
          createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
            id: `magic_node_light_${hero.position.x}_${hero.position.y}`,
            color: '#7CFC9A',
            radius: 2,
            intensity: 0.4,
            softness: 0.4,
            effect: LightEffect.PULSE,
            rate: 0.6,
            enabled: true,
          }),
        ),
      ];
    }
    const healthModifier = getDifficulty(state).modifiers.health;
    liveHeroes(state).forEach((hero) => {
      const maxHealth = getEffectiveMaxHealth(hero, healthModifier);
      if (hero.health < maxHealth) {
        const hits = roll(hero.level, 3);
        const recoveredHealth = Math.min(hits, maxHealth - hero.health);
        hero.health += recoveredHealth;
        if (!state.damageIndicators) {
          state.damageIndicators = [];
        }
        state.damageIndicators.push(
          createIndicator(recoveredHealth, hero.position, {
            color: '#0ab44e',
            effect: 'fade',
          }),
        );
      }
    });
    event.used = true;
  },
  sleepingGasCloud: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    if (state.currentActor) {
      state.currentActor.actions = Math.max(1, state.currentActor.actions - 1);
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(
          i18n('content.indicators.minusAction', { actions: '1' }),
          state.currentActor.position,
          {
            color: '#ff3333',
            effect: 'float',
          },
        ),
      );
    }
    // A greenish cloud of sleeping gas fills every room where a live hero
    // stands (one cloud per room — gas fills its whole room), until the
    // round is reset.
    const liveParty = liveHeroes(state);
    const gasRooms = new Set<string>();
    liveParty.forEach((hero) => {
      const room = findCell(
        state.dungeon.layout.grid,
        hero.position.x,
        hero.position.y,
      );
      if (room) {
        gasRooms.add(room);
      }
    });
    state.eventLights = [
      ...(state.eventLights ?? []),
      ...[...gasRooms]
        .map((room) =>
          liveParty.find(
            (hero) =>
              findCell(
                state.dungeon.layout.grid,
                hero.position.x,
                hero.position.y,
              ) === room,
          ),
        )
        .filter((hero): hero is NonNullable<typeof hero> => Boolean(hero))
        .map((hero) =>
          createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
            id: `sleeping_gas_light_${findCell(
              state.dungeon.layout.grid,
              hero.position.x,
              hero.position.y,
            )}`,
            color: '#7CB96B',
            intensity: 0.3,
            softness: 0.8,
            effect: LightEffect.GAS,
            rate: 0.5,
            enabled: true,
          }),
        ),
    ];
    state.roundActionsDelta = (state.roundActionsDelta ?? 0) - 1;
    event.used = true;
  },
  theLostOrc: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const earliestRound = getEarliestMonsterEventRound(state);
    const currentRound = (state.turnCount ?? 0) + 1;
    if (currentRound < earliestRound) {
      event.used = true;
      return;
    }
    spawnRandomMonster(state, MonsterType.ORC);
    event.used = true;
  },
  theLostOrch: (state: GameState, event: TurnEvent) => {
    eventEffects.theLostOrc(state, event);
  },
  theDragonsBreath: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => {
      hero.blinded = true;
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(i18n('content.indicators.blinded'), hero.position, {
          color: '#e69500',
          effect: 'float',
        }),
      );
    });
    event.used = true;
  },
  landslide: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const discoveredCorridors = state.dungeon.layout.corridors
      .filter((corridor) => !isRoomBlocked(state, corridor))
      .filter((corridor) => isRoomDiscovered(state.dungeon, corridor));
    const maxCorridorIndex = discoveredCorridors.length;
    const randomCorridorIndex = Math.floor(Math.random() * maxCorridorIndex);
    const randomCorridor = discoveredCorridors[randomCorridorIndex];
    state.dungeon.collapsedCorridor = randomCorridor;
    state.dungeon.layout.grid = state.dungeon.layout.grid.map((row) =>
      row.replaceAll(randomCorridor, COLLAPSED),
    );
    event.used = true;
  },
  foresight: (state: GameState, event: TurnEvent) => {
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
        addLog(state, 'logs.events.foreSight', {
          x: `${secret.position.x + 2}`,
          y: `${secret.position.y - 1}`,
        });
        state.dungeon.layout.items.push({
          item: secret.item,
          position: secret.position,
        });
      }
    }
    event.used = true;
  },
  foreSight: (state: GameState, event: TurnEvent) => {
    eventEffects.foresight(state, event);
  },
  earthquake: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const room = getRandomRoom(state);
    const earthquakeWeapon: Weapon = {
      id: 'boulder',
      name: 'boulder',
      nameTranslationKey: 'boulder',
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
      id: 'earthquake',
      name: 'Earthquake',
      nameTranslationKey: 'Earthquake',
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
    findVisibleMonsters(state)
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
        .filter((item) => item && !item.disabled)
        .some((item) => item.type === ItemType.MAGIC),
    );

    if (heroesWithMagicalItems.length > 0) {
      const maxHeroIndex = heroesWithMagicalItems.length;
      const randomHeroIndex = Math.floor(Math.random() * maxHeroIndex);
      const hero = heroesWithMagicalItems[randomHeroIndex];
      const magicItems = hero.inventory.filter(
        (item) => item && item.type === ItemType.MAGIC,
      );
      if (magicItems.length > 0) {
        const magicItemMaxIndex = magicItems.length;
        const randomMagicItemIndex = Math.floor(
          Math.random() * magicItemMaxIndex,
        );
        const item = magicItems[randomMagicItemIndex];
        item.disabled = true;
        if (item && !item.properties?.[ACTIVE] && item.pickup && item.drop) {
          const drop = onDrop[item.drop];
          if (drop) drop(state, item, hero);
        }
      }
    }
    event.used = true;
  },
  theElementalWeapon: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const heroes = liveHeroes(state);
    const maxHeroIndex = heroes.length;
    const randomHeroIndex = Math.floor(Math.random() * maxHeroIndex);
    const hero = heroes[randomHeroIndex];
    if (hero) {
      hero.weapon.elemental = true;
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(i18n('content.indicators.elemental'), hero.position, {
          color: '#FCFF4F',
          effect: 'crit',
        }),
      );
    }
    event.used = true;
  },
  theOrcDrums: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const visibleOrcs = findVisibleMonsters(state).filter(
      (monster) => monster.type === MonsterType.ORC,
    );
    if (visibleOrcs.length >= 4) {
      event.used = true;
      return;
    }
    visibleOrcs.forEach((monster) => {
      monster.actions = 3;
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(
          i18n('content.indicators.moreActions'),
          monster.position,
          {
            color: '#ff3333',
            effect: 'bounce',
          },
        ),
      );
    });
    event.used = true;
  },
  theOrchDrums: (state: GameState, event: TurnEvent) => {
    eventEffects.theOrcDrums(state, event);
  },
  theSymbolOfWeakness: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    liveHeroes(state).forEach((hero) => {
      hero.weakened = true;
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(i18n('content.indicators.weakened'), hero.position, {
          color: '#cc33ff',
          effect: 'float',
        }),
      );
    });
    event.used = true;
  },
  theHexagram: (state: GameState, event: TurnEvent) => {
    eventDescriptionLog(state, event);
    const heroesInDiscoveredRooms = liveHeroes(state).filter((hero) => {
      const room = findCell(
        state.dungeon.layout.grid,
        hero.position.x,
        hero.position.y,
      );
      return room && isRoomDiscovered(state.dungeon, room);
    });
    if (heroesInDiscoveredRooms.length > 0) {
      const maxHeroIndex = heroesInDiscoveredRooms.length;
      const randomHeroIndex = Math.floor(Math.random() * maxHeroIndex);
      const hero = heroesInDiscoveredRooms[randomHeroIndex];
      state.dungeon.portal = { x: hero.position.x, y: hero.position.y };
      addLog(state, 'logs.events.hexagram', {
        x: `${hero.position.x}`,
        y: `${hero.position.y}`,
      });
    }
    event.used = true;
  },
};

export const registerEventEffect = (
  key: string,
  handler: (state: GameState, event: TurnEvent) => void,
): void => {
  eventEffects[key] = handler;
};

export const executeGameEvent = (state: GameState, event: GameEvent): void => {
  switch (event.type) {
    case 'SUN_STONE':
      eventEffects.sunStone(state, event);
      break;
    case 'HUNGRY_TROLL':
      eventEffects.theHungryTroll(state, event);
      break;
    case 'TIME_PORTAL':
      eventEffects.timePortal(state, event);
      break;
    case 'FOUNTAIN_OF_YOUTH':
      eventEffects.fountainOfYouth(state, event);
      break;
    case 'SLEEPING_GAS_CLOUD':
      eventEffects.sleepingGasCloud(state, event);
      break;
    case 'LOST_ORC':
      eventEffects.theLostOrc(state, event);
      break;
    case 'DRAGONS_BREATH':
      eventEffects.theDragonsBreath(state, event);
      break;
    case 'LANDSLIDE':
      eventEffects.landslide(state, event);
      break;
    case 'MAGIC_NODE':
      eventEffects.fountainOfYouth(state, event);
      break;
    case 'FORESIGHT':
      eventEffects.foresight(state, event);
      break;
    case 'EARTHQUAKE':
      eventEffects.earthquake(state, event);
      break;
    case 'MAGIC_STORM':
      eventEffects.theMagicStorm(state, event);
      break;
    case 'ELEMENTAL_WEAPON':
      eventEffects.theElementalWeapon(state, event);
      break;
    case 'ORC_DRUMS':
      eventEffects.theOrcDrums(state, event);
      break;
    case 'SYMBOL_OF_WEAKNESS':
      eventEffects.theSymbolOfWeakness(state, event);
      break;
    case 'HEXAGRAM':
      eventEffects.theHexagram(state, event);
      break;
    default:
      assertNever(event);
  }
};

const restoreDisabledItems = (state: GameState) => {
  if (
    liveHeroes(state).some((hero) =>
      hero.inventory.some((item) => item && item.disabled),
    )
  ) {
    addLog(state, 'logs.events.magicStormRestored');
    liveHeroes(state).forEach((hero) => {
      hero.inventory.forEach((item) => {
        if (item && item.disabled) {
          if (!item.properties?.[ACTIVE] && item.pickup) {
            const pickup = onPickup[item.pickup];
            if (pickup) pickup(state, item, hero);
          }
          item.disabled = false;
        }
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
  restoreOrcDrums(state);
  state.roundActionsDelta = 0;
  state.eventLights = [];
};

const restoreOrcDrums = (state: GameState) => {
  state.dungeon.layout.monsters
    .filter((monster) => monster.type === MonsterType.ORC)
    .forEach((monster) => {
      const template = getMonsterTemplate(monster.type);
      monster.actions = template?.actions ?? 2;
    });
};

const restoreCorridor = (state: GameState) => {
  const collapsed = state.dungeon.collapsedCorridor;
  if (collapsed) {
    addLog(state, 'logs.events.landslideRestored');
    state.dungeon.layout.grid = state.dungeon.layout.grid.map((row) =>
      row.replaceAll(COLLAPSED, collapsed),
    );
    state.dungeon.collapsedCorridor = undefined;
  }
};

const restoreBlinded = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.blinded)) {
    addLog(state, 'logs.events.blindedRestored');
    liveHeroes(state).forEach((hero) => (hero.blinded = false));
  }
};

const restoreElementalWeapon = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.weapon.elemental)) {
    addLog(state, 'logs.events.elementalWeaponRestored');
    liveHeroes(state).forEach((hero) => (hero.weapon.elemental = false));
  }
};

const restoreWeakened = (state: GameState) => {
  if (liveHeroes(state).some((hero) => hero.weakened)) {
    addLog(state, 'logs.events.weakenedRestored');
    liveHeroes(state).forEach((hero) => (hero.weakened = false));
  }
};

const getRandomRoom = (state: GameState) => {
  const maxRoomIndex = state.dungeon.discoveredRooms.length;
  const randomIndex = Math.floor(Math.random() * maxRoomIndex);
  return state.dungeon.discoveredRooms[randomIndex];
};

const spawnRandomMonster = (state: GameState, monsterType: MonsterType) => {
  const activeMonsters = findVisibleMonsters(state).filter(
    (monster) => monster.type === monsterType,
  );
  const monsterCount = activeMonsters.length;
  if (monsterCount >= 4) return;
  const colours = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Blue];
  activeMonsters.forEach((monster) => {
    const colourIndex = colours.indexOf(monster.colour);
    if (colourIndex !== -1) colours.splice(colourIndex, 1);
  });

  const minDistance = getEventMinSpawnDistance(state);
  const heroes = liveHeroes(state);

  const isEligibleCell = (x: number, y: number) => {
    if (isBlockedByHero(state, x, y) || isBlockedByMonster(state, x, y)) {
      return false;
    }
    if (minDistance > 0 && heroes.length > 0) {
      const farEnough = heroes.every(
        (hero) => distanceInGrid(hero.position, { x, y }) >= minDistance,
      );
      if (!farEnough) return false;
    }
    return true;
  };

  const discoveredRooms = state.dungeon.discoveredRooms;
  if (!discoveredRooms || discoveredRooms.length === 0) return;

  const candidateCells: { x: number; y: number }[] = [];

  for (let y = 0; y < state.dungeon.layout.grid.length; y++) {
    const row = toArray(state.dungeon.layout.grid[y]);
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (discoveredRooms.includes(cell) && isEligibleCell(x, y)) {
        candidateCells.push({ x, y });
      }
    }
  }

  if (candidateCells.length === 0) return;

  const outOfLosCells = candidateCells.filter((cell) =>
    heroes.every(
      (hero) => !hasLineOfSight(hero.position, cell, 48, state, false),
    ),
  );
  const pool = outOfLosCells.length > 0 ? outOfLosCells : candidateCells;
  const chosenCell = pool[0];

  const monster = createMonster(
    monsterType,
    colours[0],
    chosenCell.x,
    chosenCell.y,
  );
  monster.exhausted = true;
  state.dungeon.layout.monsters.push(monster);
};

const eventDescriptionLog = (state: GameState, event: TurnEvent) => {
  addLog(state, event.description);
  addLog(state, event.name);
};

const shuffleEvents = (array: TurnEvent[]): TurnEvent[] => {
  soundEffectManager.playShuffle();
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
