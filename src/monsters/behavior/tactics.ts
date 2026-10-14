import type { GameState, Hero, Monster, Position } from '../../types';
import type { BehaviorContext } from './types';
import { COLLAPSED, findCell, getDist, hasLineOfSight, isNeighbouring, isWalkable, WALL, } from '../../core';
import { liveHeroes } from '../../hero/HeroLogic';
import { distanceInGrid } from '../../hero/ClickInputLogic';
import { createPassableGrid, findBestPathToHeroes, type PassableGrid, } from '../pathfinding';
import { hasMonsterAbility } from '../MonsterRegistry';

export interface ReachableTile {
  position: Position;
  distance: number;
  path: Position[];
}

const DIRECTIONS: Position[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

export const getReachablePositions = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile[] => {
  const grid = passableGrid ?? createPassableGrid(state);
  const occupied = new Set<string>();

  state.dungeon.layout.monsters.forEach((m) => {
    if (m !== monster && m.health > 0) {
      occupied.add(`${m.position.x},${m.position.y}`);
    }
  });

  liveHeroes(state).forEach((h) => {
    occupied.add(`${h.position.x},${h.position.y}`);
  });

  const queue: Array<{ pos: Position; dist: number; path: Position[] }> = [
    { pos: monster.position, dist: 0, path: [] },
  ];
  const visited = new Map<string, number>();
  visited.set(`${monster.position.x},${monster.position.y}`, 0);

  const results: ReachableTile[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.dist > 0) {
      results.push({
        position: current.pos,
        distance: current.dist,
        path: current.path,
      });
    }

    if (current.dist >= maxSteps) continue;

    for (const dir of DIRECTIONS) {
      const nx = current.pos.x + dir.x;
      const ny = current.pos.y + dir.y;
      const key = `${nx},${ny}`;

      if (!grid.isPassableStep(current.pos.x, current.pos.y, nx, ny)) {
        continue;
      }

      if (occupied.has(key)) {
        continue;
      }

      const nextDist = current.dist + 1;
      if (!visited.has(key) || nextDist < visited.get(key)!) {
        visited.set(key, nextDist);
        const nextPath = [...current.path, { x: nx, y: ny }];
        queue.push({
          pos: { x: nx, y: ny },
          dist: nextDist,
          path: nextPath,
        });
      }
    }
  }

  return results;
};

export function findChargePath(
  context: BehaviorContext,
  maxSteps?: number,
): { hero: Hero; path: Position[] } | null;
export function findChargePath(
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps?: number,
): { hero: Hero; path: Position[] } | null;
export function findChargePath(
  stateOrContext: GameState | BehaviorContext,
  monsterOrMaxSteps?: Monster | number,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): { hero: Hero; path: Position[] } | null {
  if ('monster' in stateOrContext && 'passableGrid' in stateOrContext) {
    const ctx = stateOrContext;
    const steps =
      typeof monsterOrMaxSteps === 'number' ? monsterOrMaxSteps : maxSteps;
    if (ctx.chargePath !== undefined) {
      return ctx.chargePath;
    }
    const grid = ctx.passableGrid;
    const best = findBestPathToHeroes(ctx.state, ctx.monster, grid);
    if (!best) {
      ctx.chargePath = null;
      return null;
    }
    if (best.path.length >= 1 && best.path.length <= steps) {
      ctx.chargePath = best;
      return best;
    }
    ctx.chargePath = null;
    return null;
  }

  const state = stateOrContext;
  const monster = monsterOrMaxSteps as Monster;
  const grid = passableGrid ?? createPassableGrid(state);
  const best = findBestPathToHeroes(state, monster, grid);
  if (!best) return null;
  if (best.path.length >= 1 && best.path.length <= maxSteps) {
    return best;
  }
  return null;
}

export const findCoverPositions = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile[] => {
  const reachable = getReachablePositions(
    state,
    monster,
    passableGrid,
    maxSteps,
  );
  const heroes = liveHeroes(state).filter((h) => !h.ignoredByMonsters);
  if (heroes.length === 0) return [];

  const monsterRoom = findCell(
    state.dungeon.layout.grid,
    monster.position.x,
    monster.position.y,
  );

  return reachable.filter((tile) => {
    const tileRoom = findCell(
      state.dungeon.layout.grid,
      tile.position.x,
      tile.position.y,
    );
    // Prefer staying in same room or corridor
    const sameRoomOrCorridor =
      monsterRoom === '' || tileRoom === '' || monsterRoom === tileRoom;
    if (!sameRoomOrCorridor) return false;

    // Must break LoS to all active heroes
    const hasAnyLos = heroes.some((hero) =>
      hasLineOfSight(tile.position, hero.position, 48, state, false),
    );
    return !hasAnyLos;
  });
};

export const findOverwatchPositions = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile[] => {
  const cover = findCoverPositions(state, monster, passableGrid, maxSteps);
  if (cover.length > 0) return cover;

  // Fallback: reachable positions in same room/corridor that maximize distance from nearest hero
  const reachable = getReachablePositions(
    state,
    monster,
    passableGrid,
    maxSteps,
  );
  const heroes = liveHeroes(state);
  if (heroes.length === 0) return reachable;

  return reachable.sort((a, b) => {
    const minHeroDistA = Math.min(
      ...heroes.map((h) => getDist(a.position, h.position)),
    );
    const minHeroDistB = Math.min(
      ...heroes.map((h) => getDist(b.position, h.position)),
    );
    return minHeroDistB - minHeroDistA;
  });
};

