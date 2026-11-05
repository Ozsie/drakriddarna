// Radial menu view model adapter: the only place that reads the radial
// menu state (the store's RadialMenuState with its game-typed entries).
// The action-to-icon/label-key tables and every button label, icon and
// sprite ref are prebuilt here.

import { RadialAction, type RadialMenuEntry } from '../../hero/RadialMenuLogic';
import type { RadialMenuState } from '../../store/radialMenuStore';
import type { Translator } from '@hoard-engine/uikit';
import type { RadialButtonVm, RadialMenuViewModel } from '@hoard-engine/uikit';
import { itemSpriteRef } from './heroCards';
import { i18nTranslator } from '../i18nAdapter';

export const RADIAL_MENU_ICONS: Record<RadialAction, string> = {
  [RadialAction.SEARCH]: '🔍',
  [RadialAction.PICK_LOCK]: '🗝️',
  [RadialAction.OPEN_DOOR]: '🚪',
  [RadialAction.PICK_UP_ITEM]: '🎒',
  [RadialAction.INTERACT]: '⚡',
  [RadialAction.USE_ITEM]: '✨',
  [RadialAction.NEXT]: '→',
};

export const RADIAL_MENU_LABELS: Record<RadialAction, string> = {
  [RadialAction.SEARCH]: 'content.radialMenu.search',
  [RadialAction.PICK_LOCK]: 'content.radialMenu.pickLock',
  [RadialAction.OPEN_DOOR]: 'content.radialMenu.openDoor',
  [RadialAction.PICK_UP_ITEM]: 'content.radialMenu.pickUpItem',
  [RadialAction.INTERACT]: 'content.radialMenu.interact',
  [RadialAction.USE_ITEM]: 'content.radialMenu.useItem',
  [RadialAction.NEXT]: 'content.radialMenu.next',
};

/** One ring button's texts and art, derived from the entry. */
const buttonVm = (
  entry: RadialMenuEntry,
  index: number,
  t: Translator,
): RadialButtonVm => {
  let label: string;
  let icon: string;
  let sprite: RadialButtonVm['sprite'];

  if (entry.interactable) {
    const labelKey =
      entry.interactable.nameTranslationKey ?? RADIAL_MENU_LABELS[entry.action];
    label = t(labelKey);
    icon = entry.interactable.icon ?? RADIAL_MENU_ICONS[entry.action] ?? '';
  } else if (entry.item) {
    const itemName = t(entry.item.nameTranslationKey ?? entry.item.name);
    if (entry.targetHero) {
      const targetName = t(entry.targetHero.name);
      label = `${itemName} (${targetName})`;
    } else {
      label = itemName;
    }
    icon =
      entry.item.icon ??
      (entry.item.properties?.ICON as string) ??
      RADIAL_MENU_ICONS[entry.action] ??
      '✨';
    sprite = itemSpriteRef(entry.item);
  } else {
    const labelKey = RADIAL_MENU_LABELS[entry.action];
    const baseLabel = t(labelKey);
    label = baseLabel + (entry.door ? ` (${entry.door.side})` : '');
    icon = RADIAL_MENU_ICONS[entry.action] ?? '';
  }

  return { id: index, label, icon, sprite };
};

export const toRadialMenuViewModel = (
  menu: RadialMenuState | null | undefined,
  t: Translator = i18nTranslator,
): RadialMenuViewModel | null => {
  if (!menu || !menu.entries || menu.entries.length === 0) return null;

  return {
    origin: { x: menu.x, y: menu.y },
    buttons: menu.entries.map((entry, index) => buttonVm(entry, index, t)),
  };
};
