import type { GameState, ItemLocation } from '../types';
import { ItemType } from '../types';
import { i18n, isDiscovered, isSamePosition } from '../game';
import { renderTextBox } from '../notes/NotesRendering';

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
    ) {
      return;
    }
    switch (itemLocation.item.type) {
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
  ctx.drawImage(
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
    const text = i18n(itemLocation.item.name);
    renderTextBox(ctx, text, itemLocation.position, cellSize);
  }
};
