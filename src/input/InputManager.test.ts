import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InputManager,
  InputAction,
  ACTION_TO_MOVE_DIRECTION,
} from './InputManager';
import * as store from '../store/gameStateStore';

vi.mock('../store/gameStateStore', () => ({
  moveHero: vi.fn(),
  nextTurn: vi.fn(),
  endHeroAction: vi.fn(),
  pickLockAction: vi.fn(),
  searchAction: vi.fn(),
  winLevel: vi.fn(),
}));

describe('InputManager', () => {
  let manager: InputManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new InputManager();
  });

  describe('Key Binding & Mapping', () => {
    it('initializes with default key bindings', () => {
      expect(manager.getActionForKey('w')).toBe(InputAction.MOVE_UP);
      expect(manager.getActionForKey('8')).toBe(InputAction.MOVE_UP);
      expect(manager.getActionForKey('ArrowUp')).toBe(InputAction.MOVE_UP);

      expect(manager.getActionForKey('d')).toBe(InputAction.MOVE_RIGHT);
      expect(manager.getActionForKey('6')).toBe(InputAction.MOVE_RIGHT);

      expect(manager.getActionForKey('s')).toBeUndefined();
      expect(manager.getActionForKey('x')).toBe(InputAction.MOVE_DOWN);
      expect(manager.getActionForKey('a')).toBe(InputAction.MOVE_LEFT);

      expect(manager.getActionForKey(' ')).toBe(InputAction.NEXT_TURN);
      expect(manager.getActionForKey('0')).toBe(InputAction.NEXT_TURN);
      expect(manager.getActionForKey('r')).toBe(InputAction.PICK_LOCK);
      expect(manager.getActionForKey('f')).toBe(InputAction.SEARCH);
      expect(manager.getActionForKey('End')).toBe(InputAction.END_ACTION);
    });

    it('allows binding new keys to actions', () => {
      manager.bindKey(InputAction.MOVE_DOWN, 's');
      expect(manager.getActionForKey('s')).toBe(InputAction.MOVE_DOWN);
    });

    it('allows unbinding keys from specific actions or globally', () => {
      manager.unbindKey('w', InputAction.MOVE_UP);
      expect(manager.getActionForKey('w')).toBeUndefined();
      expect(manager.getActionForKey('8')).toBe(InputAction.MOVE_UP);

      manager.unbindKey('8');
      expect(manager.getActionForKey('8')).toBeUndefined();
    });

    it('allows full custom key bindings and resetting to defaults', () => {
      manager.setKeyBindings({
        [InputAction.MOVE_UP]: ['k'],
        [InputAction.MOVE_DOWN]: ['j'],
      });

      expect(manager.getActionForKey('k')).toBe(InputAction.MOVE_UP);
      expect(manager.getActionForKey('j')).toBe(InputAction.MOVE_DOWN);
      expect(manager.getActionForKey('w')).toBeUndefined();

      manager.resetKeyBindings();
      expect(manager.getActionForKey('w')).toBe(InputAction.MOVE_UP);
    });

    it('provides copy of key bindings via getKeyBindings', () => {
      const bindings = manager.getKeyBindings();
      expect(bindings[InputAction.MOVE_UP]).toContain('w');
      // modifying returned copy should not modify internal bindings
      bindings[InputAction.MOVE_UP] = [];
      expect(manager.getActionForKey('w')).toBe(InputAction.MOVE_UP);
    });
  });

  describe('Action Dispatchers & Execution', () => {
    it('executes registered action handlers when action is triggered', () => {
      const handler = vi.fn();
      const unsubscribe = manager.onAction(InputAction.MOVE_UP, handler);

      const handled = manager.executeAction(InputAction.MOVE_UP);
      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledWith(InputAction.MOVE_UP);

      unsubscribe();
      handler.mockClear();
      manager.executeAction(InputAction.MOVE_UP);
      expect(handler).not.toHaveBeenCalled();
    });

    it('clears action handlers correctly', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      manager.onAction(InputAction.MOVE_UP, handler1);
      manager.onAction(InputAction.MOVE_DOWN, handler2);

      manager.clearActionHandlers(InputAction.MOVE_UP);
      manager.executeAction(InputAction.MOVE_UP);
      manager.executeAction(InputAction.MOVE_DOWN);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      manager.clearActionHandlers();
      manager.executeAction(InputAction.MOVE_DOWN);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('triggers default store dispatchers for each InputAction', () => {
      manager.executeAction(InputAction.MOVE_UP);
      expect(store.moveHero).toHaveBeenCalledWith('U');

      manager.executeAction(InputAction.MOVE_DOWN);
      expect(store.moveHero).toHaveBeenCalledWith('D');

      manager.executeAction(InputAction.MOVE_LEFT);
      expect(store.moveHero).toHaveBeenCalledWith('L');

      manager.executeAction(InputAction.MOVE_RIGHT);
      expect(store.moveHero).toHaveBeenCalledWith('R');

      manager.executeAction(InputAction.MOVE_UP_LEFT);
      expect(store.moveHero).toHaveBeenCalledWith('UL');

      manager.executeAction(InputAction.MOVE_UP_RIGHT);
      expect(store.moveHero).toHaveBeenCalledWith('UR');

      manager.executeAction(InputAction.MOVE_DOWN_LEFT);
      expect(store.moveHero).toHaveBeenCalledWith('DL');

      manager.executeAction(InputAction.MOVE_DOWN_RIGHT);
      expect(store.moveHero).toHaveBeenCalledWith('DR');

      manager.executeAction(InputAction.NEXT_TURN);
      expect(store.nextTurn).toHaveBeenCalled();

      manager.executeAction(InputAction.END_ACTION);
      expect(store.endHeroAction).toHaveBeenCalled();

      manager.executeAction(InputAction.PICK_LOCK);
      expect(store.pickLockAction).toHaveBeenCalled();

      manager.executeAction(InputAction.SEARCH);
      expect(store.searchAction).toHaveBeenCalled();

      manager.executeAction(InputAction.WIN_LEVEL);
      expect(store.winLevel).toHaveBeenCalled();
    });

    it('verifies ACTION_TO_MOVE_DIRECTION lookup map', () => {
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_UP]).toBe('U');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_DOWN]).toBe('D');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_LEFT]).toBe('L');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_RIGHT]).toBe('R');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_UP_LEFT]).toBe('UL');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_UP_RIGHT]).toBe('UR');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_DOWN_LEFT]).toBe('DL');
      expect(ACTION_TO_MOVE_DIRECTION[InputAction.MOVE_DOWN_RIGHT]).toBe('DR');
    });
  });

  describe('Keyboard Event Handling', () => {
    it('handles keydown events and calls preventDefault for bound keys', () => {
      const preventDefault = vi.fn();
      const event = {
        key: 'w',
        target: null,
        preventDefault,
      } as unknown as KeyboardEvent;

      const handled = manager.handleKeyDown(event);
      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(store.moveHero).toHaveBeenCalledWith('U');
    });

    it('ignores unbound keys without calling preventDefault', () => {
      const preventDefault = vi.fn();
      const event = {
        key: 'F12',
        target: null,
        preventDefault,
      } as unknown as KeyboardEvent;

      const handled = manager.handleKeyDown(event);
      expect(handled).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('ignores keydown events when target is an input or textarea', () => {
      const preventDefault = vi.fn();
      const inputEl = { tagName: 'INPUT' } as HTMLElement;
      const event = {
        key: 'w',
        target: inputEl,
        preventDefault,
      } as unknown as KeyboardEvent;

      const handled = manager.handleKeyDown(event);
      expect(handled).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(store.moveHero).not.toHaveBeenCalled();
    });

    it('does not process key events when disabled', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);

      const preventDefault = vi.fn();
      const event = {
        key: 'w',
        target: null,
        preventDefault,
      } as unknown as KeyboardEvent;

      const handled = manager.handleKeyDown(event);
      expect(handled).toBe(false);
      expect(store.moveHero).not.toHaveBeenCalled();
    });
  });

  describe('Touch Gesture Handling', () => {
    it('detects swipe right and dispatches MOVE_RIGHT', () => {
      const preventDefault = vi.fn();
      const startEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent;

      const endEvent = {
        changedTouches: [{ clientX: 180, clientY: 105 }],
        preventDefault,
      } as unknown as TouchEvent;

      manager.handleTouchStart(startEvent);
      const handled = manager.handleTouchEnd(endEvent);

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(store.moveHero).toHaveBeenCalledWith('R');
    });

    it('detects swipe left, up, and down gestures', () => {
      // Swipe left
      manager.handleTouchStart({
        touches: [{ clientX: 200, clientY: 100 }],
      } as unknown as TouchEvent);
      let handled = manager.handleTouchEnd({
        changedTouches: [{ clientX: 120, clientY: 100 }],
      } as unknown as TouchEvent);
      expect(handled).toBe(true);
      expect(store.moveHero).toHaveBeenCalledWith('L');

      // Swipe up
      manager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as TouchEvent);
      handled = manager.handleTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 120 }],
      } as unknown as TouchEvent);
      expect(handled).toBe(true);
      expect(store.moveHero).toHaveBeenCalledWith('U');

      // Swipe down
      manager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);
      handled = manager.handleTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 180 }],
      } as unknown as TouchEvent);
      expect(handled).toBe(true);
      expect(store.moveHero).toHaveBeenCalledWith('D');
    });

    it('ignores small touches below minSwipeDistance', () => {
      manager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);
      const handled = manager.handleTouchEnd({
        changedTouches: [{ clientX: 110, clientY: 105 }],
      } as unknown as TouchEvent);

      expect(handled).toBe(false);
      expect(store.moveHero).not.toHaveBeenCalled();
    });

    it('supports diagonal swipe detection when configured', () => {
      manager.setGestureConfig({ enableDiagonals: true });
      expect(manager.getGestureConfig().enableDiagonals).toBe(true);

      // Down-Right swipe (45 degrees)
      manager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);
      const handled = manager.handleTouchEnd({
        changedTouches: [{ clientX: 160, clientY: 160 }],
      } as unknown as TouchEvent);

      expect(handled).toBe(true);
      expect(store.moveHero).toHaveBeenCalledWith('DR');
    });
  });

  describe('Lifecycle (Attach / Detach)', () => {
    it('attaches and detaches keyboard listeners on target', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      const mockTarget = {
        addEventListener,
        removeEventListener,
      } as unknown as EventTarget;

      manager.attach(mockTarget);
      expect(addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );

      manager.detach();
      expect(removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
    });

    it('attaches and detaches gesture listeners on element', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      const mockElement = {
        addEventListener,
        removeEventListener,
      } as unknown as HTMLElement;

      manager.attachGestures(mockElement);
      expect(addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: false },
      );

      manager.detachGestures();
      expect(removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
      );
      expect(removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
      );
    });
  });
});
