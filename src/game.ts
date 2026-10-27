import type { GameState, Hero, Position } from './types';
import { ConditionType } from './types';
import { onCheckFulfilled } from './dungeon/DungeonLogic';
import { CURRENT_SAVE_VERSION, migrateSaveState } from './saveMigration';
import { writeSave } from './saves/SavesLogic';
import { getCampaign, isKnownCampaign, DEFAULT_CAMPAIGN_ID } from './campaigns';
import {
  monsterActions,
  type MonsterTurnOptions,
} from './monsters/MonsterLogic';
import {
  applyStartingEquipment,
  liveHeroes,
  replaceDeadHeroes,
  resetLiveHeroes,
} from './hero/HeroLogic';
import { resetOnNext, resetOnNextDungeon } from './items/ItemLogic';
import { applyRoomFogTurnEndEffects } from './dungeon/RoomFogLogic';
import { applyTerrainTurnEndEffects } from './dungeon/TerrainLogic';
import {
  drawNextEvent,
  eventEffects,
  getEventsForDungeon,
  resetEventEffects,
} from './events/EventsLogic';
import { browser } from '$app/environment';
import { addLog, doReRender, i18n } from './core';
import { shuffle } from './core';
import {
  getEffectiveMaxMovement,
  getDifficulty,
  getGameMaster,
  DEFAULT_GAME_MASTER_ID,
} from './core';
import { clearActorAnimations } from './core';
import { setNextDungeonTransitionProvider } from './interactables/InteractableLogic';
import { soundEffectManager } from './audio';

// Re-exported because gameStateStore consumes it through the game module.
export { removeDamageIndicator } from './core/combat';

export const save = (state: GameState, name?: string) => {
  doReRender(state);
  writeSave(state, name ?? '');
  addLog(state, 'logs.gameSaved');
};

export const loadState = (newState: GameState) => {
  clearActorAnimations();
  newState.currentActor = newState.heroes.find(
    (hero) => hero.name === newState.currentActor?.name,
  ) as Hero | undefined;
  migrateSaveState(newState);
  // Older saves may not have a campaignId at all, and any save could in
  // theory reference a campaign that no longer exists (e.g. removed
  // during development). Fall back to the default campaign rather than
  // letting later `getCampaign(state.campaignId)` calls (e.g. in
  // `hasWon()`) throw for an unresolvable id.
  if (!newState.campaignId || !isKnownCampaign(newState.campaignId)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unknown or missing campaignId "${
        newState.campaignId ?? ''
      }" in loaded save, falling back to "${DEFAULT_CAMPAIGN_ID}".`,
    );
    newState.campaignId = DEFAULT_CAMPAIGN_ID;
  }
  addLog(newState, 'logs.gameLoaded');
  doReRender(newState);
  return newState;
};

