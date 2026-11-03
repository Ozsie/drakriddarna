// Between-dungeons view model adapter: the only place that reads GameState
// for the between-dungeons dialog, and the owner of its rules — the
// scenario/campaign score texts, the level-up XP lines, the tradable-item
// columns (with the selection match), the campaign-complete statistics and
// the party-wipe high-score merge.

import type {
  Armour,
  GameState,
  Hero,
  Item,
  PartyWipeAction,
  Shield,
  Weapon,
} from '../../types';
import { ItemType } from '../../types';
import { SCORE_POINTS_PER_SECRET, formatDuration } from '../../core';
import { MAX_HIGH_SCORES } from '../../saves/HighScoresLogic';
import { getHeroTradableItems } from '../../dungeon/BetweenDungeonsLogic';
import type { Translator } from '../../uikit/env';
import type {
  BetweenDungeonsViewModel,
  CampaignCompleteHeroRowVm,
  CampaignCompleteVm,
  HeroSectionVm,
  HighScoreRowVm,
  ScoreSectionVm,
  TradeItemVm,
  WipeChoiceVm,
} from '../../uikit/components/betweenDungeons';
import { i18nTranslator } from '../i18nAdapter';
import { actorColourKey } from '../theme';

/**
 * The wipe screen's high-score list: the stored top 10 with the current
 * run's score ranked into it (the entries that beat it). Pure — the
 * display rank is the row position.
 */
export const rankedHighScores = (
  stored: readonly { score: number }[],
  currentScore: number,
  maxEntries = MAX_HIGH_SCORES,
): HighScoreRowVm[] => {
  const currentRank =
    1 + stored.filter((entry) => entry.score > currentScore).length;
  const storedRows = stored
    .slice(0, maxEntries)
    .map((entry) => ({ score: entry.score, isCurrent: false }));
  const currentRow = { score: currentScore, isCurrent: true };
  return (
    currentRank <= maxEntries
      ? [
          ...storedRows.slice(0, currentRank - 1),
          currentRow,
          ...storedRows.slice(currentRank - 1),
        ].slice(0, maxEntries)
      : [...storedRows, currentRow]
  ).map((row) => ({ ...row, isCurrent: row.isCurrent }));
};

const scoreSectionVm = (
  state: GameState,
  t: Translator,
): ScoreSectionVm | null => {
  const bd = state.betweenDungeons;
  if (!bd?.scenarioScore) return null;
  const s = bd.scenarioScore;
  return {
    totalText: t('content.scoring.scenarioScore', {
      score: String(s.total),
    }),
    campaignText: t('content.scoring.campaignTotal', {
      score: String(bd.campaignScore ?? 0),
    }),
    breakdownTexts: [
      t('content.scoring.health', { points: String(s.healthPoints) }),
      t('content.scoring.monsters', { points: String(s.killPoints) }),
      t('content.scoring.loot', { points: String(s.itemPoints) }),
      t('content.scoring.secrets', { points: String(s.secretPoints) }),
      t('content.scoring.rounds', { points: String(s.roundPenalty) }),
    ],
    timeText:
      bd.dungeonTimeMs !== undefined
        ? t('content.scoring.time', { time: formatDuration(bd.dungeonTimeMs) })
        : undefined,
  };
};

