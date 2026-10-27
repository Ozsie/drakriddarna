import type {
  Dungeon,
  GameState,
  Hero,
  BetweenDungeonsState,
  BetweenDungeonsStep,
  HeroLevelUpInfo,
  Item,
  Weapon,
  Armour,
  Shield,
  TradeItemSlot,
} from '../types';
import { ItemType, Level } from '../types';
import { weapons } from '../items/weapons';
import {
  liveHeroes,
  rewardLiveHeroes,
  replaceDeadHeroes,
  resetLiveHeroes,
} from '../hero/HeroLogic';
import {
  resetOnNextDungeon,
  onReset,
  onPickup,
  onDrop,
  TRADE,
  RESET_ON,
} from '../items/ItemLogic';
import { soundEffectManager } from '../audio';
import { addLog, i18n, clearActorAnimations, doReRender } from '../core';
import {
  isKnownCampaign,
  getCampaign,
  DEFAULT_CAMPAIGN_ID,
} from '../campaigns';
import { getEventsForDungeon } from '../events/EventsLogic';
import {
  getCampaignHighScores,
  recordHighScore,
} from '../saves/HighScoresLogic';

export interface TradableItemEntry {
  slot: TradeItemSlot;
  item: Item;
  category: 'weapon' | 'armour' | 'shield' | 'inventory';
}

export const getHeroTradableItems = (hero: Hero): TradableItemEntry[] => {
  const entries: TradableItemEntry[] = [];
  if (hero.weapon) {
    entries.push({
      slot: 'weapon',
      item: hero.weapon,
      category: 'weapon',
    });
  }
  if (hero.armour) {
    entries.push({
      slot: 'armour',
      item: hero.armour,
      category: 'armour',
    });
  }
  if (hero.shield) {
    entries.push({
      slot: 'shield',
      item: hero.shield,
      category: 'shield',
    });
  }
  (hero.inventory || []).forEach((item, index) => {
    entries.push({
      slot: index,
      item,
      category: 'inventory',
    });
  });
  return entries;
};

export const LEVEL_THRESHOLDS: { level: Level; xp: number }[] = [
  { level: Level.APPRENTICE, xp: 0 },
  { level: Level.KNIGHT, xp: 4 },
  { level: Level.HERO, xp: 10 },
  { level: Level.LORD, xp: 18 },
  { level: Level.MASTER, xp: 28 },
];

export const getNextLevelInfo = (
  xp: number,
): { nextLevel?: Level; xpNeeded?: number } => {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp < threshold.xp) {
      return {
        nextLevel: threshold.level,
        xpNeeded: threshold.xp - xp,
      };
    }
  }
  return {};
};

export const calculateLevel = (experience: number): Level => {
  if (experience >= 28) return Level.MASTER;
  if (experience >= 18) return Level.LORD;
  if (experience >= 10) return Level.HERO;
  if (experience >= 4) return Level.KNIGHT;
  return Level.APPRENTICE;
};

export const getLevelMeaning = (level: Level): string => {
  switch (level) {
    case Level.KNIGHT:
      return i18n('content.betweenDungeons.meanings.knight');
    case Level.HERO:
      return i18n('content.betweenDungeons.meanings.hero');
    case Level.LORD:
      return i18n('content.betweenDungeons.meanings.lord');
    case Level.MASTER:
      return i18n('content.betweenDungeons.meanings.master');
    case Level.APPRENTICE:
    default:
      return i18n('content.betweenDungeons.meanings.apprentice');
  }
};

