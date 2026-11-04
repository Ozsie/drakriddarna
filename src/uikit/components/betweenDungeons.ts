// Between-dungeons component: the centered modal shown between dungeons
// — the level-up step (with the scenario score breakdown), the trading
// step (item columns with give buttons), the campaign-complete statistics
// and the party-wipe screen (choice buttons plus the ranked high-score
// list). Kit component per the 02 contract — the view model carries every
// text and the step's data prebuilt by the game-side adapter (including
// the high-score merge and the tradable-item selection); layout is
// canvas-free; hits are semantic.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import {
  PER_CHAR_WIDTH_FALLBACK,
  composeFont,
  wrapTextMeasured,
} from '../primitives/text';
import {
  drawDialogScrim,
  drawModalFrame,
  drawModalHeader,
} from '../kit/modalFrame';
import { drawButton } from '../kit/button';
import { drawListRow, listRowStyles, type ListRowStyles } from '../kit/listRow';
import type { UiContext } from '../env';
import type { UiTheme } from '../theme';

export type BetweenDungeonsStep =
  'levelUp' | 'trade' | 'campaignComplete' | 'partyWipe';

/** Which theme actor-dot token a hero's colour maps to. */
export type ActorColourKey = 'red' | 'blue' | 'yellow' | 'green';

export interface ScoreSectionVm {
  readonly totalText: string;
  readonly campaignText: string;
  readonly breakdownTexts: string[];
  /** Final wall-clock time of the completed dungeon, when timed. */
  readonly timeText?: string;
}

export interface CampaignCompleteScenarioRowVm {
  readonly nameText: string;
  readonly roundsText: string;
  readonly killsText: string;
  readonly scoreText: string;
}

export interface CampaignCompleteHeroRowVm {
  readonly title: string;
  readonly colourKey: ActorColourKey;
  readonly levelText: string;
  readonly xpText: string;
  readonly hpText: string;
  readonly killsText: string;
  readonly itemsText: string;
  readonly alive: boolean;
}

export interface CampaignCompleteVm {
  readonly scoreText: string;
  /** Total wall-clock time of the whole campaign, when timed. */
  readonly timeText?: string;
  readonly summaryText: string;
  readonly scenarioHeader: {
    name: string;
    rounds: string;
    kills: string;
    score: string;
  };
  readonly scenarioRows: readonly CampaignCompleteScenarioRowVm[];
  readonly heroHeader: {
    name: string;
    level: string;
    xp: string;
    health: string;
    kills: string;
    items: string;
  };
  readonly heroRows: readonly CampaignCompleteHeroRowVm[];
}

export interface WipeChoiceVm {
  /** The wipe action id, e.g. 'restartCampaign'. */
  readonly action: string;
  readonly labelText: string;
  readonly descriptionText: string;
}

export interface HighScoreRowVm {
  readonly score: number;
  readonly isCurrent: boolean;
}

export interface WipeHighScoresVm {
  readonly headerText: string;
  readonly currentLabelText: string;
  /** Ranked display rows, the current run merged in. */
  readonly rows: readonly HighScoreRowVm[];
}

export interface TradeItemVm {
  readonly slot: number | string;
  readonly itemIndex: number;
  readonly nameText: string;
  readonly isSelected: boolean;
}

export interface HeroSectionVm {
  readonly heroIndex: number;
  readonly title: string;
  readonly colourKey: ActorColourKey;
  readonly levelBadge: string;
  readonly isLeveledUp: boolean;
  readonly xpText: string;
  readonly levelMeaningText: string;
  readonly items: readonly TradeItemVm[];
}

export interface BetweenDungeonsViewModel {
  readonly step: BetweenDungeonsStep;
  readonly titleText: string;
  readonly subtitleText: string;
  readonly actionButtonLabel: string;
  readonly secondaryButtonLabel?: string;
  readonly scoreSection?: ScoreSectionVm | null;
  readonly campaignComplete?: CampaignCompleteVm | null;
  readonly wipeChoices?: readonly WipeChoiceVm[];
  readonly wipeHighScores?: WipeHighScoresVm | null;
  readonly heroes: readonly HeroSectionVm[];
  /** The hero whose item is selected for trading, null when none. */
  readonly selectedTradeHeroIndex: number | null;
  /** Label for the give buttons (trade step). */
  readonly giveItemText: string;
  /** Label for a hero column without tradable items. */
  readonly noItemsText: string;
}