export const findRepositionRangedPosition = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile | null => {
  const reachable = getReachablePositions(
    state,
    monster,
    passableGrid,
    maxSteps,
  );
  const heroes = liveHeroes(state).filter((h) => !h.ignoredByMonsters);
  if (heroes.length === 0) return null;

  const valid = reachable.filter((tile) => {
    // Must NOT be adjacent to any live hero
    const isAdjacentToHero = heroes.some((h) =>
      isNeighbouring(tile.position, h.position.x, h.position.y),
    );
    if (isAdjacentToHero) return false;

    // Must have LoS to at least one hero
    return heroes.some((h) =>
      hasLineOfSight(tile.position, h.position, 48, state, false),
    );
  });

  if (valid.length === 0) return null;

  // Prefer positions that give good distance to heroes
  valid.sort((a, b) => {
    const minHeroDistA = Math.min(
      ...heroes.map((h) => getDist(a.position, h.position)),
    );
    const minHeroDistB = Math.min(
      ...heroes.map((h) => getDist(b.position, h.position)),
    );
    return minHeroDistB - minHeroDistA;
  });

  return valid[0];
};

export const findKitePosition = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile | null =>
  findRepositionRangedPosition(state, monster, passableGrid, maxSteps);

export const findRetreatPosition = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile | null => {
  const reachable = getReachablePositions(
    state,
    monster,
    passableGrid,
    maxSteps,
  );
  const heroes = liveHeroes(state);
  if (heroes.length === 0) return reachable[0] ?? null;

  if (reachable.length === 0) return null;

  // Sort by furthest from closest hero
  reachable.sort((a, b) => {
    const minHeroDistA = Math.min(
      ...heroes.map((h) => getDist(a.position, h.position)),
    );
    const minHeroDistB = Math.min(
      ...heroes.map((h) => getDist(b.position, h.position)),
    );
    return minHeroDistB - minHeroDistA;
  });

  return reachable[0];
};

export const isInOneWideCorridorOrDoorway = (
  state: GameState,
  position: Position,
): boolean => {
  const layout = state.dungeon.layout;

  // Doorway check
  const isDoorway = layout.doors?.some(
    (d) => d.x === position.x && d.y === position.y,
  );
  if (isDoorway) return true;

  // Orthogonal walkable neighbors
  const orthogonalDirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  let walkableCount = 0;
  for (const dir of orthogonalDirs) {
    const nx = position.x + dir.x;
    const ny = position.y + dir.y;
    const cell = findCell(layout.grid, nx, ny);
    if (cell !== WALL && cell !== COLLAPSED && isWalkable(layout, nx, ny)) {
      walkableCount++;
    }
  }

  return walkableCount <= 2;
};

export const isHeroesApproachingChokepoint = (
  state: GameState,
  monster: Monster,
): boolean => {
  const heroes = liveHeroes(state).filter((h) => !h.ignoredByMonsters);
  if (heroes.length === 0) return false;

  // Monster covers a chokepoint or doorway
  const monsterRoom = findCell(
    state.dungeon.layout.grid,
    monster.position.x,
    monster.position.y,
  );

  return heroes.some((hero) => {
    const heroRoom = findCell(
      state.dungeon.layout.grid,
      hero.position.x,
      hero.position.y,
    );
    // Heroes are in corridor (empty string or corridor) approaching monster room
    const dist = getDist(monster.position, hero.position);
    return (
      dist >= 3 && dist <= 8 && (heroRoom === '' || heroRoom !== monsterRoom)
    );
  });
};

export const countHeroesInSpray = (
  state: GameState,
  monster: Monster,
  position: Position,
): number => {
  const heroes = liveHeroes(state).filter((h) => !h.ignoredByMonsters);
  let count = 0;

  for (const hero of heroes) {
    const dx = Math.abs(position.x - hero.position.x);
    const dy = Math.abs(position.y - hero.position.y);
    const gridDist = distanceInGrid(position, hero.position);
    const hasLos = hasLineOfSight(position, hero.position, 48, state, false);

    const isDiagonal =
      hasMonsterAbility(monster.type, 'diagonalFireAttack') &&
      dx === dy &&
      gridDist > 1 &&
      hasLos;

    const isOrthogonal =
      hasMonsterAbility(monster.type, 'orthogonalFireAttack') &&
      (position.x === hero.position.x || position.y === hero.position.y) &&
      gridDist > 1 &&
      hasLos;

    const isSameRoom =
      hasMonsterAbility(monster.type, 'sameRoomFireAttack') &&
      findCell(state.dungeon.layout.grid, position.x, position.y) ===
        findCell(state.dungeon.layout.grid, hero.position.x, hero.position.y);

    if (isDiagonal || isOrthogonal || isSameRoom) {
      count++;
    }
  }

  return count;
};

export const findSprayAlignPosition = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
  maxSteps = 3,
): ReachableTile | null => {
  const reachable = getReachablePositions(
    state,
    monster,
    passableGrid,
    maxSteps,
  );
  // Also include current position with dist 0
  const allPositions: ReachableTile[] = [
    { position: monster.position, distance: 0, path: [] },
    ...reachable,
  ];

  const aligned = allPositions
    .map((tile) => ({
      tile,
      count: countHeroesInSpray(state, monster, tile.position),
    }))
    .filter((entry) => entry.count > 0);

  if (aligned.length === 0) return null;

  aligned.sort(
    (a, b) => b.count - a.count || a.tile.distance - b.tile.distance,
  );
  return aligned[0].tile;
};
