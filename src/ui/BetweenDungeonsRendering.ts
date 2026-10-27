import {
  type GameState,
  type Hero,
  type Item,
  type Weapon,
  type Armour,
  type Shield,
  type TradeItemSlot,
  type PartyWipeAction,
  Colour,
} from '../types';
import { ItemType } from '../types';
import { i18n, SCORE_POINTS_PER_SECRET } from '../core';
import { MAX_HIGH_SCORES } from '../saves/HighScoresLogic';
import { getHeroTradableItems } from '../dungeon/BetweenDungeonsLogic';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';
import { wrapText } from './DiaryAndWinConditionRendering';

export interface BetweenDungeonsLayout {
  hasContent: boolean;
  step: 'levelUp' | 'trade' | 'campaignComplete' | 'partyWipe';
  backdropBounds: CardBounds;
  panelBounds: CardBounds;
  titleText: string;
  subtitleText: string;
  scoreSection?: ScoreSectionLayout | null;
  campaignComplete?: CampaignCompleteLayout | null;
  wipeButtons?: PartyWipeButtonLayout[];
  wipeHighScores?: PartyWipeHighScoresLayout | null;
  heroes: HeroSectionLayoutItem[];
  actionButtonBounds: CardBounds;
  actionButtonLabel: string;
  secondaryButtonBounds?: CardBounds;
  secondaryButtonLabel?: string;
  giveButtons: GiveButtonLayoutItem[];
}

export interface PartyWipeButtonLayout {
  action: PartyWipeAction;
  bounds: CardBounds;
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
  bounds: CardBounds;
  headerText: string;
  currentLabelText: string;
  rows: PartyWipeScoreRow[];
}

