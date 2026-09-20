import { t } from '$lib/translations';
import type { GameState } from '../types';

export const i18n = (
  key: string,
  properties?: Record<string, string>,
): string => (t.get(key, properties) as string) || key;

let reloadGuardTimeout: ReturnType<typeof setTimeout> | null = null;

export const saveReloadGuard = (state: GameState): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('reloadGuard', JSON.stringify(state));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to save reloadGuard:', err);
  }
};

export const debouncedSaveReloadGuard = (
  state: GameState,
  delayMs = 150,
): void => {
  if (typeof localStorage === 'undefined') return;
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
