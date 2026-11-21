import { t } from '#lib/translations/index.js';
import type { GameState } from '../types';
import { checkpointDungeonTimer } from './timer';
import { getPersistentStorage, writeReloadGuardBlob } from './persistence';

export const i18n = (
  key: string,
  properties?: Record<string, string>,
): string => t.get()(key, properties) || key;

// Developer-facing diagnostic, unlike the player-facing action log: it
// surfaces on the console so game code needs no direct console access.
export const warn = (message: string): void => {
  // eslint-disable-next-line no-console
  console.warn(message);
};

let reloadGuardTimeout: ReturnType<typeof setTimeout> | null = null;

export const saveReloadGuard = (state: GameState): void => {
  if (!getPersistentStorage()) return;
  try {
    // Checkpoint the running timer segment into the accumulated time, so
    // a page reload resumes with the elapsed time intact.
    checkpointDungeonTimer(state);
    if (!writeReloadGuardBlob(JSON.stringify(state))) {
      throw new Error('Storage write failed');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to save reloadGuard:', err);
  }
};

export const debouncedSaveReloadGuard = (
  state: GameState,
  delayMs = 150,
): void => {
  if (!getPersistentStorage()) return;
  if (reloadGuardTimeout) {
    clearTimeout(reloadGuardTimeout);
  }
  reloadGuardTimeout = setTimeout(() => {
    saveReloadGuard(state);
    reloadGuardTimeout = null;
  }, delayMs);
};

export const doReRender = (state: GameState): void => {
  state.reRender = true;
  debouncedSaveReloadGuard(state);
};

export const addLog = (
  state: GameState,
  messageKey: string,
  properties?: Record<string, string>,
): void => {
  state.actionLog = [
    {
      key: messageKey,
      properties: properties,
      turn: state.turnCount ?? 0,
    },
    ...state.actionLog,
  ];
  doReRender(state);
};
