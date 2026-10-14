import type { MonsterBehavior } from '../types';
import { liveHeroes } from '../../../hero/HeroLogic';
import {
  findChargePath,
  findCoverPositions,
  findKitePosition,
  findRepositionRangedPosition,
  isHeroesApproachingChokepoint,
} from '../tactics';
import { findBestPathToHeroes } from '../../pathfinding';

export const ORC_BEHAVIORS: MonsterBehavior[] = [
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
    name: 'Volley and advance',
    slots: ['shoot', 'move'],
    tags: ['aggressive', 'ranged'],
    isEligible: (ctx) =>
      !ctx.monster.forgotBowThisTurn &&
      Boolean(ctx.monster.rangedWeapon) &&
      ctx.visibleHeroes.length > 0 &&
      ctx.neighbouringHeroes.length === 0,
    getBaseWeight: (ctx) => (ctx.monster.temperament === 'bold' ? 6 : 4),
  },
  {
    name: 'Reposition and shoot',
    slots: ['move', 'shoot'],
    tags: ['aggressive', 'ranged'],
    isEligible: (ctx) =>
      !ctx.monster.forgotBowThisTurn &&
      Boolean(ctx.monster.rangedWeapon) &&
      findRepositionRangedPosition(
        ctx.state,
        ctx.monster,
        ctx.passableGrid,
        3,
      ) !== null,
    getBaseWeight: (ctx) => (ctx.monster.temperament === 'bold' ? 6 : 4),
  },
  {
    name: 'Advance',
    slots: ['move', 'move'],
    tags: ['aggressive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length === 0 &&
      findChargePath(ctx) === null &&
      (ctx.visibleHeroes.length > 0 ||
        findBestPathToHeroes(ctx.state, ctx.monster, ctx.passableGrid) !==
          null),
    getBaseWeight: () => 5,
  },
  {
    name: 'Fall back to cover',
    slots: ['move_to_cover', 'hold'],
    tags: ['defensive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length === 0 &&
      findChargePath(ctx) === null &&
      findCoverPositions(ctx.state, ctx.monster, ctx.passableGrid, 3).length >
        0,
    getBaseWeight: () => 4,
  },
  {
    name: 'Ambush',
    slots: ['hold', 'hold'],
    tags: ['defensive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length === 0 &&
      findChargePath(ctx) === null &&
      isHeroesApproachingChokepoint(ctx.state, ctx.monster),
    getBaseWeight: () => 3,
  },
  {
    name: 'Peek shot',
    slots: ['shoot', 'move_to_cover'],
    tags: ['defensive', 'ranged'],
    isEligible: (ctx) =>
      !ctx.monster.forgotBowThisTurn &&
      Boolean(ctx.monster.rangedWeapon) &&
      ctx.visibleHeroes.length > 0 &&
      ctx.neighbouringHeroes.length === 0 &&
      findChargePath(ctx) === null &&
      findCoverPositions(ctx.state, ctx.monster, ctx.passableGrid, 3).length >
        0,
    getBaseWeight: () => 2,
  },
  {
    name: 'Kite',
    slots: ['move_away', 'shoot'],
    tags: ['defensive', 'ranged'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length > 0 &&
      !ctx.monster.forgotBowThisTurn &&
      Boolean(ctx.monster.rangedWeapon) &&
      findKitePosition(ctx.state, ctx.monster, ctx.passableGrid, 3) !== null,
    getBaseWeight: () => 1.5,
  },
  {
    name: 'Hit and run',
    slots: ['melee', 'move_to_cover'],
    tags: ['defensive'],
    isEligible: (ctx) =>
      ctx.neighbouringHeroes.length > 0 &&
      findCoverPositions(ctx.state, ctx.monster, ctx.passableGrid, 3).length >
        0,
    getBaseWeight: () => 1,
  },
  {
    name: 'Retreat',
    slots: ['move_away', 'move_away'],
    tags: ['defensive'],
    isEligible: (ctx) =>
      ctx.monster.health <= 1 &&
      liveHeroes(ctx.state).length > ctx.aliveMonsterCount,
    getBaseWeight: () => 1,
  },
];
