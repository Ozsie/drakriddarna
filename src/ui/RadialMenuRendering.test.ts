import { describe, expect, it, vi } from 'vitest';
import {
  findHoveredRadialButton,
  getRadialButtonPositions,
  RADIAL_MENU_ICONS,
  RADIAL_MENU_LABELS,
  renderRadialMenu,
  renderRadialTooltip,
} from './RadialMenuRendering';
import { renderUI } from './UIRendering';
import { RadialAction, type RadialMenuEntry } from '../hero/RadialMenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import { Side } from '../types';

const createMockCtx = () => {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
};

describe('RadialMenuRendering', () => {
  it('returns empty button list if menu is null or has no entries', () => {
    expect(getRadialButtonPositions(null, 48)).toEqual([]);
    expect(getRadialButtonPositions({ x: 0, y: 0, entries: [] }, 48)).toEqual(
      [],
    );
  });

  it('calculates radial button positions in world space', () => {
    const entries: RadialMenuEntry[] = [
      { action: RadialAction.SEARCH },
      { action: RadialAction.NEXT },
    ];
    const menu: RadialMenuState = { x: 2, y: 3, entries };
    const cellSize = 48;
    const buttons = getRadialButtonPositions(menu, cellSize);

    expect(buttons.length).toBe(2);

    // Center is (2 * 48 + 24, 3 * 48 + 24) = (120, 168)
    // Ring radius = 48 * 1.1 = 52.8
    // Entry 0 angle: -PI/2 (top: cos = 0, sin = -1) -> (120, 168 - 52.8) = (120, 115.2)
    expect(buttons[0].index).toBe(0);
    expect(buttons[0].entry.action).toBe(RadialAction.SEARCH);
    expect(buttons[0].x).toBeCloseTo(120);
    expect(buttons[0].y).toBeCloseTo(115.2);
    expect(buttons[0].icon).toBe(RADIAL_MENU_ICONS[RadialAction.SEARCH]);

    // Entry 1 angle: PI/2 (bottom: cos = 0, sin = 1) -> (120, 168 + 52.8) = (120, 220.8)
    expect(buttons[1].index).toBe(1);
    expect(buttons[1].entry.action).toBe(RadialAction.NEXT);
    expect(buttons[1].x).toBeCloseTo(120);
    expect(buttons[1].y).toBeCloseTo(220.8);
    expect(buttons[1].icon).toBe(RADIAL_MENU_ICONS[RadialAction.NEXT]);
  });

  it('includes door side in label for door actions', () => {
    const entries: RadialMenuEntry[] = [
      {
        action: RadialAction.OPEN_DOOR,
        door: {
          x: 1,
          y: 1,
          side: Side.UP,
          open: false,
          locked: false,
          hidden: false,
          trapped: false,
          trapAttacks: 0,
          reinforced: false,
        },
      },
    ];
    const menu: RadialMenuState = { x: 1, y: 1, entries };
    const buttons = getRadialButtonPositions(menu, 48);

    expect(buttons[0].label).toContain('(Up)');
  });

  it('uses interactable icon and translation key when present', () => {
    const entries: RadialMenuEntry[] = [
      {
        action: RadialAction.INTERACT,
        interactable: {
          position: { x: 1, y: 1 },
          effect: 'customEffect',
          icon: '💎',
          nameTranslationKey: 'custom.interactable.key',
          secret: false,
          interacted: false,
        },
      },
    ];
    const menu: RadialMenuState = { x: 1, y: 1, entries };
    const buttons = getRadialButtonPositions(menu, 48);

    expect(buttons[0].icon).toBe('💎');
    expect(buttons[0].label).toBe('custom.interactable.key');
  });

  it('detects hovered button on hit-test', () => {
    const entries: RadialMenuEntry[] = [
      { action: RadialAction.SEARCH },
      { action: RadialAction.NEXT },
    ];
    const menu: RadialMenuState = { x: 0, y: 0, entries };
    const cellSize = 48;
    const buttons = getRadialButtonPositions(menu, cellSize);

    // Hit exactly on button 0
    const hitBtn0 = findHoveredRadialButton(menu, cellSize, {
      x: buttons[0].x,
      y: buttons[0].y,
    });
    expect(hitBtn0?.index).toBe(0);

    // Hit near button 0 within radius
    const hitNearBtn0 = findHoveredRadialButton(menu, cellSize, {
      x: buttons[0].x + 5,
      y: buttons[0].y + 5,
    });
    expect(hitNearBtn0?.index).toBe(0);

    // Far away point -> no hit
    const miss = findHoveredRadialButton(menu, cellSize, { x: 999, y: 999 });
    expect(miss).toBeUndefined();
  });

  it('renders radial menu buttons and icons to canvas context', () => {
    const entries: RadialMenuEntry[] = [
      { action: RadialAction.SEARCH },
      { action: RadialAction.PICK_LOCK },
    ];
    const menu: RadialMenuState = { x: 1, y: 1, entries };
    const ctx = createMockCtx();

    renderRadialMenu(ctx, 48, menu);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalledTimes(2);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('renders hover state and tooltip for hovered radial button', () => {
    const entries: RadialMenuEntry[] = [
      { action: RadialAction.SEARCH },
      { action: RadialAction.NEXT },
    ];
    const menu: RadialMenuState = { x: 1, y: 1, entries };
    const ctx = createMockCtx();

    renderRadialMenu(ctx, 48, menu, 0);

    // Tooltip draws background rect/roundRect and text
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith(
      RADIAL_MENU_LABELS[RadialAction.SEARCH],
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('renderUI calls renderRadialMenu when menu is provided', () => {
    const entries: RadialMenuEntry[] = [{ action: RadialAction.SEARCH }];
    const menu: RadialMenuState = { x: 1, y: 1, entries };
    const ctx = createMockCtx();

    renderUI(ctx, 48, menu);
    expect(ctx.arc).toHaveBeenCalled();

    const ctxEmpty = createMockCtx();
    renderUI(ctxEmpty, 48, null);
    expect(ctxEmpty.arc).not.toHaveBeenCalled();
  });
});
