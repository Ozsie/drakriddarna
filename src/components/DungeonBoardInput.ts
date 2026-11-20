export type PointerDownRoute =
  'welcome' | 'openLog' | 'consumeUi' | 'pan' | 'ignore';

export const resolvePointerDownRoute = (input: {
  isWelcomePhase: boolean;
  button: number;
  canInspectUi: boolean;
  uiHit: 'log' | 'other' | null;
}): PointerDownRoute => {
  if (input.isWelcomePhase) return 'welcome';
  if (input.button === 0 && input.canInspectUi) {
    if (input.uiHit === 'log') return 'openLog';
    if (input.uiHit === 'other') return 'consumeUi';
  }
  return input.button === 1 || input.button === 2 ? 'pan' : 'ignore';
};

export type ClickRoute = 'ignore' | 'welcome' | 'ui' | 'radial' | 'board';

export const resolveClickRoute = (input: {
  hasMovedDuringDrag: boolean;
  button: number;
  isWelcomePhase: boolean;
  hasUiHit: boolean;
  hasRadialMenu: boolean;
  hasUiCanvas: boolean;
}): ClickRoute => {
  if (input.hasMovedDuringDrag || input.button !== 0) return 'ignore';
  if (input.isWelcomePhase) return 'welcome';
  if (input.hasUiHit) return 'ui';
  if (input.hasRadialMenu && input.hasUiCanvas) return 'radial';
  return 'board';
};

export type WheelRoute = 'welcome' | 'board';

export const resolveWheelRoute = (isWelcomePhase: boolean): WheelRoute =>
  isWelcomePhase ? 'welcome' : 'board';

export type BoardKeyAction =
  'closeRadialMenu' | 'closeHeroStatus' | 'zoomIn' | 'zoomOut';

export const resolveBoardKeyActions = (key: string): BoardKeyAction[] => {
  if (key === 'Escape') return ['closeRadialMenu', 'closeHeroStatus'];
  if (key === '+' || key === '=') return ['zoomIn'];
  if (key === '-' || key === '_') return ['zoomOut'];
  return [];
};
