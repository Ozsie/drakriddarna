import type { GameState, Hero, Position } from './types';
import { ConditionType } from './types';
import { onCheckFulfilled } from './dungeon/DungeonLogic';
import { campaignIceDragonTreasure } from './campaigns/campaignIceDragonTreasure';
import {
  monsterActions,
  type MonsterTurnOptions,
} from './monsters/MonsterLogic';
import {
  levelUp,
  liveHeroes,
  replaceDeadHeroes,
  resetLiveHeroes,
  rewardLiveHeroes,
} from './hero/HeroLogic';
import { resetOnNext, resetOnNextDungeon } from './items/ItemLogic';
import {
  drawNextEvent,
  eventEffects,
  getEventsForDungeon,
  resetEventEffects,
} from './events/EventsLogic';
import { browser } from '$app/environment';
import { addLog, doReRender, i18n } from './core';
import { shuffle } from './core';
import { getEffectiveMaxMovement } from './core';
import { clearActorAnimations } from './core';

// Re-export core modules for backwards compatibility and ease of access
export {
  i18n,
  doReRender,
  addLog,
  saveReloadGuard,
  debouncedSaveReloadGuard,
} from './core/logger';
export { roll, shuffle, setRng, resetRng, createSeededRng } from './core/dice';
export {
  COLLAPSED,
  EMPTY,
  WALL,
  findCell,
  findNeighbouringHeroes,
  getDist,
  hasLineOfSight,
  isDiscovered,
  isNeighbouring,
  isRoomDiscovered,
  isSamePosition,
  isWalkable,
  normaliseVector,
  stepAlongLine,
  toArray,
} from './core/grid';
export {
  ATTACK_BONUS,
  RE_ROLL_ATTACK,
  canAct,
  createDamageIndicator,
  doorAsActor,
  getDamageString,
  getEffectiveMaxMovement,
  removeDamageIndicator,
  takeDamage,
} from './core/combat';
export {
  recordActorStep,
  getActorVisualPosition,
  isActorAnimating,
  hasActiveActorAnimations,
  getActorRemainingAnimationDuration,
  sleep,
  snapActorPosition,
  clearActorAnimations,
  setActorMovementDuration,
  getActorMovementDuration,
  resetActorMovementDuration,
  DEFAULT_ACTOR_MOVEMENT_DURATION_MS,
} from './core/ActorAnimation';
export {
  monsterActions,
  DEFAULT_MONSTER_TURN_OPTIONS,
  type MonsterTurnOptions,
} from './monsters/MonsterLogic';

export const save = (state: GameState) => {
  doReRender(state);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('state', JSON.stringify(state));
  }
  addLog(state, 'logs.gameSaved');
};

export const loadState = (newState: GameState) => {
  clearActorAnimations();
  newState.currentActor = newState.heroes.find(
    (hero) => hero.name === newState.currentActor?.name,
  ) as Hero | undefined;
  addLog(newState, 'logs.gameLoaded');
  doReRender(newState);
  return newState;
};

export const load = (currentState: GameState): GameState => {
  if (typeof localStorage !== 'undefined') {
    const stateString = localStorage.getItem('state');
    if (stateString) {
      const state: GameState = JSON.parse(stateString) as GameState;
      return loadState(state);
    }
  }
  addLog(currentState, 'logs.loadFailed');
  return currentState;
};

export const init = (): GameState => {
  const campaign = structuredClone(campaignIceDragonTreasure);
  const state: GameState = {
    heroes: campaign.heroes,
    dungeon: campaign.dungeons[0],
    currentActor: campaign.heroes[0] as Hero | undefined,
    actionLog: [
      {
        key: 'logs.playingCampaign',
        properties: { name: i18n(campaign.name) },
        turn: 0,
      },
      {
        key: 'logs.gameInitialized',
        turn: 0,
      },
      {
        key: 'logs.initLogActions',
        turn: 0,
      },
      {
        key: 'logs.initLogMoves',
        turn: 0,
      },
      {
        key: 'logs.initLogMoveFinished',
        turn: 0,
      },
      {
        key: 'logs.initLogUnfair',
        turn: 0,
      },
    ],
    itemDeck: shuffle(campaign.itemDeck),
    magicItemDeck: shuffle(campaign.magicItemDeck),
    settings: {
      cellSize: 48,
      debug: false,
    },
    eventDeck: getEventsForDungeon(campaign.dungeons[0]),
    reRender: true,
    drawEvents: true,
  };
  resetLiveHeroes(state);
  if (browser) {
    localStorage.setItem('autosave', JSON.stringify(state));
  }
  return state;
};

