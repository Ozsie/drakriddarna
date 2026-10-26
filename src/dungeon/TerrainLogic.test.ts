import { describe, expect, it } from 'vitest';
import type { Actor, GameState, Layout, TerrainCell } from '../types';
import { Level, TerrainType } from '../types';
import {
  TERRAIN_DEFAULT_STYLING,
  applyTerrainEnterEffects,
  applyTerrainTurnEndEffects,
  terrainAt,
  terrainMovementCost,
} from './TerrainLogic';

const actor = (health: number): Actor =>
  ({
    name: 'hero.test',
    health,
    level: Level.KNIGHT,
    position: { x: 1, y: 1 },
  }) as unknown as Actor;

const makeLayout = (terrain: TerrainCell[]): Layout =>
  ({ grid: ['AAA', 'AAA'], terrain }) as unknown as Layout;

const makeState = (terrain: TerrainCell[], heroes: Actor[]): GameState =>
  ({
    actionLog: [],
    heroes,
    dungeon: { layout: makeLayout(terrain) },
  }) as unknown as GameState;

const lavaCell = (x: number, y: number, damage: number): TerrainCell => ({
  position: { x, y },
  type: TerrainType.LAVA,
  damageOnEnter: damage,
  damageOnTurnEnd: damage,
});

describe('terrainAt', () => {
  it('finds the terrain cell at a position', () => {
    const layout = makeLayout([lavaCell(1, 1, 1)]);
    expect(terrainAt(layout, { x: 1, y: 1 })?.type).toBe('lava');
  });

  it('returns undefined for positions without terrain', () => {
    const layout = makeLayout([lavaCell(1, 1, 1)]);
    expect(terrainAt(layout, { x: 0, y: 0 })).toBeUndefined();
    expect(terrainAt(makeLayout([]), { x: 1, y: 1 })).toBeUndefined();
  });
});

describe('terrainMovementCost', () => {
  it('defaults to 1 without terrain', () => {
    expect(terrainMovementCost(makeLayout([]), { x: 0, y: 0 })).toBe(1);
  });

  it('returns the configured cost of the cell entered', () => {
    const layout = makeLayout([
      {
        position: { x: 1, y: 1 },
        type: TerrainType.WATER,
        movementCost: 2,
      },
    ]);
    expect(terrainMovementCost(layout, { x: 1, y: 1 })).toBe(2);
    expect(terrainMovementCost(layout, { x: 0, y: 0 })).toBe(1);
  });
});

describe('applyTerrainEnterEffects', () => {
  it('applies damageOnEnter to a hero on the terrain cell', () => {
    const hero = actor(5);
    const state = makeState([lavaCell(1, 1, 2)], [hero]);
    applyTerrainEnterEffects(state, hero);
    expect(hero.health).toBe(3);
    expect(state.damageIndicators).toHaveLength(1);
    expect(state.bloodSplatters).toHaveLength(1);
    expect(state.actionLog[0].key).toBe('logs.terrain.enterDamage');
  });

  it('does nothing without terrain damage configured', () => {
    const hero = actor(5);
    const state = makeState(
      [{ position: { x: 1, y: 1 }, type: TerrainType.WATER }],
      [hero],
    );
    applyTerrainEnterEffects(state, hero);
    expect(hero.health).toBe(5);
    expect(state.actionLog).toHaveLength(0);
  });

  it('does nothing to an actor not on a terrain cell', () => {
    const hero = actor(5);
    const state = makeState([lavaCell(0, 0, 2)], [hero]);
    applyTerrainEnterEffects(state, hero);
    expect(hero.health).toBe(5);
  });

  it('does nothing to an already downed actor', () => {
    const hero = actor(0);
    const state = makeState([lavaCell(1, 1, 2)], [hero]);
    applyTerrainEnterEffects(state, hero);
    expect(hero.health).toBe(0);
    expect(state.actionLog).toHaveLength(0);
  });

  it('downs an actor when the damage is fatal', () => {
    const hero = actor(1);
    const state = makeState([lavaCell(1, 1, 2)], [hero]);
    applyTerrainEnterEffects(state, hero);
    expect(hero.health).toBe(0);
    expect(hero.level).toBe(Level.APPRENTICE);
    expect(state.actionLog[0].key).toBe('logs.terrain.killed');
  });
});

describe('applyTerrainTurnEndEffects', () => {
  it('applies damageOnTurnEnd to a hero on the terrain cell', () => {
    const hero = actor(5);
    const state = makeState([lavaCell(1, 1, 1)], [hero]);
    applyTerrainTurnEndEffects(state, hero);
    expect(hero.health).toBe(4);
    expect(state.actionLog[0].key).toBe('logs.terrain.turnEndDamage');
  });

  it('ignores damageOnEnter when ending the turn', () => {
    const hero = actor(5);
    const state = makeState(
      [{ position: { x: 1, y: 1 }, type: TerrainType.LAVA, damageOnEnter: 3 }],
      [hero],
    );
    applyTerrainTurnEndEffects(state, hero);
    expect(hero.health).toBe(5);
  });

  it('downs an actor when the turn-end damage is fatal', () => {
    const hero = actor(2);
    const state = makeState([lavaCell(1, 1, 3)], [hero]);
    applyTerrainTurnEndEffects(state, hero);
    expect(hero.health).toBe(0);
    expect(hero.level).toBe(Level.APPRENTICE);
  });
});

describe('TERRAIN_DEFAULT_STYLING', () => {
  it('has styling for the built-in terrain types', () => {
    expect(TERRAIN_DEFAULT_STYLING[TerrainType.WATER].color).toBeDefined();
    expect(TERRAIN_DEFAULT_STYLING[TerrainType.LAVA].color).toBeDefined();
  });
});
