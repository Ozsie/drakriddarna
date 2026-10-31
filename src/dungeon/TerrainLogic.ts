import type { Actor, GameState, Layout, Position, TerrainCell } from '../types';
import { TerrainType } from '../types';
import { createBloodSplatter } from '../combat';
import {
  addLog,
  createDamageIndicator,
  flashActor,
  i18n,
  processActorDowned,
} from '../core';
import { isSamePosition } from '../core';

// Base styling per built-in terrain type, used when a cell does not
// configure its own colour or opacity.
export const TERRAIN_DEFAULT_STYLING: Record<
  string,
  { color: string; opacity: number; rate: number }
> = {
  [TerrainType.WATER]: { color: '#2e6f9e', opacity: 0.55, rate: 0.3 },
  [TerrainType.LAVA]: { color: '#cf3a12', opacity: 0.8, rate: 0.4 },
};

export const TERRAIN_DEFAULT_OPACITY = 0.6;
export const TERRAIN_DEFAULT_RATE = 0.35;

export const terrainAt = (
  layout: Layout,
  position: Position,
): TerrainCell | undefined =>
  layout.terrain?.find((cell) => isSamePosition(cell.position, position));

// Movement points a step onto the given cell costs (default 1).
export const terrainMovementCost = (
  layout: Layout,
  position: Position,
): number => terrainAt(layout, position)?.movementCost ?? 1;

// Applies flat environmental damage to an actor, bypassing armour and
// shield like other environmental damage (see the chaos sword in
// src/items/ItemLogic). Shared by terrain cells and room fog;
// `effectNameKey` is the i18n key of the effect's display name, and
// `logKey` receives the actor name, damage and effect name.
export const damageActorFromEffect = (
  state: GameState,
  actor: Actor,
  effectNameKey: string,
  damage: number,
  logKey: string,
): void => {
  const effectName = i18n(effectNameKey);
  addLog(state, logKey, {
    actor: i18n(actor.name),
    damage: `${damage}`,
    terrain: effectName,
  });
  actor.health -= damage;
  flashActor(actor);
  state.bloodSplatters = [
    ...(state.bloodSplatters ?? []),
    createBloodSplatter(actor.position, { damage }),
  ];
  state.damageIndicators = [
    ...(state.damageIndicators ?? []),
    createDamageIndicator(damage, actor.position),
  ];
  if (actor.health <= 0) {
    addLog(state, 'logs.terrain.killed', {
      actor: i18n(actor.name),
      terrain: effectName,
    });
    processActorDowned(state, actor);
  }
};

// Everything that happens when an actor arrives on a cell: the terrain's
// damage on enter, if any. Called for heroes (arriveOnCell) and monsters
// (monsterMove / monsterMoveToPosition).
export const applyTerrainEnterEffects = (
  state: GameState,
  actor: Actor,
): void => {
  if (actor.health <= 0) return;
  const terrain = terrainAt(state.dungeon.layout, actor.position);
  if (terrain && (terrain.damageOnEnter ?? 0) > 0) {
    damageActorFromEffect(
      state,
      actor,
      `content.terrain.${terrain.type}`,
      terrain.damageOnEnter ?? 0,
      'logs.terrain.enterDamage',
    );
  }
};

// Everything that happens when an actor ends its turn on a cell: the
// terrain's damage on turn end, if any. Called for the hero ending its
// turn (next) and each monster at the end of its turn.
export const applyTerrainTurnEndEffects = (
  state: GameState,
  actor: Actor,
): void => {
  if (actor.health <= 0) return;
  const terrain = terrainAt(state.dungeon.layout, actor.position);
  if (terrain && (terrain.damageOnTurnEnd ?? 0) > 0) {
    damageActorFromEffect(
      state,
      actor,
      `content.terrain.${terrain.type}`,
      terrain.damageOnTurnEnd ?? 0,
      'logs.terrain.turnEndDamage',
    );
  }
};
