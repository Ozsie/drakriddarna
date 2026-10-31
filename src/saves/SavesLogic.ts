import { i18n } from '../core';
import type { GameState } from '../types';
// Evaluation order matters: the campaign modules call `defineDungeon` through
// the DungeonLogic re-export at module scope, so DungeonLogic must be
// evaluated before the campaigns registry (same pattern as game.ts).
import '../dungeon/DungeonLogic';
import { campaigns } from '../campaigns';

// Named manual saves: a JSON index of save metadata under `saves`, and one
// full `GameState` blob per save under `save_<id>`. The metadata carries
// everything the load dialog shows (name plus campaign/dungeon hints), so
// listing saves never parses the full save blobs. The pre-multiple-saves
// single manual slot (`state`) is imported into the list on first access.

const SAVE_INDEX_KEY = 'saves';
const SAVE_PREFIX = 'save_';
const LEGACY_STATE_KEY = 'state';

export const MAX_SAVE_NAME_LENGTH = 30;

export interface SaveHints {
  campaignId?: string;
  campaignNameTranslationKey?: string;
  dungeonNameTranslationKey?: string;
}

export interface SaveMetaData extends SaveHints {
  id: string;
  name: string;
  timestamp: number;
}

const hasLocalStorage = (): boolean => typeof localStorage !== 'undefined';

const generateSaveId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `save-${String(Date.now())}-${String(Math.floor(Math.random() * 1e9))}`;

/** Campaign/dungeon display keys for one saved state, for the load dialog. */
export const extractSaveHints = (state: GameState): SaveHints => {
  const campaign = state.campaignId ? campaigns[state.campaignId] : undefined;
  return {
    campaignId: state.campaignId,
    campaignNameTranslationKey: campaign?.name,
    dungeonNameTranslationKey:
      state.dungeon?.nameTranslationKey ?? state.dungeon?.name,
  };
};

/** Human-readable "campaign - dungeon" hint for a save's metadata. */
export const getSaveHint = (hints: SaveHints): string => {
  const campaign = hints.campaignNameTranslationKey
    ? i18n(hints.campaignNameTranslationKey)
    : '';
  const dungeon = hints.dungeonNameTranslationKey
    ? i18n(hints.dungeonNameTranslationKey)
    : '';
  return [campaign, dungeon].filter((part) => part !== '').join(' - ');
};

const readIndex = (): SaveMetaData[] => {
  try {
    const raw = localStorage.getItem(SAVE_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as SaveMetaData[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt index is treated as empty; the save blobs stay untouched.
    return [];
  }
};

const writeIndex = (saves: SaveMetaData[]): void => {
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(saves));
};

const addSaveToIndex = (meta: SaveMetaData): void => {
  const index = readIndex().filter((existing) => existing.id !== meta.id);
  index.unshift(meta);
  writeIndex(index);
};

/**
 * Imports the legacy single manual-save slot (`state`) into the named save
 * list, once. The blob moves to `save_<id>` under the "Manual Save" name
 * and the legacy key is removed; nothing else has written it since.
 */
const importLegacyManualSave = (): void => {
  const legacy = localStorage.getItem(LEGACY_STATE_KEY);
  if (!legacy) return;
  try {
    const state = JSON.parse(legacy) as GameState;
    const meta = createSaveMetaData(
      state,
      i18n('content.menu.loadGame.buttons.manualSave'),
      generateSaveId(),
      Date.now(),
    );
    localStorage.setItem(`${SAVE_PREFIX}${meta.id}`, legacy);
    addSaveToIndex(meta);
  } catch {
    // Leave a corrupt legacy save untouched rather than dropping it.
    return;
  }
  localStorage.removeItem(LEGACY_STATE_KEY);
};

export const createSaveMetaData = (
  state: GameState,
  name: string,
  id: string,
  timestamp: number,
): SaveMetaData => ({
  ...extractSaveHints(state),
  id,
  name,
  timestamp,
});

/** All named saves, newest first. Runs the legacy-slot import first. */
export const listSaves = (): SaveMetaData[] => {
  if (!hasLocalStorage()) return [];
  importLegacyManualSave();
  return readIndex()
    .filter((meta) => meta && typeof meta.id === 'string')
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Writes a new named save and returns its metadata. An empty name falls
 * back to the default label; returns null when storage is unavailable.
 */
export const writeSave = (
  state: GameState,
  name: string,
): SaveMetaData | null => {
  if (!hasLocalStorage()) return null;
  const trimmed = name.trim().slice(0, MAX_SAVE_NAME_LENGTH);
  const meta = createSaveMetaData(
    state,
    trimmed || i18n('content.menu.saveGame.defaultName'),
    generateSaveId(),
    Date.now(),
  );
  try {
    localStorage.setItem(`${SAVE_PREFIX}${meta.id}`, JSON.stringify(state));
    addSaveToIndex(meta);
  } catch {
    return null;
  }
  return meta;
};

/** The raw saved `GameState` JSON for one save id, or null when missing. */
export const readSaveStateString = (id: string): string | null => {
  if (!hasLocalStorage() || !id) return null;
  return localStorage.getItem(`${SAVE_PREFIX}${id}`);
};

/** Load-dialog hint for a raw saved state string (the autosave slot). */
let lastHintSource: string | null = null;
let lastHintResult = '';
export const getSaveHintFromStateString = (stateString: string): string => {
  // The load menu rebuilds its items on every hit-test, so the (large)
  // autosave blob is parsed only when its content actually changed.
  if (stateString === lastHintSource) return lastHintResult;
  lastHintSource = stateString;
  try {
    const state = JSON.parse(stateString) as GameState;
    lastHintResult = getSaveHint(extractSaveHints(state));
  } catch {
    lastHintResult = '';
  }
  return lastHintResult;
};
