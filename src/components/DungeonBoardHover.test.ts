import { describe, expect, it } from 'vitest';
import type { Hero } from '../types';
import {
  clearBoardHovers,
  createBoardHoverState,
  updateBetweenDungeonsHover,
  updateDiaryHover,
  updateDungeonIntroHover,
  updateEventCardHover,
  updateHeroCardsHover,
  updateMenuHover,
  updateMonsterCardsHover,
  updateTopBarHover,
} from './DungeonBoardHover';

const hero = (name: string): Hero =>
  ({
    name,
    health: 7,
    position: { x: 0, y: 0 },
  }) as unknown as Hero;

describe('between-dungeons hover', () => {
  it('hovers the action button with a pointer cursor and reports the change', () => {
    const hover = createBoardHoverState();
    const result = updateBetweenDungeonsHover(hover, {
      type: 'actionButton',
    });
    expect(hover.isBdActionHovered).toBe(true);
    expect(result.cursor).toBe('pointer');
    expect(result.changed).toBe(true);
  });

  it('is idempotent while the pointer stays on the same element', () => {
    const hover = createBoardHoverState();
    updateBetweenDungeonsHover(hover, { type: 'actionButton' });
    const result = updateBetweenDungeonsHover(hover, {
      type: 'actionButton',
    });
    expect(result.changed).toBe(false);
  });

  it('tracks the hovered trade item and the give-item target', () => {
    const hover = createBoardHoverState();
    updateBetweenDungeonsHover(hover, {
      type: 'item',
      heroIndex: 1,
      slot: 'weapon',
      itemIndex: 2,
    });
    expect(hover.hoveredBdItem).toEqual({ heroIndex: 1, itemIndex: 2 });
    const result = updateBetweenDungeonsHover(hover, {
      type: 'giveItem',
      targetHeroIndex: 3,
    });
    expect(hover.hoveredBdItem).toBeNull();
    expect(hover.hoveredBdGiveHeroIndex).toBe(3);
    expect(result.cursor).toBe('pointer');
  });

  it('tracks the hovered party-wipe option and clears it again', () => {
    const hover = createBoardHoverState();
    const result = updateBetweenDungeonsHover(hover, {
      type: 'wipeButton',
      action: 'restartDungeon',
    });
    expect(hover.hoveredBdWipeAction).toBe('restartDungeon');
    expect(result.cursor).toBe('pointer');

    const cleared = updateBetweenDungeonsHover(hover, null);
    expect(hover.hoveredBdWipeAction).toBeNull();
    expect(cleared.cursor).toBe('default');
    expect(cleared.changed).toBe(true);
  });

  it('clears every flag when the pointer is over empty overlay space', () => {
    const hover = createBoardHoverState();
    updateBetweenDungeonsHover(hover, { type: 'secondaryButton' });
    const result = updateBetweenDungeonsHover(hover, null);
    expect(hover.isBdSecondaryHovered).toBe(false);
    expect(result.cursor).toBe('default');
    expect(result.changed).toBe(true);
  });
});

describe('dungeon intro hover', () => {
  it('clears other UI hovers and tracks the close button', () => {
    const hover = createBoardHoverState();
    hover.isMenuHovered = true;
    hover.isDebugHovered = true;
    hover.isLogHovered = true;
    hover.hoveredInventoryHeroName = 'Fearik';
    hover.hoveredCloseHeroName = 'Fearik';
    hover.hoveredUseItem = { heroName: 'Fearik', itemIndex: 0 };
    hover.isEventCardToggleHovered = true;
    hover.hoveredRadialIndex = 2;

    const result = updateDungeonIntroHover(hover, { type: 'close' });

    expect(hover.isMenuHovered).toBe(false);
    expect(hover.isDebugHovered).toBe(false);
    expect(hover.isLogHovered).toBe(false);
    expect(hover.hoveredInventoryHeroName).toBeNull();
    expect(hover.hoveredCloseHeroName).toBeNull();
    expect(hover.hoveredUseItem).toBeNull();
    expect(hover.isEventCardToggleHovered).toBe(false);
    expect(hover.hoveredRadialIndex).toBeNull();
    expect(hover.isDungeonIntroCloseHovered).toBe(true);
    expect(result.cursor).toBe('pointer');
    expect(result.changed).toBe(true);
  });

  it('shows the default cursor over the backdrop', () => {
    const hover = createBoardHoverState();
    const result = updateDungeonIntroHover(hover, { type: 'backdrop' });
    expect(hover.isDungeonIntroCloseHovered).toBe(false);
    expect(result.cursor).toBe('default');
  });
});

describe('top bar hover', () => {
  it.each(['menu', 'debug', 'log'] as const)(
    'hovers the %s button with a pointer cursor and resets the others',
    (element) => {
      const hover = createBoardHoverState();
      const result = updateTopBarHover(hover, element, false);
      expect(result.cursor).toBe('pointer');
      expect(result.changed).toBe(true);
      expect(
        element === 'menu' ? hover.isMenuHovered : !hover.isMenuHovered,
      ).toBe(true);
      expect(
        element === 'debug' ? hover.isDebugHovered : !hover.isDebugHovered,
      ).toBe(true);
      expect(element === 'log' ? hover.isLogHovered : !hover.isLogHovered).toBe(
        true,
      );
    },
  );

  it('only hovers the log dropdown while the log is open', () => {
    const closed = createBoardHoverState();
    expect(updateTopBarHover(closed, 'logDropdown', false).cursor).toBe(
      'default',
    );
    expect(closed.isLogHovered).toBe(false);

    const open = createBoardHoverState();
    const result = updateTopBarHover(open, 'logDropdown', true);
    expect(result.cursor).toBe('pointer');
    expect(open.isLogHovered).toBe(true);
  });

  it('clears the menu hover for non-interactive elements', () => {
    const hover = createBoardHoverState();
    hover.isMenuHovered = true;
    const result = updateTopBarHover(hover, 'turn', false);
    expect(result.cursor).toBe('default');
    expect(hover.isMenuHovered).toBe(false);
  });
});

