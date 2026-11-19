import { describe, expect, it } from 'vitest';
import type { Item } from '../types';
import { magicItems } from './magicItems';
import { getItemAuraSeed } from './ItemAura';

describe('generated magic item auras', () => {
  it('marks the four magic items for generated auras instead of light sources', () => {
    const auraItemIds = [
      'boots_of_speed',
      'giants_glove',
      'ring_of_precision',
      'crown_of_wisdom',
    ];
    const auraItems = magicItems.filter((item) =>
      auraItemIds.includes(item.id ?? ''),
    );

    expect(auraItems).toHaveLength(auraItemIds.length);
    auraItems.forEach((item) => {
      expect(item.generatedAura).toBe(true);
      expect(item.light).toBeUndefined();
      expect(getItemAuraSeed(item)).toBe(item.id);
    });
  });

  it('recognizes the four legacy saved items without treating other lights as auras', () => {
    for (const id of [
      'boots_of_speed',
      'giants_glove',
      'ring_of_precision',
      'crown_of_wisdom',
    ]) {
      expect(getItemAuraSeed({ id } as Item)).toBe(id);
    }

    expect(
      getItemAuraSeed({ id: 'custom_lantern', light: {} } as Item),
    ).toBeNull();
    expect(getItemAuraSeed({ generatedAura: true } as Item)).toBeNull();
  });
});