export interface PartyWipeButtonLayout {
  action: string;
  bounds: Rect;
  labelText: string;
  descriptionLines: string[];
}

export interface PartyWipeScoreRow {
  rankText: string;
  scoreText: string;
  isCurrent: boolean;
  y: number;
}

export interface PartyWipeHighScoresLayout {
  bounds: Rect;
  headerText: string;
  currentLabelText: string;
  rows: PartyWipeScoreRow[];
}

export interface ScoreSectionLayout {
  bounds: Rect;
  totalText: string;
  campaignText: string;
  breakdownTexts: string[];
  timeText?: string;
}

export interface CampaignCompleteScenarioRow {
  nameText: string;
  roundsText: string;
  killsText: string;
  scoreText: string;
  y: number;
}

export interface CampaignCompleteHeroRow {
  title: string;
  colourKey: ActorColourKey;
  levelText: string;
  xpText: string;
  hpText: string;
  killsText: string;
  itemsText: string;
  alive: boolean;
  y: number;
}

export interface CampaignCompleteLayout {
  scoreText: string;
  scoreY: number;
  timeText?: string;
  summaryText: string;
  summaryY: number;
  scenarioHeader: {
    name: string;
    rounds: string;
    kills: string;
    score: string;
  };
  scenarioHeaderY: number;
  scenarioRows: CampaignCompleteScenarioRow[];
  heroHeader: {
    name: string;
    level: string;
    xp: string;
    health: string;
    kills: string;
    items: string;
  };
  heroHeaderY: number;
  heroRows: CampaignCompleteHeroRow[];
}

export interface TradeItemLayoutItem {
  heroIndex: number;
  slot: number | string;
  itemIndex: number;
  bounds: Rect;
  nameText: string;
  isSelected: boolean;
}

export interface HeroSectionLayoutItem {
  heroIndex: number;
  hero: HeroSectionVm;
  bounds: Rect;
  title: string;
  levelBadge: string;
  isLeveledUp: boolean;
  xpText: string;
  levelMeaningText: string;
  items: TradeItemLayoutItem[];
}

export interface GiveButtonLayoutItem {
  targetHeroIndex: number;
  bounds: Rect;
  label: string;
}

export interface BetweenDungeonsLayout {
  hasContent: boolean;
  step: BetweenDungeonsStep;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  scoreSection?: ScoreSectionLayout | null;
  campaignComplete?: CampaignCompleteLayout | null;
  wipeButtons?: PartyWipeButtonLayout[];
  wipeHighScores?: PartyWipeHighScoresLayout | null;
  heroes: HeroSectionLayoutItem[];
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  giveButtons: GiveButtonLayoutItem[];
}

/** Semantic hit: which affordance of the dialog is under the point. */
export type BetweenDungeonsHit =
  | { kind: 'actionButton' }
  | { kind: 'secondaryButton' }
  | {
      kind: 'item';
      heroIndex: number;
      slot: number | string;
      itemIndex: number;
    }
  | { kind: 'giveItem'; targetHeroIndex: number }
  | { kind: 'wipeButton'; action: string }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

// The wipe descriptions have always been wrapped with the per-character
// approximation (no context), so the wrap is part of the layout contract.
const perCharMeasure = (perChar: number) => ({
  width: (text: string) => text.length * perChar,
});

export const emptyBetweenDungeonsLayout = (): BetweenDungeonsLayout => ({
  hasContent: false,
  step: 'levelUp',
  backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  titleText: '',
  subtitleText: '',
  heroes: [],
  actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  actionButtonLabel: '',
  giveButtons: [],
});

