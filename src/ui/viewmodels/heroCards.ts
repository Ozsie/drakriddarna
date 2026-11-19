// Hero cards view model adapter: the only place that reads GameState for
// the hero cards. Live heroes, the compact filter, current/target
// highlighting and every card text are prebuilt here. The cards' inventory
// button opens the full-screen hero status screen; the cards themselves
// carry no inventory view (see ./heroStatus for that screen's adapter).

import type { GameState, Hero, Item } from '../../types';
import { liveHeroes } from '../../hero/HeroLogic';
import type { SpriteRef, Translator } from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';

export interface HeroCardVm {
  heroId: string;
  title: string;
  colour: Hero['colour'];
  isCurrent: boolean;
  isTarget: boolean;
  hpText: string;
  actionsText?: string;
  movesText?: string;
  equipmentText?: string;
  weaponText?: string;
  armourText?: string;
  shieldText?: string;
  inventoryButtonIcon: string;
}

export interface HeroCardsViewModel {
  cards: HeroCardVm[];
}

const heroCardVm = (
  hero: Hero,
  isCurrent: boolean,
  isTarget: boolean,
  t: Translator,
): HeroCardVm => {
  const heroNameTranslated = t(hero.name);
  const levelTranslated = t(`content.level.${hero.level}`);
  const title = `${
    isTarget ? '*' : ''
  }${heroNameTranslated} - ${levelTranslated} (${hero.experience})`;
  const noneText = `${t('content.hero.none')} (0)`;

  return {
    heroId: hero.name,
    title,
    colour: hero.colour,
    isCurrent,
    isTarget,
    hpText: `${t('content.hero.hp')}: ${hero.health}`,
    actionsText: isCurrent
      ? `${t('content.hero.actions')}: ${hero.actions}`
      : undefined,
    movesText: isCurrent
      ? `${t('content.hero.moves')}: ${hero.movement}`
      : undefined,
    equipmentText: isCurrent ? `${t('content.hero.equipment')}:` : undefined,
    weaponText: isCurrent
      ? `🗡️ ${t(hero.weapon.name)} (${hero.weapon.dice})`
      : undefined,
    armourText: isCurrent
      ? `🥋 ${
          hero.armour
            ? `${t(hero.armour.name)} (${hero.armour.defense})`
            : noneText
        }`
      : undefined,
    shieldText: isCurrent
      ? `🛡️ ${
          hero.shield
            ? `${t(hero.shield.name)} (${hero.shield.dice})`
            : noneText
        }`
      : undefined,
    inventoryButtonIcon: '🎒',
  };
};

/** Maps an item's sprite sheet to a sprite ref for the asset port. */
export const itemSpriteRef = (item: Item): SpriteRef | undefined =>
  item.sprite
    ? {
        assetId: item.sprite.image,
        index: item.sprite.index,
        size: item.sprite.size,
      }
    : undefined;

export const toHeroCardsViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
  compact = false,
): HeroCardsViewModel => {
  if (!state) return { cards: [] };

  const heroes = liveHeroes(state);
  if (!heroes || heroes.length === 0) return { cards: [] };

  const currentActorName = state.currentActor?.name;
  const targetActorName = state.targetActor?.name;

  // On narrow screens only the active or targeted hero's card is drawn;
  // the other cards would cover the board and overlap the monster cards.
  const visibleHeroes = compact
    ? heroes.filter(
        (hero) =>
          hero.name === currentActorName || hero.name === targetActorName,
      )
    : heroes;

  return {
    cards: visibleHeroes.map((hero) =>
      heroCardVm(
        hero,
        currentActorName === hero.name,
        targetActorName === hero.name,
        t,
      ),
    ),
  };
};
