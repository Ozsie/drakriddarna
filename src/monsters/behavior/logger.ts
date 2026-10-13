/* eslint-disable no-console */
import type { BehaviorDecision } from './types';
import type { Hero, Monster } from '../../types';
import type { ScoredHero } from './scoring';

export interface TargetSelectionLog {
  monster: Monster;
  candidates: ScoredHero[];
  selectedHero?: Hero;
  actionType?: 'melee' | 'ranged' | 'pathfinding' | string;
}

export const logMonsterTargetSelection = (
  logData: TargetSelectionLog,
): void => {
  if (!logData.candidates || logData.candidates.length === 0) return;

  const targetType = logData.actionType
    ? `${logData.actionType.charAt(0).toUpperCase() + logData.actionType.slice(1)} Target`
    : 'Target Selection';

  const groupLabel = `[AI Target] ${logData.monster.name} (${targetType})`;

  if (typeof console.groupCollapsed === 'function') {
    console.groupCollapsed(groupLabel);
  } else {
    console.log(groupLabel);
  }

  if (typeof console.table === 'function') {
    console.table(
      logData.candidates.map((c) => ({
        Hero: c.hero.name,
        Score: c.score.toFixed(2),
        HP: c.hero.health,
        Steps:
          c.stepsNeeded > 0
            ? `-${c.stepsNeeded * 3} (${c.stepsNeeded} steps)`
            : '0',
        'Last Attacker': c.isLastAttacker ? '+3' : '-',
        'Targeted Count':
          c.targetedTimes >= 2
            ? `-4 (${c.targetedTimes}x)`
            : `${c.targetedTimes}x`,
        'Kill Noticed': c.noticedKill ? '+2' : '-',
        Random: `+${c.randomBonus.toFixed(2)}`,
      })),
    );
  } else {
    logData.candidates.forEach((c) => {
      console.log(
        `${c.hero.name}: Score=${c.score.toFixed(2)}, Steps=${
          c.stepsNeeded
        }, LastAttacker=${c.isLastAttacker}, Targeted=${
          c.targetedTimes
        }, KillNoticed=${c.noticedKill}, Random=+${c.randomBonus.toFixed(2)}`,
      );
    });
  }

  const selected = logData.selectedHero ?? logData.candidates[0]?.hero;
  if (selected) {
    const topScore =
      logData.candidates.find((c) => c.hero === selected)?.score ??
      logData.candidates[0]?.score;
    console.log(
      `>> Target Selected: %c${selected.name}%c (Score: ${
        topScore !== undefined ? topScore.toFixed(2) : 'N/A'
      })`,
      'color: #4CAF50; font-weight: bold;',
      '',
    );
  }

  if (typeof console.groupEnd === 'function') {
    console.groupEnd();
  }
};

export const logTargetSelection = logMonsterTargetSelection;

export const logMonsterBehaviorDecision = (
  decision: BehaviorDecision,
): void => {
  const totalWeight = decision.evaluatedBehaviors
    .filter((b) => b.eligible)
    .reduce((sum, b) => sum + b.finalWeight, 0);

  const groupLabel = `[AI] ${decision.monster.name} (${
    decision.temperament
  }, Streak: ${decision.passiveStreak}, Director: ${decision.directorState}${
    decision.forgotBowThisTurn ? ', Bow Forgotten' : ''
  })`;

  if (typeof console.groupCollapsed === 'function') {
    console.groupCollapsed(groupLabel);
  } else {
    console.log(groupLabel);
  }

  if (typeof console.table === 'function') {
    console.table(
      decision.evaluatedBehaviors.map((b) => ({
        Behavior: b.name,
        Eligible: b.eligible ? 'YES' : 'NO',
        'Base W': b.baseWeight.toFixed(2),
        'Final W': b.finalWeight.toFixed(2),
        'Chance %':
          b.eligible && totalWeight > 0
            ? `${((b.finalWeight / totalWeight) * 100).toFixed(1)}%`
            : '0.0%',
        Reason: b.ineligibleReason ?? '',
      })),
    );
  } else {
    decision.evaluatedBehaviors.forEach((b) => {
      const eligible = b.eligible ? 'YES' : 'NO';
      console.log(
        `${b.name}: Eligible=${eligible}, Base=${b.baseWeight.toFixed(
          2,
        )}, Final=${b.finalWeight.toFixed(2)}${
          b.ineligibleReason ? ` (${b.ineligibleReason})` : ''
        }`,
      );
    });
  }

  console.log(
    `>> Selected: %c${
      decision.chosenBehavior.name
    }%c (Slots: [${decision.chosenBehavior.slots.join(', ')}])`,
    'color: #4CAF50; font-weight: bold;',
    '',
  );

  if (typeof console.groupEnd === 'function') {
    console.groupEnd();
  }
};
