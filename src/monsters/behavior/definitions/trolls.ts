import type { MonsterBehavior } from '../types';
import { findChargePath } from '../tactics';

export const TROLL_BEHAVIORS: MonsterBehavior[] = [
  {
    name: 'Brawl',
    slots: ['melee', 'melee'],
    tags: ['aggressive'],
    isEligible: (ctx) => ctx.neighbouringHeroes.length > 0,
    getBaseWeight: () => 10,
  },
  {
    name: 'Charge',
    slots: ['move', 'melee'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length === 0 && findChargePath(ctx) !== null,
    getBaseWeight: (ctx) => {
      const charge = findChargePath(ctx);
      if (charge) {
        const healthModifier = ctx.state.gameMaster?.modifiers.health ?? 0;
        const maxHealth = charge.hero.maxHealth + healthModifier;
        if (charge.hero.health <= maxHealth / 2) {
          return 11;
        }
      }
      return 8;
    },
  },
  {
    name: 'Advance',
    slots: ['move', 'move'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length === 0 && findChargePath(ctx) === null,
    getBaseWeight: () => 6,
  },
];
