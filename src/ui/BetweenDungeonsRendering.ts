// Game-side facade for the between-dungeons dialog. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/betweenDungeons is the only place that reads
// GameState and owns the dialog's rules (score texts, level-up XP lines,
// tradable items, the high-score merge). This module keeps the historical
// entry points — including the Hero/Item-carrying layout items and the
// typed hit results the controller dispatches — so the controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type {
  GameState,
  Hero,
  Item,
  PartyWipeAction,
  TradeItemSlot,
} from '../types';
import type {
  CompositionLayoutNode,
  CompositionNode,
  CompositionRenderOptions,
  UiEnv,
  UiContext,
} from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/primitives';
import {
  composeFont,
  PER_CHAR_WIDTH_FALLBACK,
  wrapTextMeasured,
} from '@hoard-engine/primitives';
import { actorColour } from './theme';
import {
  hitTestComposition,
  layoutComposition,
  renderComposition,
} from '@hoard-engine/uikit';
import {
  toBetweenDungeonsViewModel,
  type ActorColourKey,
  type BetweenDungeonsViewModel,
} from './viewmodels/betweenDungeons';
import { getHeroTradableItems } from '../dungeon/BetweenDungeonsLogic';
import { legacyUiEnv, defaultUiEnv } from './env';
import { uiAssetProvider } from './assets';

interface ScoreSectionGeometry {
  bounds: Rect;
  totalText: string;
  campaignText: string;
  breakdownTexts: string[];
  timeText?: string;
}

interface CampaignCompleteGeometry {
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
  scenarioRows: {
    nameText: string;
    roundsText: string;
    killsText: string;
    scoreText: string;
    y: number;
  }[];
  heroHeader: {
    name: string;
    level: string;
    xp: string;
    health: string;
    kills: string;
    items: string;
  };
  heroHeaderY: number;
  heroRows: {
    title: string;
    colourKey: ActorColourKey;
    colour?: ReturnType<typeof actorColour>;
    levelText: string;
    xpText: string;
    hpText: string;
    killsText: string;
    itemsText: string;
    alive: boolean;
    y: number;
  }[];
}

interface WipeHighScoresGeometry {
  bounds: Rect;
  headerText: string;
  currentLabelText: string;
  rows: {
    rankText: string;
    scoreText: string;
    isCurrent: boolean;
    y: number;
  }[];
}

interface WipeButtonGeometry {
  action: string;
  bounds: Rect;
  labelText: string;
  descriptionLines: string[];
}

interface HeroGeometry {
  heroIndex: number;
  hero: BetweenDungeonsViewModel['heroes'][number];
  bounds: Rect;
  title: string;
  levelBadge: string;
  isLeveledUp: boolean;
  xpText: string;
  levelMeaningText: string;
  items: {
    heroIndex: number;
    slot: number | string;
    itemIndex: number;
    bounds: Rect;
    nameText: string;
    isSelected: boolean;
  }[];
}

interface GiveButtonGeometry {
  targetHeroIndex: number;
  bounds: Rect;
  label: string;
}

interface BetweenDungeonsGeometry {
  hasContent: boolean;
  step: BetweenDungeonsLayout['step'];
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  noItemsText: string;
  scoreSection?: ScoreSectionGeometry | null;
  campaignComplete?: CampaignCompleteGeometry | null;
  wipeButtons?: WipeButtonGeometry[];
  wipeHighScores?: WipeHighScoresGeometry | null;
  heroes: HeroGeometry[];
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  giveButtons: GiveButtonGeometry[];
}

const perCharMeasure = (perChar: number) => ({
  width: (text: string) => text.length * perChar,
});

export interface BetweenDungeonsLayout {
  hasContent: boolean;
  step: 'levelUp' | 'trade' | 'campaignComplete' | 'partyWipe';
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  scoreSection?: ScoreSectionGeometry | null;
  campaignComplete?: CampaignCompleteGeometry | null;
  wipeButtons?: PartyWipeButtonLayout[];
  wipeHighScores?: WipeHighScoresGeometry | null;
  heroes: HeroSectionLayoutItem[];
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  giveButtons: GiveButtonGeometry[];
}

export interface PartyWipeButtonLayout {
  action: PartyWipeAction;
  bounds: Rect;
  labelText: string;
  descriptionLines: string[];
}

