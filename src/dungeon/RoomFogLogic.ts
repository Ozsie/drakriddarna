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

// Fills a room or corridor with fog, merging the given options over any
// fog the room already has. Used by dungeon authors declaratively (via
// `roomFog`) and by effects at runtime, e.g. a gas valve an interactable
// opens; because the fog becomes part of the layout, it persists in the
// save like any other dungeon state.
export const fillRoomFog = (
  state: GameState,
  room: string,
  options: RoomFogOptions,
): void => {
  state.dungeon.layout.roomFog = {
    ...state.dungeon.layout.roomFog,
    [room]: { ...state.dungeon.layout.roomFog?.[room], ...options },
  };
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
