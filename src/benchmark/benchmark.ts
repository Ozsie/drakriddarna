import type { Dungeon, Hero } from '../types';
import { createSeededRng, resetRng, setRng } from '../core';
import { init, next } from '../game';
import { getGameMaster, DEFAULT_GAME_MASTER_ID } from '../gameMasters';
import type { MonsterTurnOptions } from '../monsters/MonsterLogic';
import { liveHeroes, resetLiveHeroes, levelUp } from '../hero/HeroLogic';
import { getCampaign } from '../campaigns';
import { getEventsForDungeon } from '../events/EventsLogic';
import { playHeroTurn } from './bot';

export const HEADLESS_MONSTER_OPTIONS: MonsterTurnOptions = {
  delayBetweenMonsters: 0,
  delayBetweenActions: 0,
  delayAfterAttack: 0,
  waitForMovement: false,
};

export interface MonsterSpawnRecord {
  round: number;
  monster: string;
}

export interface GameSimulationResult {
  runId: number;
  status: 'WON' | 'LOST' | 'TIMEOUT';
  turns: number;
  monstersKilled: number;
  survivingHeroes: number;
  heroCasualties: number;
  remainingHeroHealth: number;
  lowestPartyHp: number;
  nearDeathCount: number;
  wastedSearches: number;
  spawns: MonsterSpawnRecord[];
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
  stdDevHeroCasualties: number;
  avgMonstersKilled: number;
  avgRemainingHealth: number;
  avgWinRemainingHealth: number;
  lowestPartyHp: number;
  totalNearDeathCount: number;
  avgNearDeathCount: number;
  totalWastedSearches: number;
  avgWastedSearches: number;
  totalSpawns: number;
  spawns: MonsterSpawnRecord[];
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
  levelUpHeroes?: boolean;
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
    levelUpHeroes = false,
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