export interface HeroSectionLayoutItem {
  heroIndex: number;
  hero: Hero;
  bounds: Rect;
  title: string;
  levelBadge: string;
  isLeveledUp: boolean;
  xpText: string;
  levelMeaningText: string;
  items: TradeItemLayoutItem[];
}

export interface TradeItemLayoutItem {
  heroIndex: number;
  slot: TradeItemSlot;
  itemIndex: number;
  item: Item;
  category: 'weapon' | 'armour' | 'shield' | 'inventory';
  bounds: Rect;
  nameText: string;
  isSelected: boolean;
}

export interface RenderBetweenDungeonsOptions {
  env?: UiEnv;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  hoveredItem?: {
    heroIndex: number;
    slot?: TradeItemSlot;
    itemIndex?: number;
  } | null;
  hoveredGiveHeroIndex?: number | null;
  hoveredWipeAction?: PartyWipeAction | null;
}

export type BetweenDungeonsHitResult =
  | { type: 'actionButton' }
  | { type: 'secondaryButton' }
  | { type: 'item'; heroIndex: number; slot: TradeItemSlot; itemIndex: number }
  | { type: 'giveItem'; targetHeroIndex: number }
  | { type: 'wipeButton'; action: PartyWipeAction }
  | { type: 'panel' }
  | { type: 'backdrop' };

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  env: UiEnv | undefined,
): BetweenDungeonsGeometry => {
  const resolved = legacyUiEnv(env, { viewWidth });
  const vm = toBetweenDungeonsViewModel(state, resolved.t);
  const empty = (): BetweenDungeonsGeometry => ({
    hasContent: false,
    step: 'levelUp',
    backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    titleText: '',
    subtitleText: '',
    noItemsText: '',
    heroes: [],
    actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    actionButtonLabel: '',
    giveButtons: [],
  });
  if (!vm || viewWidth <= 0 || viewHeight <= 0) return empty();

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
  const buttonHeight = 36;
  const buttonWidth = isCampaignComplete ? 200 : isLevelUp ? 180 : 220;
  const buttonY = panelY + panelHeight - paddingY - buttonHeight;
  const buttonX = panelX + panelWidth - paddingX - buttonWidth;
  const actionButtonBounds: Rect = isPartyWipe
    ? { x: 0, y: 0, width: 0, height: 0 }
    : { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

  let secondaryButtonBounds: Rect | undefined;
  let secondaryButtonLabel: string | undefined;
  if (vm.step === 'trade') {
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: buttonY,
      width: 100,
      height: buttonHeight,
    };
    secondaryButtonLabel = vm.secondaryButtonLabel;
  }

  let scoreSection: ScoreSectionGeometry | null = null;
  if (isLevelUp && vm.scoreSection) {
    scoreSection = {
      bounds: {
        x: panelX + paddingX,
        y: panelY + paddingY + 54,
        width: contentWidth,
        height: 46,
      },
      totalText: vm.scoreSection.totalText,
      campaignText: vm.scoreSection.campaignText,
      breakdownTexts: [...vm.scoreSection.breakdownTexts],
      timeText: vm.scoreSection.timeText,
    };
  }

  let campaignComplete: CampaignCompleteGeometry | null = null;
  if (isCampaignComplete && vm.campaignComplete) {
    const cc = vm.campaignComplete;
    const scoreY = panelY + paddingY + 58;
    const summaryY = scoreY + 24;
    const scenarioHeaderY = summaryY + 26;
    const scenarioRowHeight = 16;
    const heroHeaderY =
      scenarioHeaderY + 18 + cc.scenarioRows.length * scenarioRowHeight + 14;
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
        y: heroHeaderY + 18 + index * 20,
      })),
    };
  }

  let wipeButtons: WipeButtonGeometry[] = [];
  let wipeHighScores: WipeHighScoresGeometry | null = null;
  if (isPartyWipe) {
    const columnGap = 16;
    const buttonColumnWidth = Math.floor(contentWidth * 0.52);
    const scoreColumnWidth = contentWidth - buttonColumnWidth - columnGap;
    const scoreColumnX = panelX + paddingX + buttonColumnWidth + columnGap;
    const wipeButtonHeight = 68;
    const wipeGap = 14;
    const choices = vm.wipeChoices ?? [];
    const wipeTotalHeight =
      choices.length * wipeButtonHeight + (choices.length - 1) * wipeGap;
    const wipeTop =
      panelY +
      70 +
      Math.max(0, Math.floor((panelHeight - 140 - wipeTotalHeight) / 2));
    wipeButtons = choices.map((choice, index) => ({
      action: choice.action,
      bounds: {
        x: panelX + paddingX,
        y: wipeTop + index * (wipeButtonHeight + wipeGap),
        width: buttonColumnWidth,
        height: wipeButtonHeight,
      },
      labelText: choice.labelText,
      descriptionLines: wrapTextMeasured(
        perCharMeasure(PER_CHAR_WIDTH_FALLBACK),
        choice.descriptionText,
        buttonColumnWidth - 32,
        composeFont(resolved.theme, resolved.theme.typography.sizes.md),
      ),
    }));
    if (vm.wipeHighScores) {
      const hs = vm.wipeHighScores;
      wipeHighScores = {
        bounds: {
          x: scoreColumnX,
          y: wipeTop,
          width: scoreColumnWidth,
          height: 22 + hs.rows.length * 16,
        },
        headerText: hs.headerText,
        currentLabelText: hs.currentLabelText,
        rows: hs.rows.map((row, index) => ({
          rankText: `${String(index + 1)}.`,
          scoreText: String(row.score),
          isCurrent: row.isCurrent,
          y: wipeTop + 22 + index * 16,
        })),
      };
    }
  }

  const heroesY =
    panelY +
    paddingY +
    54 +
    (scoreSection ? scoreSection.bounds.height + 8 : 0);
  const availableHeroHeight = buttonY - heroesY - 12;
  const heroes: HeroGeometry[] = [];
  const giveButtons: GiveButtonGeometry[] = [];
  const heroCount = vm.heroes.length;
  if (!isCampaignComplete && !isPartyWipe && isLevelUp) {
    const cardGap = 8;
    const cardHeight = Math.max(
      50,
      Math.floor(
        (availableHeroHeight - (heroCount - 1) * cardGap) /
          Math.max(1, heroCount),
      ),
    );
    vm.heroes.forEach((hero, index) => {
      heroes.push({
        heroIndex: hero.heroIndex,
        hero,
        bounds: {
          x: panelX + paddingX,
          y: heroesY + index * (cardHeight + cardGap),
          width: contentWidth,
          height: cardHeight,
        },
        title: hero.title,
        levelBadge: hero.levelBadge,
        isLeveledUp: hero.isLeveledUp,
        xpText: hero.xpText,
        levelMeaningText: hero.levelMeaningText,
        items: [],
      });
    });
  } else if (!isCampaignComplete && !isPartyWipe) {
    const columnGap = 8;
    const columnWidth = Math.floor(
      (contentWidth - (heroCount - 1) * columnGap) / Math.max(1, heroCount),
    );
    vm.heroes.forEach((hero, heroIndex) => {
      const columnX = panelX + paddingX + heroIndex * (columnWidth + columnGap);
      const items = hero.items.map((entry, itemIndex) => ({
        heroIndex: hero.heroIndex,
        slot: entry.slot,
        itemIndex: entry.itemIndex,
        bounds: {
          x: columnX + 4,
          y: heroesY + 34 + itemIndex * 30,
          width: columnWidth - 8,
          height: 26,
        },
        nameText: entry.nameText,
        isSelected: entry.isSelected,
      }));
      const bounds = {
        x: columnX,
        y: heroesY,
        width: columnWidth,
        height: availableHeroHeight,
      };
      if (
        vm.selectedTradeHeroIndex !== null &&
        vm.selectedTradeHeroIndex !== hero.heroIndex
      ) {
        giveButtons.push({
          targetHeroIndex: hero.heroIndex,
          bounds: {
            x: columnX + 6,
            y: Math.min(
              bounds.y + bounds.height - 30,
              heroesY + 34 + hero.items.length * 30 + 4,
            ),
            width: columnWidth - 12,
            height: 24,
          },
          label: vm.giveItemText,
        });
      }
      heroes.push({
        heroIndex: hero.heroIndex,
        hero,
        bounds,
        title: hero.title,
        levelBadge: hero.levelBadge,
        isLeveledUp: hero.isLeveledUp,
        xpText: hero.xpText,
        levelMeaningText: hero.levelMeaningText,
        items,
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
    noItemsText: vm.noItemsText,
    scoreSection,
    campaignComplete,
    wipeButtons,
    wipeHighScores,
    heroes,
    actionButtonBounds,
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel,
    giveButtons,
  };
};

/** Maps the view-model layout onto the historical Hero/Item-carrying shapes. */
const toLegacyLayout = (
  kitLayout: BetweenDungeonsGeometry,
  state: GameState,
): BetweenDungeonsLayout => {
  const { noItemsText, ...layout } = kitLayout;
  void noItemsText;
  const heroList = state.heroes as Hero[];
  const cc = kitLayout.campaignComplete;

  return {
    ...layout,
    campaignComplete: cc
      ? {
          ...cc,
          heroRows: cc.heroRows.map((row) => ({
            ...row,
            colour: actorColour(row.colourKey),
          })),
        }
      : null,
    wipeButtons: kitLayout.wipeButtons?.map((button) => ({
      ...button,
      action: button.action as PartyWipeAction,
    })),
    heroes: kitLayout.heroes.map((heroSection) => {
      const hero = heroList[heroSection.heroIndex];
      const tradableItems = getHeroTradableItems(hero);
      return {
        heroIndex: heroSection.heroIndex,
        hero,
        bounds: heroSection.bounds,
        title: heroSection.title,
        levelBadge: heroSection.levelBadge,
        isLeveledUp: heroSection.isLeveledUp,
        xpText: heroSection.xpText,
        levelMeaningText: heroSection.levelMeaningText,
        items: heroSection.items.map((item, itemIdx) => ({
          heroIndex: item.heroIndex,
          slot: item.slot as TradeItemSlot,
          itemIndex: item.itemIndex,
          item: tradableItems[itemIdx]?.item,
          category: tradableItems[itemIdx]?.category ?? 'inventory',
          bounds: item.bounds,
          nameText: item.nameText,
          isSelected: item.isSelected,
        })),
      };
    }),
  };
};

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  offsetX: bounds.x,
  offsetY: bounds.y,
  alignSelf: 'start',
  justifySelf: 'start',
});

const textNode = (
  text: string,
  bounds: Rect,
  themeStyle: NonNullable<CompositionNode['themeStyle']>,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'top',
  lineHeight?: number,
): CompositionNode =>
  positioned(
    {
      type: 'text',
      text,
      align,
      baseline,
      lineHeight,
      themeStyle,
    },
    bounds,
  );

const localRect = (rect: Rect, panel: Rect): Rect => ({
  x: rect.x - panel.x,
  y: rect.y - panel.y,
  width: rect.width,
  height: rect.height,
});

const betweenDungeonsComposition = (
  layout: BetweenDungeonsGeometry,
  viewWidth: number,
  viewHeight: number,
  env: UiEnv,
  options?: RenderBetweenDungeonsOptions,
): {
  composition: CompositionLayoutNode;
  actions: Map<string, BetweenDungeonsHitResult>;
  hoveredActionId?: string;
} => {
  const p = layout.panelBounds;
  const actions = new Map<string, BetweenDungeonsHitResult>();
  const panelChildren: CompositionNode[] = [
    positioned(
      { type: 'hitTarget', actionId: 'panel' },
      { x: 0, y: 0, width: p.width, height: p.height },
    ),
  ];
  actions.set('panel', { type: 'panel' });
  actions.set('backdrop', { type: 'backdrop' });
  panelChildren.push(
    textNode(
      layout.titleText,
      { x: 18, y: 14, width: p.width - 36, height: 28 },
      { text: 'headerDialog', fontSize: 'title', fontWeight: 'bold' },
    ),
    textNode(
      layout.subtitleText,
      { x: 18, y: 38, width: p.width - 36, height: 24 },
      { text: 'secondary', fontSize: 'lg' },
    ),
  );
  const registerHit = (
    id: string,
    rect: Rect,
    result: BetweenDungeonsHitResult,
  ): void => {
    actions.set(id, result);
    panelChildren.push(
      positioned({ type: 'hitTarget', actionId: id }, localRect(rect, p)),
    );
  };
  const addText = (
    text: string,
    rect: Rect,
    style: NonNullable<CompositionNode['themeStyle']>,
    align: CanvasTextAlign = 'left',
    baseline: CanvasTextBaseline = 'top',
  ): void => {
    panelChildren.push(
      textNode(text, localRect(rect, p), style, align, baseline),
    );
  };
  const addFill = (
    rect: Rect,
    style: NonNullable<CompositionNode['themeStyle']>,
    radius = 6,
    hoverStyle?: NonNullable<CompositionNode['themeStyle']>,
  ): void => {
    panelChildren.push(
      positioned(
        {
          type: 'fill',
          shape: 'roundedRect',
          themeStyle: { ...style, radius },
          hoverThemeStyle: hoverStyle ? { ...hoverStyle, radius } : undefined,
        },
        localRect(rect, p),
      ),
    );
  };
  if (layout.scoreSection && layout.step === 'levelUp') {
    const s = layout.scoreSection;
    const b = s.bounds;
    addFill(b, {
      surface: 'scoreBox',
      border: 'scoreBox',
      strokeWidth: 'thin',
    });
    addText(
      s.totalText,
      { x: b.x + 10, y: b.y + 8, width: b.width - 20, height: 22 },
      { text: 'headerDialog', fontSize: 'xl', fontWeight: 'bold' },
    );
    addText(
      s.campaignText,
      { x: b.x + 10, y: b.y + 8, width: b.width - 20, height: 22 },
      { text: 'headerDialog', fontSize: 'xl', fontWeight: 'bold' },
      'right',
    );
    addText(
      s.breakdownTexts.join('  ·  '),
      { x: b.x + 10, y: b.y + 30, width: b.width - 20, height: 16 },
      { text: 'muted', fontSize: 'md' },
    );
    if (s.timeText) {
      addText(
        s.timeText,
        { x: b.x + 10, y: b.y + 30, width: b.width - 20, height: 16 },
        { text: 'muted', fontSize: 'md' },
        'right',
      );
    }
  }

  if (layout.step === 'partyWipe' && layout.wipeButtons) {
    for (const button of layout.wipeButtons) {
      const hovered = options?.hoveredWipeAction === button.action;
      addFill(
        button.bounds,
        {
          surface: hovered ? 'wipeButtonHover' : 'wipeButton',
          border: hovered ? 'wipeButtonHover' : 'wipeButton',
          strokeWidth: hovered ? 'regular' : 'thin',
        },
        8,
      );
      registerHit(`wipe:${button.action}`, button.bounds, {
        type: 'wipeButton',
        action: button.action as PartyWipeAction,
      });
      addText(
        button.labelText,
        { ...button.bounds, height: 32 },
        { text: 'strong', fontSize: 'xl', fontWeight: 'bold' },
        'center',
        'middle',
      );
      button.descriptionLines.forEach((line, index) => {
        addText(
          line,
          {
            x: button.bounds.x,
            y: button.bounds.y + 27 + index * 15,
            width: button.bounds.width,
            height: 15,
          },
          { text: 'wipeDescription', fontSize: 'md' },
          'center',
          'middle',
        );
      });
    }

    const highScores = layout.wipeHighScores;
    if (highScores) {
      addFill(highScores.bounds, {
        surface: 'row',
        border: 'row',
        strokeWidth: 'thin',
      });
      addText(
        highScores.headerText,
        {
          x: highScores.bounds.x + 10,
          y: highScores.bounds.y + 8,
          width: highScores.bounds.width - 20,
          height: 18,
        },
        { text: 'headerDialog', fontSize: 'sm', fontWeight: 'bold' },
      );
      highScores.rows.forEach((row) => {
        addText(
          row.rankText,
          { x: highScores.bounds.x + 10, y: row.y, width: 30, height: 16 },
          { text: row.isCurrent ? 'scoreGold' : 'secondary', fontSize: 'sm' },
        );
        addText(
          `${row.scoreText}${row.isCurrent ? ` ${highScores.currentLabelText}` : ''}`,
          {
            x: highScores.bounds.x + 40,
            y: row.y,
            width: highScores.bounds.width - 50,
            height: 16,
          },
          { text: row.isCurrent ? 'scoreGold' : 'secondary', fontSize: 'sm' },
          'right',
        );
      });
    }
  } else if (layout.campaignComplete && layout.step === 'campaignComplete') {
    const cc = layout.campaignComplete;
    const x = p.x + 18;
    const right = p.x + p.width - 18;
    addText(
      cc.scoreText,
      { x, y: cc.scoreY, width: p.width - 36, height: 24 },
      { text: 'headerDialog', fontSize: 'display', fontWeight: 'bold' },
    );
    if (cc.timeText) {
      addText(
        cc.timeText,
        { x, y: cc.scoreY, width: p.width - 36, height: 20 },
        { text: 'muted', fontSize: 'md' },
        'right',
      );
    }
    addText(
      cc.summaryText,
      { x, y: cc.summaryY, width: p.width - 36, height: 20 },
      { text: 'muted', fontSize: 'md' },
    );
    const colW = p.width - 36;
    const columns = [
      {
        label: cc.scenarioHeader.name,
        x,
        width: colW * 0.52,
        align: 'left' as const,
      },
      {
        label: cc.scenarioHeader.rounds,
        x: x + colW * 0.52,
        width: colW * 0.12,
        align: 'right' as const,
      },
      {
        label: cc.scenarioHeader.kills,
        x: x + colW * 0.64,
        width: colW * 0.12,
        align: 'right' as const,
      },
      {
        label: cc.scenarioHeader.score,
        x: right - colW * 0.22,
        width: colW * 0.22,
        align: 'right' as const,
      },
    ];
    columns.forEach((column) =>
      addText(
        column.label,
        { x: column.x, y: cc.scenarioHeaderY, width: column.width, height: 18 },
        { text: 'strong', fontSize: 'sm', fontWeight: 'bold' },
        column.align,
      ),
    );
    cc.scenarioRows.forEach((row) => {
      [row.nameText, row.roundsText, row.killsText, row.scoreText].forEach(
        (value, index) => {
          const column = columns[index];
          addText(
            value,
            { x: column.x, y: row.y, width: column.width, height: 16 },
            { text: 'body', fontSize: 'sm' },
            column.align,
          );
        },
      );
    });
    const heroHeaders = [
      cc.heroHeader.name,
      cc.heroHeader.level,
      cc.heroHeader.xp,
      cc.heroHeader.health,
      cc.heroHeader.kills,
      cc.heroHeader.items,
    ];
    const heroColX = [
      x,
      right - 360,
      right - 290,
      right - 200,
      right - 120,
      right - 90,
    ];
    heroHeaders.forEach((header, index) =>
      addText(
        header,
        {
          x: heroColX[index],
          y: cc.heroHeaderY,
          width: index === 0 ? 150 : 70,
          height: 18,
        },
        { text: 'strong', fontSize: 'sm', fontWeight: 'bold' },
        index === 0 ? 'left' : 'right',
      ),
    );
    cc.heroRows.forEach((row) => {
      const values = [
        row.title,
        row.levelText,
        row.xpText,
        row.hpText,
        row.killsText,
        row.itemsText,
      ];
      const colour = actorColour(row.colourKey);
      addText(
        '●',
        { x, y: row.y, width: 16, height: 16 },
        { textColor: colour, fontSize: 'xxs' },
      );
      values.forEach((value, index) =>
        addText(
          value,
          {
            x: heroColX[index] + (index === 0 ? 16 : 0),
            y: row.y,
            width: index === 0 ? 134 : 70,
            height: 16,
          },
          {
            text: row.alive ? 'body' : 'dimmed',
            fontSize: 'sm',
          },
          index === 0 ? 'left' : 'right',
        ),
      );
    });
  } else if (layout.step === 'levelUp') {
    for (const hero of layout.heroes) {
      const b = hero.bounds;
      const hovered = false;
      addFill(b, {
        surface: hero.isLeveledUp ? 'leveledRow' : 'row',
        border: hero.isLeveledUp ? 'rowSelected' : 'row',
        strokeWidth: hero.isLeveledUp ? 'medium' : 'thin',
      });
      addText(
        '●',
        { x: b.x + 7, y: b.y + 9, width: 14, height: 14 },
        {
          textColor: env.theme.palette.actorDot[hero.hero.colourKey],
          fontSize: 'xxs',
        },
        'center',
        'middle',
      );
      addText(
        hero.title,
        {
          x: b.x + 26,
          y: b.y + 4,
          width: Math.max(50, b.width - 156),
          height: 24,
        },
        { text: 'strong', fontSize: 'xl', fontWeight: 'bold' },
        'left',
        'middle',
      );
      addText(
        hero.xpText,
        { x: b.x + 140, y: b.y + 4, width: 150, height: 24 },
        { text: 'muted', fontSize: 'md' },
        'left',
        'middle',
      );
      const badge = {
        x: b.x + b.width - 110,
        y: b.y + 6,
        width: 100,
        height: 20,
      };
      addFill(
        badge,
        {
          surface: hero.isLeveledUp ? 'checkboxSelected' : 'checkbox',
          border: hero.isLeveledUp ? 'checkboxSelected' : 'input',
          strokeWidth: 'thin',
        },
        4,
      );
      addText(
        hero.levelBadge,
        badge,
        {
          text: hero.isLeveledUp ? 'bright' : 'body',
          fontSize: 'sm',
          fontWeight: 'bold',
        },
        'center',
        'middle',
      );
      addText(
        hero.levelMeaningText,
        { x: b.x + 26, y: b.y + 28, width: b.width - 40, height: 20 },
        {
          text: hero.isLeveledUp ? 'rowSelected' : 'secondary',
          fontSize: 'md',
        },
      );
      void hovered;
    }
  } else {
    for (const hero of layout.heroes) {
      const b = hero.bounds;
      addFill(b, { surface: 'row', border: 'row', strokeWidth: 'thin' });
      addText(
        '●',
        { x: b.x + 5, y: b.y + 8, width: 14, height: 14 },
        {
          textColor: env.theme.palette.actorDot[hero.hero.colourKey],
          fontSize: 'xxs',
        },
        'center',
        'middle',
      );
      addText(
        hero.title,
        { x: b.x + 22, y: b.y + 2, width: b.width - 28, height: 24 },
        { text: 'strong', fontSize: 'xl', fontWeight: 'bold' },
        'left',
        'middle',
      );
      if (hero.items.length === 0) {
        addText(
          layout.noItemsText,
          { x: b.x + 10, y: b.y + 34, width: b.width - 20, height: 16 },
          { text: 'dimmed', fontSize: 'sm' },
        );
      }
      for (const item of hero.items) {
        const hovered =
          options?.hoveredItem?.heroIndex === item.heroIndex &&
          options.hoveredItem.itemIndex === item.itemIndex;
        addFill(
          item.bounds,
          item.isSelected
            ? {
                surface: 'tradeItemSelected',
                border: 'tradeItemSelected',
                strokeWidth: 'medium',
              }
            : hovered
              ? { surface: 'rowHover', border: 'rowHover', strokeWidth: 'thin' }
              : { surface: 'tradeItem', border: 'input', strokeWidth: 'thin' },
          4,
        );
        const id = `item:${item.heroIndex}:${String(item.slot)}:${item.itemIndex}`;
        registerHit(id, item.bounds, {
          type: 'item',
          heroIndex: item.heroIndex,
          slot: item.slot as TradeItemSlot,
          itemIndex: item.itemIndex,
        });
        addText(
          item.nameText,
          {
            x: item.bounds.x + 6,
            y: item.bounds.y,
            width: item.bounds.width - 12,
            height: item.bounds.height,
          },
          {
            text: item.isSelected ? 'rowSelected' : 'dialogValue',
            fontSize: 'sm',
          },
          'left',
          'middle',
        );
      }
    }
    for (const button of layout.giveButtons) {
      const hovered = options?.hoveredGiveHeroIndex === button.targetHeroIndex;
      addFill(
        button.bounds,
        {
          surface: hovered ? 'giveButtonHover' : 'giveButton',
          border: 'giveButton',
          strokeWidth: 'thin',
        },
        4,
      );
      registerHit(`give:${button.targetHeroIndex}`, button.bounds, {
        type: 'giveItem',
        targetHeroIndex: button.targetHeroIndex,
      });
      addText(
        button.label,
        button.bounds,
        { text: 'bright', fontSize: 'sm', fontWeight: 'bold' },
        'center',
        'middle',
      );
    }
  }

  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    const id = 'secondary';
    actions.set(id, { type: 'secondaryButton' });
    panelChildren.push(
      positioned(
        {
          type: 'button',
          actionId: id,
          label: layout.secondaryButtonLabel,
          variant: 'secondary',
        },
        localRect(layout.secondaryButtonBounds, p),
      ),
    );
  }
  if (layout.actionButtonBounds.width > 0) {
    const id = 'action';
    actions.set(id, { type: 'actionButton' });
    panelChildren.push(
      positioned(
        {
          type: 'button',
          actionId: id,
          label: layout.actionButtonLabel,
          variant: 'primary',
        },
        localRect(layout.actionButtonBounds, p),
      ),
    );
  }

  const composition: CompositionNode = {
    type: 'stack',
    width: viewWidth,
    height: viewHeight,
    children: [
      positioned(
        {
          type: 'fill',
          themeStyle: { overlay: 'scrimDialog' },
        },
        layout.backdropBounds,
      ),
      positioned(
        {
          type: 'hitTarget',
          actionId: 'backdrop',
        },
        layout.backdropBounds,
      ),
      positioned(
        {
          type: 'panel',
          padding: 0,
          childrenLayout: 'stack',
          width: p.width,
          height: p.height,
          themeStyle: {
            surface: 'panelDialog',
            border: 'panelDialog',
            strokeWidth: 'regular',
            radius: 10,
            text: 'headerDialog',
            fontSize: 'title',
            fontWeight: 'bold',
          },
          children: panelChildren,
        },
        p,
      ),
    ],
  };
  const renderLayout = layoutComposition(
    composition,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
  );

  const hoveredActionId = options?.hoveredItem
    ? `item:${options.hoveredItem.heroIndex}:${String(options.hoveredItem.slot ?? '')}:${options.hoveredItem.itemIndex ?? ''}`
    : options?.hoveredGiveHeroIndex !== null &&
        options?.hoveredGiveHeroIndex !== undefined
      ? `give:${options.hoveredGiveHeroIndex}`
      : options?.hoveredWipeAction
        ? `wipe:${options.hoveredWipeAction}`
        : options?.hoveredSecondary
          ? 'secondary'
          : options?.hoveredAction
            ? 'action'
            : undefined;
  return { composition: renderLayout, actions, hoveredActionId };
};

