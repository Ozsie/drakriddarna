import { describe, expect, it } from 'vitest';
import {
  resolveBoardKeyActions,
  resolveClickRoute,
  resolvePointerDownRoute,
  resolveWheelRoute,
} from './DungeonBoardInput';

describe('DungeonBoardInput', () => {
  it('prioritizes welcome and UI routes over pointer panning', () => {
    expect(
      resolvePointerDownRoute({
        isWelcomePhase: true,
        button: 2,
        canInspectUi: true,
        uiHit: 'log',
      }),
    ).toBe('welcome');
    expect(
      resolvePointerDownRoute({
        isWelcomePhase: false,
        button: 0,
        canInspectUi: true,
        uiHit: 'log',
      }),
    ).toBe('openLog');
    expect(
      resolvePointerDownRoute({
        isWelcomePhase: false,
        button: 0,
        canInspectUi: true,
        uiHit: 'other',
      }),
    ).toBe('consumeUi');
    expect(
      resolvePointerDownRoute({
        isWelcomePhase: false,
        button: 2,
        canInspectUi: true,
        uiHit: 'other',
      }),
    ).toBe('pan');
  });

  it('prioritizes drag suppression, welcome, UI hits and radial menus for clicks', () => {
    const baseInput = {
      hasMovedDuringDrag: false,
      button: 0,
      isWelcomePhase: false,
      hasUiHit: false,
      hasRadialMenu: true,
      hasUiCanvas: true,
    };

    expect(resolveClickRoute({ ...baseInput, hasMovedDuringDrag: true })).toBe(
      'ignore',
    );
    expect(resolveClickRoute({ ...baseInput, button: 2 })).toBe('ignore');
    expect(resolveClickRoute({ ...baseInput, isWelcomePhase: true })).toBe(
      'welcome',
    );
    expect(resolveClickRoute({ ...baseInput, hasUiHit: true })).toBe('ui');
    expect(resolveClickRoute(baseInput)).toBe('radial');
    expect(resolveClickRoute({ ...baseInput, hasRadialMenu: false })).toBe(
      'board',
    );
  });

  it('routes wheel input and maps board keys to actions', () => {
    expect(resolveWheelRoute(true)).toBe('welcome');
    expect(resolveWheelRoute(false)).toBe('board');
    expect(resolveBoardKeyActions('Escape')).toEqual([
      'closeRadialMenu',
      'closeHeroStatus',
    ]);
    expect(resolveBoardKeyActions('+')).toEqual(['zoomIn']);
    expect(resolveBoardKeyActions('=')).toEqual(['zoomIn']);
    expect(resolveBoardKeyActions('-')).toEqual(['zoomOut']);
    expect(resolveBoardKeyActions('_')).toEqual(['zoomOut']);
    expect(resolveBoardKeyActions('a')).toEqual([]);
  });
});
