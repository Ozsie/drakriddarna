import { browser } from '$app/env';
import {
  ActionDispatcher,
  classifySwipe,
  dispatchKeyInput,
  KeyBindings,
  type SwipeDirection,
} from '@hoard-engine/input';
import {
  moveHero,
  nextTurn,
  endHeroAction,
  pickLockAction,
  searchAction,
  interactAction,
  winLevel,
} from '../store/gameStateStore';

export enum InputAction {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  MOVE_UP_LEFT = 'MOVE_UP_LEFT',
  MOVE_UP_RIGHT = 'MOVE_UP_RIGHT',
  MOVE_DOWN_LEFT = 'MOVE_DOWN_LEFT',
  MOVE_DOWN_RIGHT = 'MOVE_DOWN_RIGHT',
  NEXT_TURN = 'NEXT_TURN',
  END_ACTION = 'END_ACTION',
  PICK_LOCK = 'PICK_LOCK',
  SEARCH = 'SEARCH',
  INTERACT = 'INTERACT',
  WIN_LEVEL = 'WIN_LEVEL',
}

export type ActionHandler = (action: InputAction) => void;

export type KeyBindingMap = Record<InputAction, string[]>;

const SWIPE_TO_ACTION: Record<SwipeDirection, InputAction> = {
  up: InputAction.MOVE_UP,
  down: InputAction.MOVE_DOWN,
  left: InputAction.MOVE_LEFT,
  right: InputAction.MOVE_RIGHT,
  'up-left': InputAction.MOVE_UP_LEFT,
  'up-right': InputAction.MOVE_UP_RIGHT,
  'down-left': InputAction.MOVE_DOWN_LEFT,
  'down-right': InputAction.MOVE_DOWN_RIGHT,
};

export interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export interface GestureConfig {
  minSwipeDistance: number;
  maxSwipeTime: number;
  enableDiagonals: boolean;
}

export const ACTION_TO_MOVE_DIRECTION: Partial<Record<InputAction, string>> = {
  [InputAction.MOVE_UP]: 'U',
  [InputAction.MOVE_DOWN]: 'D',
  [InputAction.MOVE_LEFT]: 'L',
  [InputAction.MOVE_RIGHT]: 'R',
  [InputAction.MOVE_UP_LEFT]: 'UL',
  [InputAction.MOVE_UP_RIGHT]: 'UR',
  [InputAction.MOVE_DOWN_LEFT]: 'DL',
  [InputAction.MOVE_DOWN_RIGHT]: 'DR',
};

export const DEFAULT_KEY_BINDINGS: KeyBindingMap = {
  [InputAction.MOVE_UP]: ['8', 'w', 'W', 'ArrowUp'],
  [InputAction.MOVE_DOWN]: ['2', 'x', 'X', 'ArrowDown'],
  [InputAction.MOVE_LEFT]: ['4', 'a', 'A', 'ArrowLeft'],
  [InputAction.MOVE_RIGHT]: ['6', 'd', 'D', 'ArrowRight'],
  [InputAction.MOVE_UP_LEFT]: ['7', 'q', 'Q'],
  [InputAction.MOVE_UP_RIGHT]: ['9', 'e', 'E'],
  [InputAction.MOVE_DOWN_LEFT]: ['1', 'z', 'Z'],
  [InputAction.MOVE_DOWN_RIGHT]: ['3', 'c', 'C'],
  [InputAction.NEXT_TURN]: ['0', ' '],
  [InputAction.END_ACTION]: ['End', 'Tab'],
  [InputAction.PICK_LOCK]: ['-', 'r', 'R'],
  [InputAction.SEARCH]: ['+', 'f', 'F'],
  [InputAction.INTERACT]: ['i', 'I'],
  [InputAction.WIN_LEVEL]: [],
};

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  minSwipeDistance: 30,
  maxSwipeTime: 600,
  enableDiagonals: false,
};

export class InputManager {
  private keyBindings: KeyBindings<InputAction>;
  private actionDispatcher: ActionDispatcher<InputAction>;
  private attachedTarget: EventTarget | null = null;
  private gestureElement: HTMLElement | null = null;
  private touchStartPos: TouchPosition | null = null;
  private gestureConfig: GestureConfig;

  constructor(
    customBindings?: Partial<KeyBindingMap>,
    customGestureConfig?: Partial<GestureConfig>,
  ) {
    this.keyBindings = new KeyBindings({
      ...DEFAULT_KEY_BINDINGS,
      ...customBindings,
    });
    this.actionDispatcher = new ActionDispatcher((error, action) =>
      // eslint-disable-next-line no-console
      console.error(`Error executing action handler for ${action}:`, error),
    );
    this.gestureConfig = {
      ...DEFAULT_GESTURE_CONFIG,
      ...customGestureConfig,
    };
    this.registerDefaultDispatchers();
  }