export const getBetweenDungeonsLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  env?: UiEnv,
): BetweenDungeonsLayout => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, env);
  if (!state || !kitLayout.hasContent) {
    return {
      hasContent: false,
      step: 'levelUp',
      backdropBounds: kitLayout.backdropBounds,
      panelBounds: kitLayout.panelBounds,
      titleText: kitLayout.titleText,
      subtitleText: kitLayout.subtitleText,
      heroes: [],
      actionButtonBounds: kitLayout.actionButtonBounds,
      actionButtonLabel: kitLayout.actionButtonLabel,
      giveButtons: kitLayout.giveButtons,
    };
  }
  return toLegacyLayout(kitLayout, state);
};

export const getBetweenDungeonsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
): BetweenDungeonsHitResult | null => {
  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, undefined);
  if (!kitLayout.hasContent) return null;

  const resolved = legacyUiEnv(undefined, { viewWidth });
  const { composition, actions } = betweenDungeonsComposition(
    kitLayout,
    viewWidth,
    viewHeight,
    resolved,
  );
  const hit = hitTestComposition(composition, { x, y });
  return hit ? (actions.get(hit.actionId) ?? null) : null;
};

export const renderBetweenDungeons = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderBetweenDungeonsOptions,
): void => {
  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return;
  }

  const resolved = legacyUiEnv(options?.env ?? defaultUiEnv, {
    viewWidth,
    ctx,
  });
  const layout = kitLayoutFor(viewWidth, viewHeight, state, resolved);
  if (!layout.hasContent) return;

  const { composition, hoveredActionId } = betweenDungeonsComposition(
    layout,
    viewWidth,
    viewHeight,
    resolved,
    options,
  );

  const ui: UiContext = {
    ...resolved,
    ctx,
    assets: uiAssetProvider,
  };
  const renderOptions: CompositionRenderOptions = { hoveredActionId };
  renderComposition(composition, ui, renderOptions);
};
