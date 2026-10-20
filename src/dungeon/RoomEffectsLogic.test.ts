import { describe, expect, it } from 'vitest';
import type { GameState, Item } from '../types';
import { ItemType } from '../types';
import { roomEffects } from './RoomEffectsLogic';

const item = (
  id: string,
  type: ItemType = ItemType.WEAPON,
  amountInDeck = 1,
): Item =>
  ({
    id,
    name: id,
    nameTranslationKey: id,
    type,
    amountInDeck,
  }) as Item;

const makeState = (
  layoutItems: { item?: Item; position: { x: number; y: number } }[],
  itemDeck: Item[],
  magicItemDeck: Item[] = [],
): GameState =>
  ({
    itemDeck,
    magicItemDeck,
    dungeon: {
      layout: {
        grid: ['KKK', 'KKK'],
        items: layoutItems,
      },
    },
  }) as unknown as GameState;

describe('revealRemainingItemsInRoom', () => {
  it('places remaining deck items in the room', () => {
    const sword = item('sword');
    const state = makeState([], [sword]);
    roomEffects.revealRemainingItemsInRoom(state, 'K');
    expect(state.dungeon.layout.items).toHaveLength(1);
    expect(state.dungeon.layout.items[0].item).toBe(sword);
    expect(state.itemDeck).toHaveLength(0);
  });

  it('never places more copies of an item than amountInDeck', () => {
    const shield = item('shield', ItemType.SHIELD, 2);
    const state = makeState([], [shield, { ...shield }, { ...shield }]);
    roomEffects.revealRemainingItemsInRoom(state, 'K');
    const placed = state.dungeon.layout.items.filter(
      (i) => i.item?.id === 'shield',
    );
    expect(placed).toHaveLength(2);
  });

  it('counts copies already lying in the dungeon against amountInDeck', () => {
    const crown = item('crown', ItemType.MAGIC, 1);
    const state = makeState(
      [{ item: crown, position: { x: 1, y: 1 } }],
      [],
      [crown],
    );
    roomEffects.revealRemainingItemsInRoom(state, 'K');
    const crowns = state.dungeon.layout.items.filter(
      (i) => i.item?.id === 'crown',
    );
    expect(crowns).toHaveLength(1);
    expect(state.magicItemDeck).toHaveLength(0);
  });

  it('still places copies when the floor holds fewer than amountInDeck', () => {
    const shield = item('shield', ItemType.SHIELD, 2);
    const state = makeState(
      [{ item: shield, position: { x: 0, y: 0 } }],
      [shield],
    );
    roomEffects.revealRemainingItemsInRoom(state, 'K');
    const shields = state.dungeon.layout.items.filter(
      (i) => i.item?.id === 'shield',
    );
    expect(shields).toHaveLength(2);
  });

  it('skips floor cells that already hold an item', () => {
    const sword = item('sword');
    const state = makeState(
      [{ item: item('other'), position: { x: 0, y: 0 } }],
      [sword],
    );
    roomEffects.revealRemainingItemsInRoom(state, 'K');
    expect(
      state.dungeon.layout.items.some(
        (i) =>
          i.position.x === 0 && i.position.y === 0 && i.item?.id === 'sword',
      ),
    ).toBe(false);
  });
});