  /**
   * Registers default store action dispatchers for all InputActions.
   */
  public registerDefaultDispatchers(): void {
    this.onAction(InputAction.MOVE_UP, () => moveHero('U'));
    this.onAction(InputAction.MOVE_DOWN, () => moveHero('D'));
    this.onAction(InputAction.MOVE_LEFT, () => moveHero('L'));
    this.onAction(InputAction.MOVE_RIGHT, () => moveHero('R'));
    this.onAction(InputAction.MOVE_UP_LEFT, () => moveHero('UL'));
    this.onAction(InputAction.MOVE_UP_RIGHT, () => moveHero('UR'));
    this.onAction(InputAction.MOVE_DOWN_LEFT, () => moveHero('DL'));
    this.onAction(InputAction.MOVE_DOWN_RIGHT, () => moveHero('DR'));
    this.onAction(InputAction.NEXT_TURN, () => void nextTurn());
    this.onAction(InputAction.END_ACTION, () => void endHeroAction());
    this.onAction(InputAction.PICK_LOCK, () => pickLockAction());
    this.onAction(InputAction.SEARCH, () => searchAction());
    this.onAction(InputAction.INTERACT, () => interactAction());
    this.onAction(InputAction.WIN_LEVEL, () => winLevel());
  }

  /**
   * Subscribes a handler to an input action. Returns an unsubscribe function.
   */
  public onAction(action: InputAction, handler: ActionHandler): () => void {
    return this.actionDispatcher.on(action, handler);
  }

  /**
   * Removes all handlers for a specific action, or all actions if not specified.
   */
  public clearActionHandlers(action?: InputAction): void {
    this.actionDispatcher.clear(action);
  }

  /**
   * Executes all registered handlers for the given action.
   */
  public executeAction(action: InputAction): boolean {
    return this.actionDispatcher.execute(action);
  }

  /**
   * Rebinds an action to a new set of keys or adds keys to an action.
   */
  public bindKey(action: InputAction, key: string): void {
    this.keyBindings.bind(action, key);
  }

  /**
   * Unbinds a key from all actions or a specific action.
   */
  public unbindKey(key: string, action?: InputAction): void {
    this.keyBindings.unbind(key, action);
  }

  /**
   * Sets the full key binding configuration.
   */
  public setKeyBindings(bindings: Partial<KeyBindingMap>): void {
    this.keyBindings.set(bindings);
  }

  /**
   * Gets current key bindings.
   */
  public getKeyBindings(): KeyBindingMap {
    return this.keyBindings.getAll();
  }

  /**
   * Resets key bindings to default.
   */
  public resetKeyBindings(): void {
    this.keyBindings.reset();
  }

  /**
   * Finds the action bound to a given key string.
   */
  public getActionForKey(key: string): InputAction | undefined {
    return this.keyBindings.get(key);
  }

  /**
   * Handles keyboard event. Returns true if the key was intercepted and handled.
   */
  public handleKeyDown = (event: KeyboardEvent): boolean =>
    dispatchKeyInput(event, this.keyBindings, this.actionDispatcher, {
      includeSelect: true,
      includeContentEditable: true,
    });

  /**
   * Touch / Gesture Handlers
   */
  public handleTouchStart = (event: TouchEvent): void => {
    if (!this.actionDispatcher.isEnabled() || event.touches.length !== 1) {
      this.touchStartPos = null;
      return;
    }
    const touch = event.touches[0];
    this.touchStartPos = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  public handleTouchEnd = (event: TouchEvent): boolean => {
    if (
      !this.actionDispatcher.isEnabled() ||
      !this.touchStartPos ||
      event.changedTouches.length === 0 ||
      (event.touches && event.touches.length > 0)
    ) {
      this.touchStartPos = null;
      return false;
    }

    const touch = event.changedTouches[0];
    const direction = classifySwipe(
      this.touchStartPos,
      { x: touch.clientX, y: touch.clientY, time: Date.now() },
      this.gestureConfig,
    );
    this.touchStartPos = null;
    if (direction) {
      const action = SWIPE_TO_ACTION[direction];
      event.preventDefault?.();
      return this.executeAction(action);
    }
    return false;
  };

  /**
   * Attaches keyboard event listener to window or given event target.
   */
  public attach(target?: EventTarget): void {
    if (this.attachedTarget) {
      this.detach();
    }
    const eventTarget = target ?? (browser ? window : null);
    if (eventTarget) {
      eventTarget.addEventListener(
        'keydown',
        this.handleKeyDown as unknown as EventListener,
      );
      this.attachedTarget = eventTarget;
    }
  }

  /**
   * Detaches keyboard listener.
   */
  public detach(): void {
    if (this.attachedTarget) {
      this.attachedTarget.removeEventListener(
        'keydown',
        this.handleKeyDown as unknown as EventListener,
      );
      this.attachedTarget = null;
    }
  }

  /**
   * Attaches touch gesture listeners to an HTML element.
   */
  public attachGestures(element: HTMLElement): void {
    if (this.gestureElement) {
      this.detachGestures();
    }
    this.gestureElement = element;
    element.addEventListener('touchstart', this.handleTouchStart, {
      passive: true,
    });
    element.addEventListener('touchend', this.handleTouchEnd, {
      passive: false,
    });
  }

  /**
   * Detaches touch gesture listeners.
   */
  public detachGestures(): void {
    if (this.gestureElement) {
      this.gestureElement.removeEventListener(
        'touchstart',
        this.handleTouchStart,
      );
      this.gestureElement.removeEventListener('touchend', this.handleTouchEnd);
      this.gestureElement = null;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.actionDispatcher.setEnabled(enabled);
  }

  public isEnabled(): boolean {
    return this.actionDispatcher.isEnabled();
  }

  public setGestureConfig(config: Partial<GestureConfig>): void {
    this.gestureConfig = { ...this.gestureConfig, ...config };
  }

  public getGestureConfig(): GestureConfig {
    return { ...this.gestureConfig };
  }
}

// Global singleton instance for app-wide use
export const inputManager = new InputManager();