const campaignCompleteVm = (
  state: GameState,
  t: Translator,
): CampaignCompleteVm | null => {
  const bd = state.betweenDungeons;
  if (!bd || bd.step !== 'campaignComplete') return null;

  const records = state.scenarioScores ?? [];
  const totalRounds = records.reduce((sum, r) => sum + r.rounds, 0);
  const totalKills = records.reduce((sum, r) => sum + r.kills, 0);
  const totalSecrets = records.reduce(
    (sum, r) => sum + r.score.secretPoints / SCORE_POINTS_PER_SECRET,
    0,
  );

  const heroRows: CampaignCompleteHeroRowVm[] = (state.heroes as Hero[]).map(
    (hero) => {
      const alive = hero.health > 0;
      const itemsCarried =
        hero.inventory.filter((item) => item).length +
        (hero.weapon ? 1 : 0) +
        (hero.armour ? 1 : 0) +
        (hero.shield ? 1 : 0);
      return {
        title: t(hero.name),
        colourKey: actorColourKey(hero.colour),
        levelText: t(`content.level.${hero.level}`),
        xpText: String(hero.experience),
        hpText: alive
          ? `${hero.health}/${hero.maxHealth}`
          : t('content.campaignComplete.fallen'),
        killsText: String(hero.kills ?? 0),
        itemsText: String(itemsCarried),
        alive,
      };
    },
  );

  return {
    scoreText: t('content.scoring.campaignTotal', {
      score: String(bd.campaignScore ?? 0),
    }),
    timeText:
      bd.campaignTimeMs !== undefined
        ? t('content.campaignComplete.campaignTime', {
            time: formatDuration(bd.campaignTimeMs),
          })
        : undefined,
    summaryText: t('content.campaignComplete.summary', {
      scenarios: String(records.length),
      rounds: String(totalRounds),
      kills: String(totalKills),
      secrets: String(totalSecrets),
    }),
    scenarioHeader: {
      name: t('content.campaignComplete.scenarioHeader'),
      rounds: t('content.campaignComplete.roundsHeader'),
      kills: t('content.campaignComplete.killsHeader'),
      score: t('content.campaignComplete.scoreHeader'),
    },
    scenarioRows: records.map((record) => ({
      nameText: t(record.dungeonName),
      roundsText: String(record.rounds),
      killsText: String(record.kills),
      scoreText: String(record.score.total),
    })),
    heroHeader: {
      name: t('content.campaignComplete.heroHeader'),
      level: t('content.campaignComplete.levelHeader'),
      xp: 'XP',
      health: t('content.campaignComplete.healthHeader'),
      kills: t('content.campaignComplete.killsHeader'),
      items: t('content.campaignComplete.itemsHeader'),
    },
    heroRows,
  };
};

const levelUpHeroesVm = (state: GameState, t: Translator): HeroSectionVm[] => {
  const bd = state.betweenDungeons!;
  const heroList = state.heroes as Hero[];

  return heroList.map((hero, index) => {
    const info = bd.levelUps[index];
    const isLeveledUp = info?.leveledUp ?? false;
    const levelName = t(`content.level.${hero.level}`);
    const xpText = info
      ? info.xpToNextLevel
        ? `${t('content.betweenDungeons.xpProgress', {
            xp: String(hero.experience),
          })} ${t('content.betweenDungeons.nextLevelXp', {
            needed: String(info.xpToNextLevel),
            nextLevel: t(`content.level.${info.nextLevel ?? 'max'}`),
          })}`
        : `${t('content.betweenDungeons.xpProgress', {
            xp: String(hero.experience),
          })} ${t('content.betweenDungeons.maxLevel')}`
      : `${hero.experience} XP`;

    return {
      heroIndex: index,
      title: t(hero.name),
      colourKey: actorColourKey(hero.colour),
      levelBadge: isLeveledUp
        ? t('content.betweenDungeons.leveledUpBadge')
        : levelName,
      isLeveledUp,
      xpText,
      levelMeaningText: info?.levelMeaning || '',
      items: [],
    };
  });
};

const tradeItemName = (item: Item, category: string, t: Translator): string => {
  let nameText = t(item.nameTranslationKey ?? item.name);
  if (category === 'weapon') {
    nameText = `🗡️ ${nameText} (${(item as Weapon).dice})`;
  } else if (category === 'armour') {
    nameText = `🥋 ${nameText} (${(item as Armour).defense})`;
  } else if (category === 'shield') {
    nameText = `🛡️ ${nameText} (${(item as Shield).dice})`;
  } else {
    if (item.type === ItemType.WEAPON) {
      nameText = `🗡️ ${nameText}`;
    } else if (item.type === ItemType.ARMOUR) {
      nameText = `🥋 ${nameText}`;
    } else if (item.type === ItemType.SHIELD) {
      nameText = `🛡️ ${nameText}`;
    } else {
      nameText = `📦 ${nameText}`;
    }
  }
  return nameText;
};

