import {
  createSaveSlots,
  parseSaveBlob,
  type SaveSlots,
} from '@hoard-engine/saves';
import { i18n } from '../core';
import type { GameState } from '../types';
// Evaluation order matters: the campaign modules call `defineDungeon` through
// the DungeonLogic re-export at module scope, so DungeonLogic must be
// evaluated before the campaigns registry (same pattern as game.ts).
import '../dungeon/DungeonLogic';
import { campaigns } from '../campaigns';

// Named manual saves: a JSON index of save metadata under `saves`, and one
// full `GameState` blob per save under `save_<id>`. The storage mechanics
// (index round trip, newest-first listing, blob reads, the legacy single
// manual slot import) come from @hoard-engine/saves; everything else is game
// knowledge injected here — the i18n labels, the campaign/dungeon hints,
// the ids and the timestamps. The metadata carries everything the load
// dialog shows (name plus campaign/dungeon hints), so listing saves never
// parses the full save blobs. The pre-multiple-saves single manual slot
// (`state`) is imported into the list on first access.

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

// The slot store is built lazily so storage availability is evaluated on
// first use, like the historical per-call check.
let slotStore: SaveSlots<SaveMetaData> | null = null;
const getSlots = (): SaveSlots<SaveMetaData> => {
  slotStore ??= createSaveSlots<SaveMetaData>({
    storage: hasLocalStorage() ? localStorage : null,
    indexKey: SAVE_INDEX_KEY,
    slotPrefix: SAVE_PREFIX,
  });
  return slotStore;
};

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

/**
 * Imports the legacy single manual-save slot (`state`) into the named save
 * list, once. The blob moves to `save_<id>` under the "Manual Save" name
 * and the legacy key is removed; nothing else has written it since.
 */
const importLegacyManualSave = (): void => {
  getSlots().importLegacySlot(LEGACY_STATE_KEY, (state) =>
    createSaveMetaData(
      state as GameState,
      i18n('content.menu.loadGame.buttons.manualSave'),
      generateSaveId(),
      Date.now(),
    ),
  );
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
  importLegacyManualSave();
  return getSlots().list();
};

/**
 * Writes a new named save and returns its metadata. An empty name falls
 * back to the default label; returns null when storage is unavailable.
 */
export const writeSave = (
  state: GameState,
  name: string,
): SaveMetaData | null => {
  const trimmed = name.trim().slice(0, MAX_SAVE_NAME_LENGTH);
  const meta = createSaveMetaData(
    state,
    trimmed || i18n('content.menu.saveGame.defaultName'),
    generateSaveId(),
    Date.now(),
  );
  return getSlots().write(state, meta);
};

/** The raw saved `GameState` JSON for one save id, or null when missing. */
export const readSaveStateString = (id: string): string | null =>
  getSlots().readSlot(id);

/** Load-dialog hint for a raw saved state string (the autosave slot). */
let lastHintSource: string | null = null;
let lastHintResult = '';
export const getSaveHintFromStateString = (stateString: string): string => {
  // The load menu rebuilds its items on every hit-test, so the (large)
  // autosave blob is parsed only when its content actually changed.
  if (stateString === lastHintSource) return lastHintResult;
  lastHintSource = stateString;
  const state = parseSaveBlob<GameState>(stateString);
  lastHintResult = state ? getSaveHint(extractSaveHints(state)) : '';
  return lastHintResult;
};
