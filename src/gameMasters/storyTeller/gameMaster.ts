import type { GameMaster } from '../../types';
import { shields } from '../../items/shields';
import { weapons } from '../../items/weapons';
import type { DirectorState } from '../../monsters/behavior';

export const storyTeller: GameMaster = {
  id: 'storyTeller',
  nameTranslationKey: 'content.gameMaster.storyTeller.name',
  descriptionTranslationKey: 'content.gameMaster.storyTeller.description',
  modifiers: {
    attack: 0,
    defense: 0,
    movement: 0,
    search: 2,
    health: 1,
  },
  monsterBehavior: {
    bowForgottenChance: 0.2,
    getDirectorState: ({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    }: {
      hasDeadHero: boolean;
      partyHpPercentage: number;
      aliveMonsterCount: number;
    }): DirectorState => {
      // Storyteller eases off very generously when heroes are hurt or down
      if (hasDeadHero || partyHpPercentage < 0.45) {
        return 'EASE';
      }
      if (partyHpPercentage > 0.85 && aliveMonsterCount <= 1) {
        return 'PUSH';
      }
      return 'NEUTRAL';
    },
  },
  events: {
    minMonsterSpawnDistance: 3,
    earliestMonsterRound: 4,
    skipHungryTrollBelowHalfHealth: true,
  },
  startingEquipment: {
    shield: shields[1],
    weapon: weapons[0],
    inventory: [],
  },
};

export default storyTeller;
