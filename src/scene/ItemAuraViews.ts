import type { LightViewport } from '@hoard-engine/lighting';
import { screenWorldBounds, type SceneIsoView } from '@hoard-engine/scene';
import type { Actor, GameState, Position } from '../types';
import { getActorVisualPosition, isDiscovered } from '../core';
import { getItemAuraSeed } from '../items/ItemAura';

export type ItemAuraView = {
  seed: string;
  position: Position;
};

export const getIsometricAuraViewport = (
  view: SceneIsoView,
  cellSize: number,
): LightViewport => {
  const bounds = screenWorldBounds(view, cellSize * 2);
  return {
    x: bounds.minX / cellSize,
    y: bounds.minY / cellSize,
    width: (bounds.maxX - bounds.minX) / cellSize,
    height: (bounds.maxY - bounds.minY) / cellSize,
  };
};

const isInViewport = (position: Position, viewport?: LightViewport): boolean =>
  !viewport ||
  !(
    position.x + 1 < viewport.x ||
    position.y + 1 < viewport.y ||
    position.x > viewport.x + viewport.width ||
    position.y > viewport.y + viewport.height
  );

export const buildItemAuraViews = (
  state: GameState,
  currentTime: number = Date.now(),
  viewport?: LightViewport,
): ItemAuraView[] => {
  const carriers: Actor[] = [...state.heroes, ...state.dungeon.layout.monsters];

  return carriers.flatMap((actor) => {
    if (
      actor.health <= 0 ||
      !isDiscovered(state.dungeon, actor.position.x, actor.position.y)
    ) {
      return [];
    }

    const position = getActorVisualPosition(actor, currentTime);
    if (!isInViewport(position, viewport)) return [];

    return (actor.inventory ?? []).flatMap((item) => {
      if (item.disabled) return [];
      const seed = getItemAuraSeed(item);
      return seed ? [{ seed, position }] : [];
    });
  });
};
