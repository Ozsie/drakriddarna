// Hero selection view model adapter: the only place that reads the game
// side for the hero-selection step — the campaign roster, party limits
// and the rename/party rules the controller drives.

import { getCampaign } from '../../campaigns';
import type { Campaign, Hero } from '../../types';
import type { Translator } from '@hoard-engine/uikit';
import { applyTextInputKey, clampTextInput } from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';

export interface HeroSelectionViewModel {
  headerText: string;
  startButtonLabel: string;
  backButtonLabel: string;
  minHeroes: number;
  maxHeroes: number;
  rows: {
    id: string;
    defaultLabel: string;
    colour: string;
  }[];
}

/** Player-typed names are clamped but never corrected or generated. */
export const MAX_HERO_NAME_LENGTH = 20;

/** The party always has at least one hero, regardless of the campaign. */
export const MIN_PARTY_SIZE = 1;

/** The campaign's maximum party size (its roster size unless capped). */
export const getMaxHeroes = (campaign: Campaign): number =>
  Math.max(MIN_PARTY_SIZE, campaign.maxHeroes ?? campaign.heroes.length);

/** All roster heroes selected, up to the campaign maximum, in roster order. */
export const getDefaultSelectedHeroIds = (campaign: Campaign): string[] =>
  campaign.heroes
    .map((hero) => hero.id ?? '')
    .filter((id) => id !== '')
    .slice(0, getMaxHeroes(campaign));

/**
 * Toggles a hero's selection. Deselection is always allowed (Start is
 * disabled below the minimum); selection is capped at the campaign
 * maximum. The result keeps the roster order.
 */
export const toggleHeroSelection = (
  rosterIds: string[],
  selectedIds: string[],
  heroId: string,
  maxHeroes: number,
): string[] => {
  if (selectedIds.includes(heroId)) {
    return selectedIds.filter((id) => id !== heroId);
  }
  if (selectedIds.length >= maxHeroes) {
    return selectedIds;
  }
  return rosterIds.filter((id) => selectedIds.includes(id) || id === heroId);
};

/** Names are user content: length-clamped, never corrected or generated. */
export const clampHeroName = (name: string): string =>
  clampTextInput(name, MAX_HERO_NAME_LENGTH);

/** The roster default a name input is prefilled with. */
export const getHeroDefaultName = (
  campaign: Campaign,
  heroId: string,
  t: Translator = i18nTranslator,
): string => {
  const hero = campaign.heroes.find((h) => h.id === heroId);
  return hero ? t(hero.nameTranslationKey ?? hero.name) : '';
};

/**
 * The value the rename editor edits: the typed name once the hero has
 * one, otherwise the prefilled roster default — so erasing and appending
 * both start from the name shown in the input.
 */
export const getHeroRenameValue = (
  campaign: Campaign,
  heroId: string,
  names: Record<string, string>,
  t: Translator = i18nTranslator,
): string => names[heroId] ?? getHeroDefaultName(campaign, heroId, t);

/**
 * Applies one rename keystroke: Backspace erases the last character,
 * a printable character appends (length-clamped), anything else is a
 * no-op.
 */
export const applyHeroRenameKey = (value: string, key: string): string =>
  applyTextInputKey(value, key, MAX_HERO_NAME_LENGTH);

/** Start needs at least one selected hero (empty names fall back). */
export const isHeroSelectionStartEnabled = (selectedIds: string[]): boolean =>
  selectedIds.length >= MIN_PARTY_SIZE;

/**
 * The override heroes for `init()`: deep clones of the selected roster
 * heroes in roster order, with the typed names applied. Renamed heroes
 * keep the roster id and get the typed name as their translation key, so
 * unrenamed heroes keep their translations and renamed ones display the
 * literal typed name. The campaign's registered roster is never touched.
 */
export const buildSelectedHeroes = (
  campaign: Campaign,
  selectedIds: string[],
  names: Record<string, string>,
): Hero[] =>
  campaign.heroes
    .filter((hero) => hero.id !== undefined && selectedIds.includes(hero.id))
    .map((hero) => {
      const clone = structuredClone(hero) as Hero;
      const typed = names[hero.id ?? ''] ?? '';
      const trimmed = typed.trim();
      if (trimmed) {
        clone.name = clampHeroName(trimmed);
        clone.nameTranslationKey = clone.name;
      }
      return clone;
    });

export const toHeroSelectionViewModel = (
  campaignId: string,
  t: Translator = i18nTranslator,
): HeroSelectionViewModel => {
  const campaign = getCampaign(campaignId);
  return {
    headerText: t('content.menu.heroSelection.header'),
    startButtonLabel: t('content.menu.heroSelection.buttons.start'),
    backButtonLabel: t('content.menu.loadGame.buttons.back'),
    minHeroes: MIN_PARTY_SIZE,
    maxHeroes: getMaxHeroes(campaign),
    rows: campaign.heroes.map((hero) => ({
      id: hero.id ?? '',
      defaultLabel: t(hero.nameTranslationKey ?? hero.name),
      colour: hero.colour,
    })),
  };
};
