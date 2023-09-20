import type { GameState, ItemLocation } from "../types";
import { ItemType } from "../types";


export const renderItems = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState) => {
  state.dungeon.layout.items
    .forEach((itemLocation) => {
      switch (itemLocation.item.type) {
        case ItemType.MAGIC: renderMagicItem(ctx, ground, cellSize, itemLocation); break;
      }
    });
}

const renderMagicItem = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, itemLocation: ItemLocation) => {
  const x = itemLocation.position.x;
  const y = itemLocation.position.y;
  ctx.drawImage(ground, 4*48, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
}
