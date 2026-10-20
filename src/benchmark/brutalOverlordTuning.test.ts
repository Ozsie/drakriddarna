import { describe, it, expect, beforeAll } from 'vitest';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import type { GameMaster, GameState, Hero, Monster } from '../types';
import { loadTranslations } from '$lib/translations';
import { runGameMasterBenchmark } from './benchmark';
import { gameMasters } from '../gameMasters';
import { brutalOverlord } from '../gameMasters/brutalOverlord/gameMaster';
import type {
  BehaviorContext,
  DirectorState,
  MonsterBehavior,
} from '../monsters/behavior';

const RUNS = 250;

// Fresh nested objects so no state can be shared with the built-in GM or
// between variants.
const freshBO = (id: string, changes: Partial<GameMaster>): GameMaster => ({
  ...brutalOverlord,
  id,
  modifiers: { ...brutalOverlord.modifiers },
  events: { ...brutalOverlord.events },
  startingEquipment: { ...brutalOverlord.startingEquipment },
  monsterBehavior: {
    bowForgottenChance: brutalOverlord?.monsterBehavior?.bowForgottenChance,
    getDirectorState: brutalOverlord?.monsterBehavior?.getDirectorState,
    calculateBehaviorWeight:
      brutalOverlord?.monsterBehavior?.calculateBehaviorWeight,
  },
  ...changes,
});

const pushAtHalfDirector = ({
  hasDeadHero,
  partyHpPercentage,
  aliveMonsterCount,
}: {
  hasDeadHero: boolean;
  partyHpPercentage: number;
  aliveMonsterCount: number;
}): DirectorState => {
  if (hasDeadHero && partyHpPercentage < 0.25) return 'EASE';
  if (partyHpPercentage > 0.5 || aliveMonsterCount <= 3) return 'PUSH';
  return 'NEUTRAL';
};

const weight125 = (
  behavior: MonsterBehavior,
  _context: BehaviorContext,
  baseWeight: number,
): number =>
  behavior.tags.includes('aggressive') ? baseWeight * 1.25 : baseWeight;

const damageAboveThreshold =
  (threshold: number) =>
  (
    damage: number,
    _attacker: Monster,
    _defender: Hero,
    state: GameState,
  ): number => {
    const live = (state?.heroes ?? []).filter((h) => h.health > 0);
    const hp = live.reduce((sum, h) => sum + h.health, 0);
    const max = live.reduce((sum, h) => sum + h.maxHealth, 0);
    return max > 0 && hp / max > threshold ? damage + 1 : damage;
  };

const variants: [string, GameMaster][] = [
  ['baseline', freshBO('boBaseline', {})],
  [
    'searchMinus1',
    freshBO('boSearchMinus1', {
      modifiers: { ...brutalOverlord.modifiers, search: -1 },
    }),
  ],
  [
    'pushAtHalf',
    freshBO('boPushAtHalf', {
      monsterBehavior: {
        ...brutalOverlord.monsterBehavior,
        getDirectorState: pushAtHalfDirector,
      },
    }),
  ],
  [
    'weight125',
    freshBO('boWeight125', {
      monsterBehavior: {
        ...brutalOverlord.monsterBehavior,
        calculateBehaviorWeight: weight125,
      },
    }),
  ],
  [
    'spawnDistance1',
    freshBO('boSpawnDistance1', {
      events: { ...brutalOverlord.events, minMonsterSpawnDistance: 1 },
    }),
  ],
  [
    'damageAboveHalf',
    freshBO('boDamageAboveHalf', {
      modifyMonsterDamageDealt: damageAboveThreshold(0.5),
    }),
  ],
  [
    'healthMinus1',
    freshBO('boHealthMinus1', {
      modifiers: { ...brutalOverlord.modifiers, health: -1 },
    }),
  ],
  [
    'damageAbove80',
    freshBO('boDamageAbove80', {
      modifyMonsterDamageDealt: damageAboveThreshold(0.8),
    }),
  ],
  [
    'movementMinus1',
    freshBO('boMovementMinus1', {
      modifiers: { ...brutalOverlord.modifiers, movement: -1 },
    }),
  ],
  [
    'healthMinus1MovementMinus1',
    freshBO('boHealthMinus1MovementMinus1', {
      modifiers: { ...brutalOverlord.modifiers, health: -1, movement: -1 },
    }),
  ],
];

describe('brutalOverlord difficulty candidates (250 runs)', () => {
  beforeAll(async () => {
    for (const [, gm] of variants) {
      gameMasters[gm.id] = gm;
    }
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  for (const [label, gm] of variants) {
    it(`variant: ${label}`, async () => {
      for (const dungeon of [e1m0, e1m1]) {
        const summary = await runGameMasterBenchmark({
          dungeon,
          gameMasterId: gm.id,
          runs: RUNS,
          startSeed: 1000,
          maxTurns: 100,
        });
        // eslint-disable-next-line no-console
        console.log(
          `[${label}] ${
            dungeon.name === 'campaign.iceDragon.e1m0.name' ? 'e1m0' : 'e1m1'
          } ` +
            `win=${summary.winRate}% loss=${summary.lossRate}% timeout=${summary.timeouts}% ` +
            `avgTurns=${summary.avgTurns} avgCasualties=${summary.avgHeroCasualties}`,
        );
        expect(summary.totalRuns).toBe(RUNS);
      }
    });
  }
});
