import { describe, it, expect, vi } from 'vitest';
import {
  getBetweenDungeonsLayout,
  getBetweenDungeonsHit,
  renderBetweenDungeons,
} from './BetweenDungeonsRendering';
import {
  openBetweenDungeons,
  openCampaignComplete,
  openPartyWipe,
  setBetweenDungeonsStep,
} from '../dungeon/BetweenDungeonsLogic';
import { init } from '../game';
import type { ScenarioScore } from '../types';

const createMockCtx = () =>
  ({
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
  }) as unknown as CanvasRenderingContext2D;

describe('BetweenDungeonsRendering', () => {
  it('returns empty layout if betweenDungeons is not present', () => {
    const state = init();
    state.betweenDungeons = undefined;
    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(false);
  });

  it('computes levelUp layout when step is levelUp', () => {
    const state = init();
    openBetweenDungeons(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('levelUp');
    expect(layout.heroes.length).toBeGreaterThan(0);
    expect(layout.actionButtonLabel).toBeDefined();
    expect(layout.secondaryButtonBounds).toBeUndefined();
  });

  it('includes the dungeon time in the level-up score section when the run was timed', () => {
    const state = init();
    const scenarioScore: ScenarioScore = {
      healthPoints: 300,
      killPoints: 90,
      itemPoints: 50,
      secretPoints: 50,
      roundPenalty: -20,
      total: 470,
    };
    state.dungeon.score = scenarioScore;

    openBetweenDungeons(state);
    if (state.betweenDungeons) {
      state.betweenDungeons.dungeonTimeMs = 65_400;
    }
    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.scoreSection?.timeText).toBeDefined();

    if (state.betweenDungeons) {
      state.betweenDungeons.dungeonTimeMs = undefined;
    }
    const unTimedLayout = getBetweenDungeonsLayout(800, 600, state);
    expect(unTimedLayout.scoreSection?.timeText).toBeUndefined();
  });

  it('includes the campaign time on the campaign-complete screen when the run was timed', () => {
    const state = init();
    openCampaignComplete(state);
    if (state.betweenDungeons) {
      state.betweenDungeons.campaignTimeMs = 3_723_000;
    }

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.campaignComplete?.timeText).toBeDefined();

    if (state.betweenDungeons) {
      state.betweenDungeons.campaignTimeMs = undefined;
    }
    const unTimedLayout = getBetweenDungeonsLayout(800, 600, state);
    expect(unTimedLayout.campaignComplete?.timeText).toBeUndefined();
  });

  it('computes trade layout when step is trade', () => {
    const state = init();
    openBetweenDungeons(state);
    setBetweenDungeonsStep(state, 'trade');

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('trade');
    expect(layout.heroes.length).toBeGreaterThan(0);
    expect(layout.actionButtonLabel).toBeDefined();
    expect(layout.secondaryButtonBounds).toBeDefined();
  });

  it('handles hit testing on action and secondary buttons', () => {
    const state = init();
    openBetweenDungeons(state);
    setBetweenDungeonsStep(state, 'trade');

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const actionHit = getBetweenDungeonsHit(
      800,
      600,
      state,
      layout.actionButtonBounds.x + 10,
      layout.actionButtonBounds.y + 10,
    );
    expect(actionHit?.type).toBe('actionButton');

    if (layout.secondaryButtonBounds) {
      const secHit = getBetweenDungeonsHit(
        800,
        600,
        state,
        layout.secondaryButtonBounds.x + 10,
        layout.secondaryButtonBounds.y + 10,
      );
      expect(secHit?.type).toBe('secondaryButton');
    }
  });

  it('renders between dungeons without crashing', () => {
    const state = init();
    openBetweenDungeons(state);

    const ctx = createMockCtx();

    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state);
    }).not.toThrow();

    setBetweenDungeonsStep(state, 'trade');
    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state);
    }).not.toThrow();
  });

  it('computes campaignComplete layout with scenario and hero statistics', () => {
    const state = init();
    const scenarioScore: ScenarioScore = {
      healthPoints: 300,
      killPoints: 90,
      itemPoints: 50,
      secretPoints: 50,
      roundPenalty: -20,
      total: 470,
    };
    state.score = 940;
    state.scenarioScores = [
      {
        dungeonName: state.dungeon.name,
        score: scenarioScore,
        rounds: 10,
        kills: 3,
      },
      {
        dungeonName: 'campaign.iceDragon.e1m1.name',
        score: { ...scenarioScore, total: 470 },
        rounds: 12,
        kills: 4,
      },
    ];

    openCampaignComplete(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('campaignComplete');
    expect(layout.campaignComplete).toBeDefined();
    const cc = layout.campaignComplete;
    if (!cc) return;
    expect(cc.scenarioRows.length).toBe(2);
    expect(cc.scenarioRows[0].scoreText).toBe('470');
    expect(cc.scenarioRows[1].roundsText).toBe('12');
    expect(cc.heroRows.length).toBe(state.heroes.length);
    expect(cc.heroRows.every((row) => row.alive)).toBe(true);
    expect(layout.heroes).toEqual([]);
    expect(layout.secondaryButtonBounds).toBeUndefined();

    // The finish button is hit-testable
    const actionHit = getBetweenDungeonsHit(
      800,
      600,
      state,
      layout.actionButtonBounds.x + 10,
      layout.actionButtonBounds.y + 10,
    );
    expect(actionHit?.type).toBe('actionButton');
  });

  it('marks dead heroes as fallen in the campaignComplete hero rows', () => {
    const state = init();
    state.heroes[0].health = 0;
    state.scenarioScores = [
      {
        dungeonName: state.dungeon.name,
        score: {
          healthPoints: 0,
          killPoints: 0,
          itemPoints: 0,
          secretPoints: 0,
          roundPenalty: 0,
          total: 0,
        },
        rounds: 1,
        kills: 0,
      },
    ];

    openCampaignComplete(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const cc = layout.campaignComplete;
    expect(cc).toBeDefined();
    if (!cc) return;
    const fallen = cc.heroRows[0];
    expect(fallen.alive).toBe(false);
    expect(fallen.hpText).not.toBe(
      `${state.heroes[0].health}/${state.heroes[0].maxHealth}`,
    );
    expect(cc.heroRows.slice(1).every((row) => row.alive)).toBe(true);
  });

  it('renders the campaign-complete screen without crashing', () => {
    const state = init();
    state.scenarioScores = [
      {
        dungeonName: state.dungeon.name,
        score: {
          healthPoints: 300,
          killPoints: 90,
          itemPoints: 50,
          secretPoints: 50,
          roundPenalty: -20,
          total: 470,
        },
        rounds: 10,
        kills: 3,
      },
    ];
    openCampaignComplete(state);

    const ctx = createMockCtx();
    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state);
    }).not.toThrow();
  });

  it('computes the party-wipe layout with three choice buttons', () => {
    const state = init();
    openPartyWipe(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('partyWipe');
    expect(layout.wipeButtons?.length).toBe(3);
    expect(layout.wipeButtons?.map((button) => button.action)).toEqual([
      'restartCampaign',
      'restartDungeon',
      'loadSave',
    ]);
    expect(layout.wipeButtons?.[0].descriptionLines.length).toBeGreaterThan(0);
    // The generic action button is replaced by the wipe choices
    expect(layout.actionButtonBounds.width).toBe(0);
    expect(layout.actionButtonBounds.height).toBe(0);
    expect(layout.heroes).toEqual([]);
    expect(layout.secondaryButtonBounds).toBeUndefined();
    expect(layout.campaignComplete).toBeNull();
  });

  it('ranks the current run into the party-wipe high score list', () => {
    const state = init();
    state.score = 700;
    state.betweenDungeons = {
      completedDungeonName: state.dungeon.name,
      step: 'partyWipe',
      levelUps: [],
      campaignScore: 700,
      wipeHighScores: [
        { score: 900, date: '2024-01-01T00:00:00.000Z' },
        { score: 800, date: '2024-01-02T00:00:00.000Z' },
        { score: 600, date: '2024-01-03T00:00:00.000Z' },
      ],
      selectedTradeItem: null,
    };

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const hs = layout.wipeHighScores;
    expect(hs).toBeDefined();
    if (!hs) return;
    expect(hs.rows.map((row) => row.rankText)).toEqual([
      '1.',
      '2.',
      '3.',
      '4.',
    ]);
    expect(hs.rows.map((row) => row.scoreText)).toEqual([
      '900',
      '800',
      '700',
      '600',
    ]);
    expect(hs.rows.map((row) => row.isCurrent)).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it('appends the current run below the top 10 with its real rank', () => {
    const state = init();
    const stored = Array.from({ length: 10 }, (_, i) => ({
      score: 1000 - i * 10,
      date: '2024-01-01T00:00:00.000Z',
    }));
    state.betweenDungeons = {
      completedDungeonName: state.dungeon.name,
      step: 'partyWipe',
      levelUps: [],
      campaignScore: 5,
      wipeHighScores: stored,
      selectedTradeItem: null,
    };

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const hs = layout.wipeHighScores;
    expect(hs).toBeDefined();
    if (!hs) return;
    expect(hs.rows).toHaveLength(11);
    expect(hs.rows[10].rankText).toBe('11.');
    expect(hs.rows[10].scoreText).toBe('5');
    expect(hs.rows[10].isCurrent).toBe(true);
    expect(hs.rows.slice(0, 10).every((row) => !row.isCurrent)).toBe(true);
  });

  it('shows the current run alone when no high scores are stored', () => {
    const state = init();
    state.betweenDungeons = {
      completedDungeonName: state.dungeon.name,
      step: 'partyWipe',
      levelUps: [],
      campaignScore: 120,
      wipeHighScores: [],
      selectedTradeItem: null,
    };

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const hs = layout.wipeHighScores;
    expect(hs).toBeDefined();
    if (!hs) return;
    expect(hs.rows).toHaveLength(1);
    expect(hs.rows[0].isCurrent).toBe(true);
    expect(hs.rows[0].rankText).toBe('1.');
  });

  it('hit-tests the party-wipe choice buttons', () => {
    const state = init();
    openPartyWipe(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const button = layout.wipeButtons?.[1];
    expect(button).toBeDefined();
    if (!button) return;
    const hit = getBetweenDungeonsHit(
      800,
      600,
      state,
      button.bounds.x + 10,
      button.bounds.y + 10,
    );
    expect(hit).toEqual({ type: 'wipeButton', action: 'restartDungeon' });

    // A click on the backdrop still hits the overlay, never the board
    const backdropHit = getBetweenDungeonsHit(800, 600, state, 5, 5);
    expect(backdropHit?.type).toBe('backdrop');
  });

  it('renders the party-wipe screen without crashing', () => {
    const state = init();
    openPartyWipe(state);

    const ctx = createMockCtx();
    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state, {
        hoveredWipeAction: 'loadSave',
      });
    }).not.toThrow();
  });
});
