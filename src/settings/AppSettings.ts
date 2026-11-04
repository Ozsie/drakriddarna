import { writable, get } from 'svelte/store';
import { browser } from '$app/env';
import { musicManager, soundEffectManager } from '../audio';
import { gameStateStore, syncStore } from '../store/gameStateStore';
import type { GameState } from '../types';

// App-level settings (music/audio on/off and volumes, plus the debug
// on/off switch), persisted in localStorage['appSettings'] and applied
// live to the audio managers. The app setting `musicOn` is the single
// source of truth for music and `debugOn` for debug mode: each mirrors
// into its GameState.settings field whenever a game state exists, so
// saves stay self-contained and keep deriving correctly. The mirrors are
// one-directional — loading a save never overwrites the app setting.

export interface AppSettings {
  musicOn: boolean;
  sfxOn: boolean;
  /** Music volume in [0, 1]; the UI presents it as 0-100 percent. */
  musicVolume: number;
  /** Sound-effect volume in [0, 1]; the UI presents it as 0-100 percent. */
  sfxVolume: number;
  /** Debug mode on/off; mirrored into GameState.settings['debug']. */
  debugOn: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  musicOn: true,
  sfxOn: true,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  debugOn: false,
};

const APP_SETTINGS_STORAGE_KEY = 'appSettings';

export const appSettingsStore = writable<AppSettings>(DEFAULT_APP_SETTINGS);

const clampVolume = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, value));
};

/**
 * Parses stored settings; missing, partial or invalid JSON falls back to
 * the defaults (the current audio-manager defaults).
 */
export const parseAppSettings = (json: string | null): AppSettings => {
  if (!json) return { ...DEFAULT_APP_SETTINGS };
  try {
    const parsed = JSON.parse(json) as Partial<AppSettings>;
    return {
      musicOn:
        typeof parsed.musicOn === 'boolean'
          ? parsed.musicOn
          : DEFAULT_APP_SETTINGS.musicOn,
      sfxOn:
        typeof parsed.sfxOn === 'boolean'
          ? parsed.sfxOn
          : DEFAULT_APP_SETTINGS.sfxOn,
      musicVolume: clampVolume(
        parsed.musicVolume,
        DEFAULT_APP_SETTINGS.musicVolume,
      ),
      sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_APP_SETTINGS.sfxVolume),
      debugOn:
        typeof parsed.debugOn === 'boolean'
          ? parsed.debugOn
          : DEFAULT_APP_SETTINGS.debugOn,
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const persistAppSettings = (settings: AppSettings): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode, quota); settings then
    // only live for this session.
  }
};

/** Applies the settings to both audio managers immediately. */
export const applyAppSettings = (settings: AppSettings): void => {
  musicManager.setVolume(settings.musicVolume);
  musicManager.setMuted(!settings.musicOn);
  soundEffectManager.setVolume(settings.sfxVolume);
  soundEffectManager.setMuted(!settings.sfxOn);
};

/**
 * Mirrors `musicOn` into the current game state's saved music field so
 * saves stay self-contained. One-directional: app setting → save field.
 */
export const mirrorMusicSetting = (settings: AppSettings): void => {
  const state = get(gameStateStore);
  if (state && state.settings['music'] !== settings.musicOn) {
    state.settings['music'] = settings.musicOn;
    syncStore(state);
  }
};

/**
 * Mirrors `debugOn` into the current game state's saved debug field so
 * saves stay self-contained. One-directional: app setting → save field.
 */
export const mirrorDebugSetting = (settings: AppSettings): void => {
  const state = get(gameStateStore);
  if (state && state.settings['debug'] !== settings.debugOn) {
    state.settings['debug'] = settings.debugOn;
    syncStore(state);
  }
};

/**
 * Applies the app-level debug setting to a freshly created or loaded
 * state, so a run started while debug was toggled on in the settings
 * view actually runs in debug mode. The caller owns persisting the
 * state.
 */
export const applyDebugSetting = (state: GameState): void => {
  state.settings['debug'] = get(appSettingsStore).debugOn;
};

/**
 * Updates the settings: clamps the volumes, persists, applies to the
 * managers and mirrors the music and debug states into the game state.
 */
export const updateAppSettings = (patch: Partial<AppSettings>): AppSettings => {
  const current = get(appSettingsStore);
  const next: AppSettings = {
    musicOn: patch.musicOn ?? current.musicOn,
    sfxOn: patch.sfxOn ?? current.sfxOn,
    musicVolume: clampVolume(
      patch.musicVolume ?? current.musicVolume,
      current.musicVolume,
    ),
    sfxVolume: clampVolume(
      patch.sfxVolume ?? current.sfxVolume,
      current.sfxVolume,
    ),
    debugOn: patch.debugOn ?? current.debugOn,
  };
  appSettingsStore.set(next);
  persistAppSettings(next);
  applyAppSettings(next);
  mirrorMusicSetting(next);
  mirrorDebugSetting(next);
  return next;
};

/** Loads the persisted settings; called once at boot. */
export const loadAppSettings = (): AppSettings => {
  const settings =
    typeof localStorage === 'undefined'
      ? { ...DEFAULT_APP_SETTINGS }
      : parseAppSettings(localStorage.getItem(APP_SETTINGS_STORAGE_KEY));
  appSettingsStore.set(settings);
  return settings;
};

// Load once at boot and apply to both managers immediately.
if (browser) {
  applyAppSettings(loadAppSettings());
}
