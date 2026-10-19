import type { Dungeon, Hero } from '../types';
import { createSeededRng, resetRng, setRng } from '../core';
import { init, next } from '../game';
import { getGameMaster, DEFAULT_GAME_MASTER_ID } from '../gameMasters';
import type { MonsterTurnOptions } from '../monsters/MonsterLogic';
import { liveHeroes, resetLiveHeroes } from '../hero/HeroLogic';
import { playHeroTurn } from './bot';

export const HEADLESS_MONSTER_OPTIONS: MonsterTurnOptions = {
  delayBetweenMonsters: 0,
  delayBetweenActions: 0,
  delayAfterAttack: 0,
  waitForMovement: false,
};

export interface GameSimulationResult {
  runId: number;
  status: 'WON' | 'LOST' | 'TIMEOUT';
  turns: number;
  monstersKilled: number;
  survivingHeroes: number;
  heroCasualties: number;
  remainingHeroHealth: number;
}

export interface GameMasterBenchmarkSummary {
  gameMaster: string;
  difficulty: string;
  totalRuns: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  lossRate: number;
  timeoutRate: number;
  avgTurns: number;
  avgHeroCasualties: number;
  avgMonstersKilled: number;
  avgRemainingHealth: number;
  results: GameSimulationResult[];
}

export type DifficultyBenchmarkSummary = GameMasterBenchmarkSummary;

export interface RunDungeonOptions {
  dungeon?: Dungeon;
  campaignId?: string;
  gameMasterId?: string;
  difficultyId?: string;
  seed?: number;
  maxTurns?: number;
}

/**
 * Runs a single headless game simulation to completion or timeout.
 */
export const runSingleGame = async (
  options: RunDungeonOptions = {},
): Promise<GameSimulationResult> => {
  const {
    campaignId = 'iceDragonTreasure',
    gameMasterId,
    difficultyId,
    dungeon,
    seed,
    maxTurns = 150,
  } = options;

  const gmId = gameMasterId ?? difficultyId ?? DEFAULT_GAME_MASTER_ID;

  if (seed !== undefined) {
    setRng(createSeededRng(seed));
  } else {
    resetRng();
  }

  try {
    const state = init(campaignId, gmId);
    const gameMaster = getGameMaster(gmId);
    state.gameMaster = gameMaster;
    state.difficulty = gameMaster;
    state.gameMasterId = gameMaster.id;

    // Override specific dungeon if requested
    if (dungeon) {
      state.dungeon = structuredClone(dungeon);
      resetLiveHeroes(state);
      state.currentActor = state.heroes[0] as Hero | undefined;
    }

    let turn = 0;
    let status: 'WON' | 'LOST' | 'TIMEOUT' = 'TIMEOUT';
    let totalMonstersKilled = 0;
    const initialDungeonName = state.dungeon.name;

    while (turn < maxTurns) {
      totalMonstersKilled = Math.max(
        totalMonstersKilled,
        state.dungeon.killCount,
      );

      // Check if heroes are all dead
      if (liveHeroes(state).length === 0) {
        status = 'LOST';
        break;
      }

      // Check if initial dungeon is won / beaten or transitioned to next
      if (
        state.dungeon.beaten ||
        state.dungeon.name !== initialDungeonName ||
        state.dungeon.winConditions.every((wc) => wc.fulfilled)
      ) {
        status = 'WON';
        break;
      }

      // Execute hero round
      const initialLiveHeroesCount = liveHeroes(state).length;
      for (let hIdx = 0; hIdx < initialLiveHeroesCount; hIdx++) {
        if (!state.currentActor) break;

        playHeroTurn(state);
        await next(state, HEADLESS_MONSTER_OPTIONS);

        totalMonstersKilled = Math.max(
          totalMonstersKilled,
          state.dungeon.killCount,
        );

        if (
          state.dungeon.beaten ||
          state.dungeon.name !== initialDungeonName ||
          state.dungeon.winConditions.every((wc) => wc.fulfilled)
        ) {
          status = 'WON';
          break;
        }
        if (liveHeroes(state).length === 0) {
          status = 'LOST';
          break;
        }
      }

      turn++;

      if (status !== 'TIMEOUT') break;
    }

    const surviving = liveHeroes(state);
    const survivingCount = surviving.length;
    const casualties = state.heroes.length - survivingCount;
    const totalHp = surviving.reduce(
      (sum, h) => sum + Math.max(0, h.health),
      0,
    );

    return {
      runId: seed ?? 0,
      status,
      turns: turn,
      monstersKilled: totalMonstersKilled,
      survivingHeroes: survivingCount,
      heroCasualties: casualties,
      remainingHeroHealth: totalHp,
    };
  } finally {
    resetRng();
  }
};