export const openBetweenDungeons = (state: GameState): BetweenDungeonsState => {
  clearActorAnimations();
  const completedDungeonName = state.dungeon.name;
  const nextDungeon = state.dungeon.nextDungeon;

  const heroProgression: {
    hero: Hero;
    prevXp: number;
    prevLevel: Level;
  }[] = state.heroes.map((h) => ({
    hero: h as Hero,
    prevXp: h.experience,
    prevLevel: h.level,
  }));

  // Reward live heroes (+1 XP)
  rewardLiveHeroes(state);

  // Compute new levels and level-up info
  let anyHeroLeveledUp = false;
  const levelUps: HeroLevelUpInfo[] = heroProgression.map(
    ({ hero, prevXp, prevLevel }) => {
      const newXp = hero.experience;
      const newLevel = calculateLevel(newXp);
      hero.level = newLevel;
      const leveledUp = prevLevel !== newLevel;
      if (leveledUp) {
        anyHeroLeveledUp = true;
      }
      const nextInfo = getNextLevelInfo(newXp);
      return {
        heroName: hero.name,
        heroColour: hero.colour,
        previousLevel: prevLevel,
        newLevel,
        previousExperience: prevXp,
        newExperience: newXp,
        leveledUp,
        levelMeaning: getLevelMeaning(newLevel),
        xpToNextLevel: nextInfo.xpNeeded,
        nextLevel: nextInfo.nextLevel,
      };
    },
  );

  if (anyHeroLeveledUp) {
    soundEffectManager.playLevelUp();
  }

  // Replace dead heroes and reset scenario items
  replaceDeadHeroes(state);
  resetLiveHeroes(state);
  resetOnNextDungeon(state);

  const betweenDungeonsState: BetweenDungeonsState = {
    completedDungeonName,
    nextDungeon,
    step: 'levelUp',
    levelUps,
    scenarioScore: state.dungeon.score,
    campaignScore: state.score,
    selectedTradeItem: null,
  };

  state.betweenDungeons = betweenDungeonsState;
  doReRender(state);
  return betweenDungeonsState;
};

/**
 * Opens the final campaign-complete screen after the last dungeon of a
 * campaign is beaten: the same overlay as between dungeons, but without
 * the progression side effects — no +1 XP reward, no hero replacement.
 * Heroes are shown exactly as they finished the final scenario.
 */
export const openCampaignComplete = (
  state: GameState,
): BetweenDungeonsState => {
  clearActorAnimations();
  const campaignId =
    state.campaignId && isKnownCampaign(state.campaignId)
      ? state.campaignId
      : DEFAULT_CAMPAIGN_ID;
  const campaignName =
    state.campaignId && isKnownCampaign(state.campaignId)
      ? getCampaign(state.campaignId).name
      : state.dungeon.name;

  // A completed campaign records its score as a high score.
  recordHighScore(campaignId, state.score ?? 0);

  const betweenDungeonsState: BetweenDungeonsState = {
    completedDungeonName: state.dungeon.name,
    completedCampaignName: campaignName,
    step: 'campaignComplete',
    levelUps: [],
    scenarioScore: state.dungeon.score,
    campaignScore: state.score,
    selectedTradeItem: null,
  };

  state.betweenDungeons = betweenDungeonsState;
  doReRender(state);
  return betweenDungeonsState;
};

/**
 * Opens the party-wipe screen when every hero has fallen: the same
 * overlay as between dungeons, offering to restart the campaign from
 * scratch, retry the current dungeon (with experience and levels lost)
 * or load a saved game. The game state itself is left untouched until
 * the player chooses.
 */
export const openPartyWipe = (state: GameState): BetweenDungeonsState => {
  clearActorAnimations();
  const campaignId =
    state.campaignId && isKnownCampaign(state.campaignId)
      ? state.campaignId
      : DEFAULT_CAMPAIGN_ID;
  const betweenDungeonsState: BetweenDungeonsState = {
    completedDungeonName: state.dungeon.name,
    step: 'partyWipe',
    levelUps: [],
    campaignScore: state.score,
    wipeHighScores: getCampaignHighScores(campaignId),
    selectedTradeItem: null,
  };

  state.betweenDungeons = betweenDungeonsState;
  addLog(state, 'logs.allHeroesDead');
  doReRender(state);
  return betweenDungeonsState;
};

export const setBetweenDungeonsStep = (
  state: GameState,
  step: BetweenDungeonsStep,
): void => {
  if (!state.betweenDungeons) return;
  state.betweenDungeons.step = step;
  state.betweenDungeons.selectedTradeItem = null;
  doReRender(state);
};

export const selectTradeItem = (
  state: GameState,
  heroIndex: number,
  slot: TradeItemSlot,
): void => {
  if (!state.betweenDungeons) return;
  const current = state.betweenDungeons.selectedTradeItem;
  if (current && current.heroIndex === heroIndex && current.slot === slot) {
    state.betweenDungeons.selectedTradeItem = null;
  } else {
    state.betweenDungeons.selectedTradeItem = {
      heroIndex,
      slot,
      itemIndex: typeof slot === 'number' ? slot : undefined,
    };
  }
  doReRender(state);
};

