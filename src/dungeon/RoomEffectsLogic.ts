import { type GameState, ItemType } from '../types';
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

    const remaining = [...state.itemDeck, ...state.magicItemDeck];

    remaining.forEach((item, index) => {
      const position = floorPositions[index % floorPositions.length];
      state.dungeon.layout.items.push({ item, position });
      if (item.type === ItemType.MAGIC) {
        removeFoundMagicItemFromDeck(state, item);
      } else {
        removeFoundItemFromDeck(state, item);
      }
    });
  },
  stopEvents: (state: GameState, room: string) => {
    state.drawEvents = false;
  }
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
