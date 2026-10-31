import type { Actor, GameState, Hero, Monster } from '../../types';
import { Level } from '../../types';
import { nextRandom } from '../../core';
import { logMonsterTargetSelection } from './logger';

export interface TargetScoreOptions {
  state?: GameState;
  monster: Monster;
  hero?: Hero;
  ranged?: boolean;
  stepsByHero?: Map<Hero, number> | ((hero: Hero) => number);
  stepsNeeded?: number;
  rng?: () => number;
  noticeRoll?: number;
  randomVal?: number;
  debug?: boolean;
}

export interface ScoredHero {
  hero: Hero;
  score: number;
  stepsNeeded: number;
  expectedDamage: number;
  isLastAttacker: boolean;
  targetedTimes: number;
  noticedKill: boolean;
  randomBonus: number;
}

export const getHitRate = (level?: Level): number => {
  switch (level) {
    case Level.APPRENTICE:
      return 2 / 6;
    case Level.KNIGHT:
    case Level.HERO:
      return 3 / 6;
    case Level.LORD:
    case Level.MASTER:
    default:
      return 4 / 6;
  }
};

export const getMonsterExpectedDamage = (
  monster: Monster,
  target?: Actor,
  ranged = false,
): number => {
  const weapon =
    ranged && monster.rangedWeapon ? monster.rangedWeapon : monster.weapon;
  const rawDice = weapon?.dice ?? 3;
  const dice = Math.max(
    0,
    rawDice - (monster.blinded ? 1 : 0) - (monster.weakened ? 1 : 0),
  );
  const hitRate = getHitRate(monster.level);
  const expectedHits = dice * hitRate;

  if (!target) {
    return expectedHits;
  }

  const defense = weapon?.ignoresArmour
    ? 0
    : target.armour?.defense ?? target.defense ?? 0;
  const shieldDice = weapon?.ignoresShield ? 0 : target.shield?.dice ?? 0;
  const shieldRate = getHitRate(target.level);
  const expectedShield = shieldDice * shieldRate;

  return Math.max(0, expectedHits - (defense + expectedShield));
};

export const scoreHero = (
  hero: Hero,
  options: TargetScoreOptions,
): ScoredHero => {
  const monster = options.monster;
  const stepsNeeded =
    options.stepsNeeded !== undefined
      ? options.stepsNeeded
      : typeof options.stepsByHero === 'function'
      ? options.stepsByHero(hero)
      : options.stepsByHero?.get(hero) ?? 0;

  let score = 10;
  score -= 3 * stepsNeeded;

  const isLastAttacker = Boolean(
    (monster.lastAttackedBy &&
      (monster.lastAttackedBy === hero.id ||
        monster.lastAttackedBy === hero.name)) ||
      (monster.lastAttackedByHero &&
        (monster.lastAttackedByHero === hero ||
          monster.lastAttackedByHero.id === hero.id ||
          monster.lastAttackedByHero.name === hero.name)),
  );
  if (isLastAttacker) {
    score += 3;
  }

  const targetedTimes =
    hero.roundTargetCount ??
    options.state?.roundTargetCounts?.[hero.id ?? hero.name] ??
    0;
  if (targetedTimes >= 2) {
    score -= 4;
  }

  const expectedDamage = getMonsterExpectedDamage(
    monster,
    hero,
    options.ranged,
  );
  const noticeRoll =
    options.noticeRoll !== undefined
      ? options.noticeRoll
      : options.rng
      ? options.rng()
      : nextRandom();

  const noticedKill = hero.health <= expectedDamage && noticeRoll < 0.5;
  if (noticedKill) {
    score += 2;
  }

  const randomBonus =
    options.randomVal !== undefined
      ? options.randomVal
      : (options.rng ? options.rng() : nextRandom()) * 3;

  score += randomBonus;

  return {
    hero,
    score,
    stepsNeeded,
    expectedDamage,
    isLastAttacker,
    targetedTimes,
    noticedKill,
    randomBonus,
  };
};

export const scoreHeroTarget = (
  options: TargetScoreOptions & { hero: Hero },
): number => scoreHero(options.hero, options).score;

export const selectScoredTarget = (
  possibleTargets: Hero[],
  options: TargetScoreOptions,
): Hero => {
  if (possibleTargets.length === 0) {
    throw new Error('No targets to select from');
  }

  const scored = possibleTargets.map((hero) => scoreHero(hero, options));
  scored.sort((a, b) => b.score - a.score);

  logMonsterTargetSelection({
    monster: options.monster,
    candidates: scored,
    selectedHero: scored[0].hero,
    actionType: options.ranged ? 'ranged' : 'melee',
    state: options.state,
    debug: options.debug,
  });

  return scored[0].hero;
};

export const resetRoundTargetCounters = (state: GameState): void => {
  if (state.heroes) {
    state.heroes.forEach((hero) => {
      hero.roundTargetCount = 0;
    });
  }
  state.roundTargetCounts = {};
};
