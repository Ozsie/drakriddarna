import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSaveHint,
  getSaveHintFromStateString,
  listSaves,
  MAX_SAVE_NAME_LENGTH,
  readSaveStateString,
  writeSave,
} from './SavesLogic';
import type { GameState } from '../types';

const createMockState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    campaignId: 'iceDragonTreasure',
    dungeon: {
      name: 'campaign.iceDragon.e1m1.name',
      beaten: false,
      winConditions: [],
      discoveredRooms: [],
      killCount: 0,
      intro: '',
      layout: { grid: ['AAA'], monsters: [] },
      startingPositions: [{ x: 0, y: 0 }],
    },
    heroes: [],
    actionLog: [],
    settings: {},
    ...overrides,
  }) as unknown as GameState;

describe('SavesLogic', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const key in storageMock) {
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
        for (const key in storageMock) {
          delete storageMock[key];
        }
      },
    });
  });

  it('returns an empty list when nothing is saved', () => {
    expect(listSaves()).toEqual([]);
  });

  it('round-trips a written save through the index and blob', () => {
    const state = createMockState();
    const meta = writeSave(state, 'My Save');

    expect(meta).not.toBeNull();
    expect(meta?.name).toBe('My Save');
    const saves = listSaves();
    expect(saves).toHaveLength(1);
    expect(saves[0].name).toBe('My Save');
    expect(saves[0].campaignId).toBe('iceDragonTreasure');
    expect(readSaveStateString(saves[0].id)).toBe(JSON.stringify(state));
  });

  it('lists saves newest first', () => {
    const first = writeSave(createMockState(), 'First');
    writeSave(createMockState(), 'Second');

    const saves = listSaves();
    expect(saves).toHaveLength(2);
    expect(saves[0].name).toBe('Second');
    expect(saves[1].id).toBe(first?.id);
  });

  it('falls back to a default name for blank save names', () => {
    const meta = writeSave(createMockState(), '   ');
    expect(meta?.name).not.toBe('');
    expect(meta?.name).not.toBe('   ');
  });

  it('caps the save name length', () => {
    const meta = writeSave(
      createMockState(),
      'a'.repeat(MAX_SAVE_NAME_LENGTH + 10),
    );
    expect(meta?.name).toBe('a'.repeat(MAX_SAVE_NAME_LENGTH));
  });

  it('imports the legacy manual save slot once, then removes it', () => {
    const legacy = createMockState({ campaignId: 'earthHour' });
    storageMock['state'] = JSON.stringify(legacy);

    const saves = listSaves();
    expect(saves).toHaveLength(1);
    expect(storageMock['state']).toBeUndefined();
    expect(readSaveStateString(saves[0].id)).toBe(JSON.stringify(legacy));

    // The legacy key is gone, so a second listing does not re-import it.
    expect(listSaves()).toHaveLength(1);
  });

  it('leaves a corrupt legacy slot untouched', () => {
    storageMock['state'] = '{not json';
    expect(listSaves()).toEqual([]);
    expect(storageMock['state']).toBe('{not json');
  });

  it('builds a campaign - dungeon hint from metadata', () => {
    const meta = writeSave(createMockState(), 'Hinted');
    expect(meta).not.toBeNull();
    // The mock names are untranslated keys, so i18n falls back to the key.
    const hint = getSaveHint(meta as NonNullable<typeof meta>);
    expect(hint).toContain('campaign.iceDragon.e1m1.name');
  });

  it('derives a hint from a raw saved state string', () => {
    const hint = getSaveHintFromStateString(JSON.stringify(createMockState()));
    expect(hint).toContain('campaign.iceDragon.e1m1.name');
  });

  it('returns an empty hint for an unparseable state string', () => {
    expect(getSaveHintFromStateString('{broken')).toBe('');
  });

  it('returns null for unknown save ids', () => {
    expect(readSaveStateString('missing')).toBeNull();
  });
});
