import { beforeAll, describe, expect, it } from 'vitest';
import {
  getCampaignRows,
  getGameMasterRows,
  getNewGameDialogHit,
  getNewGameDialogLayout,
} from './NewGameDialogRendering';
import { loadTranslations } from '$lib/translations';

describe('NewGameDialogRendering', () => {
  beforeAll(async () => {
    // The dialog renders translated labels; without a loaded locale
    // i18n falls back to the raw keys.
    await loadTranslations('en');
  });

  describe('rows', () => {
    it('lists every campaign and game master', () => {
      const campaigns = getCampaignRows();
      const gameMasters = getGameMasterRows();
      expect(campaigns.length).toBeGreaterThan(0);
      expect(campaigns.every((c) => c.id && c.label)).toBe(true);
      expect(gameMasters.length).toBeGreaterThan(0);
      expect(gameMasters.every((gm) => gm.id && gm.label)).toBe(true);
    });
  });

  describe('layout', () => {
    it('returns empty content for a zero-sized view', () => {
      const layout = getNewGameDialogLayout(0, 0);
      expect(layout.hasContent).toBe(false);
    });

    it('centers the panel on the screen', () => {
      const layout = getNewGameDialogLayout(800, 600);
      expect(layout.hasContent).toBe(true);
      const { panelBounds } = layout;
      expect(
        Math.abs(panelBounds.x * 2 + panelBounds.width - 800),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(panelBounds.y * 2 + panelBounds.height - 600),
      ).toBeLessThanOrEqual(1);
    });

    it('lays out one row per campaign and game master in two columns', () => {
      const layout = getNewGameDialogLayout(800, 600);
      expect(layout.campaignRows).toHaveLength(getCampaignRows().length);
      expect(layout.gameMasterRows).toHaveLength(getGameMasterRows().length);
      const firstCampaign = layout.campaignRows[0];
      const firstGameMaster = layout.gameMasterRows[0];
      // The game-master column sits right of the campaign column.
      expect(firstGameMaster.bounds.x).toBeGreaterThan(
        firstCampaign.bounds.x + firstCampaign.bounds.width,
      );
    });

    it('marks the selected campaign and game master', () => {
      const layout = getNewGameDialogLayout(800, 600, {
        selectedCampaignId: getCampaignRows()[0].id,
        selectedGameMasterId: getGameMasterRows()[0].id,
      });
      expect(layout.campaignRows[0].selected).toBe(true);
      expect(layout.campaignRows[1]?.selected ?? false).toBe(false);
      expect(layout.gameMasterRows[0].selected).toBe(true);
    });

    it('shows the seed input only in speedrunner mode', () => {
      const normal = getNewGameDialogLayout(800, 600, {
        speedrunMode: false,
      });
      expect(normal.speedrunMode).toBe(false);
      expect(normal.seedInputBounds).toBeUndefined();
      expect(normal.seedLabelText).toBeUndefined();

      const speedrun = getNewGameDialogLayout(800, 600, {
        speedrunMode: true,
        seedInput: '42',
      });
      expect(speedrun.speedrunMode).toBe(true);
      expect(speedrun.seedInputBounds).toBeDefined();
      expect(speedrun.seedLabelText).toBeTruthy();
    });
  });

  describe('hit', () => {
    it('hits campaign and game master rows', () => {
      const layout = getNewGameDialogLayout(800, 600);
      const campaignRow = layout.campaignRows[0];
      const gameMasterRow = layout.gameMasterRows[0];
      expect(
        getNewGameDialogHit(
          800,
          600,
          campaignRow.bounds.x + 5,
          campaignRow.bounds.y + 5,
        ),
      ).toEqual({ type: 'campaign', campaignId: campaignRow.id });
      expect(
        getNewGameDialogHit(
          800,
          600,
          gameMasterRow.bounds.x + 5,
          gameMasterRow.bounds.y + 5,
        ),
      ).toEqual({ type: 'gameMaster', gameMasterId: gameMasterRow.id });
    });

    it('hits the checkbox, seed input and both buttons', () => {
      const layout = getNewGameDialogLayout(800, 600, {
        speedrunMode: true,
      });
      const cb = layout.checkboxBounds;
      expect(getNewGameDialogHit(800, 600, cb.x + 2, cb.y + 2)?.type).toBe(
        'checkbox',
      );
      const input = layout.seedInputBounds!;
      expect(
        getNewGameDialogHit(800, 600, input.x + 4, input.y + 4, {
          speedrunMode: true,
        })?.type,
      ).toBe('seedInput');
      const action = layout.actionButtonBounds;
      expect(
        getNewGameDialogHit(
          800,
          600,
          action.x + action.width / 2,
          action.y + action.height / 2,
        )?.type,
      ).toBe('action');
      const secondary = layout.secondaryButtonBounds;
      expect(
        getNewGameDialogHit(
          800,
          600,
          secondary.x + secondary.width / 2,
          secondary.y + secondary.height / 2,
        )?.type,
      ).toBe('secondary');
    });

    it('falls back to panel and backdrop', () => {
      const layout = getNewGameDialogLayout(800, 600);
      const panel = layout.panelBounds;
      expect(
        getNewGameDialogHit(800, 600, panel.x + panel.width / 2, panel.y + 2)
          ?.type,
      ).toBe('panel');
      expect(getNewGameDialogHit(800, 600, 2, 2)?.type).toBe('backdrop');
    });
  });
});