export const layoutBetweenDungeons = (
  vm: BetweenDungeonsViewModel | null,
  viewBounds: Rect,
  theme: UiTheme,
): BetweenDungeonsLayout => {
  if (!vm) return emptyBetweenDungeonsLayout();
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (viewWidth <= 0 || viewHeight <= 0) return emptyBetweenDungeonsLayout();

  const isLevelUp = vm.step === 'levelUp';
  const isCampaignComplete = vm.step === 'campaignComplete';
  const isPartyWipe = vm.step === 'partyWipe';

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(340, viewWidth - marginX * 2));
  const panelHeight = Math.min(540, Math.max(360, viewHeight - marginY * 2));
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const btnHeight = 36;
  const btnWidth = isCampaignComplete ? 200 : isLevelUp ? 180 : 220;
  const btnY = panelY + panelHeight - paddingY - btnHeight;
  const btnX = panelX + panelWidth - paddingX - btnWidth;

  // The party-wipe screen draws its own stacked choice buttons instead of
  // the generic action button.
  const actionButtonBounds: Rect = isPartyWipe
    ? { x: 0, y: 0, width: 0, height: 0 }
    : {
        x: btnX,
        y: btnY,
        width: btnWidth,
        height: btnHeight,
      };

  let secondaryButtonBounds: Rect | undefined = undefined;
  let secondaryButtonLabel: string | undefined = undefined;

  if (vm.step === 'trade') {
    const secWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secWidth,
      height: btnHeight,
    };
    secondaryButtonLabel = vm.secondaryButtonLabel;
  }

  // Score breakdown of the completed scenario, shown on the level-up step
  // between the subtitle and the hero cards.
  let scoreSection: ScoreSectionLayout | null = null;
  if (isLevelUp && vm.scoreSection) {
    const s = vm.scoreSection;
    scoreSection = {
      bounds: {
        x: panelX + paddingX,
        y: panelY + paddingY + 54,
        width: contentWidth,
        height: 46,
      },
      totalText: s.totalText,
      campaignText: s.campaignText,
      breakdownTexts: [...s.breakdownTexts],
      timeText: s.timeText,
    };
  }

  // Campaign-complete statistics: campaign score headline, a per-scenario
  // score table and one final row of statistics per hero.
  let campaignComplete: CampaignCompleteLayout | null = null;
  if (isCampaignComplete && vm.campaignComplete) {
    const cc = vm.campaignComplete;
    const scoreY = panelY + paddingY + 58;
    const summaryY = scoreY + 24;
    const scenarioHeaderY = summaryY + 26;
    const scenarioRowHeight = 16;
    const heroHeaderY =
      scenarioHeaderY + 18 + cc.scenarioRows.length * scenarioRowHeight + 14;
    const heroRowHeight = 20;
    campaignComplete = {
      scoreText: cc.scoreText,
      scoreY,
      timeText: cc.timeText,
      summaryText: cc.summaryText,
      summaryY,
      scenarioHeader: cc.scenarioHeader,
      scenarioHeaderY,
      scenarioRows: cc.scenarioRows.map((row, index) => ({
        ...row,
        y: scenarioHeaderY + 18 + index * scenarioRowHeight,
      })),
      heroHeader: cc.heroHeader,
      heroHeaderY,
      heroRows: cc.heroRows.map((row, index) => ({
        ...row,
        y: heroHeaderY + 18 + index * heroRowHeight,
      })),
    };
  }

  // Party-wipe options: choice buttons in the left column, the campaign
  // high score list (with the current run ranked into it) on the right.
  let wipeButtons: PartyWipeButtonLayout[] = [];
  let wipeHighScores: PartyWipeHighScoresLayout | null = null;
  if (isPartyWipe) {
    const colGap = 16;
    const buttonColWidth = Math.floor(contentWidth * 0.52);
    const scoreColWidth = contentWidth - buttonColWidth - colGap;
    const scoreColX = panelX + paddingX + buttonColWidth + colGap;

    const wipeBtnHeight = 68;
    const wipeGap = 14;
    const choices = vm.wipeChoices ?? [];
    const wipeTotalHeight =
      choices.length * wipeBtnHeight + (choices.length - 1) * wipeGap;
    const wipeTop =
      panelY +
      70 +
      Math.max(0, Math.floor((panelHeight - 140 - wipeTotalHeight) / 2));
    wipeButtons = choices.map((choice, index) => ({
      action: choice.action,
      bounds: {
        x: panelX + paddingX,
        y: wipeTop + index * (wipeBtnHeight + wipeGap),
        width: buttonColWidth,
        height: wipeBtnHeight,
      },
      labelText: choice.labelText,
      descriptionLines: wrapTextMeasured(
        perCharMeasure(PER_CHAR_WIDTH_FALLBACK),
        choice.descriptionText,
        buttonColWidth - 32,
        composeFont(theme, theme.typography.sizes.md),
      ),
    }));

    // High scores: the stored top 10 with the current run's score ranked
    // into it; the list is sorted, so the display position is the rank.
    const hs = vm.wipeHighScores;
    if (hs) {
      const scoreRowHeight = 16;
      wipeHighScores = {
        bounds: {
          x: scoreColX,
          y: wipeTop,
          width: scoreColWidth,
          height: 22 + hs.rows.length * scoreRowHeight,
        },
        headerText: hs.headerText,
        currentLabelText: hs.currentLabelText,
        rows: hs.rows.map((row, index) => ({
          rankText: `${String(index + 1)}.`,
          scoreText: String(row.score),
          isCurrent: row.isCurrent,
          y: wipeTop + 22 + index * scoreRowHeight,
        })),
      };
    }
  }

  // Calculate layout for heroes
  const heroCount = vm.heroes.length;
  const heroesY =
    panelY +
    paddingY +
    54 +
    (scoreSection ? scoreSection.bounds.height + 8 : 0);
  const availableHeroHeight = btnY - heroesY - 12;

  const heroesLayout: HeroSectionLayoutItem[] = [];
  const giveButtonsLayout: GiveButtonLayoutItem[] = [];

  if (isCampaignComplete || isPartyWipe) {
    // The campaign-complete and party-wipe steps draw their own content
    // instead of the hero cards.
  } else if (isLevelUp) {
    // Vertical list of heroes with level up details
    const cardGap = 8;
    const cardHeight = Math.max(
      50,
      Math.floor(
        (availableHeroHeight - (heroCount - 1) * cardGap) /
          Math.max(1, heroCount),
      ),
    );

    vm.heroes.forEach((hero, index) => {
      const cardY = heroesY + index * (cardHeight + cardGap);
      const cardBounds: Rect = {
        x: panelX + paddingX,
        y: cardY,
        width: contentWidth,
        height: cardHeight,
      };

      heroesLayout.push({
        heroIndex: hero.heroIndex,
        hero,
        bounds: cardBounds,
        title: hero.title,
        levelBadge: hero.levelBadge,
        isLeveledUp: hero.isLeveledUp,
        xpText: hero.xpText,
        levelMeaningText: hero.levelMeaningText,
        items: [],
      });
    });
  } else {
    // Trading step: columns for heroes
    const colGap = 8;
    const colWidth = Math.floor(
      (contentWidth - (heroCount - 1) * colGap) / Math.max(1, heroCount),
    );

    vm.heroes.forEach((hero, hIndex) => {
      const colX = panelX + paddingX + hIndex * (colWidth + colGap);
      const colBounds: Rect = {
        x: colX,
        y: heroesY,
        width: colWidth,
        height: availableHeroHeight,
      };

      const itemLayouts: TradeItemLayoutItem[] = [];
      const itemStartY = heroesY + 34;
      const itemRowHeight = 26;
      const itemGap = 4;

      hero.items.forEach((entry, entryIndex) => {
        const itemY = itemStartY + entryIndex * (itemRowHeight + itemGap);
        const itemBounds: Rect = {
          x: colX + 4,
          y: itemY,
          width: colWidth - 8,
          height: itemRowHeight,
        };

        itemLayouts.push({
          heroIndex: hero.heroIndex,
          slot: entry.slot,
          itemIndex: entry.itemIndex,
          bounds: itemBounds,
          nameText: entry.nameText,
          isSelected: entry.isSelected,
        });
      });

      // If an item is selected from another hero, add a "Give" button here
      if (
        vm.selectedTradeHeroIndex !== null &&
        vm.selectedTradeHeroIndex !== hero.heroIndex
      ) {
        const giveBtnY = Math.min(
          colBounds.y + colBounds.height - 30,
          itemStartY + hero.items.length * (itemRowHeight + itemGap) + 4,
        );
        const giveBtnBounds: Rect = {
          x: colX + 6,
          y: giveBtnY,
          width: colWidth - 12,
          height: 24,
        };
        giveButtonsLayout.push({
          targetHeroIndex: hero.heroIndex,
          bounds: giveBtnBounds,
          label: vm.giveItemText,
        });
      }

      heroesLayout.push({
        heroIndex: hero.heroIndex,
        hero,
        bounds: colBounds,
        title: hero.title,
        levelBadge: hero.levelBadge,
        isLeveledUp: hero.isLeveledUp,
        xpText: hero.xpText,
        levelMeaningText: hero.levelMeaningText,
        items: itemLayouts,
      });
    });
  }

  return {
    hasContent: true,
    step: vm.step,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText: vm.titleText,
    subtitleText: vm.subtitleText,
    scoreSection,
    campaignComplete,
    wipeButtons,
    wipeHighScores,
    heroes: heroesLayout,
    actionButtonBounds,
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel,
    giveButtons: giveButtonsLayout,
  };
};

