// Hero status view model adapter: the only place that reads GameState for
// the full-screen status and inventory screen. Equipment slots, the
// inventory grid, the selected item's detail, the stat boxes, the applied
// status effects and every text — including the use/used labels and sprite
// references — are prebuilt here from the open hero's state.

import { ItemType } from '../../types';
import type { GameState, Hero, Item, TurnEvent } from '../../types';
import { liveHeroes } from '../../hero/HeroLogic';
import { ACTIVE, DESCRIPTION, USED } from '../../items/ItemLogic';
import { LEVEL_THRESHOLDS } from '../../dungeon/BetweenDungeonsLogic';
import type { SpriteRef, Translator } from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';
import { itemSpriteRef } from './heroCards';

export type HeroStatusSlotId = 'weapon' | 'armour' | 'shield';

export interface HeroStatusSlotVm {
  slotId: HeroStatusSlotId;
  labelText: string;
  isEmpty: boolean;
  nameText: string;
  effectText: string;
  isSelected: boolean;
  sprite: SpriteRef | undefined;
  icon: string | undefined;
}

export interface HeroStatusItemVm {
  itemIndex: number;
  nameText: string;
  isSelected: boolean;
  isDisabled: boolean;
  sprite: SpriteRef | undefined;
  icon: string | undefined;
}

export interface HeroStatusStatVm {
  statId: 'health' | 'experience' | 'actions' | 'steps';
  labelText: string;
  valueText: string;
  maxText: string;
}

export interface HeroStatusEffectVm {
  effectId: string;
  labelText: string;
}

export interface HeroStatusDetailVm {
  nameText: string;
  effectText: string | undefined;
  descriptionText: string;
  thematicDescriptionText: string;
  hasUse: boolean;
  isUsable: boolean;
  isUsed: boolean;
  useText: string;
  usedText: string;
}

export interface HeroStatusViewModel {
  heroId: string;
  headerText: string;
  closeIcon: string;
  slots: readonly HeroStatusSlotVm[];
  descriptionHeaderText: string;
  detail: HeroStatusDetailVm | null;
  statusEffectsHeaderText: string;
  effects: readonly HeroStatusEffectVm[];
  inventoryLabelText: string;
  inventory: readonly HeroStatusItemVm[];
  inventoryEmptyText: string;
  stats: readonly HeroStatusStatVm[];
}

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
  currentEvent?: TurnEvent,
): readonly HeroStatusEffectVm[] => {
  const effects: HeroStatusEffectVm[] = [];
  const addTranslatedEffect = (item: Item, effectId: string): void => {
    const nameKey = item.nameTranslationKey ?? item.name;
    if (!nameKey.endsWith('.name')) return;
    const effectKey = `${nameKey.slice(0, -'.name'.length)}.effect`;
    const labelText = t(effectKey);
    if (!labelText || labelText === effectKey) return;
    effects.push({ effectId, labelText });
  };
  if (hero.blinded) {
    effects.push({
      effectId: 'blinded',
      labelText: t('events.dragonsBreath.effect'),
    });
  }
  if (hero.weakened) {
    effects.push({
      effectId: 'weakened',
      labelText: t('events.weakness.effect'),
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
      labelText: t('events.elementalWeapon.effect'),
    });
  }
  [hero.weapon, hero.armour, hero.shield].forEach((item) => {
    if (!item || item.disabled) return;
    addTranslatedEffect(item, `equipment:${item.id ?? item.name}`);
  });
  if (
    currentEvent &&
    (currentEvent.effect === 'timePortal' ||
      currentEvent.effect === 'sleepingGasCloud' ||
      currentEvent.effect === 'theMagicStorm')
  ) {
    const nameKey = currentEvent.nameTranslationKey;
    if (nameKey?.endsWith('.name')) {
      const effectKey = `${nameKey.slice(0, -'.name'.length)}.effect`;
      const disabledMagicItem =
        currentEvent.effect === 'theMagicStorm'
          ? hero.inventory.find(
              (item) => item?.disabled && item.type === ItemType.MAGIC,
            )
          : undefined;
      if (currentEvent.effect !== 'theMagicStorm' || disabledMagicItem) {
        const labelText = t(
          effectKey,
          disabledMagicItem
            ? {
                item: t(
                  disabledMagicItem.nameTranslationKey ??
                    disabledMagicItem.name,
                ),
              }
            : undefined,
        );
        if (labelText && labelText !== effectKey) {
          effects.push({
            effectId: `event:${currentEvent.id ?? currentEvent.effect}`,
            labelText,
          });
        }
      }
    }
  }
  hero.inventory.forEach((item, index) => {
    if (!item || item.disabled || !item.properties) return;
    const properties = item.properties;
    const grantsPassiveEffect =
      Number(properties.MOVEMENT_BONUS) > 0 ||
      Number(properties.ATTACK_BONUS) > 0 ||
      Number(properties.SEARCH_BONUS) > 0 ||
      (Boolean(properties.RE_ROLL_ATTACK) && !properties[USED]);
    if (!grantsPassiveEffect) return;
    addTranslatedEffect(item, `item:${item.id ?? index}`);
  });
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
  const nameKey = item.nameTranslationKey ?? item.name;
  const translationPrefix = nameKey.endsWith('.name')
    ? nameKey.slice(0, -'.name'.length)
    : null;
  const translatedField = (field: string): string => {
    if (!translationPrefix) return '';
    const key = `${translationPrefix}.${field}`;
    const value = t(key);
    return value === key ? '' : value;
  };
  const effectText = translatedField('effect');
  const translatedDescription = translatedField('description');
  const legacyDescription = item.properties?.[DESCRIPTION]
    ? t(String(item.properties[DESCRIPTION]))
    : '';
  return {
    nameText: t(nameKey),
    effectText: effectText || undefined,
    descriptionText: translatedDescription || legacyDescription,
    thematicDescriptionText: translatedField('thematicDescription'),
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
      isDisabled: Boolean(item.disabled),
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
          effectText:
            detail.effectText ||
            equipmentEffectText(hero, selection.source.kind) ||
            undefined,
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
    effects: heroStatusEffects(hero, t, state?.currentEvent),
    inventoryLabelText: t('content.status.inventory'),
    inventory,
    inventoryEmptyText: '(Empty)',
    stats: statusStats(hero, t),
  };
};
