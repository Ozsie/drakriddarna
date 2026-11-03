// Monster cards view model adapter: the only place that reads GameState for
// the monster cards. Visible monsters (discovered rooms, compact filter),
// current/target highlighting and every card text are prebuilt here.

import type { GameState, Monster } from '../../types';
import { findVisibleMonsters } from '../../monsters/MonsterLogic';
import type { Translator } from '../../uikit/env';
import type { MonsterCardsViewModel } from '../../uikit/components/monsterCards';
import { i18nTranslator } from '../i18nAdapter';

const translateOrFallback = (
  key: string,
  fallback: string,
  t: Translator,
): string => {
  const res = t(key);
  return res === key ? fallback : res || fallback;
};

/** Identity of a monster card hit: the monster's id or name. */
export const monsterCardId = (monster: Monster): string =>
  monster.id ?? monster.name;

export const toMonsterCardsViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
  compact = false,
): MonsterCardsViewModel => {
  if (!state) return { cards: [] };

  const monsters = findVisibleMonsters(state);
  if (!monsters || monsters.length === 0) return { cards: [] };

  const currentActor = state.currentActor;
  const targetActor = state.targetActor;

  const isMonsterCurrent = (monster: Monster): boolean =>
    Boolean(currentActor && currentActor === (monster as unknown));
  const isMonsterTarget = (monster: Monster): boolean =>
    Boolean(
      targetActor &&
      (targetActor === (monster as unknown) ||
        (targetActor.name === monster.name &&
          targetActor.position?.x === monster.position?.x &&
          targetActor.position?.y === monster.position?.y)),
    );

  // On narrow screens only the active monster's card is drawn, mirroring
  // the hero cards, so the cards never cover the whole board.
  const visibleMonsters = compact
    ? monsters.filter((m) => isMonsterCurrent(m) || isMonsterTarget(m))
    : monsters;

  if (visibleMonsters.length === 0) return { cards: [] };

  const noneLabel = translateOrFallback('content.hero.none', 'None', t);
  const hpLabel = translateOrFallback('content.hero.hp', 'HP', t);

  return {
    cards: visibleMonsters.map((monster) => {
      const isTarget = isMonsterTarget(monster);
      const monsterNameTranslated = t(
        monster.nameTranslationKey ?? monster.name,
      );
      const weaponName = monster.weapon
        ? t(monster.weapon.nameTranslationKey ?? monster.weapon.name)
        : noneLabel;
      const rangedWeaponName = monster.rangedWeapon
        ? t(
            monster.rangedWeapon.nameTranslationKey ??
              monster.rangedWeapon.name,
          )
        : noneLabel;
      const armourName = monster.armour
        ? t(monster.armour.nameTranslationKey ?? monster.armour.name)
        : noneLabel;
      const shieldName = monster.shield
        ? t(monster.shield.nameTranslationKey ?? monster.shield.name)
        : noneLabel;

      return {
        id: monsterCardId(monster),
        title: `${isTarget ? '*' : ''}${monsterNameTranslated}`,
        colour: monster.colour,
        isCurrent: isMonsterCurrent(monster),
        isTarget,
        hpText: `${hpLabel}: ${monster.health}`,
        hasRangedWeapon: Boolean(monster.rangedWeapon),
        weaponText: `🗡 ${weaponName} (${monster.weapon?.dice ?? 0})`,
        rangedWeaponText: `🏹 ${rangedWeaponName} (${
          monster.rangedWeapon?.dice ?? 0
        })`,
        armourText: `🥋 ${armourName} (${monster.armour?.defense ?? 0})`,
        shieldText: `🛡 ${shieldName} (${monster.shield?.dice ?? 0})`,
      };
    }),
  };
};