export interface ScoreSectionLayout {
  bounds: CardBounds;
  totalText: string;
  campaignText: string;
  breakdownTexts: string[];
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
  colour: Colour;
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

export interface HeroSectionLayoutItem {
  heroIndex: number;
  hero: Hero;
  bounds: CardBounds;
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
  bounds: CardBounds;
  nameText: string;
  isSelected: boolean;
}

export interface GiveButtonLayoutItem {
  targetHeroIndex: number;
  bounds: CardBounds;
  label: string;
}

export interface RenderBetweenDungeonsOptions {
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

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const SUBTITLE_FONT = '13px Arial, Helvetica, sans-serif';
const HERO_NAME_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const BADGE_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const DESC_FONT = '12px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const ITEM_FONT = '11px Arial, Helvetica, sans-serif';
const SMALL_BTN_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const CAMPAIGN_SCORE_FONT = 'bold 20px Arial, Helvetica, sans-serif';
const TABLE_HEADER_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const TABLE_FONT = '11px Arial, Helvetica, sans-serif';

const heroColourHex = (colour: Colour): string =>
  colour === Colour.Red
    ? '#ef4444'
    : colour === Colour.Blue
    ? '#3b82f6'
    : colour === Colour.Yellow
    ? '#eab308'
    : '#10b981';

/**
 * Draws the campaign-complete statistics: score headline, campaign
 * summary, the per-scenario score table and one row per hero.
 */
const renderCampaignCompleteSection = (
  ctx: CanvasRenderingContext2D,
  panel: CardBounds,
  cc: CampaignCompleteLayout,
): void => {
  const x = panel.x + 18;
  const right = panel.x + panel.width - 18;

  ctx.textBaseline = 'top';

  // Score headline
  ctx.fillStyle = '#fce28a';
  ctx.font = CAMPAIGN_SCORE_FONT;
  ctx.textAlign = 'left';
  ctx.fillText(cc.scoreText, x, cc.scoreY);

  // Campaign summary
  ctx.fillStyle = '#94a3b8';
  ctx.font = DESC_FONT;
  ctx.fillText(cc.summaryText, x, cc.summaryY);

  // Per-scenario table
  ctx.font = TABLE_HEADER_FONT;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(cc.scenarioHeader.name, x, cc.scenarioHeaderY);
  ctx.textAlign = 'right';
  ctx.fillText(cc.scenarioHeader.rounds, right - 260, cc.scenarioHeaderY);
  ctx.fillText(cc.scenarioHeader.kills, right - 180, cc.scenarioHeaderY);
  ctx.fillText(cc.scenarioHeader.score, right, cc.scenarioHeaderY);

  for (const row of cc.scenarioRows) {
    ctx.font = TABLE_FONT;
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(row.nameText, x, row.y);
    ctx.textAlign = 'right';
    ctx.fillText(row.roundsText, right - 260, row.y);
    ctx.fillText(row.killsText, right - 180, row.y);
    ctx.fillStyle = '#fcd34d';
    ctx.fillText(row.scoreText, right, row.y);
  }

  // Per-hero table
  ctx.font = TABLE_HEADER_FONT;
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  ctx.fillText(cc.heroHeader.name, x, cc.heroHeaderY);
  ctx.textAlign = 'right';
  ctx.fillText(cc.heroHeader.level, right - 360, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.xp, right - 290, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.health, right - 200, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.kills, right - 120, cc.heroHeaderY);
  ctx.fillText(cc.heroHeader.items, right, cc.heroHeaderY);

  for (const row of cc.heroRows) {
    ctx.font = TABLE_FONT;
    ctx.fillStyle = row.alive ? '#e2e8f0' : '#64748b';
    if (row.alive) {
      ctx.beginPath();
      ctx.arc(x + 5, row.y + 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = heroColourHex(row.colour);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.fillText(row.title, x + 16, row.y);
    ctx.textAlign = 'right';
    ctx.fillText(row.levelText, right - 360, row.y);
    ctx.fillStyle = row.alive ? '#e2e8f0' : '#64748b';
    ctx.fillText(row.xpText, right - 290, row.y);
    ctx.fillText(row.hpText, right - 200, row.y);
    ctx.fillText(row.killsText, right - 120, row.y);
    ctx.fillText(row.itemsText, right, row.y);
  }
};

export const getBetweenDungeonsLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
): BetweenDungeonsLayout => {
  const emptyLayout: BetweenDungeonsLayout = {
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
  };

  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const bd = state.betweenDungeons;
  const isLevelUp = bd.step === 'levelUp';
  const isCampaignComplete = bd.step === 'campaignComplete';
  const isPartyWipe = bd.step === 'partyWipe';

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(340, viewWidth - marginX * 2));
  const panelHeight = Math.min(540, Math.max(360, viewHeight - marginY * 2));
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const nextDungeonName = bd.nextDungeon?.name ? i18n(bd.nextDungeon.name) : '';
  const completedName = bd.completedDungeonName
    ? i18n(bd.completedDungeonName)
    : '';

  const titleText = isCampaignComplete
    ? i18n('content.campaignComplete.title', {
        name: i18n(bd.completedCampaignName ?? bd.completedDungeonName),
      })
    : isPartyWipe
    ? i18n('content.partyWipe.title')
    : isLevelUp
    ? i18n('content.betweenDungeons.titleLevelUp', { name: completedName })
    : i18n('content.betweenDungeons.titleTrade');

  const subtitleText = isCampaignComplete
    ? i18n('content.campaignComplete.subtitle')
    : isPartyWipe
    ? i18n('content.partyWipe.subtitle', { name: completedName })
    : isLevelUp
    ? i18n('content.betweenDungeons.subtitleLevelUp')
    : i18n('content.betweenDungeons.subtitleTrade', {
        nextDungeon: nextDungeonName || completedName,
      });

  const btnHeight = 36;
  const btnWidth = isCampaignComplete ? 200 : isLevelUp ? 180 : 220;
  const btnY = panelY + panelHeight - paddingY - btnHeight;
  const btnX = panelX + panelWidth - paddingX - btnWidth;

  // The party-wipe screen draws its own stacked choice buttons instead of
  // the generic action button.
  const actionButtonBounds: CardBounds = isPartyWipe
    ? { x: 0, y: 0, width: 0, height: 0 }
    : {
        x: btnX,
        y: btnY,
        width: btnWidth,
        height: btnHeight,
      };

  const actionButtonLabel = isCampaignComplete
    ? i18n('content.betweenDungeons.buttons.finishCampaign')
    : isLevelUp
    ? i18n('content.betweenDungeons.buttons.tradeItems')
    : bd.nextDungeon
    ? i18n('content.betweenDungeons.buttons.startNextDungeon')
    : i18n('content.betweenDungeons.buttons.finishCampaign');

  let secondaryButtonBounds: CardBounds | undefined = undefined;
  let secondaryButtonLabel: string | undefined = undefined;

  if (bd.step === 'trade') {
    const secWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secWidth,
      height: btnHeight,
    };
    secondaryButtonLabel = i18n(
      'content.betweenDungeons.buttons.backToLevelUp',
    );
  }

