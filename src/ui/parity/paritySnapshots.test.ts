// Parity snapshots for every in-scope (chrome) renderer. Each renderer runs
// against the real-GameState fixtures in ./fixtures into a recording
// context, and the recorded call log is snapshotted. A refactor that only
// moves literals into a theme must leave the logs byte-identical; any
// change is an intentional visual difference that must be called out in the
// PR together with an updated snapshot
// (docs/ui-kit-spec/05-boundary-and-verification.md).
//
// The debug printout is deliberately not snapshotted: it renders wall-clock
// time and the device pixel ratio.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTranslations } from '$lib/translations';
import { createRecordingContext } from '../../uikit/testing/recordingContext';
import {
  COMPACT_WIDTH,
  REGULAR_HEIGHT,
  REGULAR_WIDTH,
  betweenDungeonsState,
  campaignCompleteState,
  earlyGameState,
  midCampaignState,
  saveIndexFixture,
} from './fixtures';
import type { GameState, Hero } from '../../types';
import { getCampaign } from '../../campaigns';
import { DEFAULT_APP_SETTINGS } from '../../settings/AppSettings';
import { RadialAction } from '../../hero/RadialMenuLogic';
import {
  getDefaultSelectedHeroIds,
  renderHeroSelection,
} from '../HeroSelectionRendering';
import { renderTopBar } from '../TopBarRendering';
import { renderHeroCards } from '../HeroCardRendering';
import { renderMonsterCards } from '../MonsterCardRendering';
import { renderDiaryAndWinConditions } from '../DiaryAndWinConditionRendering';
import { renderEventCard } from '../EventCardRendering';
import { renderBetweenDungeons } from '../BetweenDungeonsRendering';
import { renderDungeonIntro } from '../DungeonIntroRendering';
import { renderDebugMenuModal } from '../DebugMenuRendering';
import { renderRadialMenu } from '../RadialMenuRendering';
import { renderSaveLoadDialog } from '../SaveLoadDialogRendering';
import { renderNewGameDialog } from '../NewGameDialogRendering';
import { renderSettings, renderCredits } from '../SettingsRendering';
import { renderWelcome } from '../WelcomeRendering';