const killAllMonstersAchieved = (state: GameState) =>
  state.dungeon.winConditions
    .filter((wc) => wc.type === ConditionType.KILL_ALL)
    .some((wc) => wc.fulfilled);

export const next = async (
  state: GameState,
  monsterOptions?: MonsterTurnOptions,
): Promise<GameState> => {
  // eslint-disable-next-line no-console
  if (state.settings['debug']) console.log(state);
  doReRender(state);
  checkWinConditions(state);
  if (state.currentActor === undefined) return state;
  else {
    addLog(state, 'logs.endedTurn', {
      name: i18n(state.currentActor.name),
    });
    const currentIndex = liveHeroes(state).indexOf(state.currentActor);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= liveHeroes(state).length) {
      state.currentActor = undefined;
      await monsterActions(state, monsterOptions);
      nextIndex = 0;
      resetOnNext(state);
    }
    if (liveHeroes(state).length === 0) {
      return resetLevel(state);
    }
    let guard = 0;
    while (
      liveHeroes(state)[nextIndex] &&
      liveHeroes(state)[nextIndex].incapacitated &&
      guard < liveHeroes(state).length * 2
    ) {
      addLog(state, 'logs.noLongerIncapacitated', {
        name: i18n(liveHeroes(state)[nextIndex].name),
      });
      liveHeroes(state)[nextIndex].incapacitated = false;
      nextIndex++;
      if (nextIndex >= liveHeroes(state).length) {
        state.currentActor = undefined;
        await monsterActions(state, monsterOptions);
        nextIndex = 0;
        resetOnNext(state);
      }
      guard++;
    }
    state.currentActor = liveHeroes(state)[nextIndex];
    state.currentActor.actions = 2;
    state.currentActor.movement = getEffectiveMaxMovement(state.currentActor);
    const hasKilledAll = killAllMonstersAchieved(state);
    if (nextIndex === 0 && !hasKilledAll) {
      resetEventEffects(state);
      if (state.drawEvents) {
        const event = drawNextEvent(state);
        state.currentEvent = event;
        eventEffects[event.effect](state, event);
      } else {
        state.currentEvent = undefined;
      }
    } else if (state.roundActionsDelta) {
      state.currentActor.actions = Math.max(
        1,
        state.currentActor.actions + state.roundActionsDelta,
      );
    }
    if (nextIndex === 0) {
      state.turnCount = (state.turnCount ?? 0) + 1;
    }
    addLog(state, 'logs.startedTurn', { name: i18n(state.currentActor.name) });
    doReRender(state);
  }
  return state;
};

export const endAction = async (
  state: GameState,
  monsterOptions?: MonsterTurnOptions,
): Promise<void> => {
  doReRender(state);
  const hero = state.currentActor;
  if (!hero) return;
  hero.actions--;
  hero.movement = getEffectiveMaxMovement(hero);
  if (hero.actions === 0) {
    await next(state, monsterOptions);
  }
};

export const resetLevel = (currentState: GameState): GameState => {
  clearActorAnimations();
  if (typeof localStorage !== 'undefined') {
    const loadedRawState = localStorage.getItem('autosave');
    if (loadedRawState) {
      const state: GameState = JSON.parse(loadedRawState) as GameState;
      doReRender(state);

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
      state.drawEvents = true;
      addLog(state, 'logs.allHeroesDead');
      return state;
    }
  }
  addLog(currentState, 'logs.failedToReset');
  return currentState;
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
    if (condition.checkFulfilled) {
      condition.fulfilled = onCheckFulfilled[condition.checkFulfilled](
        state,
        condition,
      );
    }
  });
  state.dungeon.beaten = state.dungeon.winConditions
    .map((condition) => condition.fulfilled)
    .reduce((partial, fulfilled) => partial && fulfilled, true);
  if (state.dungeon.beaten) {
    addLog(state, 'logs.allConditionsFulfilled');
    addLog(state, 'logs.clearedDungeon', { name: i18n(state.dungeon.name) });
    if (state.dungeon.nextDungeon?.name) {
      addLog(state, 'logs.moveToNext', {
        name: i18n(state.dungeon.nextDungeon?.name),
      });
    }
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
    clearActorAnimations();
    state.dungeon = state.dungeon.nextDungeon;
    state.actionLog = [
      {
        key: 'logs.youHaveReached',
        properties: { name: i18n(state.dungeon.name) },
        turn: 0,
      },
    ];
    state.eventDeck = getEventsForDungeon(state.dungeon);
    doReRender(state);
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('autosave', JSON.stringify(state));
    }
  }
};
