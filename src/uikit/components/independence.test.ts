// The independence test: every component is driven by a hand-built view
// model alone — no GameState, no adapter, no fixture from the game side.
// For each component this builds a minimal view model, lays it out,
// hit-tests a region and renders into a recording context. It is both a
// usage contract (the kit is usable without the game) and a compile-time
// check that the view models are complete.
//
// The kit ships no strings: every label below is a stand-in the test
// itself provides (the translator is the identity), never a default.

import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../testing/recordingContext';
import { defaultTheme } from '../theme';
import type { UiContext, UiEnv } from '../env';

const env: UiEnv = {
  theme: defaultTheme,
  mode: 'regular',
  t: (key) => key,
  measure: { width: (text) => text.length * 6.5 },
};

const ui = (ctx: CanvasRenderingContext2D): UiContext => ({
  ...env,
  ctx,
  assets: { get: () => undefined },
});

const viewBounds = { x: 0, y: 0, width: 1280, height: 800 };

const rendersSomething = (log: readonly string[]): boolean =>
  log.some((entry) => entry.startsWith('fill') || entry.startsWith('stroke'));

import {
  hitTestBetweenDungeons,
  layoutBetweenDungeons,
  renderBetweenDungeons,
} from './betweenDungeons';
import { hitTestDiary, layoutDiary, renderDiary } from './diary';
import {
  hitTestDungeonIntro,
  layoutDungeonIntro,
  renderDungeonIntro,
} from './dungeonIntro';
import {
  hitTestEventCard,
  layoutEventCard,
  renderEventCard,
} from './eventCard';
import {
  hitTestHeroCards,
  layoutHeroCards,
  renderHeroCards,
} from './heroCards';
import {
  hitTestHeroSelection,
  layoutHeroSelection,
  renderHeroSelection,
} from './heroSelection';
import { hitTestMenu, layoutMenu, renderMenu } from './menu';
import {
  hitTestMonsterCards,
  layoutMonsterCards,
  renderMonsterCards,
} from './monsterCards';
import {
  hitTestNewGameDialog,
  layoutNewGameDialog,
  renderNewGameDialog,
} from './newGameDialog';
import {
  hitTestRadialMenu,
  layoutRadialMenu,
  renderRadialMenu,
} from './radialMenu';
import {
  hitTestSaveLoadDialog,
  layoutSaveLoadDialog,
  renderSaveLoadDialog,
} from './saveLoadDialog';
import {
  hitTestSettings,
  layoutSettings,
  renderSettings,
  hitTestCredits,
  layoutCredits,
  renderCredits,
} from './settings';
import { hitTestTopBar, layoutTopBar, renderTopBar } from './topBar';
import { hitTestWelcome, layoutWelcome, renderWelcome } from './welcome';

