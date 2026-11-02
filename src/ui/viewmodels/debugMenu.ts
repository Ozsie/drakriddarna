// Debug-menu view model adapter: the only place that reads GameState
// (through MenuLogic) for the canvas menu — the debug menu and its event
// view. The view name, header and item ids and labels are prebuilt here;
// item onClick closures stay game-side and are resolved by the facade
// on hits.

import type { GameState } from '../../types';
import {
  type CanvasMenuItem,
  type DebugMenuView,
  type MenuCallbacks,
  getDebugMenuHeader,
  getDebugMenuItemsForView,
} from '../../menu/MenuLogic';
import type { MenuViewModel } from '../../uikit';

export const toDebugMenuViewModel = (
  state: GameState | null | undefined,
  view: DebugMenuView,
  callbacks?: MenuCallbacks,
): MenuViewModel | null => {
  if (!state) return null;

  const items: CanvasMenuItem[] = getDebugMenuItemsForView(
    view,
    state,
    callbacks,
  );

  return {
    view,
    headerText: getDebugMenuHeader(view),
    items: items.map((item) => ({ id: item.id, label: item.label })),
    footerText: '',
  };
};
