// Real GameState fixtures for the parity snapshots (see
// docs/ui-kit-spec/05-boundary-and-verification.md). States are built with
// the game's own `init` on a fixed seed and then pushed into the situations
// the renderers must keep rendering identically: early game, mid-campaign
// with injured heroes, between-dungeons overlays, compact widths and both
// locales. Everything here must stay deterministic — no wall-clock reads,
// no random ids.

import { addLog } from '../../core';
import {
  openBetweenDungeons,
  openCampaignComplete,
} from '../../dungeon/BetweenDungeonsLogic';
import { init } from '../../game';
import { DEFAULT_GAME_MASTER_ID } from '../../gameMasters';
import type { GameState, Hero } from '../../types';

export const PARITY_CAMPAIGN_ID = 'iceDragonTreasure';
export const PARITY_SEED = 20261031;

export const REGULAR_WIDTH = 1280;
export const REGULAR_HEIGHT = 800;
export const COMPACT_WIDTH = 600;

const createState = (): GameState =>
  init(PARITY_CAMPAIGN_ID, DEFAULT_GAME_MASTER_ID, PARITY_SEED);

const revealAllRooms = (state: GameState): void => {
  const rooms = new Set<string>();
  state.dungeon.layout.grid.forEach((row) => {
    for (const cell of row) {
      if (cell !== '#') rooms.add(cell);
    }
  });
  state.dungeon.discoveredRooms = [...rooms];
};

/** A freshly initialized run: full health, nothing discovered, turn 1. */
export const earlyGameState = (): GameState => createState();

/**
 * Mid-campaign: rooms revealed, injured and equipped heroes, an active
 * event, log history, a stopped dungeon timer and a running score.
 */
export const midCampaignState = (): GameState => {
  const state = createState();
  state.turnCount = 7;
  revealAllRooms(state);

  addLog(state, 'logs.gameSaved');
  addLog(state, 'logs.endedTurn');

  const heroes = state.heroes as Hero[];
  if (heroes[0]) {
    heroes[0].health = Math.max(1, heroes[0].maxHealth - 3);
    if (state.itemDeck.length > 0) {
      heroes[0].inventory = [...heroes[0].inventory, state.itemDeck[0]];
    }
  }
  if (heroes[1]) {
    heroes[1].health = Math.max(1, heroes[1].maxHealth - 6);
  }
  state.currentActor = heroes[0];
  state.targetActor = state.dungeon.layout.monsters.find(
    (monster) => monster.health > 0,
  );
  state.currentEvent = state.eventDeck[0];
  state.timer = { dungeonElapsedMs: 65_400, campaignElapsedMs: 720_000 };
  state.score = 470;
  state.scenarioScores = [
    {
      dungeonName: state.dungeon.name,
      score: {
        healthPoints: 300,
        killPoints: 90,
        itemPoints: 50,
        secretPoints: 50,
        roundPenalty: -20,
        total: 470,
      },
      rounds: 7,
      kills: 2,
    },
  ];
  return state;
};

/** The between-dungeons level-up screen after a beaten scenario. */
export const betweenDungeonsState = (): GameState => {
  const state = midCampaignState();
  state.dungeon.score = {
    healthPoints: 300,
    killPoints: 90,
    itemPoints: 50,
    secretPoints: 50,
    roundPenalty: -20,
    total: 470,
  };
  openBetweenDungeons(state);
  if (state.betweenDungeons) {
    state.betweenDungeons.dungeonTimeMs = 65_400;
  }
  return state;
};

/** The campaign-complete screen shown after the final dungeon. */
export const campaignCompleteState = (): GameState => {
  const state = midCampaignState();
  openCampaignComplete(state);
  if (state.betweenDungeons) {
    state.betweenDungeons.campaignTimeMs = 3_723_000;
  }
  return state;
};

/** Fixed save-slot index contents for the load dialog (see SavesLogic). */
export const saveIndexFixture = (state: GameState): string =>
  JSON.stringify([
    {
      id: 'save-alpha',
      name: 'Before the gates',
      timestamp: 1_770_000_000_000,
      campaignId: state.campaignId,
      campaignNameTranslationKey: 'campaign.iceDragon.name',
      dungeonNameTranslationKey: state.dungeon.name,
    },
    {
      id: 'save-beta',
      name: 'Troll cave cleared',
      timestamp: 1_770_860_000_000,
      campaignId: state.campaignId,
      campaignNameTranslationKey: 'campaign.iceDragon.name',
      dungeonNameTranslationKey: state.dungeon.name,
    },
  ]);
