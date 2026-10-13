import { MonsterType } from '../../../types';
import { isDarkLord } from '../../MonsterRegistry';
import type { MonsterBehavior } from '../types';
import { ORC_BEHAVIORS } from './orcs';
import { TROLL_BEHAVIORS } from './trolls';
import { DARK_LORD_BEHAVIORS } from './darkLords';

export * from './orcs';
export * from './trolls';
export * from './darkLords';

export const DEFAULT_FALLBACK_BEHAVIORS: MonsterBehavior[] = [
  {
    name: 'Brawl',
    slots: ['melee', 'melee'],
    tags: ['aggressive'],
    isEligible: (ctx) => ctx.neighbouringHeroes.length > 0,
    getBaseWeight: () => 10,
  },
  {
    name: 'Volley',
    slots: ['shoot', 'shoot'],
    tags: ['aggressive', 'ranged'],
    isEligible: (ctx) =>
      !ctx.monster.forgotBowThisTurn &&
      Boolean(ctx.monster.rangedWeapon) &&
      ctx.visibleHeroes.length > 0,
    getBaseWeight: () => 8,
  },
  {
    name: 'Advance',
    slots: ['move', 'move'],
    tags: ['aggressive'],
    isEligible: () => true,
    getBaseWeight: () => 5,
  },
];

export const getBehaviorsForMonsterType = (
  monsterType: string,
): MonsterBehavior[] => {
  if (monsterType === MonsterType.ORC || monsterType === MonsterType.ORCH) {
    return ORC_BEHAVIORS;
  }
  if (monsterType === MonsterType.TROLL) {
    return TROLL_BEHAVIORS;
  }
  if (isDarkLord(monsterType)) {
    return DARK_LORD_BEHAVIORS;
  }
  return DEFAULT_FALLBACK_BEHAVIORS;
};
