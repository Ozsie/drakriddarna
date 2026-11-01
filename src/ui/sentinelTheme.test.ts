// The sentinel parameterization test (docs/ui-kit-spec/05): every chrome
// renderer runs against the parity fixtures with a theme whose tokens are
// unique markers, and every style value written to the context must be
// (or contain) a marker. A leaked literal — a color or font the renderer
// still holds — fails here, long before the boundary lint exists.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Colour } from '../types';
import { createRecordingContext } from '../uikit/testing/recordingContext';
import { createSentinelTheme } from '../uikit/testing/sentinelTheme';
import { defaultTheme, type UiTheme } from '../uikit/theme';
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

const runs: [
  string,
  (ctx: CanvasRenderingContext2D, theme: UiTheme) => void,
][] = [
  [
    'topBar',
    (ctx, theme) =>
      renderTopBar(ctx, REGULAR_WIDTH, midCampaignState(), { theme }),
  ],
  [
    'heroCards',
    (ctx, theme) =>
      renderHeroCards(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        theme,
      }),
  ],
  [
    'monsterCards',
    (ctx, theme) =>
      renderMonsterCards(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        midCampaignState(),
        { theme },
      ),
  ],
  [
    'diary',
    (ctx, theme) =>
      renderDiaryAndWinConditions(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        midCampaignState(),
        { theme },
      ),
  ],
  [
    'eventCard',
    (ctx, theme) =>
      renderEventCard(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        theme,
      }),
  ],
  [
    'betweenDungeons',
    (ctx, theme) =>
      renderBetweenDungeons(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        betweenDungeonsState(),
        { theme },
      ),
  ],
  [
    'dungeonIntro',
    (ctx, theme) =>
      renderDungeonIntro(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, earlyGameState(), {
        theme,
      }),
  ],
  [
    'menuModal',
    (ctx, theme) =>
      renderMenuModal(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, midCampaignState(), {
        theme,
        view: 'main',
      }),
  ],
  [
    'radialMenu',
    (ctx, theme) => {
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
        theme,
      );
    },
  ],
  [
    'saveLoadDialog',
    (ctx, theme) => {
      const state = midCampaignState();
      localStorage.setItem('saves', saveIndexFixture(state));
      localStorage.setItem('save_save-alpha', JSON.stringify(state));
      renderSaveLoadDialog(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, {
        mode: 'load',
        theme,
      });
    },
  ],
  [
    'newGameDialog',
    (ctx, theme) =>
      renderNewGameDialog(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, {
        selectedCampaignId: 'iceDragonTreasure',
        theme,
      }),
  ],
  [
    'settings',
    (ctx, theme) =>
      renderSettings(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, DEFAULT_APP_SETTINGS, {
        theme,
      }),
  ],
  [
    'credits',
    (ctx, theme) =>
      renderCredits(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, { theme }),
  ],
  [
    'heroSelection',
    (ctx, theme) => {
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
          theme,
        },
      );
    },
  ],
  [
    'welcome',
    (ctx, theme) =>
      renderWelcome(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, { theme }),
  ],
  [
    'compactTopBar',
    (ctx, theme) =>
      renderTopBar(ctx, COMPACT_WIDTH, midCampaignState(), { theme }),
  ],
  [
    'heroCardsWithInventory',
    (ctx, theme) => {
      const state = midCampaignState();
      (state.heroes as Hero[])[0].isInventoryOpen = true;
      renderHeroCards(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, state, { theme });
    },
  ],
];

describe('sentinel theme', () => {
  it.each(runs)('%s writes only sentinel styles', (name, draw) => {
    const rec = createRecordingContext();
    draw(rec.ctx, sentinelTheme);
    expect(rec.log.length, `${name} rendered nothing`).toBeGreaterThan(0);
    const leaked = leakedStyles(rec.log);
    expect(
      leaked.length === 0,
      `${name} leaked style literals: ${leaked.join(', ')}`,
    ).toBe(true);
  });
});