export const hitTestBetweenDungeons = (
  layout: BetweenDungeonsLayout,
  point: { x: number; y: number },
): BetweenDungeonsHit => {
  if (!layout.hasContent) return null;

  if (
    layout.actionButtonBounds.width > 0 &&
    isPointInRect(point.x, point.y, layout.actionButtonBounds)
  ) {
    return { kind: 'actionButton' };
  }

  if (
    layout.secondaryButtonBounds &&
    isPointInRect(point.x, point.y, layout.secondaryButtonBounds)
  ) {
    return { kind: 'secondaryButton' };
  }

  for (const giveBtn of layout.giveButtons) {
    if (isPointInRect(point.x, point.y, giveBtn.bounds)) {
      return { kind: 'giveItem', targetHeroIndex: giveBtn.targetHeroIndex };
    }
  }

  for (const hero of layout.heroes) {
    for (const item of hero.items) {
      if (isPointInRect(point.x, point.y, item.bounds)) {
        return {
          kind: 'item',
          heroIndex: item.heroIndex,
          slot: item.slot,
          itemIndex: item.itemIndex,
        };
      }
    }
  }

  for (const wipeButton of layout.wipeButtons ?? []) {
    if (isPointInRect(point.x, point.y, wipeButton.bounds)) {
      return { kind: 'wipeButton', action: wipeButton.action };
    }
  }

  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }

  if (isPointInRect(point.x, point.y, layout.backdropBounds)) {
    return { kind: 'backdrop' };
  }

  return null;
};

