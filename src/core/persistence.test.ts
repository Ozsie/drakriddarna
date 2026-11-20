import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueStorage } from '@hoard-engine/saves';
import type { GameState } from '../types';
import {
  getPersistentStorage,
  readAutosave,
  readAutosaveString,
  readReloadGuard,
  STORAGE_KEYS,
  writeAutosave,
  writeReloadGuardBlob,
} from './persistence';

const createStorage = (
  values: Map<string, string> = new Map(),
): KeyValueStorage => ({
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
});

const testState = { campaignId: 'iceDragonTreasure' } as GameState;

describe('game persistence adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips autosaves and reload guards through storage', () => {
    vi.stubGlobal('localStorage', createStorage());

    writeAutosave(testState);
    expect(readAutosaveString()).toBe(JSON.stringify(testState));
    expect(readAutosave()).toEqual(testState);

    expect(writeReloadGuardBlob(JSON.stringify(testState))).toBe(true);
    expect(readReloadGuard()).toEqual(testState);
  });

  it('returns null for absent autosave and reload guard keys', () => {
    vi.stubGlobal('localStorage', createStorage());

    expect(readAutosaveString()).toBeNull();
    expect(readAutosave()).toBeNull();
    expect(readReloadGuard()).toBeNull();
  });

  it('returns null for malformed or non-object saved JSON', () => {
    let raw: string | null = '{broken';
    vi.stubGlobal('localStorage', {
      getItem: (key: string) =>
        key === STORAGE_KEYS.autosave || key === STORAGE_KEYS.reloadGuard
          ? raw
          : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    expect(readAutosave()).toBeNull();
    expect(readReloadGuard()).toBeNull();

    raw = '[]';
    expect(readAutosave()).toBeNull();
    expect(readReloadGuard()).toBeNull();
  });

  it('treats missing or inaccessible storage as unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(getPersistentStorage()).toBeNull();
    expect(readAutosave()).toBeNull();
    expect(readReloadGuard()).toBeNull();

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage access denied');
      },
    });

    try {
      expect(getPersistentStorage()).toBeNull();
      expect(readAutosaveString()).toBeNull();
      expect(writeReloadGuardBlob(JSON.stringify(testState))).toBe(false);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }
  });

  it('does not throw when storage operations fail', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Storage read failed');
      },
      setItem: () => {
        throw new Error('Storage write failed');
      },
      removeItem: vi.fn(),
    });

    expect(readAutosaveString()).toBeNull();
    expect(readReloadGuard()).toBeNull();
    expect(() => writeAutosave(testState)).not.toThrow();
    expect(writeReloadGuardBlob(JSON.stringify(testState))).toBe(false);
  });
});
