import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSaveLoadDialogHit,
  getSaveLoadDialogLayout,
} from './SaveLoadDialogRendering';
import type { GameState } from '../types';
import { writeSave } from '../saves/SavesLogic';
import { loadTranslations } from '$lib/translations';

const createMockState = (): GameState =>
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
  }) as unknown as GameState;

describe('SaveLoadDialogRendering', () => {
  const storageMock: Record<string, string> = {};
  const mockState = createMockState();

  beforeAll(async () => {
    // The dialog renders translated titles/footers; without a loaded
    // locale i18n falls back to the raw keys.
    await loadTranslations('en');
  });

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

  describe('layout', () => {
    it('returns empty content without a state', () => {
      const layout = getSaveLoadDialogLayout(800, 600, null, { mode: 'save' });
      expect(layout.hasContent).toBe(false);
    });

    it('centers the panel on the screen', () => {
      const layout = getSaveLoadDialogLayout(800, 600, mockState, {
        mode: 'save',
      });
      expect(layout.hasContent).toBe(true);
      const { panelBounds } = layout;
      expect(
        Math.abs(panelBounds.x * 2 + panelBounds.width - 800),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(panelBounds.y * 2 + panelBounds.height - 600),
      ).toBeLessThanOrEqual(1);
    });

    it('gives the save mode an input and two buttons, no rows', () => {
      const layout = getSaveLoadDialogLayout(800, 600, mockState, {
        mode: 'save',
      });
      expect(layout.inputBounds).toBeDefined();
      expect(layout.rows).toEqual([]);
      expect(layout.actionButtonBounds).toBeDefined();
      expect(layout.secondaryButtonBounds).toBeDefined();
      expect(layout.secondaryButtonLabel).toBeDefined();
    });

    it('gives the load mode one row per save and a back button', () => {
      localStorage.setItem('autosave', JSON.stringify(mockState));
      writeSave(mockState, 'First');
      writeSave(mockState, 'Second');

      const layout = getSaveLoadDialogLayout(800, 600, mockState, {
        mode: 'load',
      });
      expect(layout.rows).toHaveLength(3);
      expect(layout.rows[0].item.id).toBe('load_autosave');
      expect(layout.rows[1].item.label).toBe('Second');
      expect(layout.rows[2].item.label).toBe('First');
      // Single dismiss button at the action position.
      expect(layout.actionButtonBounds).toBeDefined();
      expect(layout.secondaryButtonBounds).toBeUndefined();
    });

    it('crops overflowing saves and notes the rest in the footer', () => {
      for (let index = 0; index < 40; index += 1) {
        writeSave(mockState, `Save ${String(index)}`);
      }
      const layout = getSaveLoadDialogLayout(320, 240, mockState, {
        mode: 'load',
      });
      expect(layout.rows.length).toBeGreaterThan(0);
      expect(layout.rows.length).toBeLessThan(41);
      expect(layout.footerText).toMatch(/\d+/);
    });
  });

  describe('hit', () => {
    it('hits rows, buttons and backdrop in the load mode', () => {
      writeSave(mockState, 'My Save');
      const layout = getSaveLoadDialogLayout(800, 600, mockState, {
        mode: 'load',
      });
      const row = layout.rows[0].bounds;
      const rowHit = getSaveLoadDialogHit(
        800,
        600,
        mockState,
        { mode: 'load' },
        row.x + 5,
        row.y + 5,
      );
      expect(rowHit?.type).toBe('row');

      const action = layout.actionButtonBounds;
      expect(action).toBeDefined();
      const actionHit = getSaveLoadDialogHit(
        800,
        600,
        mockState,
        { mode: 'load' },
        action!.x + 5,
        action!.y + 5,
      );
      expect(actionHit?.type).toBe('action');

      const backdropHit = getSaveLoadDialogHit(
        800,
        600,
        mockState,
        { mode: 'load' },
        4,
        4,
      );
      expect(backdropHit?.type).toBe('backdrop');
    });

    it('hits the input, save, cancel and backdrop in the save mode', () => {
      const layout = getSaveLoadDialogLayout(800, 600, mockState, {
        mode: 'save',
      });
      const input = layout.inputBounds!;
      expect(
        getSaveLoadDialogHit(
          800,
          600,
          mockState,
          { mode: 'save' },
          input.x + 5,
          input.y + 5,
        )?.type,
      ).toBe('input');
      const action = layout.actionButtonBounds!;
      expect(
        getSaveLoadDialogHit(
          800,
          600,
          mockState,
          { mode: 'save' },
          action.x + 5,
          action.y + 5,
        )?.type,
      ).toBe('action');
      const secondary = layout.secondaryButtonBounds!;
      expect(
        getSaveLoadDialogHit(
          800,
          600,
          mockState,
          { mode: 'save' },
          secondary.x + 5,
          secondary.y + 5,
        )?.type,
      ).toBe('secondary');
      expect(
        getSaveLoadDialogHit(800, 600, mockState, { mode: 'save' }, 4, 4)?.type,
      ).toBe('backdrop');
    });
  });
});