const tradeHeroesVm = (state: GameState, t: Translator): HeroSectionVm[] => {
  const bd = state.betweenDungeons!;
  const heroList = state.heroes as Hero[];

  return heroList.map((hero, hIndex) => {
    const tradableItems = getHeroTradableItems(hero);
    const items: TradeItemVm[] = tradableItems.map((entry, entryIndex) => ({
      slot: entry.slot,
      itemIndex: typeof entry.slot === 'number' ? entry.slot : entryIndex,
      nameText: tradeItemName(entry.item, entry.category, t),
      isSelected:
        bd.selectedTradeItem?.heroIndex === hIndex &&
        (bd.selectedTradeItem?.slot === entry.slot ||
          (typeof entry.slot === 'number' &&
            bd.selectedTradeItem?.itemIndex === entry.slot)),
    }));

    return {
      heroIndex: hIndex,
      title: t(hero.name),
      colourKey: actorColourKey(hero.colour),
      levelBadge: t(`content.level.${hero.level}`),
      isLeveledUp: false,
      xpText: `${hero.experience} XP`,
      levelMeaningText: '',
      items,
    };
  });
};

const wipeChoicesVm = (
  state: GameState,
  completedName: string,
  t: Translator,
): WipeChoiceVm[] => {
  const choices: {
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
  return choices.map((choice) => ({
    action: choice.action,
    labelText: t(choice.labelKey),
    descriptionText: t(choice.descriptionKey, { name: completedName }),
  }));
};

export const toBetweenDungeonsViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
): BetweenDungeonsViewModel | null => {
  if (!state || !state.betweenDungeons) return null;
  const bd = state.betweenDungeons;

  const step = bd.step;
  const isLevelUp = step === 'levelUp';
  const isCampaignComplete = step === 'campaignComplete';
  const isPartyWipe = step === 'partyWipe';

  const nextDungeonName = bd.nextDungeon?.name ? t(bd.nextDungeon.name) : '';
  const completedName = bd.completedDungeonName
    ? t(bd.completedDungeonName)
    : '';

  const titleText = isCampaignComplete
    ? t('content.campaignComplete.title', {
        name: t(bd.completedCampaignName ?? bd.completedDungeonName),
      })
    : isPartyWipe
      ? t('content.partyWipe.title')
      : isLevelUp
        ? t('content.betweenDungeons.titleLevelUp', { name: completedName })
        : t('content.betweenDungeons.titleTrade');

  const subtitleText = isCampaignComplete
    ? t('content.campaignComplete.subtitle')
    : isPartyWipe
      ? t('content.partyWipe.subtitle', { name: completedName })
      : isLevelUp
        ? t('content.betweenDungeons.subtitleLevelUp')
        : t('content.betweenDungeons.subtitleTrade', {
            nextDungeon: nextDungeonName || completedName,
          });

  const actionButtonLabel = isCampaignComplete
    ? t('content.betweenDungeons.buttons.finishCampaign')
    : isLevelUp
      ? t('content.betweenDungeons.buttons.tradeItems')
      : bd.nextDungeon
        ? t('content.betweenDungeons.buttons.startNextDungeon')
        : t('content.betweenDungeons.buttons.finishCampaign');

  return {
    step,
    titleText,
    subtitleText,
    actionButtonLabel,
    secondaryButtonLabel:
      step === 'trade'
        ? t('content.betweenDungeons.buttons.backToLevelUp')
        : undefined,
    scoreSection: isLevelUp ? scoreSectionVm(state, t) : null,
    campaignComplete: campaignCompleteVm(state, t),
    wipeChoices: isPartyWipe
      ? wipeChoicesVm(state, completedName, t)
      : undefined,
    wipeHighScores: isPartyWipe
      ? {
          headerText: t('content.partyWipe.highScores'),
          currentLabelText: t('content.partyWipe.thisRun'),
          rows: rankedHighScores(
            bd.wipeHighScores ?? [],
            bd.campaignScore ?? 0,
          ),
        }
      : null,
    heroes: isLevelUp
      ? levelUpHeroesVm(state, t)
      : step === 'trade'
        ? tradeHeroesVm(state, t)
        : [],
    selectedTradeHeroIndex: bd.selectedTradeItem
      ? bd.selectedTradeItem.heroIndex
      : null,
    giveItemText: t('content.betweenDungeons.buttons.giveItem'),
    noItemsText: t('content.betweenDungeons.noItems'),
  };
};
