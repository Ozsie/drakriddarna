// Game-side facade for the radial action menu. The component (layout,
// hit test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/radialMenu is the only place that reads the radial-menu
// store state. This module keeps the historical entry points — including
// the RadialButtonPosition carrying the game entry, which the controller
// dispatches — so callers work unchanged, with the exact same pixels:
// parity snapshots cover the whole chain.

import type { ItemSprite } from '../types';
import type { RadialMenuEntry } from '../hero/RadialMenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import type { SpriteRef, Translator, UiEnv } from '../uikit/env';
import {
  hitTestRadialMenu,
  layoutRadialMenu,
  renderRadialMenu as renderRadialMenuComponent,
  renderRadialTooltip as renderRadialTooltipComponent,
  type RadialMenuLayout as KitLayout,
} from '../uikit/components/radialMenu';
import { toRadialMenuViewModel } from './viewmodels/radialMenu';
import { legacyUiContext, defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';

export { RADIAL_MENU_ICONS, RADIAL_MENU_LABELS } from './viewmodels/radialMenu';

export interface RadialButtonPosition {
  index: number;
  entry: RadialMenuEntry;
  x: number;
  y: number;
  radius: number;
  label: string;
  icon: string;
  sprite?: ItemSprite;
}

const entriesFor = (menu: RadialMenuState | null | undefined) =>
  menu?.entries ?? [];

const spriteOf = (
  entry: RadialMenuEntry,
  spriteRef: SpriteRef | undefined,
): ItemSprite | undefined =>
  entry.item?.sprite ??
  (spriteRef
    ? { image: spriteRef.assetId, index: spriteRef.index, size: spriteRef.size }
    : undefined);

/** Maps a kit layout onto the historical entry-carrying positions. */
const toLegacyPositions = (
  kitLayout: KitLayout,
  entries: readonly RadialMenuEntry[],
): RadialButtonPosition[] =>
  kitLayout.items.map((item) => ({
    index: item.button.id,
    entry: entries[item.button.id],
    x: item.x,
    y: item.y,
    radius: item.radius,
    label: item.button.label,
    icon: item.button.icon,
    sprite: spriteOf(entries[item.button.id], item.button.sprite),
  }));

export const getRadialButtonPositions = (
  menu: RadialMenuState,
  cellSize: number,
  t: Translator = i18nTranslator,
): RadialButtonPosition[] => {
  const vm = toRadialMenuViewModel(menu, t);
  if (!vm) return [];
  const kitLayout = layoutRadialMenu(vm, cellSize);
  return toLegacyPositions(kitLayout, entriesFor(menu));
};

export const findHoveredRadialButton = (
  menu: RadialMenuState,
  cellSize: number,
  worldPos: { x: number; y: number },
): RadialButtonPosition | undefined => {
  const vm = toRadialMenuViewModel(menu);
  if (!vm) return undefined;
  const kitLayout = layoutRadialMenu(vm, cellSize);
  const hit = hitTestRadialMenu(kitLayout, worldPos);
  if (!hit) return undefined;
  return toLegacyPositions(kitLayout, entriesFor(menu)).find(
    (button) => button.index === hit.id,
  );
};

export const renderRadialTooltip = (
  ctx: CanvasRenderingContext2D,
  button: RadialButtonPosition,
  env: UiEnv = defaultUiEnv,
): void => {
  renderRadialTooltipComponent(
    ctx,
    { x: button.x, y: button.y, radius: button.radius, label: button.label },
    env.theme,
  );
};

export const renderRadialMenu = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  menu: RadialMenuState,
  hoveredIndex?: number | null,
  env: UiEnv = defaultUiEnv,
): void => {
  if (!menu) return;

  const vm = toRadialMenuViewModel(menu, env.t);
  if (!vm) return;
  const kitLayout = layoutRadialMenu(vm, cellSize);

  renderRadialMenuComponent(kitLayout, legacyUiContext(ctx, env), {
    hoveredId: hoveredIndex ?? null,
  });
};
