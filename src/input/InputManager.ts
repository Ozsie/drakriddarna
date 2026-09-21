import { browser } from '$app/environment';
import {
  moveHero,
  nextTurn,
  endHeroAction,
  pickLockAction,
  searchAction,
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
  WIN_LEVEL = 'WIN_LEVEL',
}

export type ActionHandler = (action: InputAction) => void;

export type KeyBindingMap = Record<InputAction, string[]>;

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
  [InputAction.WIN_LEVEL]: [],
};

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  minSwipeDistance: 30,
  maxSwipeTime: 600,
  enableDiagonals: false,
};

export class InputManager {
  private keyBindings: KeyBindingMap;
  private actionHandlers: Map<InputAction, Set<ActionHandler>> = new Map();
  private enabled = true;
  private attachedTarget: EventTarget | null = null;
  private gestureElement: HTMLElement | null = null;
  private touchStartPos: TouchPosition | null = null;
  private gestureConfig: GestureConfig;

  constructor(
    customBindings?: Partial<KeyBindingMap>,
    customGestureConfig?: Partial<GestureConfig>,
  ) {
    this.keyBindings = this.cloneBindings({
      ...DEFAULT_KEY_BINDINGS,
      ...customBindings,
    });
    this.gestureConfig = {
      ...DEFAULT_GESTURE_CONFIG,
      ...customGestureConfig,
    };
    this.registerDefaultDispatchers();
  }

  private cloneBindings(bindings: KeyBindingMap): KeyBindingMap {
    const clone = {} as KeyBindingMap;
    for (const action of Object.values(InputAction)) {
      clone[action] = bindings[action] ? [...bindings[action]] : [];
    }
    return clone;
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
    this.onAction(InputAction.NEXT_TURN, () => nextTurn());
    this.onAction(InputAction.END_ACTION, () => endHeroAction());
    this.onAction(InputAction.PICK_LOCK, () => pickLockAction());
    this.onAction(InputAction.SEARCH, () => searchAction());
    this.onAction(InputAction.WIN_LEVEL, () => winLevel());
  }

  /**
   * Subscribes a handler to an input action. Returns an unsubscribe function.
   */
  public onAction(action: InputAction, handler: ActionHandler): () => void {
    if (!this.actionHandlers.has(action)) {
      this.actionHandlers.set(action, new Set());
    }
    const handlers = this.actionHandlers.get(action)!;
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  /**
   * Removes all handlers for a specific action, or all actions if not specified.
   */
  public clearActionHandlers(action?: InputAction): void {
    if (action) {
      this.actionHandlers.delete(action);
    } else {
      this.actionHandlers.clear();
    }
  }

  /**
   * Executes all registered handlers for the given action.
   */
  public executeAction(action: InputAction): boolean {
    if (!this.enabled) return false;
    const handlers = this.actionHandlers.get(action);
    if (!handlers || handlers.size === 0) return false;
    handlers.forEach((handler) => {
      try {
        handler(action);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error executing action handler for ${action}:`, err);
      }
    });
    return true;
  }

  /**
   * Rebinds an action to a new set of keys or adds keys to an action.
   */
  public bindKey(action: InputAction, key: string): void {
    if (!this.keyBindings[action]) {
      this.keyBindings[action] = [];
    }
    if (!this.keyBindings[action].includes(key)) {
      this.keyBindings[action].push(key);
    }
  }

  /**
   * Unbinds a key from all actions or a specific action.
   */
  public unbindKey(key: string, action?: InputAction): void {
    if (action) {
      if (this.keyBindings[action]) {
        this.keyBindings[action] = this.keyBindings[action].filter(
          (k) => k !== key,
        );
      }
    } else {
      for (const act of Object.values(InputAction)) {
        if (this.keyBindings[act]) {
          this.keyBindings[act] = this.keyBindings[act].filter(
            (k) => k !== key,
          );
        }
      }
    }
  }

  /**
   * Sets the full key binding configuration.
   */
  public setKeyBindings(bindings: Partial<KeyBindingMap>): void {
    for (const [action, keys] of Object.entries(bindings)) {
      if (action in InputAction && Array.isArray(keys)) {
        this.keyBindings[action as InputAction] = [...keys];
      }
    }
  }

  /**
   * Gets current key bindings.
   */
  public getKeyBindings(): KeyBindingMap {
    return this.cloneBindings(this.keyBindings);
  }

  /**
   * Resets key bindings to default.
   */
  public resetKeyBindings(): void {
    this.keyBindings = this.cloneBindings(DEFAULT_KEY_BINDINGS);
  }

  /**
   * Finds the action bound to a given key string.
   */
  public getActionForKey(key: string): InputAction | undefined {
    for (const [action, keys] of Object.entries(this.keyBindings)) {
      if (keys.includes(key)) {
        return action as InputAction;
      }
    }
    return undefined;
  }

  /**
   * Handles keyboard event. Returns true if the key was intercepted and handled.
   */
  public handleKeyDown = (event: KeyboardEvent): boolean => {
    if (!this.enabled) return false;

    // Ignore key presses inside text inputs or textareas
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return false;
    }

    const action = this.getActionForKey(event.key);
    if (action) {
      event.preventDefault?.();
      return this.executeAction(action);
    }
    return false;
  };

  /**
   * Touch / Gesture Handlers
   */
  public handleTouchStart = (event: TouchEvent): void => {
    if (!this.enabled || event.touches.length === 0) return;
    const touch = event.touches[0];
    this.touchStartPos = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  public handleTouchEnd = (event: TouchEvent): boolean => {
    if (
      !this.enabled ||
      !this.touchStartPos ||
      event.changedTouches.length === 0
    ) {
      this.touchStartPos = null;
      return false;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStartPos.x;
    const dy = touch.clientY - this.touchStartPos.y;
    const elapsed = Date.now() - this.touchStartPos.time;
    this.touchStartPos = null;

    if (elapsed > this.gestureConfig.maxSwipeTime) return false;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.gestureConfig.minSwipeDistance) return false;

    let action: InputAction | null = null;

    if (this.gestureConfig.enableDiagonals) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180 to 180
      if (angle >= -22.5 && angle < 22.5) action = InputAction.MOVE_RIGHT;
      else if (angle >= 22.5 && angle < 67.5)
        action = InputAction.MOVE_DOWN_RIGHT;
      else if (angle >= 67.5 && angle < 112.5) action = InputAction.MOVE_DOWN;
      else if (angle >= 112.5 && angle < 157.5)
        action = InputAction.MOVE_DOWN_LEFT;
      else if (angle >= -67.5 && angle < -22.5)
        action = InputAction.MOVE_UP_RIGHT;
      else if (angle >= -112.5 && angle < -67.5) action = InputAction.MOVE_UP;
      else if (angle >= -157.5 && angle < -112.5)
        action = InputAction.MOVE_UP_LEFT;
      else action = InputAction.MOVE_LEFT;
    } else {
      if (absDx > absDy) {
        action = dx > 0 ? InputAction.MOVE_RIGHT : InputAction.MOVE_LEFT;
      } else {
        action = dy > 0 ? InputAction.MOVE_DOWN : InputAction.MOVE_UP;
      }
    }

    if (action) {
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
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
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