describe('component independence (hand-built view models)', () => {
  it('topBar lays out, hit-tests and renders', () => {
    const vm = {
      menuLabel: 'Menu',
      debugLabel: 'Debug',
      showDebug: false,
      turnText: 'Turn 3',
      scoreText: 'Score 120',
      isSpeedrun: false,
      timerText: '',
      timerTemplateText: '00:00',
      turnTemplateText: 'Turn 000',
      scoreTemplateText: 'Score 000',
      logText: 'Nothing happened.',
      logEntries: ['Nothing happened.', 'Something happened.'],
    };
    const layout = layoutTopBar(vm, viewBounds, env);
    const hit = hitTestTopBar(layout, {
      x: layout.menuButton.x + 2,
      y: layout.menuButton.y + 2,
    });
    const rec = createRecordingContext();
    renderTopBar(layout, vm, ui(rec.ctx));
    expect(hit).toBe('menu');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('heroCards lays out, hit-tests and renders', () => {
    const vm = {
      cards: [
        {
          heroId: 'hero-1',
          title: 'Hero One',
          colour: '#CD5C5C',
          isCurrent: true,
          isTarget: false,
          hpText: 'HP: 6',
          actionsText: 'Actions: 2',
          movesText: 'Moves: 4',
          equipmentText: 'Equipment:',
          weaponText: '🗡️ Sword (2)',
          armourText: '🥋 Mail (1)',
          shieldText: '🛡️ None (0)',
          inventoryButtonIcon: '🎒',
          inventory: {
            heroId: 'hero-1',
            titleText: 'Hero One inventory',
            emptyText: '(Empty)',
            closeIcon: '✕',
            items: [
              {
                itemIndex: 0,
                nameText: 'Potion',
                descriptionText: 'Heals',
                hasUseButton: true,
                isUsable: true,
                isUsed: false,
                useText: 'Use',
                usedText: 'Used',
                icon: '🧪',
              },
            ],
          },
        },
        {
          heroId: 'hero-2',
          title: 'Hero Two',
          colour: '#1E90FF',
          isCurrent: false,
          isTarget: true,
          hpText: 'HP: 5',
          inventoryButtonIcon: '🎒',
          inventory: null,
        },
      ],
    };
    const layout = layoutHeroCards(vm, viewBounds);
    const invBtn = layout.cards[0].inventoryButtonBounds;
    const hit = hitTestHeroCards(layout, {
      x: invBtn.x + 2,
      y: invBtn.y + 2,
    });
    const rec = createRecordingContext();
    renderHeroCards(layout, vm, ui(rec.ctx));
    expect(hit?.kind).toBe('inventoryButton');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('monsterCards lays out, hit-tests and renders', () => {
    const vm = {
      cards: [
        {
          id: 'monster-1',
          title: 'Goblin',
          colour: '#90EE90',
          isCurrent: false,
          isTarget: false,
          hpText: 'HP: 3',
          hasRangedWeapon: false,
          weaponText: '🗡️ Spear (1)',
          rangedWeaponText: '🏹 None (0)',
          armourText: '🥋 None (0)',
          shieldText: '🛡️ None (0)',
        },
      ],
    };
    const layout = layoutMonsterCards(vm, viewBounds);
    const hit = hitTestMonsterCards(layout, {
      x: layout.cards[0].bounds.x + 4,
      y: layout.cards[0].bounds.y + 4,
    });
    const rec = createRecordingContext();
    renderMonsterCards(layout, vm, ui(rec.ctx));
    expect(hit?.kind).toBe('card');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('dungeonIntro lays out, hit-tests and renders', () => {
    const vm = {
      titleText: 'The Buried Gate',
      introText: 'The gate groans open.',
      closeButtonLabel: 'Close',
    };
    const layout = layoutDungeonIntro(vm, viewBounds, env);
    const hit = hitTestDungeonIntro(layout, {
      x: layout.closeButtonBounds.x + 2,
      y: layout.closeButtonBounds.y + 2,
    });
    const rec = createRecordingContext();
    renderDungeonIntro(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('close');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('menu lays out, hit-tests and renders', () => {
    const vm = {
      view: 'main',
      headerText: 'Menu',
      items: [
        { id: 'new_game', label: 'New Game' },
        { id: 'load_game', label: 'Load Game' },
      ],
      footerText: 'built today',
    };
    const layout = layoutMenu(vm, viewBounds);
    const hit = hitTestMenu(layout, {
      x: layout.items[0].bounds.x + 2,
      y: layout.items[0].bounds.y + 2,
    });
    const rec = createRecordingContext();
    renderMenu(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('item');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('welcome lays out, hit-tests and renders', () => {
    const vm = {
      headerText: 'Drakriddarna',
      buttons: [
        { id: 'newGame', label: 'New Game' },
        { id: 'loadGame', label: 'Load Game' },
        { id: 'settings', label: 'Settings' },
      ],
      footerText: 'built today',
      backgroundAssetId: 'welcomeBackground',
    };
    const layout = layoutWelcome(vm, viewBounds);
    const hit = hitTestWelcome(layout, {
      x: layout.buttons[0].bounds.x + 2,
      y: layout.buttons[0].bounds.y + 2,
    });
    const rec = createRecordingContext();
    renderWelcome(layout, vm, ui(rec.ctx));
    expect(hit).toBe('newGame');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('saveLoadDialog lays out, hit-tests and renders in both modes', () => {
    const build = (mode: 'save' | 'load') => ({
      mode,
      titleText: mode === 'save' ? 'Save' : 'Load',
      subtitleText: 'Choose',
      rows:
        mode === 'load'
          ? [
              { id: 'save-a', label: 'Save A', hint: 'Dungeon 2' },
              { id: 'save-b', label: 'Save B' },
            ]
          : [],
      actionButtonLabel: mode === 'save' ? 'Save' : 'Back',
      secondaryButtonLabel: mode === 'save' ? 'Cancel' : undefined,
    });
    for (const mode of ['save', 'load'] as const) {
      const layout = layoutSaveLoadDialog(build(mode), viewBounds, env);
      const hit = hitTestSaveLoadDialog(layout, {
        x: layout.actionButtonBounds!.x + 2,
        y: layout.actionButtonBounds!.y + 2,
      });
      const rec = createRecordingContext();
      renderSaveLoadDialog(layout, ui(rec.ctx), { saveName: 'Run' });
      expect(hit?.kind).toBe('action');
      expect(rendersSomething(rec.log)).toBe(true);
    }
  });

  it('newGameDialog lays out, hit-tests and renders', () => {
    const vm = {
      titleText: 'New Game',
      campaignHeaderText: 'Campaign',
      gameMasterHeaderText: 'Game Master',
      campaignRows: [{ id: 'c1', label: 'Treasure of the Ice Dragon' }],
      gameMasterRows: [{ id: 'easy', label: 'Easy' }],
      checkboxLabelText: 'Speedrunner mode',
      seedLabelText: 'Seed',
      actionButtonLabel: 'Begin',
      secondaryButtonLabel: 'Cancel',
    };
    const layout = layoutNewGameDialog(vm, viewBounds, {
      selectedCampaignId: 'c1',
      speedrunMode: true,
    });
    const hit = hitTestNewGameDialog(layout, {
      x: layout.campaignRows[0].bounds.x + 2,
      y: layout.campaignRows[0].bounds.y + 2,
    });
    const rec = createRecordingContext();
    renderNewGameDialog(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('campaign');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('heroSelection lays out, hit-tests and renders', () => {
    const vm = {
      headerText: 'Choose your heroes',
      startButtonLabel: 'Start',
      backButtonLabel: 'Back',
      minHeroes: 1,
      maxHeroes: 2,
      rows: [
        { id: 'h1', defaultLabel: 'Fearik', colour: '#CD5C5C' },
        { id: 'h2', defaultLabel: 'Helbran', colour: '#1E90FF' },
      ],
    };
    const layout = layoutHeroSelection(vm, viewBounds, env, {
      selectedHeroIds: ['h1'],
      names: {},
    });
    const hit = hitTestHeroSelection(layout, {
      x: layout.rows[0].checkboxBounds.x + 2,
      y: layout.rows[0].checkboxBounds.y + 2,
    });
    const rec = createRecordingContext();
    renderHeroSelection(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('checkbox');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('settings and credits lay out, hit-test and render', () => {
    const settingsVm = {
      headerText: 'Settings',
      backButtonLabel: 'Back',
      rows: [
        {
          id: 'music',
          kind: 'toggle' as const,
          label: 'Music: On',
          dimmed: false,
        },
        {
          id: 'musicVolume',
          kind: 'slider' as const,
          label: 'Music volume',
          dimmed: false,
          value: 0.5,
        },
      ],
    };
    const settingsLayout = layoutSettings(settingsVm, viewBounds);
    const settingsHit = hitTestSettings(settingsLayout, {
      x: settingsLayout.rows[0].bounds.x + 2,
      y: settingsLayout.rows[0].bounds.y + 2,
    });
    const rec = createRecordingContext();
    renderSettings(settingsLayout, ui(rec.ctx));
    expect(settingsHit?.kind).toBe('toggle');
    expect(rendersSomething(rec.log)).toBe(true);

    const creditsVm = {
      headerText: 'Credits',
      backButtonLabel: 'Back',
      rows: [
        { id: 'music', label: 'Music license', url: 'https://example.com' },
      ],
    };
    const creditsLayout = layoutCredits(creditsVm, viewBounds);
    const creditsHit = hitTestCredits(creditsLayout, {
      x: creditsLayout.rows[0].bounds.x + 2,
      y: creditsLayout.rows[0].bounds.y + 2,
    });
    const rec2 = createRecordingContext();
    renderCredits(creditsLayout, ui(rec2.ctx));
    expect(creditsHit?.kind).toBe('row');
    expect(rendersSomething(rec2.log)).toBe(true);
  });

  it('eventCard lays out, hit-tests and renders', () => {
    const vm = {
      headerText: '🎴 Events (1/2)',
      deckSummary: { remaining: 1, total: 2, drawn: 1 },
      activeEvent: {
        header: 'Current event',
        title: '1. The Sun Stone',
        description: 'Warm light radiates.',
      },
      drawnEventsHeader: 'Drawn (1):',
      drawnEvents: [{ number: 1, title: '• 1. The Hungry Troll' }],
      emptyDrawnText: '(None drawn yet)',
    };
    const layout = layoutEventCard(vm, viewBounds, env);
    const hit = hitTestEventCard(layout, {
      x: layout.toggleButtonBounds.x + 2,
      y: layout.toggleButtonBounds.y + 2,
    });
    const rec = createRecordingContext();
    renderEventCard(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('toggle');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('diary lays out, hit-tests and renders', () => {
    const vm = {
      diaryHeader: 'Diary (turn 3)',
      winConditions: [
        { text: 'Kill all monsters.', fulfilled: false },
        { text: 'Open a certain door.', fulfilled: true },
      ],
      diaryNotes: [
        { header: 'On 2)', message: 'A secret is revealed.', turn: 2 },
      ],
    };
    const layout = layoutDiary(vm, viewBounds, env);
    const hit = hitTestDiary(layout, {
      x: layout.bounds.x + 4,
      y: layout.bounds.y + 4,
    });
    const rec = createRecordingContext();
    renderDiary(layout, ui(rec.ctx));
    expect(hit?.kind).toBe('panel');
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('betweenDungeons lays out, hit-tests and renders the trade step', () => {
    const vm = {
      step: 'trade' as const,
      titleText: 'Trade items',
      subtitleText: 'Give items between heroes',
      actionButtonLabel: 'Start next dungeon',
      secondaryButtonLabel: 'Back to level up',
      scoreSection: null,
      campaignComplete: null,
      wipeChoices: undefined,
      wipeHighScores: null,
      heroes: [
        {
          heroIndex: 0,
          title: 'Fearik',
          colourKey: 'red' as const,
          levelBadge: 'Apprentice',
          isLeveledUp: false,
          xpText: '12 XP',
          levelMeaningText: '',
          items: [
            {
              slot: 0,
              itemIndex: 0,
              nameText: '🗡️ Sword (2)',
              isSelected: true,
            },
          ],
        },
        {
          heroIndex: 1,
          title: 'Helbran',
          colourKey: 'blue' as const,
          levelBadge: 'Apprentice',
          isLeveledUp: false,
          xpText: '9 XP',
          levelMeaningText: '',
          items: [],
        },
      ],
      selectedTradeHeroIndex: 0,
      giveItemText: 'Give',
      noItemsText: 'No items',
    };
    const layout = layoutBetweenDungeons(vm, viewBounds, defaultTheme);
    const item = layout.heroes[0].items[0];
    const hit = hitTestBetweenDungeons(layout, {
      x: item.bounds.x + 2,
      y: item.bounds.y + 2,
    });
    const rec = createRecordingContext();
    renderBetweenDungeons(layout, vm, ui(rec.ctx));
    expect(hit?.kind).toBe('item');
    expect(layout.giveButtons.length).toBe(1);
    expect(rendersSomething(rec.log)).toBe(true);
  });

  it('radialMenu lays out, hit-tests and renders', () => {
    const vm = {
      origin: { x: 3, y: 2 },
      buttons: [
        { id: 0, label: 'Search', icon: '🔍' },
        { id: 1, label: 'Open door', icon: '🚪' },
      ],
    };
    const layout = layoutRadialMenu(vm, 48);
    const hit = hitTestRadialMenu(layout, {
      x: layout.items[0].x,
      y: layout.items[0].y,
    });
    const rec = createRecordingContext();
    renderRadialMenu(layout, ui(rec.ctx), { hoveredId: 0 });
    expect(hit?.kind).toBe('button');
    expect(rendersSomething(rec.log)).toBe(true);
  });
});
