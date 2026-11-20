import type { Dungeon, GameState, Hero } from './types';
import { ConditionType, Level } from './types';
import { onCheckFulfilled, applyFallbackItems } from './dungeon/DungeonLogic';
import { CURRENT_SAVE_VERSION, migrateSaveState } from './saveMigration';
import { writeSave } from './saves/SavesLogic';
import { getCampaign, isKnownCampaign, DEFAULT_CAMPAIGN_ID } from './campaigns';
import {
  monsterActions,
  type MonsterTurnOptions,
} from './monsters/MonsterLogic';

import {
  applyStartingEquipment,
  assignHeroSprites,
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
import { browser } from '$app/env';
import { addLog, doReRender, i18n, readAutosave, writeAutosave } from './core';
import { shuffle } from './core';
import { awardScenarioScore, beginDungeonTiming } from './core';
import { createSeededRng, resetRng, setRng } from './core';
import { checkpointDungeonTimer, resumeDungeonTimer } from './core';
import {
  getEffectiveMaxMovement,
  getDifficulty,
  getGameMaster,
  DEFAULT_GAME_MASTER_ID,
} from './core';
import { clearActorAnimations } from './core';
import { emitSoundCue } from './core';
import { setNextDungeonTransitionProvider } from './interactables/InteractableLogic';
import { dispatchDirectorEvent } from '@hoard-engine/directors';

// Re-exported because gameStateStore consumes it through the game module.
export { removeDamageIndicator } from './core/combat';

export const save = (state: GameState, name?: string) => {
  // The saved snapshot carries the full elapsed dungeon time under a
  // fresh segment base, so loading it does not count the offline gap.
  checkpointDungeonTimer(state);
  doReRender(state);
  writeSave(state, name ?? '');
  addLog(state, 'logs.gameSaved');
};

type RestoreSource = 'loaded save' | 'autosave';

const restoreRuntimeState = (state: GameState, source: RestoreSource): void => {
  if (!state.campaignId || !isKnownCampaign(state.campaignId)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unknown or missing campaignId "${
        state.campaignId ?? ''
      }" in ${source}, falling back to "${DEFAULT_CAMPAIGN_ID}".`,
    );
    state.campaignId = DEFAULT_CAMPAIGN_ID;
  }
  // Saved runs resume without counting the time between saving and restoring.
  resumeDungeonTimer(state);
  // Speedrun saves keep their fixed seed; ordinary runs return to true
  // randomness (e.g. after a seeded run in the same session).
  if (state.speedrunSeed !== undefined) {
    setRng(createSeededRng(state.speedrunSeed));
  } else {
    resetRng();
  }
};

export const loadState = (newState: GameState) => {
  clearActorAnimations();
  newState.currentActor = newState.heroes.find(
    (hero) => hero.name === newState.currentActor?.name,
  ) as Hero | undefined;
  migrateSaveState(newState);
  restoreRuntimeState(newState, 'loaded save');
  addLog(newState, 'logs.gameLoaded');
  doReRender(newState);
  return newState;
};

// Whether a dungeon shows an intro screen the timer waits for (mirrors
// `shouldShowDungeonIntro` in src/ui/DungeonIntroRendering.ts).
const hasDungeonIntro = (dungeon: Dungeon): boolean =>
  typeof dungeon.intro === 'string' && dungeon.intro.trim().length > 0;

// The seed a speedrunner run is seeded with when the player leaves the
// seed input at its default (see the new-game dialog).
export const DEFAULT_SPEEDRUN_SEED = 42;

