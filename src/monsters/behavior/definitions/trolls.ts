import type { MonsterBehavior } from '../types';
import { findChargePath, isInOneWideCorridorOrDoorway } from '../tactics';

export const TROLL_BEHAVIORS: MonsterBehavior[] = [
  {
    name: 'Block the corridor',
    slots: ['hold', 'melee'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length > 0 &&
      isInOneWideCorridorOrDoorway(ctx.state, ctx.monster.position),
    getBaseWeight: () => 14,
  },
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
      if (charge && charge.hero.health <= charge.hero.maxHealth / 2) {
        return 11;
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