describe('canvas menu hover', () => {
  it('tracks the hovered menu item and clears card hovers', () => {
    const hover = createBoardHoverState();
    hover.hoveredInventoryHeroName = 'Fearik';
    hover.hoveredRadialIndex = 1;

    const result = updateMenuHover(hover, {
      type: 'item',
      item: { id: 'debug', label: 'Debug', onClick: () => undefined },
    });

    expect(hover.hoveredMenuItemId).toBe('debug');
    expect(hover.hoveredInventoryHeroName).toBeNull();
    expect(hover.hoveredRadialIndex).toBeNull();
    expect(result.cursor).toBe('pointer');
  });

  it('shows the default cursor over the backdrop and clears the item', () => {
    const hover = createBoardHoverState();
    hover.hoveredMenuItemId = 'debug';
    const result = updateMenuHover(hover, { type: 'backdrop' });
    expect(hover.hoveredMenuItemId).toBeNull();
    expect(result.cursor).toBe('default');
  });
});

describe('hero cards hover', () => {
  it('tracks the hovered inventory button', () => {
    const hover = createBoardHoverState();
    const result = updateHeroCardsHover(hover, {
      type: 'inventoryButton',
      hero: hero('Fearik'),
    });
    expect(hover.hoveredInventoryHeroName).toBe('Fearik');
    expect(result.cursor).toBe('pointer');
  });

  it('tracks the hovered use-item button by hero and item index', () => {
    const hover = createBoardHoverState();
    hover.hoveredInventoryHeroName = 'Fearik';
    const result = updateHeroCardsHover(hover, {
      type: 'inventoryUseItem',
      hero: hero('Helbran'),
      item: {} as never,
      itemIndex: 3,
    });
    expect(hover.hoveredInventoryHeroName).toBeNull();
    expect(hover.hoveredUseItem).toEqual({ heroName: 'Helbran', itemIndex: 3 });
    expect(result.cursor).toBe('pointer');
    expect(result.changed).toBe(true);
  });

  it('shows the default cursor over the card body without clearing flags on re-hover', () => {
    const hover = createBoardHoverState();
    const result = updateHeroCardsHover(hover, {
      type: 'card',
      hero: hero('Fearik'),
    });
    expect(result.cursor).toBe('default');
    expect(result.changed).toBe(false);
  });
});

describe('monster cards and diary hover', () => {
  it('monster cards clear the standard hovers but keep the event card toggle', () => {
    const hover = createBoardHoverState();
    hover.isMenuHovered = true;
    hover.isEventCardToggleHovered = true;
    hover.hoveredRadialIndex = 0;
    const result = updateMonsterCardsHover(hover);
    expect(hover.isMenuHovered).toBe(false);
    expect(hover.hoveredRadialIndex).toBeNull();
    expect(hover.isEventCardToggleHovered).toBe(true);
    expect(result.cursor).toBe('default');
  });

  it('the diary also clears the event card toggle', () => {
    const hover = createBoardHoverState();
    hover.isEventCardToggleHovered = true;
    const result = updateDiaryHover(hover);
    expect(hover.isEventCardToggleHovered).toBe(false);
    expect(result.changed).toBe(true);
  });
});

describe('event card hover', () => {
  it('tracks the toggle button with a pointer cursor', () => {
    const hover = createBoardHoverState();
    const result = updateEventCardHover(hover, { type: 'toggle' });
    expect(hover.isEventCardToggleHovered).toBe(true);
    expect(result.cursor).toBe('pointer');
  });

  it('clears the toggle hover off the toggle button', () => {
    const hover = createBoardHoverState();
    hover.isEventCardToggleHovered = true;
    const result = updateEventCardHover(hover, { type: 'card' });
    expect(hover.isEventCardToggleHovered).toBe(false);
    expect(result.cursor).toBe('default');
    expect(result.changed).toBe(true);
  });
});

describe('clearBoardHovers', () => {
  it('clears every hover flag and reports the change', () => {
    const hover = createBoardHoverState();
    hover.hoveredRadialIndex = 1;
    hover.isMenuHovered = true;
    hover.isDebugHovered = true;
    hover.isLogHovered = true;
    hover.isDungeonIntroCloseHovered = true;
    hover.hoveredMenuItemId = 'x';
    hover.hoveredInventoryHeroName = 'Fearik';
    hover.hoveredCloseHeroName = 'Fearik';
    hover.hoveredUseItem = { heroName: 'Fearik', itemIndex: 0 };
    hover.isEventCardToggleHovered = true;

    expect(clearBoardHovers(hover, { radial: true })).toBe(true);
    expect(hover).toEqual(createBoardHoverState());
  });

  it('leaves the radial index alone when not asked to clear it', () => {
    const hover = createBoardHoverState();
    hover.hoveredRadialIndex = 1;
    expect(clearBoardHovers(hover, { radial: false })).toBe(false);
    expect(hover.hoveredRadialIndex).toBe(1);
  });

  it('reports no change for a clean state', () => {
    expect(clearBoardHovers(createBoardHoverState(), { radial: true })).toBe(
      false,
    );
  });
});
