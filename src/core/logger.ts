import { browser } from '$app/environment';
import { t } from '$lib/translations';
import type { GameState } from '../types';

export const i18n = (
  key: string,
  properties?: Record<string, string>,
): string => (t.get(key, properties) as string) || key;

export const doReRender = (state: GameState): void => {
  state.reRender = true;
  if (browser) {
    localStorage.setItem('reloadGuard', JSON.stringify(state));
  }
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
