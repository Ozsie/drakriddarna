import { describe, it, expect } from 'vitest';
import { onCheckFulfilled } from './WinConditionChecks';
import { init } from '../game';
import { ConditionType, ItemType } from '../types';
import type { Item } from '../types';

describe('onCheckFulfilled registry', () => {
  it('hasNecklaceOfLight checks item semantic id', () => {
    const state = init();
    const condition = {
      type: ConditionType.KILL_ALL,
      fulfilled: true,
    };

    // When hero does not have necklace
    expect(onCheckFulfilled.hasNecklaceOfLight(state, condition)).toBe(false);

    // When hero has necklace by id
    const necklaceItem: Item = {
      id: 'necklace_of_light',
      name: 'Custom Translation Key or Renamed UI String',
      type: ItemType.MAGIC,
      value: 0,
      amountInDeck: 1,
    };
    state.heroes[0].inventory.push(necklaceItem);

    expect(onCheckFulfilled.hasNecklaceOfLight(state, condition)).toBe(true);
  });
});
