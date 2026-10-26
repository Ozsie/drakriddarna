import type {
  Actor,
  GameState,
  Layout,
  Position,
  RoomFogOptions,
} from '../types';
import { findCell } from '../core';
import { damageActorFromEffect } from './TerrainLogic';

// Display name of an unnamed fog, used in the damage log.
export const DEFAULT_FOG_NAME_KEY = 'content.fog.name';

// The fog options of the room or corridor a position is in, if any.
export const roomFogAt = (
  layout: Layout,
  position: Position,
): RoomFogOptions | undefined => {
  const cell = findCell(layout.grid, position.x, position.y);
  return cell ? layout.roomFog?.[cell] : undefined;
};

// Everything that happens when an actor arrives on a cell: the fog's
// damage on enter, if the room's fog is configured to hurt. Called for
// heroes (arriveOnCell) and monsters (monsterMove /
// monsterMoveToPosition).
export const applyRoomFogEnterEffects = (
  state: GameState,
  actor: Actor,
): void => {
  if (actor.health <= 0) return;
  const fog = roomFogAt(state.dungeon.layout, actor.position);
  if (fog && (fog.damageOnEnter ?? 0) > 0) {
    damageActorFromEffect(
      state,
      actor,
      fog.nameTranslationKey ?? DEFAULT_FOG_NAME_KEY,
      fog.damageOnEnter ?? 0,
      'logs.terrain.enterDamage',
    );
  }
};

// Everything that happens when an actor ends its turn in a room: the
// fog's damage on turn end, if configured. Called for the hero ending
// its turn (next) and each monster at the end of its turn.
export const applyRoomFogTurnEndEffects = (
  state: GameState,
  actor: Actor,
): void => {
  if (actor.health <= 0) return;
  const fog = roomFogAt(state.dungeon.layout, actor.position);
  if (fog && (fog.damageOnTurnEnd ?? 0) > 0) {
    damageActorFromEffect(
      state,
      actor,
      fog.nameTranslationKey ?? DEFAULT_FOG_NAME_KEY,
      fog.damageOnTurnEnd ?? 0,
      'logs.terrain.turnEndDamage',
    );
  }
};