/**
 * Runs a full benchmark across multiple runs for a given dungeon and game master.
 */
export const runGameMasterBenchmark = async (options: {
  dungeon?: Dungeon;
  campaignId?: string;
  gameMasterId?: string;
  difficultyId?: string;
  runs: number;
  startSeed?: number;
  maxTurns?: number;
}): Promise<GameMasterBenchmarkSummary> => {
  const {
    gameMasterId,
    difficultyId,
    runs,
    startSeed = 1000,
    dungeon,
    campaignId,
    maxTurns,
  } = options;

  const gmId = gameMasterId ?? difficultyId ?? DEFAULT_GAME_MASTER_ID;
  const gm = getGameMaster(gmId);
  const results: GameSimulationResult[] = [];

  for (let i = 0; i < runs; i++) {
    const seed = startSeed + i;
    const res = await runSingleGame({
      dungeon,
      campaignId,
      gameMasterId: gm.id,
      seed,
      maxTurns,
    });
    results.push({ ...res, runId: i + 1 });
  }

  const wins = results.filter((r) => r.status === 'WON').length;
  const losses = results.filter((r) => r.status === 'LOST').length;
  const timeouts = results.filter((r) => r.status === 'TIMEOUT').length;

  const sumTurns = results.reduce((acc, r) => acc + r.turns, 0);
  const sumCasualties = results.reduce((acc, r) => acc + r.heroCasualties, 0);
  const sumKills = results.reduce((acc, r) => acc + r.monstersKilled, 0);
  const sumHealth = results.reduce((acc, r) => acc + r.remainingHeroHealth, 0);

  return {
    gameMaster: gm.id,
    difficulty: gm.id,
    totalRuns: runs,
    wins,
    losses,
    timeouts,
    winRate: Math.round((wins / runs) * 100),
    lossRate: Math.round((losses / runs) * 100),
    timeoutRate: Math.round((timeouts / runs) * 100),
    avgTurns: +(sumTurns / runs).toFixed(1),
    avgHeroCasualties: +(sumCasualties / runs).toFixed(2),
    avgMonstersKilled: +(sumKills / runs).toFixed(1),
    avgRemainingHealth: +(sumHealth / runs).toFixed(1),
    results,
  };
};

export const runDifficultyBenchmark = runGameMasterBenchmark;

/**
 * Formats benchmark summaries as a readable ASCII report table.
 */
export const formatBenchmarkReport = (
  summaries: GameMasterBenchmarkSummary[],
  title = 'Game Master Benchmark Report',
): string => {
  const lines: string[] = [];
  lines.push(
    '==================================================================================',
  );
  lines.push(`  ${title}`);
  lines.push(
    '==================================================================================',
  );
  lines.push(
    'Game Master    | Runs | Win Rate | Loss Rate | Avg Turns | Avg Casualties | Avg Kills | Avg Rem HP',
  );
  lines.push(
    '---------------+------+----------+-----------+-----------+----------------+-----------+-----------',
  );

  for (const s of summaries) {
    const gm = (s.gameMaster ?? s.difficulty).padEnd(14);
    const runs = String(s.totalRuns).padStart(4);
    const winR = `${s.winRate}%`.padStart(8);
    const lossR = `${s.lossRate}%`.padStart(9);
    const turns = String(s.avgTurns).padStart(9);
    const cas = String(s.avgHeroCasualties).padStart(14);
    const kills = String(s.avgMonstersKilled).padStart(9);
    const hp = String(s.avgRemainingHealth).padStart(10);
    lines.push(
      `${gm} | ${runs} | ${winR} | ${lossR} | ${turns} | ${cas} | ${kills} | ${hp}`,
    );
  }
  lines.push(
    '==================================================================================',
  );
  return lines.join('\n');
};