export const init = (
  campaignId: string = DEFAULT_CAMPAIGN_ID,
  gameMasterId: string = DEFAULT_GAME_MASTER_ID,
): GameState => {
  const campaign = structuredClone(getCampaign(campaignId));
  const selectedGameMaster = getGameMaster(gameMasterId);

  let dungeonEvents = getEventsForDungeon(
    campaign.dungeons[0],
    campaign.eventDeck,
  );
  if (selectedGameMaster?.events?.modifyEventDeck) {
    // Temp partial state for modifier hook if needed
    const partialState = {
      campaignId: campaign.id,
      gameMaster: selectedGameMaster,
      heroes: campaign.heroes,
      dungeon: campaign.dungeons[0],
    } as GameState;
    dungeonEvents = selectedGameMaster.events.modifyEventDeck(
      dungeonEvents,
      partialState,
    );
  }

  const state: GameState = {
    campaignId: campaign.id,
    saveVersion: CURRENT_SAVE_VERSION,
    gameMaster: selectedGameMaster,
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
    eventDeck: dungeonEvents,
    reRender: true,
    drawEvents: true,
  };
  if (selectedGameMaster?.initialState) {
    state.gameMasterState = selectedGameMaster.initialState();
  }
  applyStartingEquipment(state.heroes as Hero[], selectedGameMaster);
  resetLiveHeroes(state);
  selectedGameMaster?.onGameInit?.(state);
  if (state.currentActor) {
    selectedGameMaster?.onHeroTurnStart?.(state.currentActor, state);
  }
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
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    hasWon(state);
    return state;
  }
  if (state.currentActor === undefined) return state;
  else {
    // Terrain the hero ends its turn on (e.g. standing in lava) or fog
    // of the room it stands in (e.g. poison gas) takes its toll before
    // the turn passes on. The toll can down the acting hero, so the
    // live-heroes index is captured while they are still alive: a
    // survivor advances by one, a downed hero keeps the captured index —
    // which then points at the next live hero, and still triggers the
    // normal round-end processing when they were last in the round.
    const turnEndActor = state.currentActor;
    const currentIndex = liveHeroes(state).indexOf(turnEndActor);
    applyTerrainTurnEndEffects(state, turnEndActor);
    applyRoomFogTurnEndEffects(state, turnEndActor);
    addLog(state, 'logs.endedTurn', {
      name: i18n(turnEndActor.name),
    });
    turnEndActor.actions = 0;
    turnEndActor.movement = 0;
    let nextIndex =
      currentIndex === -1
        ? 0
        : turnEndActor.health > 0
        ? currentIndex + 1
        : currentIndex;
    // Whether the round wrapped around — distinct from `nextIndex`
    // being 0, which also happens when the first hero of the round was
    // downed by their turn-end toll: only a wrap starts a new round.
    let roundEnded = false;
    if (nextIndex >= liveHeroes(state).length) {
      state.currentActor = undefined;
      const gm = getDifficulty(state);
      gm.onHeroPhaseEnd?.(state);
      await monsterActions(state, monsterOptions);
      gm.onMonsterPhaseEnd?.(state);
      nextIndex = 0;
      roundEnded = true;
      resetOnNext(state);
    }
    if (liveHeroes(state).length === 0) {
      state.currentActor = undefined;
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
      liveHeroes(state)[nextIndex].actions = 0;
      liveHeroes(state)[nextIndex].movement = 0;
      nextIndex++;
      if (nextIndex >= liveHeroes(state).length) {
        state.currentActor = undefined;
        const gm = getDifficulty(state);
        gm.onHeroPhaseEnd?.(state);
        await monsterActions(state, monsterOptions);
        gm.onMonsterPhaseEnd?.(state);
        nextIndex = 0;
        roundEnded = true;
        resetOnNext(state);
      }
      guard++;
    }
    if (liveHeroes(state).length === 0 || !liveHeroes(state)[nextIndex]) {
      state.currentActor = undefined;
      return resetLevel(state);
    }
    state.currentActor = liveHeroes(state)[nextIndex];
    state.currentActor.actions = 2;
    state.currentActor.movement = getEffectiveMaxMovement(
      state.currentActor,
      getDifficulty(state).modifiers.movement,
    );
    if (roundEnded) {
      state.turnCount = (state.turnCount ?? 0) + 1;
      const gm = getDifficulty(state);
      gm.onRoundStart?.(state.turnCount, state);
    }
    const hasKilledAll = killAllMonstersAchieved(state);
    if (roundEnded && !hasKilledAll) {
      resetEventEffects(state);
      if (state.drawEvents) {
        state.previousEvent = state.currentEvent;
        const event = drawNextEvent(state);
        state.currentEvent = event;
        soundEffectManager.playEventSound(event);
        const effect = eventEffects[event.effect];
        if (effect) {
          effect(state, event);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Unknown event effect: ${event.effect}`);
        }
      } else {
        state.previousEvent = state.currentEvent;
        state.currentEvent = undefined;
      }
    } else if (state.roundActionsDelta) {
      state.currentActor.actions = Math.max(
        1,
        state.currentActor.actions + state.roundActionsDelta,
      );
    }
    const gm = getDifficulty(state);
    gm.onHeroTurnStart?.(state.currentActor, state);
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
  hero.actions = Math.max(0, hero.actions - 1);
  if (hero.actions > 0) {
    hero.movement = getEffectiveMaxMovement(
      hero,
      getDifficulty(state).modifiers.movement,
    );
  } else {
    hero.movement = 0;
  }
  if (hero.actions === 0) {
    await next(state, monsterOptions);
  }
};

export const resetLevel = (currentState: GameState): GameState => {
  clearActorAnimations();
  const gm = getDifficulty(currentState);
  gm.onPartyDefeat?.(currentState);
  if (typeof localStorage !== 'undefined') {
    const loadedRawState = localStorage.getItem('autosave');
    if (loadedRawState) {
      const state: GameState = JSON.parse(loadedRawState) as GameState;
      if (!state.campaignId || !isKnownCampaign(state.campaignId)) {
        // eslint-disable-next-line no-console
        console.warn(
          `Unknown or missing campaignId "${
            state.campaignId ?? ''
          }" in autosave, falling back to "${DEFAULT_CAMPAIGN_ID}".`,
        );
        state.campaignId = DEFAULT_CAMPAIGN_ID;
      }
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
        condition.fulfilled = !state.dungeon.layout.monsters
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
      case ConditionType.SECRET_FOUND: {
        condition.fulfilled =
          state.dungeon.layout.secrets.find(
            (secret) => secret.id === condition.targetSecretId,
          )?.found ?? false;
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
  const previouslyBeaten = state.dungeon.beaten;
  state.dungeon.beaten = state.dungeon.winConditions
    .map((condition) => condition.fulfilled)
    .reduce((partial, fulfilled) => partial && fulfilled, true);
  if (state.dungeon.beaten) {
    if (!previouslyBeaten) {
      const gm = getDifficulty(state);
      gm.onDungeonComplete?.(state);
    }
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
  if (typeof document === 'undefined') return;
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

import { openBetweenDungeons } from './dungeon/BetweenDungeonsLogic';

export const hasWon = (state: GameState) => {
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    openBetweenDungeons(state);
  }
};

setNextDungeonTransitionProvider(hasWon);
