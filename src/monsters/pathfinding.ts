// Game-side facade over the @hoard-engine/grid engine package
// (published on npm, consumed as a dependency). The A* algorithm, the
// passable-grid step rules and the blocked-edge bookkeeping are
// game-agnostic and live in the package; everything that knows the game
// stays here — which tiles are walkable and discovered, which edges are
// closed, target selection and scoring (see docs/engine-packages.md).
import type { GameState, Hero, Monster, Position } from '../types';
import { getDist, isDiscovered, isWalkable } from '../core';
import {
  collectBlockedEdges,
  createPassableGrid as createPackagePassableGrid,
  findPath as findPackagePath,
  type PassableGrid,
} from '@hoard-engine/grid';
import { liveHeroes } from '../hero/HeroLogic';
import { scoreHero, type ScoredHero } from './behavior';
import { logMonsterTargetSelection } from './behavior';

export type { PassableGrid } from '@hoard-engine/grid';

export const createPassableGrid = (state: GameState): PassableGrid => {
  const layout = state.dungeon.layout;
  const height = layout.grid.length;
  const width = layout.grid[0]?.length ?? 0;

  const isWalkableTile = (x: number, y: number): boolean =>
    isWalkable(layout, x, y) && isDiscovered(state.dungeon, x, y);

  // Edges a monster cannot cross: closed doors and edge walls alike. Both
  // block the shared edge between two cells in exactly the same way.
  const blockedEdges = collectBlockedEdges({
    doors: layout.doors,
    walls: layout.walls,
  });

  return createPackagePassableGrid(width, height, isWalkableTile, blockedEdges);
};

export const findPath = (
  start: Position,
  targetHero: Hero,
  passableGrid: PassableGrid,
  occupiedPositions: Set<string>,
): Position[] | null =>
  findPackagePath(start, targetHero.position, passableGrid, occupiedPositions);

export const findBestPathToHeroes = (
  state: GameState,
  monster: Monster,
  passableGrid: PassableGrid,
  rng?: () => number,
): { hero: Hero; path: Position[]; score?: number } | null => {
  const heroes = liveHeroes(state).filter((hero) => !hero.ignoredByMonsters);
  if (heroes.length === 0) return null;

  const occupiedPositions = new Set<string>();

  // Monsters occupy positions
  state.dungeon.layout.monsters.forEach((m) => {
    if (m !== monster && m.health > 0) {
      occupiedPositions.add(`${m.position.x},${m.position.y}`);
    }
  });

  // Heroes occupy positions
  liveHeroes(state).forEach((h) => {
    occupiedPositions.add(`${h.position.x},${h.position.y}`);
  });

  type Candidate = {
    hero: Hero;
    path: Position[];
    dist: number;
    score: number;
    scored: ScoredHero;
  };

  const candidates: Candidate[] = [];

  for (const hero of heroes) {
    const path = findPath(
      monster.position,
      hero,
      passableGrid,
      occupiedPositions,
    );
    if (path && path.length > 0) {
      const scored = scoreHero(hero, {
        state,
        monster,
        stepsNeeded: path.length,
        rng,
      });
      candidates.push({
        hero,
        path,
        dist: getDist(monster.position, hero.position),
        score: scored.score,
        scored,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);

  logMonsterTargetSelection({
    monster,
    candidates: candidates.map((c) => c.scored),
    selectedHero: candidates[0].hero,
    actionType: 'pathfinding',
    state,
  });

  return {
    hero: candidates[0].hero,
    path: candidates[0].path,
    score: candidates[0].score,
  };
};