const heroColourHex = (theme: UiTheme, key: ActorColourKey): string =>
  theme.palette.actorDot[key];

/**
 * Draws the campaign-complete statistics: score headline, campaign
 * summary, the per-scenario score table and one row per hero.
 */
const renderCampaignCompleteSection = (
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  cc: CampaignCompleteLayout,
  theme: UiTheme,
): void => {
  const x = panel.x + 18;
  const right = panel.x + panel.width - 18;

  const descFont = composeFont(theme, theme.typography.sizes.md);
  const tableHeaderFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const tableFont = composeFont(theme, theme.typography.sizes.sm);

  ctx.textBaseline = 'top';

  // Score headline
  ctx.fillStyle = theme.palette.text.headerDialog;
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.display,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'left';
  ctx.fillText(cc.scoreText, x, cc.scoreY);

  // Campaign total time, right of the score headline
  if (cc.timeText) {
    ctx.fillStyle = theme.palette.text.muted;
    ctx.font = descFont;
    ctx.textAlign = 'right';
    ctx.fillText(cc.timeText, right, cc.scoreY);
  }

  // Campaign summary
  ctx.fillStyle = theme.palette.text.muted;
  ctx.font = descFont;
  ctx.textAlign = 'left';
  ctx.fillText(cc.summaryText, x, cc.summaryY);

  // Per-scenario table
  ctx.font = tableHeaderFont;
  ctx.fillStyle = theme.palette.text.secondary;
  ctx.fillText(cc.scenarioHeader.name, x, cc.scenarioHeaderY);
  ctx.textAlign = 'right';
  ctx.fillText(cc.scenarioHeader.rounds, right - 260, cc.scenarioHeaderY);
  ctx.fillText(cc.scenarioHeader.kills, right - 180, cc.scenarioHeaderY);
  ctx.fillText(cc.scenarioHeader.score, right, cc.scenarioHeaderY);

  for (const row of cc.scenarioRows) {
    ctx.font = tableFont;
    ctx.fillStyle = theme.palette.text.body;
    ctx.textAlign = 'left';
    ctx.fillText(row.nameText, x, row.y);
    ctx.textAlign = 'right';
    ctx.fillText(row.roundsText, right - 260, row.y);
    ctx.fillText(row.killsText, right - 180, row.y);
    ctx.fillStyle = theme.palette.text.scoreGold;
    ctx.fillText(row.scoreText, right, row.y);
  }

  // Per-hero table
  ctx.font = tableHeaderFont;
  ctx.fillStyle = theme.palette.text.secondary;
  ctx.textAlign = 'left';
  ctx.fillText(cc.heroHeader.name, x, cc.heroHeaderY);
  ctx.textAlign = 'right';
  ctx.fillText(cc.heroHeader.level, right - 360, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.xp, right - 290, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.health, right - 200, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.kills, right - 120, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.items, right, cc.heroHeaderY);

  for (const row of cc.heroRows) {
    ctx.font = tableFont;
    ctx.fillStyle = row.alive
      ? theme.palette.text.body
      : theme.palette.text.dimmed;
    if (row.alive) {
      ctx.beginPath();
      ctx.arc(x + 5, row.y + 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = heroColourHex(theme, row.colourKey);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.fillText(row.title, x + 16, row.y);
    ctx.textAlign = 'right';
    ctx.fillText(row.levelText, right - 360, row.y);
    ctx.fillStyle = row.alive
      ? theme.palette.text.body
      : theme.palette.text.dimmed;
    ctx.fillText(row.xpText, right - 290, row.y);
    ctx.fillText(row.hpText, right - 200, row.y);
    ctx.fillText(row.killsText, right - 120, row.y);
    ctx.fillText(row.itemsText, right, row.y);
  }
};

export interface RenderBetweenDungeonsOptions {
  readonly hoveredAction?: boolean;
  readonly hoveredSecondary?: boolean;
  readonly hoveredItem?: {
    heroIndex: number;
    itemIndex?: number;
  } | null;
  readonly hoveredGiveHeroIndex?: number | null;
  readonly hoveredWipeAction?: string | null;
}

export const renderBetweenDungeons = (
  layout: BetweenDungeonsLayout,
  vm: BetweenDungeonsViewModel,
  ui: UiContext,
  options?: RenderBetweenDungeonsOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  const descFont = composeFont(theme, theme.typography.sizes.md);
  const buttonFont = composeFont(
    theme,
    theme.typography.sizes.xl,
    theme.typography.weights.bold,
  );
  const badgeFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const heroNameFont = composeFont(
    theme,
    theme.typography.sizes.xl,
    theme.typography.weights.bold,
  );
  const itemFont = composeFont(theme, theme.typography.sizes.sm);

  const view = layout.backdropBounds;

  ctx.save();

  // Dark backdrop
  drawDialogScrim(ctx, view.width, view.height, theme);

  // Main modal panel
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);
  drawModalHeader(ctx, p, layout.titleText, theme);

  // Subtitle
  ctx.fillStyle = theme.palette.text.secondary;
  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Scenario score breakdown
  const score = layout.scoreSection;
  if (score && layout.step === 'levelUp') {
    const sb = score.bounds;
    ctx.fillStyle = theme.palette.surface.scoreBox;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.scoreBox;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.stroke();

    ctx.font = heroNameFont;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.palette.text.headerDialog;
    ctx.fillText(score.totalText, sb.x + 10, sb.y + 8);
    ctx.textAlign = 'right';
    ctx.fillText(score.campaignText, sb.x + sb.width - 10, sb.y + 8);

    ctx.fillStyle = theme.palette.text.muted;
    ctx.font = descFont;
    ctx.textAlign = 'left';
    ctx.fillText(score.breakdownTexts.join('  ·  '), sb.x + 10, sb.y + 30);
    if (score.timeText) {
      ctx.textAlign = 'right';
      ctx.fillText(score.timeText, sb.x + sb.width - 10, sb.y + 30);
    }
    ctx.textAlign = 'left';
  }

  // Render Heroes / campaign statistics
  if (layout.step === 'partyWipe' && layout.wipeButtons) {
    for (const wb of layout.wipeButtons) {
      const isHovered = options?.hoveredWipeAction === wb.action;
      const wipeStyles: ListRowStyles = isHovered
        ? {
            fill: theme.palette.surface.wipeButtonHover,
            border: theme.palette.border.wipeButtonHover,
            lineWidth: theme.shape.strokeWidth.regular,
          }
        : {
            fill: theme.palette.surface.wipeButton,
            border: theme.palette.border.wipeButton,
            lineWidth: theme.shape.strokeWidth.thin,
          };
      drawListRow(ctx, wb.bounds, wipeStyles, 8);

      ctx.fillStyle = theme.palette.text.strong;
      ctx.font = buttonFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        wb.labelText,
        wb.bounds.x + wb.bounds.width / 2,
        wb.bounds.y + 16,
      );
      ctx.fillStyle = theme.palette.text.wipeDescription;
      ctx.font = descFont;
      wb.descriptionLines.forEach((line, lineIndex) => {
        ctx.fillText(
          line,
          wb.bounds.x + wb.bounds.width / 2,
          wb.bounds.y + 34 + lineIndex * 15,
        );
      });
    }

    const hs = layout.wipeHighScores;
    if (hs) {
      drawListRow(ctx, hs.bounds, listRowStyles(theme, 'rest'));

      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.palette.text.headerDialog;
      ctx.font = badgeFont;
      ctx.fillText(hs.headerText, hs.bounds.x + 10, hs.bounds.y + 8);

      for (const row of hs.rows) {
        ctx.fillStyle = row.isCurrent
          ? theme.palette.text.scoreGold
          : theme.palette.text.secondary;
        ctx.font = itemFont;
        ctx.fillText(row.rankText, hs.bounds.x + 10, row.y);
        ctx.textAlign = 'right';
        const suffix = row.isCurrent ? ` ${hs.currentLabelText}` : '';
        ctx.fillText(
          `${row.scoreText}${suffix}`,
          hs.bounds.x + hs.bounds.width - 10,
          row.y,
        );
        ctx.textAlign = 'left';
      }
    }
  } else if (layout.campaignComplete && layout.step === 'campaignComplete') {
    renderCampaignCompleteSection(ctx, p, layout.campaignComplete, theme);
  } else if (layout.step === 'levelUp') {
    for (const h of layout.heroes) {
      const hb = h.bounds;
      const heroStyles: ListRowStyles = h.isLeveledUp
        ? {
            fill: theme.palette.surface.leveledRow,
            border: theme.palette.border.rowSelected,
            lineWidth: theme.shape.strokeWidth.medium,
          }
        : listRowStyles(theme, 'rest');
      drawListRow(ctx, hb, heroStyles);

      // Hero name & color dot
      ctx.fillStyle = heroColourHex(theme, h.hero.colourKey);
      ctx.beginPath();
      ctx.arc(hb.x + 14, hb.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.palette.text.strong;
      ctx.font = heroNameFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 26, hb.y + 16);

      // XP info
      ctx.fillStyle = theme.palette.text.muted;
      ctx.font = descFont;
      ctx.fillText(h.xpText, hb.x + 140, hb.y + 16);

      // Level badge
      const badgeX = hb.x + hb.width - 110;
      const badgeY = hb.y + 6;
      ctx.fillStyle = h.isLeveledUp
        ? theme.palette.surface.checkboxSelected
        : theme.palette.surface.checkbox;
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.fill();
      ctx.strokeStyle = h.isLeveledUp
        ? theme.palette.border.checkboxSelected
        : theme.palette.border.input;
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.stroke();

      ctx.fillStyle = h.isLeveledUp
        ? theme.palette.text.bright
        : theme.palette.text.body;
      ctx.font = badgeFont;
      ctx.textAlign = 'center';
      ctx.fillText(h.levelBadge, badgeX + 50, badgeY + 10);

      // Level Meaning explanation
      ctx.fillStyle = h.isLeveledUp
        ? theme.palette.text.rowSelected
        : theme.palette.text.secondary;
      ctx.font = descFont;
      ctx.textAlign = 'left';
      ctx.fillText(h.levelMeaningText, hb.x + 26, hb.y + 36);
    }
  } else {
    // Trading step
    for (const h of layout.heroes) {
      const hb = h.bounds;
      drawListRow(ctx, hb, listRowStyles(theme, 'rest'));

      // Hero header
      ctx.fillStyle = heroColourHex(theme, h.hero.colourKey);
      ctx.beginPath();
      ctx.arc(hb.x + 12, hb.y + 14, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.palette.text.strong;
      ctx.font = heroNameFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 22, hb.y + 14);

      if (h.items.length === 0) {
        ctx.fillStyle = theme.palette.text.dimmed;
        ctx.font = itemFont;
        ctx.fillText(vm.noItemsText, hb.x + 10, hb.y + 42);
      }

      // Render Items
      for (const it of h.items) {
        const ib = it.bounds;
        const isHovered =
          options?.hoveredItem?.heroIndex === it.heroIndex &&
          options?.hoveredItem?.itemIndex === it.itemIndex;

        const itemStyles: ListRowStyles = it.isSelected
          ? {
              fill: theme.palette.surface.tradeItemSelected,
              border: theme.palette.border.tradeItemSelected,
              lineWidth: theme.shape.strokeWidth.medium,
            }
          : isHovered
            ? {
                fill: theme.palette.surface.rowHover,
                border: theme.palette.border.rowHover,
                lineWidth: theme.shape.strokeWidth.thin,
              }
            : {
                fill: theme.palette.surface.tradeItem,
                border: theme.palette.border.input,
                lineWidth: theme.shape.strokeWidth.thin,
              };
        drawListRow(ctx, ib, itemStyles, 4);

        ctx.fillStyle = it.isSelected
          ? theme.palette.text.rowSelected
          : theme.palette.text.dialogValue;
        ctx.font = itemFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.nameText, ib.x + 6, ib.y + ib.height / 2);
      }
    }

    // Give buttons
    for (const gb of layout.giveButtons) {
      const gbb = gb.bounds;
      const isHovered = options?.hoveredGiveHeroIndex === gb.targetHeroIndex;
      ctx.fillStyle = isHovered
        ? theme.palette.surface.giveButtonHover
        : theme.palette.surface.giveButton;
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.fill();

      ctx.strokeStyle = theme.palette.border.giveButton;
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.stroke();

      ctx.fillStyle = theme.palette.text.bright;
      ctx.font = badgeFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gb.label, gbb.x + gbb.width / 2, gbb.y + gbb.height / 2);
    }
  }

  // Secondary Button (Back)
  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    drawButton(
      ctx,
      layout.secondaryButtonBounds,
      layout.secondaryButtonLabel,
      theme,
      { variant: 'secondary', hovered: Boolean(options?.hoveredSecondary) },
    );
  }

  // Action Button
  const ab = layout.actionButtonBounds;
  if (ab.width > 0) {
    drawButton(ctx, ab, layout.actionButtonLabel, theme, {
      variant: 'primary',
      hovered: Boolean(options?.hoveredAction),
    });
  }

  ctx.restore();
};
