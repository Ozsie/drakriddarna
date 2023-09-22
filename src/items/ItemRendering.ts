import type { GameState, ItemLocation } from "../types";
import { ItemType } from "../types";


export const renderItems = (ctx: CanvasRenderingContext2D, items: CanvasImageSource, cellSize: number, state: GameState) => {
  state.dungeon.layout.items
    .forEach((itemLocation) => {
      switch (itemLocation.item.type) {
        case ItemType.MAGIC: renderMagicItem(ctx, items, cellSize, itemLocation); break;
      }
    });
}

const renderMagicItem = (ctx: CanvasRenderingContext2D, item: CanvasImageSource, cellSize: number, itemLocation: ItemLocation) => {
  const x = itemLocation.position.x;
  const y = itemLocation.position.y;
  ctx.drawImage(
    item,
    48 * (itemLocation.item.spritePos?.x ?? 0),
    48 * (itemLocation.item.spritePos?.y ?? 0),
    48,
    48,
    x*cellSize,
    y*cellSize,
    cellSize,
    cellSize
  );
}