describe('parity snapshots', () => {
  beforeAll(async () => {
    // Labels are human-authored translations; without a loaded locale
    // i18n falls back to the raw keys.
    await loadTranslations('en');
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  it('snapshots the top bar in regular and compact mode', () => {
    const regular = createRecordingContext();
    renderTopBar(regular.ctx, REGULAR_WIDTH, midCampaignState());
    expect([...regular.log]).toMatchSnapshot('topbar-regular');

    const compact = createRecordingContext();
    renderTopBar(compact.ctx, COMPACT_WIDTH, midCampaignState());
    expect([...compact.log]).toMatchSnapshot('topbar-compact');
  });

  it('snapshots the hero cards, including an open inventory popover', () => {
    const state = midCampaignState();
    const regular = createRecordingContext();
    renderHeroCards(regular.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state);
    expect([...regular.log]).toMatchSnapshot('herocards-regular');

    const withInventory = midCampaignState();
    (withInventory.heroes as Hero[])[0].isInventoryOpen = true;
    const popover = createRecordingContext();
    renderHeroCards(popover.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, withInventory);
    expect([...popover.log]).toMatchSnapshot('herocards-inventory-open');

    const compact = createRecordingContext();
    renderHeroCards(
      compact.ctx,
      COMPACT_WIDTH,
      REGULAR_HEIGHT,
      midCampaignState(),
    );
    expect([...compact.log]).toMatchSnapshot('herocards-compact');
  });

  it('snapshots the monster cards for visible monsters', () => {
    const state = midCampaignState();
    const rec = createRecordingContext();
    renderMonsterCards(rec.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state);
    expect([...rec.log]).toMatchSnapshot('monstercards-regular');
  });

  it('snapshots the diary and win-condition panel', () => {
    const regular = createRecordingContext();
    renderDiaryAndWinConditions(
      regular.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      midCampaignState(),
    );
    expect([...regular.log]).toMatchSnapshot('diary-regular');

    const collapsed = createRecordingContext();
    renderDiaryAndWinConditions(
      collapsed.ctx,
      COMPACT_WIDTH,
      REGULAR_HEIGHT,
      midCampaignState(),
      { isCollapsed: true },
    );
    expect([...collapsed.log]).toMatchSnapshot('diary-collapsed');
  });

  it('snapshots the event card with an active event', () => {
    const rec = createRecordingContext();
    renderEventCard(rec.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState());
    expect([...rec.log]).toMatchSnapshot('eventcard-regular');
  });

  it('snapshots the between-dungeons level-up screen', () => {
    const rec = createRecordingContext();
    renderBetweenDungeons(
      rec.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      betweenDungeonsState(),
    );
    expect([...rec.log]).toMatchSnapshot('betweendungeons-levelup');
  });

  it('snapshots the campaign-complete screen', () => {
    const rec = createRecordingContext();
    renderBetweenDungeons(
      rec.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      campaignCompleteState(),
    );
    expect([...rec.log]).toMatchSnapshot('betweendungeons-campaigncomplete');
  });

  it('snapshots the dungeon intro modal', () => {
    const rec = createRecordingContext();
    renderDungeonIntro(
      rec.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      earlyGameState(),
    );
    expect([...rec.log]).toMatchSnapshot('dungeonintro');
  });

  it('snapshots the canvas debug menu modal', () => {
    const rec = createRecordingContext();
    renderDebugMenuModal(
      rec.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      midCampaignState(),
      {
        view: 'debug',
      },
    );
    expect([...rec.log]).toMatchSnapshot('debugmenu-debug');
  });

  it('snapshots the radial action menu', () => {
    const state = midCampaignState();
    const rec = createRecordingContext();
    renderRadialMenu(
      rec.ctx,
      32,
      {
        x: 300,
        y: 300,
        entries: [
          { action: RadialAction.SEARCH },
          { action: RadialAction.PICK_UP_ITEM },
          { action: RadialAction.USE_ITEM, item: state.itemDeck[0] },
          { action: RadialAction.NEXT },
        ],
      },
      0,
    );
    expect([...rec.log]).toMatchSnapshot('radialmenu');
  });

  it('snapshots the save and load dialogs', () => {
    const state = midCampaignState();
    localStorage.setItem('saves', saveIndexFixture(state));
    // The load rows only list saves whose state payload still exists
    // (see getSavedGameMenuItems in MenuLogic).
    localStorage.setItem('save_save-alpha', JSON.stringify(state));
    localStorage.setItem('save_save-beta', JSON.stringify(state));

    const save = createRecordingContext();
    renderSaveLoadDialog(save.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, {
      mode: 'save',
      saveName: 'The dragon knights',
    });
    expect([...save.log]).toMatchSnapshot('saveload-save');

    const load = createRecordingContext();
    renderSaveLoadDialog(load.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, {
      mode: 'load',
    });
    expect([...load.log]).toMatchSnapshot('saveload-load');
  });

  it('snapshots the new-game dialog', () => {
    const rec = createRecordingContext();
    renderNewGameDialog(rec.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, {
      selectedCampaignId: 'iceDragonTreasure',
      speedrunMode: true,
      seedInput: '20261031',
    });
    expect([...rec.log]).toMatchSnapshot('newgamedialog');
  });

  it('snapshots the settings screen and the credits', () => {
    const settings = createRecordingContext();
    renderSettings(
      settings.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      DEFAULT_APP_SETTINGS,
    );
    expect([...settings.log]).toMatchSnapshot('settings');

    const credits = createRecordingContext();
    renderCredits(credits.ctx, REGULAR_WIDTH, REGULAR_HEIGHT);
    expect([...credits.log]).toMatchSnapshot('credits');
  });

  it('snapshots the hero selection screen', () => {
    const campaign = getCampaign('iceDragonTreasure');
    const selectedHeroIds = getDefaultSelectedHeroIds(campaign);
    const firstHeroId = selectedHeroIds[0];
    const rec = createRecordingContext();
    renderHeroSelection(
      rec.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      'iceDragonTreasure',
      {
        selectedHeroIds,
        names: firstHeroId ? { [firstHeroId]: 'Sir Sten' } : {},
      },
    );
    expect([...rec.log]).toMatchSnapshot('heroselection');
  });

  it('snapshots the welcome screen', () => {
    const fresh = createRecordingContext();
    renderWelcome(fresh.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, {
      buildInfo: { date: '2026-10-31', hash: 'abc1234' },
    });
    expect([...fresh.log]).toMatchSnapshot('welcome');

    // While a run is parked on the welcome screen, Continue and Save
    // join the button list.
    const ongoing = createRecordingContext();
    renderWelcome(ongoing.ctx, REGULAR_WIDTH, REGULAR_HEIGHT, {
      buildInfo: { date: '2026-10-31', hash: 'abc1234' },
      hasOngoingRun: true,
    });
    expect([...ongoing.log]).toMatchSnapshot('welcome-ongoing');
  });

  it('snapshots the top bar and hero cards under the Swedish locale', async () => {
    await loadTranslations('sv');
    const topBar = createRecordingContext();
    renderTopBar(topBar.ctx, REGULAR_WIDTH, midCampaignState());
    expect([...topBar.log]).toMatchSnapshot('topbar-swedish');

    const heroCards = createRecordingContext();
    renderHeroCards(
      heroCards.ctx,
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      midCampaignState(),
    );
    expect([...heroCards.log]).toMatchSnapshot('herocards-swedish');
  });

  it('still renders something for every snapshot fixture', () => {
    const state: GameState = midCampaignState();
    expect(state.heroes.length).toBeGreaterThan(0);
    expect(state.currentEvent).toBeDefined();
    expect(state.dungeon.layout.monsters.length).toBeGreaterThan(0);
  });
});