  // Score breakdown of the completed scenario, shown on the level-up step
  // between the subtitle and the hero cards.
  let scoreSection: ScoreSectionLayout | null = null;
  if (isLevelUp && bd.scenarioScore) {
    const s = bd.scenarioScore;
    scoreSection = {
      bounds: {
        x: panelX + paddingX,
        y: panelY + paddingY + 54,
        width: contentWidth,
        height: 46,
      },
      totalText: i18n('content.scoring.scenarioScore', {
        score: String(s.total),
      }),
      campaignText: i18n('content.scoring.campaignTotal', {
        score: String(bd.campaignScore ?? 0),
      }),
      breakdownTexts: [
        i18n('content.scoring.health', { points: String(s.healthPoints) }),
        i18n('content.scoring.monsters', { points: String(s.killPoints) }),
        i18n('content.scoring.loot', { points: String(s.itemPoints) }),
        i18n('content.scoring.secrets', { points: String(s.secretPoints) }),
        i18n('content.scoring.rounds', { points: String(s.roundPenalty) }),
      ],
    };
  }

  // Campaign-complete statistics: campaign score headline, a per-scenario
  // score table and one final row of statistics per hero.
  let campaignComplete: CampaignCompleteLayout | null = null;
  if (isCampaignComplete) {
    const records = state.scenarioScores ?? [];
    const totalRounds = records.reduce((sum, r) => sum + r.rounds, 0);
    const totalKills = records.reduce((sum, r) => sum + r.kills, 0);
    const totalSecrets = records.reduce(
      (sum, r) => sum + r.score.secretPoints / SCORE_POINTS_PER_SECRET,
      0,
    );

    const scoreY = panelY + paddingY + 58;
    const summaryY = scoreY + 24;
    const scenarioHeaderY = summaryY + 26;
    const scenarioRowHeight = 16;
    const heroHeaderY =
      scenarioHeaderY + 18 + records.length * scenarioRowHeight + 14;
    const heroRowHeight = 20;

    campaignComplete = {
      scoreText: i18n('content.scoring.campaignTotal', {
        score: String(bd.campaignScore ?? 0),
      }),
      scoreY,
      summaryText: i18n('content.campaignComplete.summary', {
        scenarios: String(records.length),
        rounds: String(totalRounds),
        kills: String(totalKills),
        secrets: String(totalSecrets),
      }),
      summaryY,
      scenarioHeader: {
        name: i18n('content.campaignComplete.scenarioHeader'),
        rounds: i18n('content.campaignComplete.roundsHeader'),
        kills: i18n('content.campaignComplete.killsHeader'),
        score: i18n('content.campaignComplete.scoreHeader'),
      },
      scenarioHeaderY,
      scenarioRows: records.map((record, index) => ({
        nameText: i18n(record.dungeonName),
        roundsText: String(record.rounds),
        killsText: String(record.kills),
        scoreText: String(record.score.total),
        y: scenarioHeaderY + 18 + index * scenarioRowHeight,
      })),
      heroHeader: {
        name: i18n('content.campaignComplete.heroHeader'),
        level: i18n('content.campaignComplete.levelHeader'),
        xp: 'XP',
        health: i18n('content.campaignComplete.healthHeader'),
        kills: i18n('content.campaignComplete.killsHeader'),
        items: i18n('content.campaignComplete.itemsHeader'),
      },
      heroHeaderY,
      heroRows: (state.heroes as Hero[]).map((hero, index) => {
        const alive = hero.health > 0;
        const itemsCarried =
          hero.inventory.filter((item) => item).length +
          (hero.weapon ? 1 : 0) +
          (hero.armour ? 1 : 0) +
          (hero.shield ? 1 : 0);
        return {
          title: i18n(hero.name),
          colour: hero.colour,
          levelText: i18n(`content.level.${hero.level}`),
          xpText: String(hero.experience),
          hpText: alive
            ? `${hero.health}/${hero.maxHealth}`
            : i18n('content.campaignComplete.fallen'),
          killsText: String(hero.kills ?? 0),
          itemsText: String(itemsCarried),
          alive,
          y: heroHeaderY + 18 + index * heroRowHeight,
        };
      }),
    };
  }

