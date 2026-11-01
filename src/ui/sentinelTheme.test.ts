// The sentinel parameterization test (docs/ui-kit-spec/05): every chrome
// renderer runs against the parity fixtures with a theme whose tokens are
// unique markers, and every style value written to the context must be
// (or contain) a marker. A leaked literal — a color or font the renderer
// still holds — fails here, long before the boundary lint exists.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Colour } from '../types';
import { createRecordingContext } from '../uikit/testing/recordingContext';
import { createSentinelTheme } from '../uikit/testing/sentinelTheme';
import type { UiEnv } from '../uikit/env';
import { defaultTheme } from '../uikit/theme';
import { defaultUiEnv } from './env';
import {
  COMPACT_WIDTH,
  REGULAR_HEIGHT,
  REGULAR_WIDTH,
  betweenDungeonsState,
  earlyGameState,
  midCampaignState,
  saveIndexFixture,
} from './parity/fixtures';
import type { Hero } from '../types';
import { getCampaign } from '../campaigns';
import { DEFAULT_APP_SETTINGS } from '../settings/AppSettings';
import { RadialAction } from '../hero/RadialMenuLogic';
import { getDefaultSelectedHeroIds } from './HeroSelectionRendering';
import { renderTopBar } from './TopBarRendering';
import { renderHeroCards } from './HeroCardRendering';
import { renderMonsterCards } from './MonsterCardRendering';
import { renderDiaryAndWinConditions } from './DiaryAndWinConditionRendering';
import { renderEventCard } from './EventCardRendering';
import { renderBetweenDungeons } from './BetweenDungeonsRendering';
import { renderDungeonIntro } from './DungeonIntroRendering';
import { renderMenuModal } from './MenuRendering';
import { renderRadialMenu } from './RadialMenuRendering';
import { renderSaveLoadDialog } from './SaveLoadDialogRendering';
import { renderNewGameDialog } from './NewGameDialogRendering';
import { renderSettings, renderCredits } from './SettingsRendering';
import { renderHeroSelection } from './HeroSelectionRendering';
import { renderWelcome } from './WelcomeRendering';

beforeAll(() => {
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

const sentinelTheme = createSentinelTheme(defaultTheme);
const sentinelEnv: UiEnv = { ...defaultUiEnv, theme: sentinelTheme };

// Allowed non-token writes: gradients log as `gradient`, composed fonts
// embed a family marker inside a size-prefixed string, and actor cards
// fill with the hero's own colour — game data that flows through the view
// model, not a style the renderer owns.
const MARKER = /⟦[^⟧]+⟧/;
const actorDataColours = new Set<string>(Object.values(Colour));
const styleWritePattern = /^(fillStyle|strokeStyle|font|shadowColor)=(.*)$/;

const leakedStyles = (log: readonly string[]): string[] =>
  log.flatMap((entry) => {
    const match = styleWritePattern.exec(entry);
    if (!match) return [];
    const [, property, value] = match;
    if (value === 'gradient') return [];
    if (MARKER.test(value)) return [];
    const unquoted = value.replace(/^"|"$/g, '');
    if (property === 'fillStyle' && actorDataColours.has(unquoted)) return [];
    return [`${property}=${value}`];
  });

const runs: [string, (ctx: CanvasRenderingContext2D, env: UiEnv) => void][] = [
  [
    'topBar',
    (ctx, env) => renderTopBar(ctx, REGULAR_WIDTH, midCampaignState(), { env }),
  ],
  [
    'heroCards',
    (ctx, env) =>
      renderHeroCards(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        env,
      }),
  ],
  [
    'monsterCards',
    (ctx, env) =>
      renderMonsterCards(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        midCampaignState(),
        { env },
      ),
  ],
  [
    'diary',
    (ctx, env) =>
      renderDiaryAndWinConditions(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        midCampaignState(),
        { env },
      ),
  ],
  [
    'eventCard',
    (ctx, env) =>
      renderEventCard(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        env,
      }),
  ],
  [
    'betweenDungeons',
    (ctx, env) =>
      renderBetweenDungeons(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        betweenDungeonsState(),
        { env },
      ),
  ],
  [
    'dungeonIntro',
    (ctx, env) =>
      renderDungeonIntro(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, earlyGameState(), {
        env,
      }),
  ],
  [
    'menuModal',
    (ctx, env) =>
      renderMenuModal(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        env,
        view: 'main',
      }),
  ],
  [
    'radialMenu',
    (ctx, env) => {
      const state = midCampaignState();
      renderRadialMenu(
        ctx,
        32,
        {
          x: 300,
          y: 300,
          entries: [
            { action: RadialAction.SEARCH },
            { action: RadialAction.USE_ITEM, item: state.itemDeck[0] },
          ],
        },
        0,
        env,
      );
    },
  ],
  [
    'saveLoadDialog',
    (ctx, env) => {
      const state = midCampaignState();
      localStorage.setItem('saves', saveIndexFixture(state));
      localStorage.setItem('save_save-alpha', JSON.stringify(state));
      renderSaveLoadDialog(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, {
        mode: 'load',
        env,
      });
    },
  ],
  [
    'newGameDialog',
    (ctx, env) =>
      renderNewGameDialog(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, {
        selectedCampaignId: 'iceDragonTreasure',
        env,
      }),
  ],
  [
    'settings',
    (ctx, env) =>
      renderSettings(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, DEFAULT_APP_SETTINGS, {
        env,
      }),
  ],
  [
    'credits',
    (ctx, env) => renderCredits(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, { env }),
  ],
  [
    'heroSelection',
    (ctx, env) => {
      const campaign = getCampaign('iceDragonTreasure');
      const selectedHeroIds = getDefaultSelectedHeroIds(campaign);
      const firstHeroId = selectedHeroIds[0];
      renderHeroSelection(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        'iceDragonTreasure',
        {
          selectedHeroIds,
          names: firstHeroId ? { [firstHeroId]: 'Sir Sten' } : {},
          env,
        },
      );
    },
  ],
  [
    'welcome',
    (ctx, env) => renderWelcome(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, { env }),
  ],
  [
    'compactTopBar',
    (ctx, env) => renderTopBar(ctx, COMPACT_WIDTH, midCampaignState(), { env }),
  ],
  [
    'heroCardsWithInventory',
    (ctx, env) => {
      const state = midCampaignState();
      (state.heroes as Hero[])[0].isInventoryOpen = true;
      renderHeroCards(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, { env });
    },
  ],
];

describe('sentinel theme', () => {
  it.each(runs)('%s writes only sentinel styles', (name, draw) => {
    const rec = createRecordingContext();
    draw(rec.ctx, sentinelEnv);
    expect(rec.log.length, `${name} rendered nothing`).toBeGreaterThan(0);
    const leaked = leakedStyles(rec.log);
    expect(
      leaked.length === 0,
      `${name} leaked style literals: ${leaked.join(', ')}`,
    ).toBe(true);
  });
});
