// Hero status view model adapter: the only place that reads GameState for
// the full-screen status and inventory screen. Equipment slots, the
// inventory grid, the selected item's detail, the stat boxes, the applied
// status effects and every text — including the use/used labels and sprite
// references — are prebuilt here from the open hero's state.

import type { GameState, Hero, Item } from '../../types';
import { liveHeroes } from '../../hero/HeroLogic';
import { ACTIVE, DESCRIPTION, USED } from '../../items/ItemLogic';
import { LEVEL_THRESHOLDS } from '../../dungeon/BetweenDungeonsLogic';
import type {
  HeroStatusDetailVm,
  HeroStatusEffectVm,
  HeroStatusItemVm,
  HeroStatusSlotId,
  HeroStatusSlotVm,
  HeroStatusStatVm,
  HeroStatusViewModel,
  Translator,
} from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';
import { itemSpriteRef } from './heroCards';

/** The item a status-screen selection refers to, as a slot id or an inventory index. */
export type HeroStatusSelectionSource =
  | { kind: 'weapon' }
  | { kind: 'armour' }
  | { kind: 'shield' }
  | { kind: 'inventory'; itemIndex: number };

/** The board controller's selected item on the status screen (UI state, not GameState). */
export interface HeroStatusSelection {
  readonly heroId: string;
  readonly source: HeroStatusSelectionSource;
}

/** Sentinel for "no max value" (the master level has no next threshold). */
const noMax = (t: Translator): string => t('content.level.max');

/** The hero whose status screen is open, or null when the screen is closed. */
export const heroWithOpenStatus = (
  state: GameState | null | undefined,
): Hero | null => {
  if (!state) return null;
  return liveHeroes(state).find((hero) => hero.isInventoryOpen) ?? null;
};

export const heroStatusItemForSource = (
  hero: Hero,
  source: HeroStatusSelectionSource,
): Item | null => {
  switch (source.kind) {
    case 'weapon':
      return hero.weapon;
    case 'armour':
      return hero.armour ?? null;
    case 'shield':
      return hero.shield ?? null;
    case 'inventory':
      return (hero.inventory ?? [])[source.itemIndex] ?? null;
  }
  return null;
};

/** Whether the selection points at this slot or inventory index. */
const isSelected = (
  selection: HeroStatusSelection | null | undefined,
  source: HeroStatusSelectionSource,
): boolean => {
  if (!selection || selection.source.kind !== source.kind) return false;
  if (selection.source.kind === 'inventory' && source.kind === 'inventory') {
    return selection.source.itemIndex === source.itemIndex;
  }
  return true;
};

/** The effect line for an equipped item (dice/defense numbers), matching the hero card texts. */
const equipmentEffectText = (hero: Hero, slotId: HeroStatusSlotId): string => {
  switch (slotId) {
    case 'weapon':
      return `(${hero.weapon.dice})`;
    case 'armour':
      return hero.armour ? `(${hero.armour.defense})` : '';
    case 'shield':
      return hero.shield ? `(${hero.shield.dice})` : '';
  }
  return '';
};

const slotVm = (
  hero: Hero,
  slotId: HeroStatusSlotId,
  labelText: string,
  item: Item | null,
  isSelectedSlot: boolean,
  t: Translator,
): HeroStatusSlotVm => ({
  slotId,
  labelText,
  isEmpty: !item,
  nameText: item
    ? t(item.nameTranslationKey ?? item.name)
    : t('content.hero.none'),
  effectText: item ? equipmentEffectText(hero, slotId) : '',
  isSelected: !item ? false : isSelectedSlot,
  sprite: item ? itemSpriteRef(item) : undefined,
  icon: item?.icon,
});

/** Experience still needed counts by level band; the absolute threshold is the stat max. */
const experienceMaxText = (hero: Hero, t: Translator): string => {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (hero.experience < threshold.xp) {
      return String(threshold.xp);
    }
  }
  return noMax(t);
};

/** The stat boxes: current and max values, maxes already reflecting equipment and effects. */
const statusStats = (
  hero: Hero,
  t: Translator,
): readonly HeroStatusStatVm[] => [
  {
    statId: 'health',
    labelText: t('content.status.health'),
    valueText: String(hero.health),
    maxText: String(hero.maxHealth),
  },
  {
    statId: 'experience',
    labelText: t('content.status.experience'),
    valueText: String(hero.experience),
    maxText: experienceMaxText(hero, t),
  },
  {
    statId: 'actions',
    labelText: t('content.hero.actions'),
    valueText: String(hero.actions),
    maxText: '2',
  },
  {
    statId: 'steps',
    labelText: t('content.status.steps'),
    valueText: String(hero.movement),
    maxText: String(hero.maxMovement),
  },
];

