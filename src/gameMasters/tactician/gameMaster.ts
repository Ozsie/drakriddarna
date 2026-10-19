import type { GameMaster } from '../../types';
import { weapons } from '../../items/weapons';
import type { DirectorState } from '../../monsters/behavior';

export const tactician: GameMaster = {
  id: 'tactician',
  nameTranslationKey: 'content.gameMaster.tactician.name',
  descriptionTranslationKey: 'content.gameMaster.tactician.description',
  modifiers: {
    attack: 0,
    defense: 0,
    movement: 0,
    search: 0,
    health: 0,
  },
  monsterBehavior: {
    bowForgottenChance: 0.15,
    getDirectorState: ({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    }: {
      hasDeadHero: boolean;
      partyHpPercentage: number;
      aliveMonsterCount: number;
    }): DirectorState => {
      // Tactician standard balanced pacing
      if (hasDeadHero || partyHpPercentage < 0.45) {
        return 'EASE';
      }
      if (partyHpPercentage > 0.8 && aliveMonsterCount <= 1) {
        return 'PUSH';
      }
      return 'NEUTRAL';
    },
  },
  events: {
    minMonsterSpawnDistance: 3,
    earliestMonsterRound: 3,
    skipHungryTrollBelowHalfHealth: true,
  },
  startingEquipment: {
    weapon: weapons[0],
    inventory: [],
  },
};

export default tactician;