  // Party-wipe options: choice buttons in the left column, the campaign
  // high score list (with the current run ranked into it) on the right.
  let wipeButtons: PartyWipeButtonLayout[] = [];
  let wipeHighScores: PartyWipeHighScoresLayout | null = null;
  if (isPartyWipe) {
    const wipeChoices: {
      action: PartyWipeAction;
      labelKey: string;
      descriptionKey: string;
    }[] = [
      {
        action: 'restartCampaign',
        labelKey: 'content.partyWipe.buttons.restartCampaign',
        descriptionKey: 'content.partyWipe.buttons.restartCampaignDesc',
      },
      {
        action: 'restartDungeon',
        labelKey: 'content.partyWipe.buttons.restartDungeon',
        descriptionKey: 'content.partyWipe.buttons.restartDungeonDesc',
      },
      {
        action: 'loadSave',
        labelKey: 'content.partyWipe.buttons.loadSave',
        descriptionKey: 'content.partyWipe.buttons.loadSaveDesc',
      },
    ];
    const colGap = 16;
    const buttonColWidth = Math.floor(contentWidth * 0.52);
    const scoreColWidth = contentWidth - buttonColWidth - colGap;
    const scoreColX = panelX + paddingX + buttonColWidth + colGap;

    const wipeBtnHeight = 68;
    const wipeGap = 14;
    const wipeTotalHeight =
      wipeChoices.length * wipeBtnHeight + (wipeChoices.length - 1) * wipeGap;
    const wipeTop =
      panelY +
      70 +
      Math.max(0, Math.floor((panelHeight - 140 - wipeTotalHeight) / 2));
    wipeButtons = wipeChoices.map((choice, index) => ({
      action: choice.action,
      bounds: {
        x: panelX + paddingX,
        y: wipeTop + index * (wipeBtnHeight + wipeGap),
        width: buttonColWidth,
        height: wipeBtnHeight,
      },
      labelText: i18n(choice.labelKey),
      descriptionLines: wrapText(
        null,
        i18n(choice.descriptionKey, { name: completedName }),
        buttonColWidth - 32,
        DESC_FONT,
      ),
    }));

    // High scores: the stored top 10 with the current run's score ranked
    // into it (rank 1 + the entries that beat it).
    const stored = bd.wipeHighScores ?? [];
    const currentScore = bd.campaignScore ?? 0;
    const currentRank =
      1 + stored.filter((entry) => entry.score > currentScore).length;
    const storedRows = stored.slice(0, MAX_HIGH_SCORES).map((entry, index) => ({
      rank: index + 1,
      score: entry.score,
      isCurrent: false,
    }));
    const currentRow = {
      rank: currentRank,
      score: currentScore,
      isCurrent: true,
    };
    const displayRows = (
      currentRank <= MAX_HIGH_SCORES
        ? [
            ...storedRows.slice(0, currentRank - 1),
            currentRow,
            ...storedRows.slice(currentRank - 1),
          ].slice(0, MAX_HIGH_SCORES)
        : [...storedRows, currentRow]
    )
      // The list is sorted, so the display position is the rank.
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const scoreRowHeight = 16;
    wipeHighScores = {
      bounds: {
        x: scoreColX,
        y: wipeTop,
        width: scoreColWidth,
        height: 22 + displayRows.length * scoreRowHeight,
      },
      headerText: i18n('content.partyWipe.highScores'),
      currentLabelText: i18n('content.partyWipe.thisRun'),
      rows: displayRows.map((row, index) => ({
        rankText: `${String(row.rank)}.`,
        scoreText: String(row.score),
        isCurrent: row.isCurrent,
        y: wipeTop + 22 + index * scoreRowHeight,
      })),
    };
  }

