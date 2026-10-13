/* eslint-disable no-console */
import type { BehaviorDecision } from './types';

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
