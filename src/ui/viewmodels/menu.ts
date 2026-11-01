// Menu view model adapter: the only place that reads GameState (through
// MenuLogic) for the canvas menu. The view name, header, item ids and
// labels and the build-info footer are prebuilt here; item onClick
// closures stay game-side and are resolved by the facade on hits.

import type { GameState } from '../../types';
import {
  type CanvasMenuItem,
  type MenuCallbacks,
  type MenuView,
  getMenuHeader,
  getMenuItemsForView,
} from '../../menu/MenuLogic';
import type { MenuViewModel } from '../../uikit/components/menu';

export const toMenuViewModel = (
  state: GameState | null | undefined,
  view: MenuView,
  callbacks?: MenuCallbacks,
  debugMode?: boolean,
  buildInfo?: { date: string; hash: string } | null,
): MenuViewModel | null => {
  if (!state) return null;

  const items: CanvasMenuItem[] = getMenuItemsForView(
    view,
    state,
    callbacks,
    debugMode,
  );

  let footerText = '';
  if (view === 'main' && buildInfo) {
    footerText = `${buildInfo.date} - ${buildInfo.hash}`;
  }

  return {
    view,
    headerText: getMenuHeader(view),
    items: items.map((item) => ({ id: item.id, label: item.label })),
    footerText,
  };
};