export const init = (
  campaignId: string = DEFAULT_CAMPAIGN_ID,
  gameMasterId: string = DEFAULT_GAME_MASTER_ID,
  speedrunSeed?: number,
  heroes?: Hero[],
): GameState => {
  // Seed the rng before anything shuffles or rolls: with a seed the
  // whole run is reproducible; without one the rng is truly random.
  if (speedrunSeed !== undefined) {
    setRng(createSeededRng(speedrunSeed));
  } else {
    resetRng();
  }
  const campaign = structuredClone(getCampaign(campaignId));
  // The hero selection screen's override replaces the roster inside the
  // cloned campaign (the registered campaign object is never mutated);
  // the override heroes are already deep clones of the roster heroes
  // with the player's names applied.
  if (heroes && heroes.length > 0) {
    campaign.heroes = heroes;
  }
  // Party sprites are position-based, not roster-fixed: whatever subset
  // the hero selection screen sends plays the rotation's packs in turn.
  assignHeroSprites(campaign.heroes as Hero[]);
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
    dungeonEvents =
      dispatchDirectorEvent(
        selectedGameMaster.events,
        'modifyEventDeck',
        dungeonEvents,
        partialState,
      ) ?? dungeonEvents;
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
    speedrunSeed,
  };
  if (selectedGameMaster?.initialState) {
    state.gameMasterState = selectedGameMaster.initialState();
  }
  // The deck was shuffled before the state existed, so its shuffle cue is
  // emitted here once the state can carry it.
  emitSoundCue(state, { cue: 'shuffle' });
  applyStartingEquipment(state.heroes as Hero[], selectedGameMaster);
  resetLiveHeroes(state);
  // Drop fallback items a hero already carries before the dungeon begins
  applyFallbackItems(state);
  // The run's timer starts when the first dungeon's intro is closed, or
  // immediately when that dungeon has no intro.
  beginDungeonTiming(state, hasDungeonIntro(campaign.dungeons[0]));
  dispatchDirectorEvent(selectedGameMaster, 'onGameInit', state);
  if (state.currentActor) {
    dispatchDirectorEvent(
      selectedGameMaster,
      'onHeroTurnStart',
      state.currentActor,
      state,
    );
  }
  if (browser) writeAutosave(state);
  return state;
};

const killAllMonstersAchieved = (state: GameState) =>
  state.dungeon.winConditions
    .filter((wc) => wc.type === ConditionType.KILL_ALL)
    .some((wc) => wc.fulfilled);

const endHeroTurn = (state: GameState, actor: Hero): number => {
  // Capture the index before turn-end effects: the toll can down this hero.
  const currentIndex = liveHeroes(state).indexOf(actor);
  applyTerrainTurnEndEffects(state, actor);
  applyRoomFogTurnEndEffects(state, actor);
  addLog(state, 'logs.endedTurn', {
    name: i18n(actor.name),
  });
  actor.actions = 0;
  actor.movement = 0;
  return currentIndex === -1
    ? 0
    : actor.health > 0
      ? currentIndex + 1
      : currentIndex;
};

const endRound = async (
  state: GameState,
  monsterOptions?: MonsterTurnOptions,
): Promise<Hero[]> => {
  state.currentActor = undefined;
  const gm = getDifficulty(state);
  dispatchDirectorEvent(gm, 'onHeroPhaseEnd', state);
  await monsterActions(state, monsterOptions);
  dispatchDirectorEvent(gm, 'onMonsterPhaseEnd', state);
  resetOnNext(state);
  return liveHeroes(state);
};

const selectNextHero = async (
  state: GameState,
  index: number,
  monsterOptions?: MonsterTurnOptions,
): Promise<{ hero: Hero | undefined; roundEnded: boolean }> => {
  let heroes = liveHeroes(state);
  let nextIndex = index;
  let roundEnded = false;
  if (nextIndex >= heroes.length) {
    heroes = await endRound(state, monsterOptions);
    nextIndex = 0;
    roundEnded = true;
  }
  if (heroes.length === 0) {
    state.currentActor = undefined;
    openPartyWipe(state);
    return { hero: undefined, roundEnded };
  }

  let guard = 0;
  while (
    heroes[nextIndex] &&
    heroes[nextIndex].incapacitated &&
    guard < heroes.length * 2
  ) {
    const hero = heroes[nextIndex];
    addLog(state, 'logs.noLongerIncapacitated', {
      name: i18n(hero.name),
    });
    hero.incapacitated = false;
    hero.actions = 0;
    hero.movement = 0;
    nextIndex++;
    if (nextIndex >= heroes.length) {
      heroes = await endRound(state, monsterOptions);
      nextIndex = 0;
      roundEnded = true;
    }
    guard++;
  }
  if (heroes.length === 0 || !heroes[nextIndex]) {
    state.currentActor = undefined;
    openPartyWipe(state);
    return { hero: undefined, roundEnded };
  }
  return { hero: heroes[nextIndex], roundEnded };
};

