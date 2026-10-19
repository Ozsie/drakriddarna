import type { GameMaster } from '../../types';
import { weapons } from '../../items/weapons';
import type {
  BehaviorContext,
  DirectorState,
  MonsterBehavior,
} from '../../monsters/behavior';

export const brutalOverlord: GameMaster = {
  id: 'brutalOverlord',
  nameTranslationKey: 'content.gameMaster.brutalOverlord.name',
  descriptionTranslationKey: 'content.gameMaster.brutalOverlord.description',
  modifiers: {
    attack: 0,
    defense: 0,
    movement: 0,
    search: 0,
    health: 0,
  },
  monsterBehavior: {
    bowForgottenChance: 0,
    getDirectorState: ({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    }: {
      hasDeadHero: boolean;
      partyHpPercentage: number;
      aliveMonsterCount: number;
    }): DirectorState => {
      // Brutal Overlord is relentless and rarely eases off
      if (hasDeadHero && partyHpPercentage < 0.25) {
        return 'EASE';
      }
      if (partyHpPercentage > 0.65 || aliveMonsterCount <= 2) {
        return 'PUSH';
      }
      return 'NEUTRAL';
    },
    calculateBehaviorWeight: (
      behavior: MonsterBehavior,
      _context: BehaviorContext,
      baseWeight: number,
    ): number => {
      // Brutal Overlord gives an extra weight bonus to aggressive behaviors
      if (behavior.tags.includes('aggressive')) {
        return baseWeight * 1.1;
      }
      return baseWeight;
    },
  },
  events: {
    minMonsterSpawnDistance: 2,
    earliestMonsterRound: 2,
    skipHungryTrollBelowHalfHealth: false,
  },
  startingEquipment: {
    weapon: weapons[0],
    inventory: [],
  },
};

export default brutalOverlord;
