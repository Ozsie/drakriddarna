import type { MonsterBehavior } from '../types';
import { countHeroesInSpray, findSprayAlignPosition } from '../tactics';

export const DARK_LORD_BEHAVIORS: MonsterBehavior[] = [
  {
    name: 'Spray',
    slots: ['fire_spray', 'move_or_melee'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      countHeroesInSpray(ctx.state, ctx.monster, ctx.monster.position) >= 1,
    getBaseWeight: (ctx) => {
      const count = countHeroesInSpray(
        ctx.state,
        ctx.monster,
        ctx.monster.position,
      );
      return 8 + Math.max(0, count - 1) * 2;
    },
  },
  {
    name: 'Line up',
    slots: ['move', 'fire_spray'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      findSprayAlignPosition(ctx.state, ctx.monster, ctx.passableGrid, 3) !==
      null,
    getBaseWeight: () => 6,
  },
  {
    name: 'Brawl',
    slots: ['melee', 'melee'],
    tags: ['aggressive'],
    isEligible: (ctx) => ctx.neighbouringHeroes.length > 0,
    getBaseWeight: () => 5,
  },
];