  // Calculate layout for heroes
  const heroList = state.heroes as Hero[];
  const heroCount = heroList.length;
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

    heroList.forEach((hero, index) => {
      const cardY = heroesY + index * (cardHeight + cardGap);
      const cardBounds: CardBounds = {
        x: panelX + paddingX,
        y: cardY,
        width: contentWidth,
        height: cardHeight,
      };

      const info = bd.levelUps[index];
      const isLeveledUp = info?.leveledUp ?? false;
      const levelName = i18n(`content.level.${hero.level}`);
      const xpText = info
        ? info.xpToNextLevel
          ? `${i18n('content.betweenDungeons.xpProgress', {
              xp: String(hero.experience),
            })} ${i18n('content.betweenDungeons.nextLevelXp', {
              needed: String(info.xpToNextLevel),
              nextLevel: i18n(`content.level.${info.nextLevel ?? 'max'}`),
            })}`
          : `${i18n('content.betweenDungeons.xpProgress', {
              xp: String(hero.experience),
            })} ${i18n('content.betweenDungeons.maxLevel')}`
        : `${hero.experience} XP`;

      const levelMeaning = info?.levelMeaning || '';

      heroesLayout.push({
        heroIndex: index,
        hero,
        bounds: cardBounds,
        title: i18n(hero.name),
        levelBadge: isLeveledUp
          ? i18n('content.betweenDungeons.leveledUpBadge')
          : levelName,
        isLeveledUp,
        xpText,
        levelMeaningText: levelMeaning,
        items: [],
      });
    });
  } else {
    // Trading step: Columns for heroes
    const colGap = 8;
    const colWidth = Math.floor(
      (contentWidth - (heroCount - 1) * colGap) / Math.max(1, heroCount),
    );

    heroList.forEach((hero, hIndex) => {
      const colX = panelX + paddingX + hIndex * (colWidth + colGap);
      const colBounds: CardBounds = {
        x: colX,
        y: heroesY,
        width: colWidth,
        height: availableHeroHeight,
      };

      const itemLayouts: TradeItemLayoutItem[] = [];
      const itemStartY = heroesY + 34;
      const itemRowHeight = 26;
      const itemGap = 4;

      const tradableItems = getHeroTradableItems(hero);

      tradableItems.forEach((entry, entryIndex) => {
        const itemY = itemStartY + entryIndex * (itemRowHeight + itemGap);
        const itemBounds: CardBounds = {
          x: colX + 4,
          y: itemY,
          width: colWidth - 8,
          height: itemRowHeight,
        };

        const isSelected =
          bd.selectedTradeItem?.heroIndex === hIndex &&
          (bd.selectedTradeItem?.slot === entry.slot ||
            (typeof entry.slot === 'number' &&
              bd.selectedTradeItem?.itemIndex === entry.slot));

        let nameText = i18n(entry.item.nameTranslationKey ?? entry.item.name);
        if (entry.category === 'weapon') {
          nameText = `🗡️ ${nameText} (${(entry.item as Weapon).dice})`;
        } else if (entry.category === 'armour') {
          nameText = `🥋 ${nameText} (${(entry.item as Armour).defense})`;
        } else if (entry.category === 'shield') {
          nameText = `🛡️ ${nameText} (${(entry.item as Shield).dice})`;
        } else {
          if (entry.item.type === ItemType.WEAPON) {
            nameText = `🗡️ ${nameText}`;
          } else if (entry.item.type === ItemType.ARMOUR) {
            nameText = `🥋 ${nameText}`;
          } else if (entry.item.type === ItemType.SHIELD) {
            nameText = `🛡️ ${nameText}`;
          } else {
            nameText = `📦 ${nameText}`;
          }
        }

        itemLayouts.push({
          heroIndex: hIndex,
          slot: entry.slot,
          itemIndex: typeof entry.slot === 'number' ? entry.slot : entryIndex,
          item: entry.item,
          category: entry.category,
          bounds: itemBounds,
          nameText,
          isSelected,
        });
      });

      // If an item is selected from another hero, add a "Give" button here
      if (bd.selectedTradeItem && bd.selectedTradeItem.heroIndex !== hIndex) {
        const giveBtnY = Math.min(
          colBounds.y + colBounds.height - 30,
          itemStartY + tradableItems.length * (itemRowHeight + itemGap) + 4,
        );
        const giveBtnBounds: CardBounds = {
          x: colX + 6,
          y: giveBtnY,
          width: colWidth - 12,
          height: 24,
        };
        giveButtonsLayout.push({
          targetHeroIndex: hIndex,
          bounds: giveBtnBounds,
          label: i18n('content.betweenDungeons.buttons.giveItem'),
        });
      }

      heroesLayout.push({
        heroIndex: hIndex,
        hero,
        bounds: colBounds,
        title: i18n(hero.name),
        levelBadge: i18n(`content.level.${hero.level}`),
        isLeveledUp: false,
        xpText: `${hero.experience} XP`,
        levelMeaningText: '',
        items: itemLayouts,
      });
    });
  }