      // Rebuild the event deck for the overridden dungeon, matching what
      // init() does for the first dungeon and what BetweenDungeonsLogic does
      // on dungeon transitions — otherwise benchmarks run with the event
      // pool of the campaign's first dungeon.
      const campaign = getCampaign(campaignId);
      let dungeonEvents = getEventsForDungeon(
        state.dungeon,
        campaign?.eventDeck ?? [],
      );
      if (gameMaster?.events?.modifyEventDeck) {
        dungeonEvents = gameMaster.events.modifyEventDeck(dungeonEvents, state);
      }
      state.eventDeck = dungeonEvents;
    }

    // Model campaign progression: level the party up as if it had already
    // cleared earlier campaign dungeons before the benchmarked one.
    if (levelUpHeroes) {
      state.heroes.forEach((hero) => {
        (hero as Hero).experience += 5;
      });
      levelUp(state);
      resetLiveHeroes(state);
      state.currentActor = state.heroes[0] as Hero | undefined;
    }

    let turn = 0;
    let status: 'WON' | 'LOST' | 'TIMEOUT' = 'TIMEOUT';
    let totalMonstersKilled = 0;
    const initialDungeonName = state.dungeon.name;

    const getPartyHealth = () =>
      state.heroes.reduce((sum, h) => sum + Math.max(0, h.health), 0);

    let lowestPartyHp = getPartyHealth();
    let nearDeathCount = 0;
    const prevHeroNearDeath = new Map<string, boolean>();
    for (const h of state.heroes) {
      const isNear = h.health > 0 && h.health < 3;
      prevHeroNearDeath.set(h.id!, isNear);
      if (isNear) nearDeathCount++;
    }

    const spawns: MonsterSpawnRecord[] = [];
    const knownMonsters = new Set(state.dungeon.layout.monsters);

    const checkHeroHealthAndSpawns = (roundNumber: number) => {
      const currentPartyHp = getPartyHealth();
      if (currentPartyHp < lowestPartyHp) {
        lowestPartyHp = currentPartyHp;
      }

      for (const h of state.heroes) {
        const wasNear = prevHeroNearDeath.get(h.id!) ?? false;
        const isNear = h.health > 0 && h.health < 3;
        if (isNear && !wasNear) {
          nearDeathCount++;
        }
        prevHeroNearDeath.set(h.id!, isNear);
      }

      for (const m of state.dungeon.layout.monsters) {
        if (!knownMonsters.has(m)) {
          knownMonsters.add(m);
          spawns.push({
            round: roundNumber,
            monster: m.name ?? m.type,
          });
        }
      }
    };

    while (turn < maxTurns) {
      checkHeroHealthAndSpawns(turn + 1);

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
        checkHeroHealthAndSpawns(turn + 1);

        await next(state, HEADLESS_MONSTER_OPTIONS);
        checkHeroHealthAndSpawns(turn + 1);

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

    checkHeroHealthAndSpawns(turn);

    const surviving = liveHeroes(state);
    const survivingCount = surviving.length;
    const casualties = state.heroes.length - survivingCount;
    const totalHp = surviving.reduce(
      (sum, h) => sum + Math.max(0, h.health),
      0,
    );
    const wastedSearches = state.actionLog.filter(
      (log) => log.key === 'logs.heroAction.searchFoundNothing',
    ).length;

    return {
      runId: seed ?? 0,
      status,
      turns: turn,
      monstersKilled: totalMonstersKilled,
      survivingHeroes: survivingCount,
      heroCasualties: casualties,
      remainingHeroHealth: totalHp,
      lowestPartyHp,
      nearDeathCount,
      wastedSearches,
      spawns,
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
  levelUpHeroes?: boolean;
}): Promise<GameMasterBenchmarkSummary> => {
  const {
    gameMasterId,
    difficultyId,
    runs,
    startSeed = 1000,
    dungeon,
    campaignId,
    maxTurns,
    levelUpHeroes,
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
      levelUpHeroes,
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

  const avgCasualties = +(sumCasualties / runs).toFixed(2);
  const varianceCasualties =
    results.reduce(
      (acc, r) => acc + Math.pow(r.heroCasualties - avgCasualties, 2),
      0,
    ) / runs;
  const stdDevHeroCasualties = +Math.sqrt(varianceCasualties).toFixed(2);

  const winResults = results.filter((r) => r.status === 'WON');
  const sumWinHealth = winResults.reduce(
    (acc, r) => acc + r.remainingHeroHealth,
    0,
  );
  const avgWinRemainingHealth =
    winResults.length > 0 ? +(sumWinHealth / winResults.length).toFixed(1) : 0;

  const lowestPartyHp = Math.min(...results.map((r) => r.lowestPartyHp));

  const totalNearDeathCount = results.reduce(
    (acc, r) => acc + r.nearDeathCount,
    0,
  );
  const avgNearDeathCount = +(totalNearDeathCount / runs).toFixed(1);

  const totalWastedSearches = results.reduce(
    (acc, r) => acc + r.wastedSearches,
    0,
  );
  const avgWastedSearches = +(totalWastedSearches / runs).toFixed(1);

  const allSpawns = results.flatMap((r) => r.spawns);
  const totalSpawns = allSpawns.length;

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
    avgHeroCasualties: avgCasualties,
    stdDevHeroCasualties,
    avgMonstersKilled: +(sumKills / runs).toFixed(1),
    avgRemainingHealth: +(sumHealth / runs).toFixed(1),
    avgWinRemainingHealth,
    lowestPartyHp,
    totalNearDeathCount,
    avgNearDeathCount,
    totalWastedSearches,
    avgWastedSearches,
    totalSpawns,
    spawns: allSpawns,
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
    '======================================================================================================================================================',
  );
  lines.push(`  ${title}`);
  lines.push(
    '======================================================================================================================================================',
  );
  lines.push(
    'Bot Playstyle: Aggressive (heals at HP <= 3, attacks enemies in range, searches adjacent secrets/doors, prioritizes combat > doors > secrets > exploration)',
  );
  lines.push(
    '------------------------------------------------------------------------------------------------------------------------------------------------------',
  );
  lines.push(
    'Game Master    | Runs | Win Rate | Loss Rate | Avg Turns | Avg Casualties (±SD) | Avg Kills | Avg Rem HP | Win Rem HP | Min Party HP | Near Death | Wasted Search | Spawns',
  );
  lines.push(
    '---------------+------+----------+-----------+-----------+----------------------+-----------+------------+------------+--------------+------------+---------------+-------',
  );

  for (const s of summaries) {
    const gm = (s.gameMaster ?? s.difficulty).padEnd(14);
    const runs = String(s.totalRuns).padStart(4);
    const winR = `${s.winRate}%`.padStart(8);
    const lossR = `${s.lossRate}%`.padStart(9);
    const turns = String(s.avgTurns).padStart(9);
    const cas = `${s.avgHeroCasualties} (±${s.stdDevHeroCasualties})`.padStart(
      20,
    );
    const kills = String(s.avgMonstersKilled).padStart(9);
    const remHp = String(s.avgRemainingHealth).padStart(10);
    const winHp = String(s.avgWinRemainingHealth).padStart(10);
    const minHp = String(s.lowestPartyHp).padStart(12);
    const nearDeath = String(s.avgNearDeathCount).padStart(10);
    const wasted = String(s.avgWastedSearches).padStart(13);
    const spawns = String(s.totalSpawns).padStart(6);

    lines.push(
      `${gm} | ${runs} | ${winR} | ${lossR} | ${turns} | ${cas} | ${kills} | ${remHp} | ${winHp} | ${minHp} | ${nearDeath} | ${wasted} | ${spawns}`,
    );
  }

  lines.push(
    '------------------------------------------------------------------------------------------------------------------------------------------------------',
  );
  lines.push('Spawns by Game Master (Round & Monster):');
  for (const s of summaries) {
    const gm = (s.gameMaster ?? s.difficulty).padEnd(14);
    if (!s.spawns || s.spawns.length === 0) {
      lines.push(`  ${gm}: None`);
    } else {
      const spawnMap = new Map<number, Map<string, number>>();
      for (const sp of s.spawns) {
        if (!spawnMap.has(sp.round)) {
          spawnMap.set(sp.round, new Map());
        }
        const roundMap = spawnMap.get(sp.round)!;
        roundMap.set(sp.monster, (roundMap.get(sp.monster) ?? 0) + 1);
      }

      const sortedRounds = Array.from(spawnMap.keys()).sort((a, b) => a - b);
      const spawnParts: string[] = [];
      for (const round of sortedRounds) {
        const roundMap = spawnMap.get(round)!;
        for (const [monster, count] of roundMap.entries()) {
          spawnParts.push(
            count > 1
              ? `Round ${round}: ${monster} (x${count})`
              : `Round ${round}: ${monster}`,
          );
        }
      }
      lines.push(`  ${gm}: ${spawnParts.join(', ')}`);
    }
  }

  lines.push(
    '======================================================================================================================================================',
  );
  return lines.join('\n');
};
