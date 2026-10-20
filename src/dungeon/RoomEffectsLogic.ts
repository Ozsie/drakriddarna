import { type GameState, type Item, ItemType } from '../types';
import { findRoomCells, isSamePosition } from '../core';
import {
  removeFoundItemFromDeck,
  removeFoundMagicItemFromDeck,
} from '../secrets/SecretsLogic';

export const roomEffects: Record<
  string,
  (state: GameState, room: string) => void
> = {
  revealRemainingItemsInRoom: (state: GameState, room: string) => {
    const floorPositions = findRoomCells(
      state.dungeon.layout.grid,
      room,
    ).filter(
      (pos) =>
        !state.dungeon.layout.items.some((i) =>
          isSamePosition(i.position, pos),
        ),
    );
    if (floorPositions.length === 0) return;

    // Copies of an item already lying in the dungeon (e.g. placed directly
    // in the dungeon layout) have no deck entry reserved for them, so the
    // reveal must not place more copies than amountInDeck allows on top of
    // those.
    const itemKey = (item: Item) => item.id ?? `${item.type}_${item.name}`;
    const copiesInDungeon = new Map<string, number>();
    state.dungeon.layout.items.forEach((itemLocation) => {
      if (!itemLocation.item) return;
      const key = itemKey(itemLocation.item);
      copiesInDungeon.set(key, (copiesInDungeon.get(key) ?? 0) + 1);
    });

    const remaining = [...state.itemDeck, ...state.magicItemDeck];

    let placed = 0;
    remaining.forEach((item) => {
      if (item.type === ItemType.MAGIC) {
        removeFoundMagicItemFromDeck(state, item);
      } else {
        removeFoundItemFromDeck(state, item);
      }

      const key = itemKey(item);
      const copies = copiesInDungeon.get(key) ?? 0;
      if (copies >= item.amountInDeck) return;
      copiesInDungeon.set(key, copies + 1);

      const position = floorPositions[placed % floorPositions.length];
      placed++;
      state.dungeon.layout.items.push({ item, position });
    });
  },
  stopEvents: (state: GameState) => {
    state.drawEvents = false;
  },
};

export const executeRoomDiscoveredEffect = (
  state: GameState,
  room: string,
): void => {
  const effectName = state.dungeon.onRoomDiscovered?.[room];
  if (effectName) {
    roomEffects[effectName]?.(state, room);
  }
};