export const tradeItem = (
  state: GameState,
  sourceHeroIndex: number,
  targetHeroIndex: number,
  slot: TradeItemSlot,
): boolean => {
  const sourceHero = state.heroes[sourceHeroIndex];
  const targetHero = state.heroes[targetHeroIndex];
  if (!sourceHero || !targetHero || sourceHeroIndex === targetHeroIndex)
    return false;

  let item: Item | undefined;

  if (slot === 'weapon') {
    item = sourceHero.weapon;
    sourceHero.weapon = structuredClone(weapons[0]);
  } else if (slot === 'armour') {
    item = sourceHero.armour;
    sourceHero.armour = undefined;
  } else if (slot === 'shield') {
    item = sourceHero.shield;
    sourceHero.shield = undefined;
  } else if (typeof slot === 'number') {
    item = sourceHero.inventory[slot];
    if (item) {
      sourceHero.inventory.splice(slot, 1);
    }
  }

  if (!item) return false;

  if (item.drop && !item.disabled) {
    const drop = onDrop[item.drop];
    if (drop) {
      drop(state, item, sourceHero);
    }
  }

  // Check if item resets on TRADE
  if (item.properties && item.reset) {
    const resetTriggers = (item.properties[RESET_ON] as string[]) ?? [];
    if (resetTriggers.includes(TRADE)) {
      const reset = onReset[item.reset];
      if (reset) {
        reset(state, item);
      }
    }
  }

  // Add/Equip to target hero
  if (item.type === ItemType.WEAPON) {
    if (
      !targetHero.weapon ||
      targetHero.weapon.id === weapons[0].id ||
      targetHero.weapon.value === 0
    ) {
      targetHero.weapon = item as Weapon;
    } else {
      targetHero.inventory.push(item);
    }
  } else if (item.type === ItemType.ARMOUR) {
    if (!targetHero.armour) {
      targetHero.armour = item as Armour;
    } else {
      targetHero.inventory.push(item);
    }
  } else if (item.type === ItemType.SHIELD) {
    if (!targetHero.shield) {
      targetHero.shield = item as Shield;
    } else {
      targetHero.inventory.push(item);
    }
  } else {
    targetHero.inventory.push(item);
  }

  if (item.pickup && !item.disabled) {
    const pickup = onPickup[item.pickup];
    if (pickup) {
      pickup(state, item, targetHero);
    }
  }

  soundEffectManager.playPickUpItem();

  if (state.betweenDungeons) {
    state.betweenDungeons.selectedTradeItem = null;
  }
  doReRender(state);
  return true;
};

export const completeBetweenDungeonsAndStartNext = (state: GameState): void => {
  if (!state.betweenDungeons) return;
  const nextDungeon = state.betweenDungeons.nextDungeon;
  state.betweenDungeons = undefined;

  if (nextDungeon) {
    startDungeon(state, nextDungeon);
  }
  doReRender(state);
};

/**
 * Debug helper: jump straight to the next dungeon of the current campaign,
 * skipping the between-dungeons progression (XP rewards, trading).
 */
export const goToNextDungeon = (state: GameState): boolean => {
  const nextDungeon = state.dungeon.nextDungeon;
  if (!nextDungeon) return false;
  startDungeon(state, nextDungeon);
  doReRender(state);
  return true;
};

const startDungeon = (state: GameState, nextDungeon: Dungeon): void => {
  state.dungeon = nextDungeon;
  state.actionLog = [
    {
      key: 'logs.youHaveReached',
      properties: { name: i18n(state.dungeon.name) },
      turn: 0,
    },
  ];
  const campaignEvents =
    state.campaignId && isKnownCampaign(state.campaignId)
      ? getCampaign(state.campaignId).eventDeck
      : undefined;
  state.eventDeck = getEventsForDungeon(state.dungeon, campaignEvents);
  state.currentEvent = undefined;
  state.drawEvents = true;
  state.roundActionsDelta = 0;
  state.turnCount = 0;
  resetLiveHeroes(state);
  resetOnNextDungeon(state);
  state.currentActor = liveHeroes(state)[0] ?? (state.heroes[0] as Hero);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('autosave', JSON.stringify(state));
  }
};