/** The status effects currently applied to the hero by items and events. */
export const heroStatusEffects = (
  hero: Hero,
  t: Translator,
): readonly HeroStatusEffectVm[] => {
  const effects: HeroStatusEffectVm[] = [];
  if (hero.blinded) {
    effects.push({
      effectId: 'blinded',
      labelText: t('content.indicators.blinded'),
    });
  }
  if (hero.weakened) {
    effects.push({
      effectId: 'weakened',
      labelText: t('content.indicators.weakened'),
    });
  }
  if (hero.incapacitated) {
    effects.push({
      effectId: 'incapacitated',
      labelText: t('content.status.incapacitated'),
    });
  }
  if (hero.ignoredByMonsters) {
    effects.push({
      effectId: 'invisible',
      labelText: t('content.indicators.invisible'),
    });
  }
  if (hero.weapon.elemental) {
    effects.push({
      effectId: 'elemental',
      labelText: t('content.indicators.elemental'),
    });
  }
  return effects;
};

/** The selected item's detail panel content; use/used state only for active inventory items. */
const detailVm = (
  item: Item,
  isActiveInventoryItem: boolean,
  t: Translator,
): HeroStatusDetailVm => {
  const isActive = isActiveInventoryItem && Boolean(item.properties?.[ACTIVE]);
  const isUsed = isActiveInventoryItem && Boolean(item.properties?.[USED]);
  return {
    nameText: t(item.nameTranslationKey ?? item.name),
    effectText: undefined,
    descriptionText: item.properties?.[DESCRIPTION]
      ? t(String(item.properties[DESCRIPTION]))
      : '',
    hasUse: isActive,
    isUsable: isActive && !isUsed,
    isUsed,
    useText: t('content.inventory.use'),
    usedText: t('content.inventory.used'),
  };
};

/**
 * Builds the status screen view model for the hero whose screen is open.
 * Null when the screen is closed or the hero disappeared.
 */
export const toHeroStatusViewModel = (
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null = null,
  t: Translator = i18nTranslator,
): HeroStatusViewModel | null => {
  const hero = heroWithOpenStatus(state);
  if (!hero) return null;

  const slotSelected = (slotId: HeroStatusSlotId): boolean =>
    selection !== null &&
    selection.heroId === hero.name &&
    isSelected(selection, { kind: slotId });

  const itemSelected = (itemIndex: number): boolean =>
    selection !== null &&
    selection.heroId === hero.name &&
    isSelected(selection, { kind: 'inventory', itemIndex });

  const slots: readonly HeroStatusSlotVm[] = [
    slotVm(
      hero,
      'weapon',
      t('content.status.weapon'),
      hero.weapon,
      slotSelected('weapon'),
      t,
    ),
    slotVm(
      hero,
      'armour',
      t('content.status.armour'),
      hero.armour ?? null,
      slotSelected('armour'),
      t,
    ),
    slotVm(
      hero,
      'shield',
      t('content.status.shield'),
      hero.shield ?? null,
      slotSelected('shield'),
      t,
    ),
  ];

  const inventory: readonly HeroStatusItemVm[] = (hero.inventory ?? []).map(
    (item, itemIndex): HeroStatusItemVm => ({
      itemIndex,
      nameText: t(item.nameTranslationKey ?? item.name),
      isSelected: itemSelected(itemIndex),
      sprite: itemSpriteRef(item),
      icon: item.icon,
    }),
  );

  let detail: HeroStatusDetailVm | null = null;
  if (selection && selection.heroId === hero.name) {
    const item = heroStatusItemForSource(hero, selection.source);
    if (item) {
      const isInventoryItem = selection.source.kind === 'inventory';
      detail = detailVm(item, isInventoryItem, t);
      if (!isInventoryItem) {
        detail = {
          ...detail,
          effectText: equipmentEffectText(hero, selection.source.kind),
          hasUse: false,
          isUsable: false,
          isUsed: false,
        };
      }
    }
  }

  return {
    heroId: hero.name,
    headerText: t('content.inventory.label', { hero: t(hero.name) }),
    closeIcon: '✕',
    slots,
    descriptionHeaderText: t('content.status.description'),
    detail,
    statusEffectsHeaderText: t('content.status.statusEffects'),
    effects: heroStatusEffects(hero, t),
    inventoryLabelText: t('content.status.inventory'),
    inventory,
    inventoryEmptyText: '(Empty)',
    stats: statusStats(hero, t),
  };
};