const drawRoundEvent = (state: GameState): void => {
  resetEventEffects(state);
  if (state.drawEvents) {
    state.previousEvent = state.currentEvent;
    const event = drawNextEvent(state);
    state.currentEvent = event;
    emitSoundCue(state, { cue: 'eventSound', event });
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
};

const startHeroTurn = (
  state: GameState,
  hero: Hero,
  roundEnded: boolean,
): void => {
  state.currentActor = hero;
  hero.actions = 2;
  hero.movement = getEffectiveMaxMovement(
    hero,
    getDifficulty(state).modifiers.movement,
  );
  if (roundEnded) {
    state.turnCount = (state.turnCount ?? 0) + 1;
    const gm = getDifficulty(state);
    dispatchDirectorEvent(gm, 'onRoundStart', state.turnCount, state);
  }
  const hasKilledAll = killAllMonstersAchieved(state);
  if (roundEnded && !hasKilledAll) {
    drawRoundEvent(state);
  } else if (state.roundActionsDelta) {
    hero.actions = Math.max(1, hero.actions + state.roundActionsDelta);
  }
  const gm = getDifficulty(state);
  dispatchDirectorEvent(gm, 'onHeroTurnStart', hero, state);
  addLog(state, 'logs.startedTurn', { name: i18n(hero.name) });
  doReRender(state);
};

export const next = async (
  state: GameState,
  monsterOptions?: MonsterTurnOptions,
): Promise<GameState> => {
  // eslint-disable-next-line no-console
  if (state.settings['debug']) console.log(state);
  doReRender(state);
  checkWinConditions(state);
  if (state.dungeon.beaten) {
    hasWon(state);
    if (state.betweenDungeons) return state;
  }
  if (state.currentActor === undefined) return state;
  const turnEndActor = state.currentActor;
  // Preserve the index captured before turn-end tolls can down the actor.
  const nextIndex = endHeroTurn(state, turnEndActor);
  const { hero, roundEnded } = await selectNextHero(
    state,
    nextIndex,
    monsterOptions,
  );
  if (!hero) return state;
  startHeroTurn(state, hero, roundEnded);
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
  dispatchDirectorEvent(gm, 'onPartyDefeat', currentState);
  const state = readAutosave();
  if (state) {
    restoreRuntimeState(state, 'autosave');
    doReRender(state);

    replaceDeadHeroes(state);
    resetLiveHeroes(state);
    resetOnNextDungeon(state);
    resetOnNext(state);
    state.currentActor = state.heroes.find(
      (hero) => hero.name === state.currentActor?.name,
    ) as Hero | undefined;
    state.drawEvents = true;
    addLog(state, 'logs.allHeroesDead');
    return state;
  }
  addLog(currentState, 'logs.failedToReset');
  return currentState;
};

/**
 * The party-wipe "retry this dungeon" option: rewinds to the last autosave
 * (the dungeon's start, or an in-dungeon checkpoint) via `resetLevel` and
 * applies the wipe penalty — the whole party restarts from 0 XP and
 * Apprentice level, matching the official "revived heroes start over"
 * defeat rules. Falls back to reviving the heroes on the current state
 * when no autosave exists, so the game always stays playable.
 */
export const restartDungeonAfterWipe = (currentState: GameState): GameState => {
  const state = resetLevel(currentState);
  if (liveHeroes(state).length === 0) {
    // resetLevel returned the unchanged, wiped state (no autosave
    // available): revive the heroes here instead.
    replaceDeadHeroes(state);
    resetLiveHeroes(state);
  }
  state.heroes.forEach((hero) => {
    hero.experience = 0;
    hero.level = Level.APPRENTICE;
  });
  state.currentActor = liveHeroes(state)[0] ?? (state.heroes[0] as Hero);
  state.betweenDungeons = undefined;
  addLog(state, 'logs.partyWipeRestartedDungeon');
  return state;
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
      dispatchDirectorEvent(gm, 'onDungeonComplete', state);
      const score = awardScenarioScore(state);
      addLog(state, 'logs.scenarioScore', {
        score: String(score.total),
        total: String(state.score ?? 0),
      });
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

import {
  openBetweenDungeons,
  openCampaignComplete,
  openPartyWipe,
} from './dungeon/BetweenDungeonsLogic';

export const hasWon = (state: GameState) => {
  if (state.dungeon.beaten && state.dungeon.nextDungeon) {
    openBetweenDungeons(state);
  } else if (state.dungeon.beaten && !state.betweenDungeons) {
    openCampaignComplete(state);
  }
};

setNextDungeonTransitionProvider(hasWon);
