import type { Item } from '../types';

const legacyAuraItemIds = new Set([
  'boots_of_speed',
  'giants_glove',
  'ring_of_precision',
  'crown_of_wisdom',
]);

export const getItemAuraSeed = (
  item: Item | null | undefined,
): string | null => {
  if (!item?.id || (!item.generatedAura && !legacyAuraItemIds.has(item.id))) {
    return null;
  }
  return item.id;
};
