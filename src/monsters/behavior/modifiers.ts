import type { Difficulty, GameState } from '../../types';
import { getDifficulty, getGameMaster, nextRandom } from '../../core';
import type {
  BehaviorContext,
  DirectorState,
  EvaluatedBehavior,
  MonsterBehavior,
} from './types';

export const getDirectorState = (
  hasDeadHero: boolean,
  partyHpPercentage: number,
  aliveMonsterCount: number,
  difficultyOrState?: Difficulty | GameState | string,
): DirectorState => {
  let difficulty: Difficulty | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = getGameMaster(difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  }

  if (difficulty?.monsterBehavior?.getDirectorState) {
    return difficulty.monsterBehavior.getDirectorState({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    });
  }

  if (hasDeadHero || partyHpPercentage < 0.45) {
    return 'EASE';
  }
  if (partyHpPercentage > 0.8 && aliveMonsterCount <= 1) {
    return 'PUSH';
  }
  return 'NEUTRAL';
};

export const rollBowForgotten = (
  difficultyOrState?: Difficulty | GameState | string,
): boolean => {
  let difficulty: Difficulty | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = getGameMaster(difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  } else {
    difficulty = getDifficulty(undefined);
  }

  const chance = difficulty?.monsterBehavior?.bowForgottenChance ?? 0.15;
  return nextRandom() < chance;
};

export const calculateBehaviorWeight = (
  behavior: MonsterBehavior,
  context: BehaviorContext,
): number => {
  let baseWeight = behavior.getBaseWeight(context);

  const difficulty = getDifficulty(context.state);
  if (difficulty?.monsterBehavior?.calculateBehaviorWeight) {
    baseWeight = difficulty.monsterBehavior.calculateBehaviorWeight(
      behavior,
      context,
      baseWeight,
    );
  }

  let weight = baseWeight;
  const isAggressive = behavior.tags.includes('aggressive');
  const isDefensive = behavior.tags.includes('defensive');

  // Temperament Multiplier
  const temperament = context.monster.temperament ?? 'bold';
  if (temperament === 'bold') {
    if (isAggressive) weight *= 1.3;
    if (isDefensive) weight *= 0.7;
  } else if (temperament === 'wary') {
    if (isAggressive) weight *= 0.8;
    if (isDefensive) weight *= 1.5;
  }

  // Director Multiplier
  if (context.directorState === 'EASE') {
    if (isAggressive) weight *= 0.7;
    if (isDefensive) weight *= 1.3;
  } else if (context.directorState === 'PUSH') {
    if (isAggressive) weight *= 1.3;
    if (isDefensive) weight *= 0.7;
  }

  // Anti-stall Multiplier
  const passiveStreak = context.monster.passiveStreak ?? 0;
  if (passiveStreak >= 2 && isDefensive) {
    weight = 0;
  }

  return weight;
};

export const evaluateBehaviors = (
  behaviors: MonsterBehavior[],
  context: BehaviorContext,
): EvaluatedBehavior[] =>
  behaviors.map((behavior) => {
    let eligible = true;
    let ineligibleReason: string | undefined = undefined;

    if (context.monster.forgotBowThisTurn && behavior.slots.includes('shoot')) {
      eligible = false;
      ineligibleReason = 'Bow forgotten this turn';
    } else if (!behavior.isEligible(context)) {
      eligible = false;
      ineligibleReason = 'Requirements not met';
    }

    const baseWeight = behavior.getBaseWeight(context);
    const finalWeight = eligible
      ? calculateBehaviorWeight(behavior, context)
      : 0;

    const isDefensiveDisqualified =
      eligible &&
      (context.monster.passiveStreak ?? 0) >= 2 &&
      behavior.tags.includes('defensive');

    return {
      name: behavior.name,
      slots: behavior.slots,
      tags: behavior.tags,
      eligible: eligible && finalWeight > 0,
      baseWeight,
      finalWeight,
      ineligibleReason: !eligible
        ? ineligibleReason
        : isDefensiveDisqualified
        ? 'Anti-stall (passive streak >= 2)'
        : undefined,
    };
  });

export const selectBehavior = (
  behaviors: MonsterBehavior[],
  context: BehaviorContext,
): {
  chosenBehavior: MonsterBehavior;
  evaluatedBehaviors: EvaluatedBehavior[];
} => {
  const evaluated = evaluateBehaviors(behaviors, context);
  const eligibleEvaluated = evaluated.filter(
    (b) => b.eligible && b.finalWeight > 0,
  );

  if (eligibleEvaluated.length === 0) {
    // Fallback behavior
    const fallback: MonsterBehavior = behaviors.find(
      (b) => b.name === 'Advance',
    ) ?? {
      name: 'Advance',
      slots: ['move', 'move'],
      tags: ['aggressive'],
      isEligible: () => true,
      getBaseWeight: () => 1,
    };
    return { chosenBehavior: fallback, evaluatedBehaviors: evaluated };
  }

  const totalWeight = eligibleEvaluated.reduce(
    (sum, b) => sum + b.finalWeight,
    0,
  );
  let roll = nextRandom() * totalWeight;

  for (const item of eligibleEvaluated) {
    roll -= item.finalWeight;
    if (roll <= 0) {
      const chosen = behaviors.find((b) => b.name === item.name)!;
      return { chosenBehavior: chosen, evaluatedBehaviors: evaluated };
    }
  }

  const chosen = behaviors.find((b) => b.name === eligibleEvaluated[0].name)!;
  return { chosenBehavior: chosen, evaluatedBehaviors: evaluated };
};