  return {
    hasContent: true,
    step: bd.step,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText,
    subtitleText,
    scoreSection,
    campaignComplete,
    wipeButtons,
    wipeHighScores,
    heroes: heroesLayout,
    actionButtonBounds,
    actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel,
    giveButtons: giveButtonsLayout,
  };
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

  const layout = getBetweenDungeonsLayout(viewWidth, viewHeight, state);
  if (!layout.hasContent) return null;

  if (
    layout.actionButtonBounds.width > 0 &&
    isPointInBounds(x, y, layout.actionButtonBounds)
  ) {
    return { type: 'actionButton' };
  }

  if (
    layout.secondaryButtonBounds &&
    isPointInBounds(x, y, layout.secondaryButtonBounds)
  ) {
    return { type: 'secondaryButton' };
  }

  for (const giveBtn of layout.giveButtons) {
    if (isPointInBounds(x, y, giveBtn.bounds)) {
      return { type: 'giveItem', targetHeroIndex: giveBtn.targetHeroIndex };
    }
  }

  for (const hero of layout.heroes) {
    for (const item of hero.items) {
      if (isPointInBounds(x, y, item.bounds)) {
        return {
          type: 'item',
          heroIndex: item.heroIndex,
          slot: item.slot,
          itemIndex: item.itemIndex,
        };
      }
    }
  }

