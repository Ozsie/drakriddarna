import { parseSaveBlob, type KeyValueStorage } from '@hoard-engine/saves';
import type { GameState } from '../types';

export const STORAGE_KEYS = {
  autosave: 'autosave',
  reloadGuard: 'reloadGuard',
  saveIndex: 'saves',
  savePrefix: 'save_',
  legacyManualSave: 'state',
} as const;

export const getPersistentStorage = (): KeyValueStorage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const writeAutosave = (state: GameState): void => {
  try {
    getPersistentStorage()?.setItem(
      STORAGE_KEYS.autosave,
      JSON.stringify(state),
    );
  } catch {
    // Storage can be unavailable or full; an autosave is best effort.
  }
};

export const readAutosaveString = (): string | null => {
  try {
    return getPersistentStorage()?.getItem(STORAGE_KEYS.autosave) ?? null;
  } catch {
    return null;
  }
};

export const readAutosave = (): GameState | null => {
  const raw = readAutosaveString();
  return raw ? parseSaveBlob<GameState>(raw) : null;
};

export const writeReloadGuardBlob = (stateString: string): boolean => {
  try {
    const storage = getPersistentStorage();
    if (!storage) return false;
    storage.setItem(STORAGE_KEYS.reloadGuard, stateString);
    return true;
  } catch {
    return false;
  }
};

export const readReloadGuard = (): GameState | null => {
  try {
    const raw =
      getPersistentStorage()?.getItem(STORAGE_KEYS.reloadGuard) ?? null;
    return raw ? parseSaveBlob<GameState>(raw) : null;
  } catch {
    return null;
  }
};
