import type { GameState, ItemLocation } from '../types';
import { ItemType } from '../types';
import { i18n } from '../core';
import { isDiscovered, isSamePosition } from '../core';
import { renderTextBox } from '../notes/NotesRendering';
import { drawCachedTile } from '../dungeon/TileTextureCache';

export const renderItems = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.items.forEach((itemLocation) => {
    if (
      !isDiscovered(
        state.dungeon,
        itemLocation.position.x,
        itemLocation.position.y,
      ) &&
      !debugMode
    )
      return;
    switch (itemLocation.item?.type ?? ItemType.WEAPON) {
      case ItemType.MAGIC:
        renderMagicItem(ctx, ground, cellSize, state, itemLocation);
        break;
      case ItemType.WEAPON:
        renderMagicItem(ctx, ground, cellSize, state, itemLocation);
    }
  });
};

const renderMagicItem = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  itemLocation: ItemLocation,
) => {
  const x = itemLocation.position.x;
  const y = itemLocation.position.y;
  drawCachedTile(
    ctx,
    ground,
    48 * 6,
    48 * 3,
    48,
    48,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
  if (!state.currentActor) return;
  const actor = state.currentActor;
  if (isSamePosition(actor?.position, itemLocation.position)) {
    const text = itemLocation.item
      ? i18n(itemLocation.item.name)
      : i18n('campaign.iceDragon.randomItem');
    renderTextBox(ctx, text, itemLocation.position, cellSize);
  }
};