  for (const wipeButton of layout.wipeButtons ?? []) {
    if (isPointInBounds(x, y, wipeButton.bounds)) {
      return { type: 'wipeButton', action: wipeButton.action };
    }
  }

  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }

  if (isPointInBounds(x, y, layout.backdropBounds)) {
    return { type: 'backdrop' };
  }

  return null;
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

  const layout = getBetweenDungeonsLayout(viewWidth, viewHeight, state);
  if (!layout.hasContent) return;

  ctx.save();

  // Dark backdrop
  ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
  ctx.fillRect(
    layout.backdropBounds.x,
    layout.backdropBounds.y,
    layout.backdropBounds.width,
    layout.backdropBounds.height,
  );

  // Main modal panel
  const p = layout.panelBounds;
  ctx.fillStyle = '#181b22';
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.titleText, p.x + 18, p.y + 14);

  // Subtitle
  ctx.fillStyle = '#cbd5e1';
  ctx.font = SUBTITLE_FONT;
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Scenario score breakdown
  const score = layout.scoreSection;
  if (score && layout.step === 'levelUp') {
    const sb = score.bounds;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.fill();
    ctx.strokeStyle = '#574f2a';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.stroke();

    ctx.font = HERO_NAME_FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fce28a';
    ctx.fillText(score.totalText, sb.x + 10, sb.y + 8);
    ctx.textAlign = 'right';
    ctx.fillText(score.campaignText, sb.x + sb.width - 10, sb.y + 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = DESC_FONT;
    ctx.textAlign = 'left';
    ctx.fillText(score.breakdownTexts.join('  ·  '), sb.x + 10, sb.y + 30);
    ctx.textAlign = 'left';
  }

  // Render Heroes / campaign statistics
  if (layout.step === 'partyWipe' && layout.wipeButtons) {
    for (const wb of layout.wipeButtons) {
      const isHovered = options?.hoveredWipeAction === wb.action;
      ctx.fillStyle = isHovered
        ? 'rgba(153, 27, 27, 0.6)'
        : 'rgba(127, 29, 29, 0.35)';
      drawRoundedRect(
        ctx,
        wb.bounds.x,
        wb.bounds.y,
        wb.bounds.width,
        wb.bounds.height,
        8,
      );
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#f87171' : '#b91c1c';
      ctx.lineWidth = isHovered ? 2 : 1;
      drawRoundedRect(
        ctx,
        wb.bounds.x,
        wb.bounds.y,
        wb.bounds.width,
        wb.bounds.height,
        8,
      );
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = BUTTON_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        wb.labelText,
        wb.bounds.x + wb.bounds.width / 2,
        wb.bounds.y + 16,
      );
      ctx.fillStyle = '#fca5a5';
      ctx.font = DESC_FONT;
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(
        ctx,
        hs.bounds.x,
        hs.bounds.y,
        hs.bounds.width,
        hs.bounds.height,
        6,
      );
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      drawRoundedRect(
        ctx,
        hs.bounds.x,
        hs.bounds.y,
        hs.bounds.width,
        hs.bounds.height,
        6,
      );
      ctx.stroke();

      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fce28a';
      ctx.font = BADGE_FONT;
      ctx.fillText(hs.headerText, hs.bounds.x + 10, hs.bounds.y + 8);

      for (const row of hs.rows) {
        ctx.fillStyle = row.isCurrent ? '#fcd34d' : '#cbd5e1';
        ctx.font = TABLE_FONT;
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
    renderCampaignCompleteSection(ctx, p, layout.campaignComplete);
  } else if (layout.step === 'levelUp') {
    for (const h of layout.heroes) {
      const hb = h.bounds;
      ctx.fillStyle = h.isLeveledUp
        ? 'rgba(212, 175, 55, 0.12)'
        : 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.fill();

      ctx.strokeStyle = h.isLeveledUp ? '#eab308' : '#334155';
      ctx.lineWidth = h.isLeveledUp ? 1.5 : 1;
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.stroke();

      // Hero name & color dot
      ctx.fillStyle =
        h.hero.colour === Colour.Red
          ? '#ef4444'
          : h.hero.colour === Colour.Blue
          ? '#3b82f6'
          : h.hero.colour === Colour.Yellow
          ? '#eab308'
          : '#10b981';
      ctx.beginPath();
      ctx.arc(hb.x + 14, hb.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = HERO_NAME_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 26, hb.y + 16);

      // XP info
      ctx.fillStyle = '#94a3b8';
      ctx.font = DESC_FONT;
      ctx.fillText(h.xpText, hb.x + 140, hb.y + 16);

      // Level badge
      const badgeX = hb.x + hb.width - 110;
      const badgeY = hb.y + 6;
      ctx.fillStyle = h.isLeveledUp ? '#ca8a04' : '#1e293b';
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.fill();
      ctx.strokeStyle = h.isLeveledUp ? '#fde047' : '#475569';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.stroke();

      ctx.fillStyle = h.isLeveledUp ? '#ffffff' : '#e2e8f0';
      ctx.font = BADGE_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(h.levelBadge, badgeX + 50, badgeY + 10);

      // Level Meaning explanation
      ctx.fillStyle = h.isLeveledUp ? '#fef08a' : '#cbd5e1';
      ctx.font = DESC_FONT;
      ctx.textAlign = 'left';
      ctx.fillText(h.levelMeaningText, hb.x + 26, hb.y + 36);
    }
  } else {
    // Trading step
    for (const h of layout.heroes) {
      const hb = h.bounds;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.stroke();

      // Hero header
      ctx.fillStyle =
        h.hero.colour === Colour.Red
          ? '#ef4444'
          : h.hero.colour === Colour.Blue
          ? '#3b82f6'
          : h.hero.colour === Colour.Yellow
          ? '#eab308'
          : '#10b981';
      ctx.beginPath();
      ctx.arc(hb.x + 12, hb.y + 14, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = HERO_NAME_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 22, hb.y + 14);

      if (h.items.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = ITEM_FONT;
        ctx.fillText(
          i18n('content.betweenDungeons.noItems'),
          hb.x + 10,
          hb.y + 42,
        );
      }

      // Render Items
      for (const it of h.items) {
        const ib = it.bounds;
        const isHovered =
          options?.hoveredItem?.heroIndex === it.heroIndex &&
          options?.hoveredItem?.itemIndex === it.itemIndex;

        ctx.fillStyle = it.isSelected
          ? '#854d0e'
          : isHovered
          ? '#334155'
          : '#1e293b';
        drawRoundedRect(ctx, ib.x, ib.y, ib.width, ib.height, 4);
        ctx.fill();

        ctx.strokeStyle = it.isSelected ? '#facc15' : '#475569';
        ctx.lineWidth = it.isSelected ? 1.5 : 1;
        drawRoundedRect(ctx, ib.x, ib.y, ib.width, ib.height, 4);
        ctx.stroke();

        ctx.fillStyle = it.isSelected ? '#fef08a' : '#f1f5f9';
        ctx.font = ITEM_FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.nameText, ib.x + 6, ib.y + ib.height / 2);
      }
    }

    // Give buttons
    for (const gb of layout.giveButtons) {
      const gbb = gb.bounds;
      const isHovered = options?.hoveredGiveHeroIndex === gb.targetHeroIndex;
      ctx.fillStyle = isHovered ? '#15803d' : '#166534';
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.fill();

      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = SMALL_BTN_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gb.label, gbb.x + gbb.width / 2, gbb.y + gbb.height / 2);
    }
  }

  // Secondary Button (Back)
  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    const sb = layout.secondaryButtonBounds;
    const isHovered = Boolean(options?.hoveredSecondary);
    ctx.fillStyle = isHovered ? '#475569' : '#334155';
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = BUTTON_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      layout.secondaryButtonLabel,
      sb.x + sb.width / 2,
      sb.y + sb.height / 2,
    );
  }

  // Action Button
  const ab = layout.actionButtonBounds;
  const isHovered = Boolean(options?.hoveredAction);
  if (ab.width > 0) {
    ctx.fillStyle = isHovered ? '#b45309' : '#92400e';
    drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = BUTTON_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      layout.actionButtonLabel,
      ab.x + ab.width / 2,
      ab.y + ab.height / 2,
    );
  }

  ctx.restore();
};
