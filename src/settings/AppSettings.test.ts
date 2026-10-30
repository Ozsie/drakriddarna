import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  DEFAULT_APP_SETTINGS,
  appSettingsStore,
  applyAppSettings,
  loadAppSettings,
  mirrorMusicSetting,
  parseAppSettings,
  persistAppSettings,
  updateAppSettings,
} from './AppSettings';
import { gameStateStore, initGame } from '../store/gameStateStore';
import { musicManager, soundEffectManager } from '../audio';

describe('AppSettings', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(storageMock)) {
      delete storageMock[key];
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        for (const key of Object.keys(storageMock)) {
          delete storageMock[key];
        }
      },
    });
    appSettingsStore.set({ ...DEFAULT_APP_SETTINGS });
  });

  describe('parsing', () => {
    it('falls back to the defaults for missing or invalid JSON', () => {
      expect(parseAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS);
      expect(parseAppSettings('')).toEqual(DEFAULT_APP_SETTINGS);
      expect(parseAppSettings('not json')).toEqual(DEFAULT_APP_SETTINGS);
      expect(parseAppSettings('{"musicOn": false')).toEqual(
        DEFAULT_APP_SETTINGS,
      );
    });

    it('keeps partial data and clamps volumes into [0, 1]', () => {
      const partial = parseAppSettings('{"musicOn": false}');
      expect(partial.musicOn).toBe(false);
      expect(partial.sfxOn).toBe(true);
      expect(partial.musicVolume).toBe(0.5);

      const clamped = parseAppSettings('{"musicVolume": 2, "sfxVolume": -1}');
      expect(clamped.musicVolume).toBe(1);
      expect(clamped.sfxVolume).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists on update and survives a reload', () => {
      updateAppSettings({ musicOn: false, musicVolume: 0.25 });
      expect(JSON.parse(storageMock['appSettings'] ?? '{}')).toEqual({
        musicOn: false,
        sfxOn: true,
        musicVolume: 0.25,
        sfxVolume: 0.8,
      });
      appSettingsStore.set({ ...DEFAULT_APP_SETTINGS });
      const loaded = loadAppSettings();
      expect(loaded.musicOn).toBe(false);
      expect(loaded.musicVolume).toBe(0.25);
      expect(get(appSettingsStore)).toEqual(loaded);
    });

    it('falls back to defaults when nothing was persisted', () => {
      expect(loadAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('tolerates storage being unavailable', () => {
      vi.stubGlobal('localStorage', undefined);
      expect(() => persistAppSettings(DEFAULT_APP_SETTINGS)).not.toThrow();
      expect(() => loadAppSettings()).not.toThrow();
    });
  });

  describe('application', () => {
    it('applies mute and volume to both managers', () => {
      const musicMute = vi.spyOn(musicManager, 'setMuted');
      const musicVolume = vi.spyOn(musicManager, 'setVolume');
      const sfxMute = vi.spyOn(soundEffectManager, 'setMuted');
      const sfxVolume = vi.spyOn(soundEffectManager, 'setVolume');
      applyAppSettings({
        musicOn: false,
        sfxOn: true,
        musicVolume: 0.3,
        sfxVolume: 0.4,
      });
      expect(musicMute).toHaveBeenCalledWith(true);
      expect(musicVolume).toHaveBeenCalledWith(0.3);
      expect(sfxMute).toHaveBeenCalledWith(false);
      expect(sfxVolume).toHaveBeenCalledWith(0.4);
      expect(soundEffectManager.getVolume()).toBeCloseTo(0.4);
      expect(soundEffectManager.isSoundMuted()).toBe(false);
      musicMute.mockRestore();
      musicVolume.mockRestore();
      sfxMute.mockRestore();
      sfxVolume.mockRestore();
    });

    it('updateAppSettings applies changes live', () => {
      updateAppSettings({ sfxOn: false, sfxVolume: 0.1 });
      expect(soundEffectManager.isSoundMuted()).toBe(true);
      expect(soundEffectManager.getVolume()).toBeCloseTo(0.1);
      expect(get(appSettingsStore).sfxOn).toBe(false);
    });
  });

  describe('music mirror', () => {
    it('mirrors musicOn into the game state when one exists', () => {
      initGame();
      const state = get(gameStateStore);
      expect(state).toBeDefined();
      updateAppSettings({ musicOn: false });
      expect(get(gameStateStore)?.settings['music']).toBe(false);
      updateAppSettings({ musicOn: true });
      expect(get(gameStateStore)?.settings['music']).toBe(true);
    });

    it('does not crash without a game state', () => {
      gameStateStore.set(null);
      expect(() => mirrorMusicSetting(DEFAULT_APP_SETTINGS)).not.toThrow();
    });
  });
});
