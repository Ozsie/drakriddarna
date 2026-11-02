// The sentinel parameterization test (docs/ui-kit-spec/05): every chrome
// renderer runs against the parity fixtures with a theme whose tokens are
// unique markers, and every style value written to the context must be
// (or contain) a marker. A leaked literal — a color or font the renderer
// still holds — fails here, long before the boundary lint exists.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Colour } from '../types';
import { createRecordingContext } from '../uikit/testing/recordingContext';
import { createSentinelTheme } from '../uikit/testing/sentinelTheme';
import type { UiEnv } from '../uikit';
import { defaultTheme } from '../uikit';
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
import { renderDebugMenuModal } from './DebugMenuRendering';
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
    'debugMenuModal',
    (ctx, env) =>
      renderDebugMenuModal(
        ctx,
        REGULAR_WIDTH,
        REGULAR_HEIGHT,
        midCampaignState(),
        {
          env,
          view: 'debug',
        },
      ),
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

// The sentinel translator: every string a component draws must either
// carry the «key» marker from the test translator or be a deliberate
// non-translation — the icon glyphs the kit draws itself, data-derived
// fragments (durations, counts, HP), player-typed names, save names,
// and the labels MenuLogic produces through the global store
// translator (rendered keys under the sentinel). A hardcoded label in a
// kit component fails this test.
const TEXT_MARKER = /«/;

// Icon glyphs and symbols the kit or the game-side tables draw as-is.
const GLYPH_ALLOWLIST = new Set([
  '🎒',
  '✕',
  '−',
  '+',
  '🎴',
  '📖',
  '❇️',
  '✓',
  '🔍',
  '🗝️',
  '🚪',
  '⚡',
  '✨',
  '→',
  '(Empty)',
]);

// User-typed or save-content names from the fixtures.
const USER_CONTENT_ALLOWLIST = new Set(['Sir Sten', 'Before the gates']);

// Pre-existing untranslated toggle labels in MenuLogic and the settings
// view model (game-side i18n debt — fixing them needs human-authored
// source text, see the AI policy; recorded in docs/ui-kit-inventory.md).
const TOGGLE_LABEL = /^(Music|Debug|Sound|Audio): (On|Off)$/;

// The debug menu header falls back to plain "Debug" while its key is
// untranslated through the global store — same i18n debt family.
const PLAIN_FALLBACK_LABELS = new Set(['Debug']);

// Durations (mm:ss, h:mm:ss, with centiseconds) and bare counts.
const DATA_SHAPE = /^-?\d+(:\d{2})+(\.\d+)?$|^-?\d+([./]\d+)* ?(%|XP)?$/;

// A translation key handed over verbatim by game-side code that
// translates through the global store (MenuLogic) or was translated at
// state-write time (level meanings).
const KEY_SHAPE = /^([a-z][a-zA-Z0-9]*\.)+[a-zA-Z0-9.]+$/;

const isAllowed = (text: string): boolean =>
  TEXT_MARKER.test(text) ||
  GLYPH_ALLOWLIST.has(text) ||
  USER_CONTENT_ALLOWLIST.has(text) ||
  PLAIN_FALLBACK_LABELS.has(text) ||
  TOGGLE_LABEL.test(text) ||
  DATA_SHAPE.test(text) ||
  // Multi-token labels (e.g. a menu item with an appended game-master
  // key) pass when every token is a key, glyph or data fragment.
  text
    .split(' ')
    .every(
      (token) =>
        KEY_SHAPE.test(token) || GLYPH_ALLOWLIST.has(token) || token === '-',
    );

const drawnTexts = (log: readonly string[]): string[] =>
  log.flatMap((entry) => {
    const match =
      /^fillText\((.*), (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)$/.exec(entry);
    if (!match) return [];
    return [match[1].replace(/^"|"$/g, '')];
  });

describe('sentinel translator', () => {
  it.each(runs)(
    '%s draws only translated or allowlisted strings',
    (name, draw) => {
      const sentinelTranslatorEnv: UiEnv = {
        ...defaultUiEnv,
        t: (key: string) => `«${key}»`,
      };
      const rec = createRecordingContext();
      draw(rec.ctx, sentinelTranslatorEnv);
      const leaked = drawnTexts(rec.log).filter((text) => !isAllowed(text));
      expect(
        leaked.length === 0,
        `${name} drew unmarked strings: ${[...new Set(leaked)].join(', ')}`,
      ).toBe(true);
    },
  );
});
