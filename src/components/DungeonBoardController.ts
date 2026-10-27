import { get } from 'svelte/store';
import { browser } from '$app/environment';
import actorSprites from '$lib/Dungeon_Character_3.png';
import buildInfo from '$lib/buildInfo.json';
import { locale } from '$lib/translations';
import type { Dungeon, GameState, Hero, Position } from '../types';
import type { MenuView, MenuCallbacks } from '../menu/MenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import { radialMenuStore } from '../store/radialMenuStore';
import {
  gameStateStore,
  handleCanvasClick,
  toggleHeroInventory,
  useHeroItem,
} from '../store/gameStateStore';
import {
  doMouseLogic,
  getCursorType,
  screenToGridPosition,
  screenToWorldPosition,
  executeRadialAction,
} from '../hero/ClickInputLogic';
import { renderHeroes, renderHeroOverlays } from '../hero/HeroRendering';
import { renderMonsters } from '../monsters/MonsterRendering';
import {
  background,
  renderDoors,
  renderFogLightDim,
  renderGrid,
  renderInteractables,
  renderPillars,
  renderPillarTops,
  renderPortal,
  renderRoomFog,
  renderSecrets,
  renderTerrain,
  renderTerrainAnimation,
  renderWalls,
  hasAnimatedTerrainEffects,
  TERRAIN_ANIMATION_STEP_MS,
} from '../dungeon/DungeonRendering';
import {
  activeLights,
  clearLightSpriteCache,
  renderAmbientDarkness,
  renderAnimatedLights,
  renderLights,
  renderStaticLights,
  setLightBlurDisabled,
  staticLightCacheKey,
  animatedLightsSignature,
} from '../dungeon/LightRendering';
import type { LightViewport } from '../dungeon/LightRendering';
import { renderItems } from '../items/ItemRendering';
import {
  renderRadialMenu,
  findHoveredRadialButton,
  renderTopBar,
  renderHeroCards,
  renderMonsterCards,
  renderDiaryAndWinConditions,
  renderEventCard,
  renderMenuModal,
  renderDungeonIntro,
  shouldShowDungeonIntro,
  dismissDungeonIntro,
  renderBetweenDungeons,
  getBetweenDungeonsHit,
  renderDebugPrintout,
  emojiCursor,
} from '../ui/UIRendering';
import {
  setBetweenDungeonsStep,
  selectTradeItem,
  tradeItem,
  completeBetweenDungeonsAndStartNext,
} from '../dungeon/BetweenDungeonsLogic';
import { useItem } from '../items/ItemLogic';
import {
  renderDamageIndicators,
  renderBloodSplatters,
  renderProjectiles,
  renderFlameEffects,
  activeShakes,
  shakeJitter,
} from '../combat';
import { clearTileTextureCache } from '../dungeon/TileTextureCache';
import { clearFogCloudCaches } from '../dungeon/DungeonRendering';
import { hasActiveActorAnimations } from '../core';
import {
  createTouchPanState,
  handleTwoFingerTouchStart,
  handleTwoFingerTouchMove,
  handleTwoFingerTouchEnd,
} from '../input/TouchPanLogic';
import { musicManager, soundEffectManager } from '../audio';
import {
  getStaticSignature,
  getDynamicSignature,
  getOverlaySignature,
} from './DungeonBoardSignatures';
import { findUiHit, type UiHit } from './DungeonBoardUiHit';
import {
  clearBoardHovers,
  createBoardHoverState,
  updateBetweenDungeonsHover,
  updateHoverForUiHit,
  type HoverResult,
} from './DungeonBoardHover';

// Inputs the Svelte component refreshes on every reactive update. The
// controller owns everything else: canvases, the render loop, pan/drag,
// hover state and all pointer/keyboard handling.
export interface DungeonBoardProps {
  /** The externally passed `state` prop, if the board is not store-driven. */
  state: GameState | undefined;
  /** `state ?? $gameStateStore`. */
  activeState: GameState | undefined;
  /** Resolved `activeDebugMode` from the component. */
  debugMode: boolean | undefined;
  dungeon: Dungeon | undefined;
  tileset: string;
  startPosition: Position | undefined;
  /** Assigns a new external `state` (no-op when store-driven). */
  onExternalStateChange: (next: GameState) => void;
}

export class DungeonBoardController {
  // Ambient-only dynamic frames (light effects, terrain, fog) render at
  // most this often; actor-driven frames run at the display's rate.
  static readonly AMBIENT_FRAME_MIN_MS = 1000 / 30;

  // --- props + derived -----------------------------------------------------
  private props: DungeonBoardProps = {
    state: undefined,
    activeState: undefined,
    debugMode: undefined,
    dungeon: undefined,
    tileset: '',
    startPosition: undefined,
    onExternalStateChange: () => {
      // replaced by updateProps
    },
  };

  private get activeState(): GameState | undefined {
    return this.props.activeState;
  }

  private get externalState(): GameState | undefined {
    return this.props.state;
  }

  private get debugMode(): boolean | undefined {
    return this.props.debugMode;
  }

  private get startPosition(): Position | undefined {
    return this.props.startPosition;
  }

  // --- canvases, images, render bookkeeping --------------------------------
  public containerElement: HTMLDivElement | null = null;
  public staticCanvas: HTMLCanvasElement | null = null;
  public actorCanvas: HTMLCanvasElement | null = null;
  public overlayCanvas: HTMLCanvasElement | null = null;
  public uiCanvas: HTMLCanvasElement | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;
  private staticLightCanvas: HTMLCanvasElement | null = null;
  private darknessCanvas: HTMLCanvasElement | null = null;
  private ground: HTMLImageElement | null = null;
  private actors: HTMLImageElement | null = null;
  private mounted = false;
  private containerWidth = 0;
  private containerHeight = 0;
  private lastContainerWidth = 0;
  private lastContainerHeight = 0;
  private cellSize = 48;
  private lastCellSize = 48;
  private totalReRenderCount = 0;
  private staticRenderCount = 0;
  private dynamicRenderCount = 0;
  private lastStaticLightKey = '';
  private lastStaticSignature = '';
  private lastDynamicSignature = '';
  private lastAmbientSignature = '';
  private lastOverlaySignature = '';
  private lastUiSignature = '';
  private overlayAnimationId: number | null = null;
  private dynamicAnimationId: number | null = null;
  private shakeAnimationId: number | null = null;
  private panRenderAnimationId: number | null = null;
  private lastDynamicFrameTs = 0;
  private lastDungeonKey = '';
  private lastTileset = '';
  private lastLocale = '';
  private lastDungeonIntroDungeon: Dungeon | undefined = undefined;
  private lastDungeonIntroName: string | undefined = undefined;

  // --- pan / drag / touch ---------------------------------------------------
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;
  private hasMovedDuringDrag = false;
  private touchPanState = createTouchPanState();
  // Reduced render quality while a pan drag is active: canvases at CSS
  // pixel ratio (1) instead of the device pixel ratio, light glow without
  // its softness blur. Cuts the per-frame fill cost roughly 4x on retina
  // phones; the first frame after the drag ends restores full quality.
  private lowQualityPan = false;

  // --- hover / UI state -----------------------------------------------------
  // The cursor is applied straight onto the ui canvas: the Svelte
  // template cannot react to mutations of controller state, so keeping
  // the style interpolation in sync from the component is not possible.
  private boardCursorValue = 'default';
  private set boardCursor(cursor: string) {
    this.boardCursorValue = cursor;
    if (this.uiCanvas) {
      this.uiCanvas.style.cursor = cursor;
    }
  }
  private hover = createBoardHoverState();
  private isLogHeld = false;
  private isLogOpen = false;
  private isCanvasMenuOpen = false;
  private currentMenuView: MenuView = 'main';
  private isEventCardCollapsed = false;
  private isDungeonIntroDismissed = false;
  private showDungeonIntro = false;

  private menuCallbacks: MenuCallbacks = {
    setView: (view: MenuView) => {
      this.currentMenuView = view;
      this.hover.hoveredMenuItemId = null;
      this.renderUiLayer(true);
    },
    closeMenu: () => {
      this.isCanvasMenuOpen = false;
      this.currentMenuView = 'main';
      this.hover.hoveredMenuItemId = null;
      this.renderUiLayer(true);
    },
    setState: (nextState: GameState) => {
      this.props.onExternalStateChange(nextState);
      this.renderCanvas(true);
    },
  };

  // --- lifecycle + reactive glue --------------------------------------------

  /** Called by the component on every Svelte reactive update. */
  updateProps(props: DungeonBoardProps): void {
    this.props = props;

    // Dungeon change: re-show the intro and re-center the view.
    if (
      props.dungeon !== this.lastDungeonIntroDungeon ||
      props.dungeon?.name !== this.lastDungeonIntroName
    ) {
      this.lastDungeonIntroDungeon = props.dungeon;
      this.lastDungeonIntroName = props.dungeon?.name;
      this.isDungeonIntroDismissed = false;
    }
    this.showDungeonIntro = shouldShowDungeonIntro(
      props.activeState,
      this.isDungeonIntroDismissed,
    );

    if (browser) {
      const isMusicEnabled = props.activeState?.settings?.['music'] !== false;
      const isSoundEnabled =
        props.activeState?.settings?.['sound'] !== false &&
        props.activeState?.settings?.['soundEffects'] !== false;
      musicManager.setMuted(!isMusicEnabled);
      soundEffectManager.setMuted(!isSoundEnabled);
      if (props.dungeon && isMusicEnabled) {
        musicManager.playDungeonMusic(props.dungeon.music);
      }
    }

    if (!this.mounted) return;

    const nextCellSize =
      (props.activeState?.settings?.['cellSize'] as number) ?? 48;
    if (nextCellSize !== this.lastCellSize) {
      this.cellSize = nextCellSize;
      this.lastCellSize = nextCellSize;
      clearTileTextureCache();
      const ratio = this.canvasRatio;
      this.initCanvas(
        this.staticCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.actorCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.lightCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.staticLightCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.darknessCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.overlayCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.uiCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.renderCanvas(true);
    } else {
      this.cellSize = nextCellSize;
    }

    if (props.activeState && props.debugMode !== undefined) {
      this.renderCanvas(false);
    }

    const dungeonKey = props.dungeon
      ? `${String(String(String(props.dungeon.name)))}|${String(
          props.startPosition?.x,
        )},${String(String(String(props.startPosition?.y)))}`
      : '';
    if (dungeonKey !== this.lastDungeonKey) {
      this.lastDungeonKey = dungeonKey;
      this.panX = 0;
      this.panY = 0;
      this.updateAllCanvasTransforms();
      this.renderCanvas(true);
    }

    if (this.ground && props.tileset && props.tileset !== this.lastTileset) {
      this.lastTileset = props.tileset;
      clearTileTextureCache();
      this.ground.src = props.tileset;
    }
  }

  /** Called by the component when the bound container size changes. */
  setContainerSize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    if (!this.mounted) return;
    if (
      width !== this.lastContainerWidth ||
      height !== this.lastContainerHeight
    ) {
      this.lastContainerWidth = width;
      this.lastContainerHeight = height;
      const ratio = this.canvasRatio;
      this.initCanvas(this.staticCanvas, width, height, ratio);
      this.initCanvas(this.actorCanvas, width, height, ratio);
      this.initCanvas(this.lightCanvas, width, height, ratio);
      this.initCanvas(this.staticLightCanvas, width, height, ratio);
      this.initCanvas(this.darknessCanvas, width, height, ratio);
      this.initCanvas(this.overlayCanvas, width, height, ratio);
      this.initCanvas(this.uiCanvas, width, height, ratio);
      this.renderCanvas(true);
    }
  }

  /** Called by the component when the radial menu store changes. */
  onRadialMenuChange(menu: RadialMenuState | null | undefined): void {
    if (this.mounted && menu !== undefined) {
      this.renderUiLayer(true);
    }
  }

  /** Called by the component when the locale changes. */
  onLocaleChange(next: string): void {
    if (this.mounted && next && next !== this.lastLocale) {
      this.lastLocale = next;
      this.renderCanvas(true);
    }
  }

  mount(): void {
    this.mounted = true;
    // Apply the cursor now that the canvas elements are bound.
    this.boardCursor = this.boardCursorValue;
    this.ground = new Image();
    this.actors = new Image();
    // Offscreen canvas for the light mask: same size and world transform
    // as the actor canvas, never attached to the DOM. Holds the lights
    // for one frame, composited onto the scene and reused to punch the
    // darkness veil.
    this.lightCanvas = document.createElement('canvas');
    // Offscreen canvas for the cached static light layer: the static
    // lights are redrawn into it only when their cache key changes, and
    // copied into the light mask every frame.
    this.staticLightCanvas = document.createElement('canvas');
    // Offscreen canvas for the ambient darkness veil: same size and world
    // transform as the actor canvas, never attached to the DOM.
    this.darknessCanvas = document.createElement('canvas');

    if (browser) {
      window.addEventListener('mousemove', this.onWindowMouseMove);
      window.addEventListener('mouseup', this.onWindowMouseUp);
      window.addEventListener('touchmove', this.onTouchMove, {
        passive: false,
      });
      window.addEventListener('touchend', this.onTouchEnd);
      window.addEventListener('touchcancel', this.onTouchCancel);
      window.addEventListener('keydown', this.onWindowKeyDown);
    }

    const ratio = this.canvasRatio;
    if (this.containerWidth && this.containerHeight) {
      this.initCanvas(
        this.staticCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.actorCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.lightCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.staticLightCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.darknessCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.overlayCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
      this.initCanvas(
        this.uiCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
      );
    }

    this.ground.onload = () => {
      this.renderStaticLayer(true);
    };
    this.actors.onload = () => {
      this.renderDynamicLayer(true);
      this.renderOverlayLayer(true);
    };

    this.ground.src = this.props.tileset;
    this.lastTileset = this.props.tileset;
    this.actors.src = actorSprites;

    if (this.isReady(this.ground)) {
      this.renderStaticLayer(true);
    }
    if (this.isReady(this.actors)) {
      this.renderDynamicLayer(true);
      this.renderOverlayLayer(true);
    }
    this.renderUiLayer(true);
  }

  destroy(): void {
    if (browser) {
      window.removeEventListener('mousemove', this.onWindowMouseMove);
      window.removeEventListener('mouseup', this.onWindowMouseUp);
      window.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('touchcancel', this.onTouchCancel);
      window.removeEventListener('keydown', this.onWindowKeyDown);
      musicManager.stop();
      soundEffectManager.stop();
    }
    if (this.overlayAnimationId) {
      cancelAnimationFrame(this.overlayAnimationId);
      this.overlayAnimationId = null;
    }
    if (this.dynamicAnimationId) {
      cancelAnimationFrame(this.dynamicAnimationId);
      this.dynamicAnimationId = null;
    }
    if (this.shakeAnimationId) {
      cancelAnimationFrame(this.shakeAnimationId);
      this.shakeAnimationId = null;
    }
    if (this.panRenderAnimationId !== null) {
      cancelAnimationFrame(this.panRenderAnimationId);
      this.panRenderAnimationId = null;
    }
    clearFogCloudCaches();
    clearLightSpriteCache();
    setLightBlurDisabled(false);
  }

  private isReady = (img: HTMLImageElement | null): boolean =>
    !!img && img.complete && img.naturalWidth > 0;

  // The device pixel ratio the canvases are sized at — except while a pan
  // drag is active, when everything renders at CSS pixel ratio instead.
  private get canvasRatio(): number {
    return (browser && !this.lowQualityPan && window.devicePixelRatio) || 1;
  }

  // Re-sizes every canvas to the current ratio. Resizing clears the
  // canvases, so the static light layer's cache key is invalidated too —
  // it is the one cached layer with no force path, redrawn only when its
  // key changes.
  private reinitCanvases = () => {
    if (!this.containerWidth || !this.containerHeight) return;
    const ratio = this.canvasRatio;
    const width = this.containerWidth;
    const height = this.containerHeight;
    for (const canvas of [
      this.staticCanvas,
      this.actorCanvas,
      this.lightCanvas,
      this.staticLightCanvas,
      this.darknessCanvas,
      this.overlayCanvas,
      this.uiCanvas,
    ]) {
      this.initCanvas(canvas, width, height, ratio);
    }
    this.lastStaticLightKey = '';
  };

  // Switches to reduced quality on the first actual pan movement of a
  // drag (not on press: a click-and-hold without movement stays sharp).
  // The resize clears every canvas, so one full low-quality redraw is
  // forced right away; the pan frame scheduled right after renders into
  // the low-quality surfaces.
  private enterLowQualityPan = () => {
    if (this.lowQualityPan) return;
    this.lowQualityPan = true;
    setLightBlurDisabled(true);
    this.reinitCanvases();
    this.renderCanvas(true);
  };

  // Restores full quality when the drag ends. A pan frame may still be
  // pending; it is cancelled so the full-quality redraw below is the one
  // that lands.
  private exitLowQualityPan = () => {
    if (!this.lowQualityPan) return;
    this.lowQualityPan = false;
    setLightBlurDisabled(false);
    if (this.panRenderAnimationId !== null) {
      cancelAnimationFrame(this.panRenderAnimationId);
      this.panRenderAnimationId = null;
    }
    this.reinitCanvases();
    this.renderCanvas(true);
  };

  // Pan moves can arrive far faster than the display refreshes, so the
  // handlers only update panX/panY and coalesce the repaint into a single
  // requestAnimationFrame; the browser shows one frame either way.
  private schedulePanRender = () => {
    if (this.panRenderAnimationId !== null) return;
    this.enterLowQualityPan();
    this.panRenderAnimationId = requestAnimationFrame(() => {
      this.panRenderAnimationId = null;
      this.updateAllCanvasTransforms();
      this.renderStaticLayer(true);
      this.renderDynamicLayer(true);
      this.renderOverlayLayer(true);
      // Everything on the UI canvas is anchored to the screen — top bar,
      // hero cards, log, modals — except the radial menu, which is drawn
      // in world coordinates and must follow the pan. So the HUD layer is
      // repainted only when its signature changed; an open radial menu is
      // the one case that forces a repositioning repaint.
      this.renderUiLayer(!!get(radialMenuStore));
      this.updateShake();
    });
  };

  private updateAllCanvasTransforms = () => {
    if (!this.containerWidth || !this.containerHeight) return;
    const ratio = this.canvasRatio;
    const centerOffsetX = this.startPosition
      ? (this.startPosition.x + 0.5) * this.cellSize
      : 0;
    const centerOffsetY = this.startPosition
      ? (this.startPosition.y + 0.5) * this.cellSize
      : 0;
    for (const canvas of [
      this.staticCanvas,
      this.actorCanvas,
      this.lightCanvas,
      this.staticLightCanvas,
      this.darknessCanvas,
      this.overlayCanvas,
      this.uiCanvas,
    ]) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            ratio * (this.containerWidth / 2 + this.panX - centerOffsetX),
            ratio * (this.containerHeight / 2 + this.panY - centerOffsetY),
          );
        }
      }
    }
  };

  private renderStaticLayer = (force = false) => {
    if (!this.activeState || !browser || !this.ground || !this.staticCanvas)
      return;
    if (!this.isReady(this.ground)) return;
    const sig = getStaticSignature(
      this.activeState,
      this.debugMode ?? false,
      this.cellSize,
    );
    if (!force && sig === this.lastStaticSignature) return;
    this.lastStaticSignature = sig;

    const ctx = this.staticCanvas.getContext('2d');
    if (!ctx) return;

    this.staticRenderCount++;
    this.totalReRenderCount++;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.restore();

    const gridCols = this.activeState.dungeon?.layout?.grid?.[0]?.length ?? 40;
    const gridRows = this.activeState.dungeon?.layout?.grid?.length ?? 30;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, this.cellSize * gridCols, this.cellSize * gridRows);
    renderGrid(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderTerrain(
      ctx,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderSecrets(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderItems(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderInteractables(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderWalls(ctx, this.cellSize, this.activeState, this.debugMode ?? false);
    renderDoors(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderPillars(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
    );
    renderPortal(ctx, this.cellSize, this.activeState, this.debugMode ?? false);
  };

  private renderDynamicLayer = (force = false) => {
    if (!this.activeState || !browser || !this.actors || !this.actorCanvas)
      return;
    if (!this.isReady(this.actors)) return;
    const currentTime = Date.now();
    this.lastDynamicFrameTs = performance.now();
    const debugMode = this.debugMode ?? false;
    // The visible part of the world, in cells: lights whose glow cannot
    // reach it are culled from rendering and animation alike.
    const centerOffsetX = this.startPosition
      ? (this.startPosition.x + 0.5) * this.cellSize
      : 0;
    const centerOffsetY = this.startPosition
      ? (this.startPosition.y + 0.5) * this.cellSize
      : 0;
    const lightViewport: LightViewport = {
      x: (centerOffsetX - this.panX - this.containerWidth / 2) / this.cellSize,
      y: (centerOffsetY - this.panY - this.containerHeight / 2) / this.cellSize,
      width: this.containerWidth / this.cellSize,
      height: this.containerHeight / this.cellSize,
    };
    const hasActiveAnimations = hasActiveActorAnimations();
    // Light effects (pulse, flicker, sweep, blink, sway) animate while any
    // light animates within the viewport. The active light list is
    // computed once per frame and shared by every lighting call below.
    const frameLights = activeLights(this.activeState, currentTime);
    // Quantized animation state of the visible lights: two renders with
    // the same signature paint identical light output, so the dynamic
    // layer repaints only when it changes — a flickering brazier
    // repaints about 8 times per second instead of every frame.
    const lightSig = animatedLightsSignature(
      this.activeState,
      debugMode,
      currentTime,
      lightViewport,
      frameLights,
    );
    const hasLightEffects = lightSig !== '';
    // Animated terrain overlays (water shimmer, lava pulse) and room fog
    // change their output slowly, so their animation state is stepped by
    // time instead of quantized per effect.
    const hasTerrainEffects = hasAnimatedTerrainEffects(
      this.activeState,
      debugMode,
      lightViewport,
    );
    const ambientSig =
      hasLightEffects || hasTerrainEffects
        ? `${lightSig}|${
            hasTerrainEffects
              ? Math.floor(currentTime / TERRAIN_ANIMATION_STEP_MS)
              : ''
          }`
        : '';
    const sig = getDynamicSignature(
      this.activeState,
      this.debugMode ?? false,
      this.cellSize,
    );
    if (
      !force &&
      !hasActiveAnimations &&
      !hasLightEffects &&
      !hasTerrainEffects &&
      sig === this.lastDynamicSignature
    )
      return;
    // Ambient repaint gate: when only ambient effects animate and the
    // game state is unchanged, the quantized signature tells whether the
    // painted frame is still current. Skipping the repaint keeps the
    // existing frame; the loop keeps ticking while anything animates.
    if (
      force &&
      !hasActiveAnimations &&
      (hasLightEffects || hasTerrainEffects) &&
      ambientSig === this.lastAmbientSignature &&
      sig === this.lastDynamicSignature
    ) {
      if (this.dynamicAnimationId) {
        cancelAnimationFrame(this.dynamicAnimationId);
      }
      this.scheduleDynamicFrame(false);
      return;
    }
    this.lastAmbientSignature = ambientSig;
    this.lastDynamicSignature = sig;

    const ctx = this.actorCanvas.getContext('2d');
    if (!ctx) return;

    this.dynamicRenderCount++;
    this.totalReRenderCount++;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.actorCanvas.width, this.actorCanvas.height);
    ctx.restore();

    // Lights render into their own offscreen mask, which is composited
    // onto the scene here and then reused to punch the ambient darkness
    // veil: one set of pixels drives both, so the visible glow and the
    // darkness hole can never drift apart. Static lights live in a
    // cached layer redrawn only when their cache key changes (occlusion
    // this.externalState, lights themselves, or the view); per frame only the
    // animating lights are drawn.
    const lightCtx = this.lightCanvas?.getContext('2d') ?? null;
    if (lightCtx && this.lightCanvas) {
      lightCtx.save();
      lightCtx.setTransform(1, 0, 0, 1, 0, 0);
      lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
      lightCtx.restore();
      if (this.staticLightCanvas) {
        const staticKey = staticLightCacheKey(
          this.activeState,
          this.cellSize,
          debugMode,
          lightViewport,
          frameLights,
        );
        if (staticKey !== this.lastStaticLightKey) {
          this.lastStaticLightKey = staticKey;
          const staticCtx = this.staticLightCanvas.getContext('2d');
          if (staticCtx) {
            staticCtx.save();
            staticCtx.setTransform(1, 0, 0, 1, 0, 0);
            staticCtx.clearRect(
              0,
              0,
              this.staticLightCanvas.width,
              this.staticLightCanvas.height,
            );
            staticCtx.restore();
            renderStaticLights(
              staticCtx,
              this.cellSize,
              this.activeState,
              debugMode,
              lightViewport,
              frameLights,
            );
          }
        }
        // Copy the cached static layer in device space; the light ctx is
        // back on the world transform for drawing the animated lights.
        lightCtx.save();
        lightCtx.setTransform(1, 0, 0, 1, 0, 0);
        lightCtx.drawImage(this.staticLightCanvas, 0, 0);
        lightCtx.restore();
        renderAnimatedLights(
          lightCtx,
          this.cellSize,
          this.activeState,
          debugMode,
          currentTime,
          lightViewport,
          frameLights,
        );
      } else {
        renderLights(
          lightCtx,
          this.cellSize,
          this.activeState,
          debugMode,
          currentTime,
          lightViewport,
          frameLights,
        );
      }
      // Fog absorbs part of the light mask inside fogged rooms, so the
      // composited glow dims and the darkness veil closes in there. The
      // light ctx is on the world transform here.
      renderFogLightDim(
        lightCtx,
        this.cellSize,
        this.activeState,
        debugMode,
        lightViewport,
      );
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.lightCanvas, 0, 0);
      ctx.restore();
    } else {
      renderLights(
        ctx,
        this.cellSize,
        this.activeState,
        debugMode,
        currentTime,
        lightViewport,
        frameLights,
      );
      renderFogLightDim(
        ctx,
        this.cellSize,
        this.activeState,
        debugMode,
        lightViewport,
      );
    }

    // Animated terrain material (water shimmer, lava pulse) sits above the
    // lit scene but below the actors, so figures wading stand on top of it.
    renderTerrainAnimation(
      ctx,
      this.cellSize,
      this.activeState,
      debugMode,
      currentTime,
      lightViewport,
    );

    const hasActiveMonsters = renderMonsters(
      ctx,
      this.actors,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
      currentTime,
    );
    const hasActiveHeroes = renderHeroes(
      ctx,
      this.actors,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
      currentTime,
    );

    // Pillar shafts rise over the cell behind them: drawn after the this.actors
    // so figures standing north of a pillar are occluded by its height,
    // and before the darkness veil so unlit shafts darken with the scene.
    if (this.ground) {
      renderPillarTops(
        ctx,
        this.ground,
        this.cellSize,
        this.activeState,
        debugMode,
      );
    }

    // Room fog drifts above the actors and pillar shafts, but below the
    // darkness veil so unlit fog darkens with the room.
    renderRoomFog(
      ctx,
      this.cellSize,
      this.activeState,
      debugMode,
      currentTime,
      lightViewport,
    );

    if (this.darknessCanvas && this.lightCanvas) {
      renderAmbientDarkness(
        ctx,
        this.darknessCanvas,
        this.lightCanvas,
        this.activeState,
      );
    }

    // The hero turn UI (walkable outline, reticule, colour bar, health
    // bar, action and step markers) is drawn above the lights and the
    // darkness veil, so it stays fully visible even on unlit cells.
    renderHeroOverlays(ctx, this.cellSize, this.activeState, currentTime);

    if (this.dynamicAnimationId) {
      cancelAnimationFrame(this.dynamicAnimationId);
      this.dynamicAnimationId = null;
    }

    if (
      hasActiveMonsters ||
      hasActiveHeroes ||
      hasLightEffects ||
      hasTerrainEffects ||
      hasActiveActorAnimations(currentTime)
    ) {
      // Actor movement keeps the full frame rate; ambient effects
      // (flickering torches, water, fog) render at half rate, halving
      // the continuous CPU cost of an animated dungeon.
      const fullRate =
        hasActiveMonsters ||
        hasActiveHeroes ||
        hasActiveActorAnimations(currentTime);
      this.scheduleDynamicFrame(fullRate);
    }
  };

  // Schedules the next dynamic-layer frame. Ambient-only frames are
  // throttled to AMBIENT_FRAME_MIN_MS: the rAF keeps ticking at full rate
  // but only renders when enough time has passed, so light effects stay
  // smooth enough while the heavy per-frame work (ray casting, blur
  // blits, full-canvas composites) runs at half frequency.
  private scheduleDynamicFrame = (fullRate: boolean): void => {
    this.dynamicAnimationId = requestAnimationFrame(() => {
      const now = performance.now();
      if (
        !fullRate &&
        now - this.lastDynamicFrameTs <
          DungeonBoardController.AMBIENT_FRAME_MIN_MS
      ) {
        this.scheduleDynamicFrame(false);
        return;
      }
      this.renderDynamicLayer(true);
    });
  };

  private renderOverlayLayer = (force = false) => {
    if (!this.activeState || !browser || !this.actors || !this.overlayCanvas)
      return;
    if (!this.isReady(this.actors)) return;
    const hasDamageIndicators =
      (this.activeState.damageIndicators?.length ?? 0) > 0;
    const hasBloodSplatters =
      (this.activeState.bloodSplatters?.length ?? 0) > 0;
    const hasProjectiles = (this.activeState.projectiles?.length ?? 0) > 0;
    const hasFlameEffects = (this.activeState.flameEffects?.length ?? 0) > 0;
    const hasOverlayEffects =
      hasDamageIndicators ||
      hasBloodSplatters ||
      hasProjectiles ||
      hasFlameEffects;
    const sig = getOverlaySignature(
      this.activeState,
      this.debugMode ?? false,
      this.cellSize,
    );
    if (
      !force &&
      !hasOverlayEffects &&
      sig === this.lastOverlaySignature &&
      !this.debugMode
    )
      return;
    this.lastOverlaySignature = sig;

    const ctx = this.overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    ctx.restore();

    const now = Date.now();
    const hasActiveProjectiles = renderProjectiles(
      ctx,
      this.cellSize,
      this.activeState,
      now,
    );
    const hasActiveBlood = renderBloodSplatters(
      ctx,
      this.cellSize,
      this.activeState,
      now,
    );
    const hasActiveDamage = renderDamageIndicators(
      ctx,
      this.cellSize,
      this.activeState,
      now,
    );
    const hasActiveFlames = renderFlameEffects(
      ctx,
      this.cellSize,
      this.activeState,
      now,
    );
    const hasActiveEffects =
      hasActiveProjectiles ||
      hasActiveBlood ||
      hasActiveDamage ||
      hasActiveFlames;

    if (this.debugMode) {
      renderDebugPrintout(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          totalReRenders: this.totalReRenderCount,
          staticReRenders: this.staticRenderCount,
          dynamicReRenders: this.dynamicRenderCount,
        },
      );
    }

    if (this.overlayAnimationId) {
      cancelAnimationFrame(this.overlayAnimationId);
      this.overlayAnimationId = null;
    }

    if (hasActiveEffects) {
      this.overlayAnimationId = requestAnimationFrame(() => {
        this.renderOverlayLayer(true);
      });
    } else {
      let stateChanged = false;
      if (hasDamageIndicators) {
        this.activeState.damageIndicators = [];
        stateChanged = true;
      }
      if (hasBloodSplatters) {
        this.activeState.bloodSplatters = [];
        stateChanged = true;
      }
      if (hasProjectiles) {
        this.activeState.projectiles = [];
        stateChanged = true;
      }
      if (hasFlameEffects) {
        this.activeState.flameEffects = [];
        stateChanged = true;
      }
      if (stateChanged && !this.externalState) {
        gameStateStore.set(this.activeState);
      }
    }
  };

  private renderUiLayer = (force = false) => {
    if (!browser || !this.uiCanvas) return;
    const menu = get(radialMenuStore);
    const recentLogs = this.activeState?.actionLog?.slice(0, 8);
    const logSig = recentLogs
      ? recentLogs
          .map(
            (l) =>
              `${String(String(String(l.turn)))}:${String(
                String(String(l.key)),
              )}`,
          )
          .join(';')
      : '';
    const heroesSig = this.activeState?.heroes
      ? (this.activeState.heroes as Hero[])
          .map(
            (h) =>
              `${String(String(String(h.name)))}:${String(
                String(String(h.health)),
              )}:${String(h.actions)}:${String(
                String(String(h.movement)),
              )}:${String(String(h.isInventoryOpen))}:${String(
                String(h.experience),
              )}:${String(String(h.inventory?.length))}`,
          )
          .join(';')
      : '';
    const monstersSig = (this.activeState?.dungeon?.layout?.monsters ?? [])
      .map(
        (m) =>
          `${String(String(String(m.name)))}:${String(
            String(String(m.health)),
          )}:${String(m.position.x)},${String(String(String(m.position.y)))}`,
      )
      .join(';');
    const roomsSig = (this.activeState?.dungeon?.discoveredRooms ?? []).join(
      ',',
    );
    const hoverSig = `${String(
      String(this.hover.hoveredInventoryHeroName),
    )}:${String(String(this.hover.hoveredCloseHeroName))}:${String(
      String(this.hover.hoveredUseItem?.heroName),
    )}-${String(String(this.hover.hoveredUseItem?.itemIndex))}`;
    const targetSig = `${String(
      String(this.activeState?.targetActor?.name),
    )}:${String(String(this.activeState?.currentActor?.name))}`;
    const winSig = `${String(
      String(String(this.activeState?.dungeon?.killCount)),
    )}:${(this.activeState?.dungeon?.winConditions ?? [])
      .map((w) => `${String(String(String(w.fulfilled)))}`)
      .join(',')}`;
    const diarySig = `${(this.activeState?.dungeon?.layout?.notes ?? [])
      .filter((n) => n.found)
      .map(
        (n) =>
          `${String(String(String(n.id)))}:${String(
            String(String(n.foundOn)),
          )}`,
      )
      .join(',')}`;
    const eventSig = `${String(
      String(this.activeState?.currentEvent?.id ?? ''),
    )}:${(this.activeState?.eventDeck ?? [])
      .map(
        (e) =>
          `${String(String(String(e.number)))}-${String(
            String(String(e.used)),
          )}`,
      )
      .join(',')}:${String(String(String(this.isEventCardCollapsed)))}:${String(
      this.hover.isEventCardToggleHovered,
    )}`;
    const introSig = `${String(String(String(this.showDungeonIntro)))}:${String(
      this.hover.isDungeonIntroCloseHovered,
    )}:${String(String(String(this.activeState?.dungeon?.intro ?? '')))}`;
    const currentDebug = this.debugMode;
    const menuSig = `${String(String(String(this.isCanvasMenuOpen)))}:${String(
      this.currentMenuView,
    )}:${String(String(this.hover.hoveredMenuItemId))}:${String(
      String(currentDebug),
    )}:${String(String(get(locale)))}:${String(
      this.activeState?.settings?.['locale'],
    )}:${String(String(this.activeState?.gameMaster?.id))}:${String(
      this.activeState?.dungeon?.beaten,
    )}:${String(String(this.activeState?.settings?.['music']))}`;
    const sig = `${String(String(String(menu?.x)))},${String(
      String(String(menu?.y)),
    )},${String(menu?.entries?.length ?? 0)},${String(
      String(this.hover.hoveredRadialIndex),
    )},${String(String(this.cellSize))},${String(
      String(this.containerWidth),
    )},${String(String(this.containerHeight))},${String(
      String(this.activeState?.turnCount),
    )},${String(String(logSig))},${String(
      String(this.hover.isMenuHovered),
    )},${String(String(this.hover.isDebugHovered))},${String(
      String(this.hover.isLogHovered),
    )},${String(String(this.isLogOpen))},${String(String(heroesSig))},${String(
      String(monstersSig),
    )},${String(String(String(roomsSig)))},${String(
      String(String(hoverSig)),
    )},${String(targetSig)},${String(String(String(winSig)))},${String(
      String(String(diarySig)),
    )},${String(String(eventSig))},${String(String(introSig))},${String(
      String(String(menuSig)),
    )}`;
    if (!force && sig === this.lastUiSignature) return;
    this.lastUiSignature = sig;

    const ctx = this.uiCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    ctx.restore();

    if (
      this.containerWidth > 0 &&
      this.containerHeight > 0 &&
      this.activeState
    ) {
      const ratio = this.canvasRatio;
      ctx.save();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderTopBar(ctx, this.containerWidth, this.activeState, {
        isMenuHovered: this.hover.isMenuHovered,
        isDebugHovered: this.hover.isDebugHovered,
        isLogHovered: this.hover.isLogHovered,
        isLogOpen: this.isLogOpen,
        debugMode: currentDebug,
      });
      renderHeroCards(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          hoveredInventoryHeroName: this.hover.hoveredInventoryHeroName,
          hoveredCloseHeroName: this.hover.hoveredCloseHeroName,
          hoveredUseItem: this.hover.hoveredUseItem,
        },
      );
      renderMonsterCards(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
      );
      renderDiaryAndWinConditions(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
      );
      renderEventCard(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          isCollapsed: this.isEventCardCollapsed,
          isToggleHovered: this.hover.isEventCardToggleHovered,
        },
      );
      if (this.isCanvasMenuOpen) {
        renderMenuModal(
          ctx,
          this.containerWidth,
          this.containerHeight,
          this.activeState,
          {
            view: this.currentMenuView,
            hoveredItemId: this.hover.hoveredMenuItemId,
            buildInfo,
            debugMode: currentDebug,
            callbacks: this.menuCallbacks,
          },
        );
      }
      if (this.showDungeonIntro) {
        renderDungeonIntro(
          ctx,
          this.containerWidth,
          this.containerHeight,
          this.activeState,
          {
            dismissed: this.isDungeonIntroDismissed,
            isCloseHovered: this.hover.isDungeonIntroCloseHovered,
          },
        );
      }
      if (this.activeState.betweenDungeons) {
        renderBetweenDungeons(
          ctx,
          this.containerWidth,
          this.containerHeight,
          this.activeState,
          {
            hoveredAction: this.hover.isBdActionHovered,
            hoveredSecondary: this.hover.isBdSecondaryHovered,
            hoveredItem: this.hover.hoveredBdItem,
            hoveredGiveHeroIndex: this.hover.hoveredBdGiveHeroIndex,
          },
        );
      }
      ctx.restore();
    }

    if (menu) {
      renderRadialMenu(ctx, this.cellSize, menu, this.hover.hoveredRadialIndex);
    }
  };

  private renderCanvas = (force = false) => {
    this.renderStaticLayer(force);
    this.renderDynamicLayer(force);
    this.renderOverlayLayer(force);
    this.renderUiLayer(force);
    this.updateShake();
  };

  // Screen shakes: a per-frame CSS translate on the world canvases
  // (static, actors, overlays), never the UI canvas, so the cached static
  // layer is never redrawn for a shake. The loop self-schedules while a
  // shake is active and prunes expired effects when it ends — the same
  // pattern the overlay layer uses for blood and flames.
  private updateShake = () => {
    if (!browser || !this.activeState) return;
    const now = Date.now();
    const shakes = this.activeState.shakeEffects ?? [];
    const active = activeShakes(shakes, now);
    const worldCanvases = [
      this.staticCanvas,
      this.actorCanvas,
      this.overlayCanvas,
    ];

    if (active.length > 0) {
      // The view centre in cells, matching the light viewport maths.
      const centerOffsetX = this.startPosition
        ? (this.startPosition.x + 0.5) * this.cellSize
        : 0;
      const centerOffsetY = this.startPosition
        ? (this.startPosition.y + 0.5) * this.cellSize
        : 0;
      const viewCenter = {
        x:
          (centerOffsetX - this.panX - this.containerWidth / 2) /
            this.cellSize +
          this.containerWidth / (2 * this.cellSize),
        y:
          (centerOffsetY - this.panY - this.containerHeight / 2) /
            this.cellSize +
          this.containerHeight / (2 * this.cellSize),
      };
      const jitter = shakeJitter(active, viewCenter, now);
      const transform = `translate(${jitter.x.toFixed(2)}px, ${jitter.y.toFixed(
        2,
      )}px)`;
      worldCanvases.forEach(
        (canvas) => canvas && (canvas.style.transform = transform),
      );
      if (this.shakeAnimationId) {
        cancelAnimationFrame(this.shakeAnimationId);
      }
      this.shakeAnimationId = requestAnimationFrame(() => this.updateShake());
    } else {
      if (this.shakeAnimationId) {
        this.shakeAnimationId = null;
        worldCanvases.forEach(
          (canvas) => canvas && (canvas.style.transform = ''),
        );
      }
      // Prune expired shakes from the state, mirroring the overlay
      // layer's cleanup of blood and flame effects.
      if (shakes.length > 0) {
        this.activeState.shakeEffects = [];
        if (!this.externalState) {
          gameStateStore.set(this.activeState);
        }
      }
    }
  };

  private initCanvas = (
    canvas: HTMLCanvasElement | null,
    width: number,
    height: number,
    ratio: number,
  ) => {
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${String(String(String(width)))}px`;
    canvas.style.height = `${String(String(String(height)))}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const centerOffsetX = this.startPosition
        ? (this.startPosition.x + 0.5) * this.cellSize
        : 0;
      const centerOffsetY = this.startPosition
        ? (this.startPosition.y + 0.5) * this.cellSize
        : 0;
      ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        ratio * (width / 2 + this.panX - centerOffsetX),
        ratio * (height / 2 + this.panY - centerOffsetY),
      );
    }
  };

  private onWindowMouseMove = (event: MouseEvent) => {
    if (this.isDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMovedDuringDrag = true;
      }
      this.panX = this.dragStartPanX + dx;
      this.panY = this.dragStartPanY + dy;
      this.schedulePanRender();
    }
  };

  private onWindowMouseUp = () => {
    if (this.isLogHeld || this.isLogOpen) {
      this.isLogHeld = false;
      this.isLogOpen = false;
      this.renderUiLayer(true);
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.exitLowQualityPan();
      if (this.hasMovedDuringDrag) {
        setTimeout(() => {
          this.hasMovedDuringDrag = false;
        }, 50);
      }
    }
  };

  public onTouchStart = (event: TouchEvent) => {
    const started = handleTwoFingerTouchStart(
      event.touches,
      { x: this.panX, y: this.panY },
      this.touchPanState,
    );
    if (started) {
      this.hasMovedDuringDrag = false;
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  };

  public onTouchMove = (event: TouchEvent) => {
    const result = handleTwoFingerTouchMove(event.touches, this.touchPanState);
    if (result) {
      this.panX = result.panX;
      this.panY = result.panY;
      if (result.moved) {
        this.hasMovedDuringDrag = true;
      }
      this.schedulePanRender();
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  };

  public onTouchEnd = (event: TouchEvent) => {
    const result = handleTwoFingerTouchEnd(event.touches, this.touchPanState, {
      x: this.panX,
      y: this.panY,
    });
    if (result.shouldEnd) {
      this.exitLowQualityPan();
      if (this.hasMovedDuringDrag) {
        setTimeout(() => {
          this.hasMovedDuringDrag = false;
        }, 50);
      }
    }
  };

  public onTouchCancel = () => {
    this.touchPanState.isDragging = false;
    this.exitLowQualityPan();
    if (this.hasMovedDuringDrag) {
      setTimeout(() => {
        this.hasMovedDuringDrag = false;
      }, 50);
    }
  };
  private onWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && get(radialMenuStore)) {
      radialMenuStore.set(null);
      this.hover.hoveredRadialIndex = null;
      this.renderUiLayer(true);
    }
  };
  // --- UI input helpers ------------------------------------------------------

  /** First UI element under the given board pixel, in cascade order. */
  private uiHitAt(
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D | null,
  ): UiHit | null {
    if (!this.activeState) return null;
    return findUiHit({
      viewWidth: this.containerWidth,
      viewHeight: this.containerHeight,
      state: this.activeState,
      x,
      y,
      ctx,
      showDungeonIntro: this.showDungeonIntro,
      dungeonIntroDismissed: this.isDungeonIntroDismissed,
      isLogOpen: this.isLogOpen,
      debugMode: this.debugMode,
      isCanvasMenuOpen: this.isCanvasMenuOpen,
      menuView: this.currentMenuView,
      menuCallbacks: this.menuCallbacks,
      buildInfo,
      eventCardCollapsed: this.isEventCardCollapsed,
    });
  }

  /** Publishes the active state to the store unless externally controlled. */
  private syncStore(): void {
    if (!this.externalState && this.activeState) {
      gameStateStore.set(this.activeState);
    }
  }

  /** Applies a hover transition: cursor and conditional UI re-render. */
  private applyHover(result: HoverResult): void {
    if (result.cursor) {
      this.boardCursor = result.cursor;
    }
    if (result.changed) {
      this.renderUiLayer(true);
    }
  }

  public onMouseDown = (event: MouseEvent) => {
    if (
      event.button === 0 &&
      this.uiCanvas &&
      this.activeState &&
      this.containerWidth > 0 &&
      this.containerHeight > 0
    ) {
      const rect = this.uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const ctx = this.uiCanvas.getContext('2d');
      const hit = this.uiHitAt(screenX, screenY, ctx);
      if (
        hit?.kind === 'topBar' &&
        (hit.hit === 'log' || hit.hit === 'logDropdown')
      ) {
        this.isLogHeld = true;
        this.isLogOpen = true;
        this.renderUiLayer(true);
        return;
      }
      // Any other UI element under the pointer swallows the press.
      if (hit) {
        return;
      }
    }

    if (event.button === 2 || event.button === 1) {
      this.isDragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.dragStartPanX = this.panX;
      this.dragStartPanY = this.panY;
      this.hasMovedDuringDrag = false;
      event.preventDefault();
    }
  };

  public onClick = (event: MouseEvent) => {
    if (this.hasMovedDuringDrag) {
      this.hasMovedDuringDrag = false;
      return;
    }
    if (event.button !== 0) return;

    if (
      this.uiCanvas &&
      this.activeState &&
      this.containerWidth > 0 &&
      this.containerHeight > 0
    ) {
      const rect = this.uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const ctx = this.uiCanvas.getContext('2d');
      const hit = this.uiHitAt(screenX, screenY, ctx);
      const activeState = this.activeState;

      if (hit?.kind === 'betweenDungeons' && activeState.betweenDungeons) {
        const bdHit = hit.hit;
        if (bdHit.type === 'actionButton') {
          soundEffectManager.playButtonClick();
          if (activeState.betweenDungeons.step === 'levelUp') {
            setBetweenDungeonsStep(activeState, 'trade');
          } else {
            completeBetweenDungeonsAndStartNext(activeState);
            if (activeState.dungeon?.startingPositions?.[0]) {
              this.panX = 0;
              this.panY = 0;
              this.updateAllCanvasTransforms();
            }
          }
          this.syncStore();
          this.renderCanvas(true);
        } else if (bdHit.type === 'secondaryButton') {
          soundEffectManager.playButtonClick();
          setBetweenDungeonsStep(activeState, 'levelUp');
          this.syncStore();
          this.renderUiLayer(true);
        } else if (bdHit.type === 'item') {
          soundEffectManager.playButtonClick();
          selectTradeItem(
            activeState,
            bdHit.heroIndex,
            bdHit.slot ?? bdHit.itemIndex,
          );
          this.syncStore();
          this.renderUiLayer(true);
        } else if (bdHit.type === 'giveItem') {
          if (activeState.betweenDungeons.selectedTradeItem) {
            tradeItem(
              activeState,
              activeState.betweenDungeons.selectedTradeItem.heroIndex,
              bdHit.targetHeroIndex,
              activeState.betweenDungeons.selectedTradeItem.slot ??
                activeState.betweenDungeons.selectedTradeItem.itemIndex,
            );
            this.syncStore();
            this.renderUiLayer(true);
          }
        }
        return;
      }

      if (hit?.kind === 'dungeonIntro') {
        const introHit = hit.hit;
        if (introHit.type === 'close' || introHit.type === 'backdrop') {
          dismissDungeonIntro(activeState);
          this.isDungeonIntroDismissed = true;
          this.hover.isDungeonIntroCloseHovered = false;
          this.syncStore();
          this.renderUiLayer(true);
        }
        return;
      }

      if (hit?.kind === 'topBar') {
        const topBarHit = hit.hit;
        if (topBarHit === 'menu') {
          soundEffectManager.playButtonClick();
          if (this.isCanvasMenuOpen && this.currentMenuView === 'main') {
            this.isCanvasMenuOpen = false;
          } else {
            this.isCanvasMenuOpen = true;
            this.currentMenuView = 'main';
          }
          this.hover.hoveredMenuItemId = null;
          this.renderUiLayer(true);
          return;
        }
        if (topBarHit === 'debug') {
          soundEffectManager.playButtonClick();
          if (this.isCanvasMenuOpen && this.currentMenuView === 'debug') {
            this.isCanvasMenuOpen = false;
          } else {
            this.isCanvasMenuOpen = true;
            this.currentMenuView = 'debug';
          }
          this.hover.hoveredMenuItemId = null;
          this.renderUiLayer(true);
          return;
        }
        return;
      }

      if (hit?.kind === 'menu') {
        const menuHit = hit.hit;
        if (menuHit.type === 'item' && menuHit.item) {
          soundEffectManager.playButtonClick();
          menuHit.item.onClick(activeState);
          this.renderCanvas(true);
        } else if (menuHit.type === 'backdrop') {
          this.isCanvasMenuOpen = false;
          this.currentMenuView = 'main';
          this.hover.hoveredMenuItemId = null;
          this.renderUiLayer(true);
        }
        return;
      }

      if (hit?.kind === 'heroCards') {
        const heroHit = hit.hit;
        if (heroHit.type === 'inventoryButton') {
          soundEffectManager.playButtonClick();
          if (this.externalState) {
            heroHit.hero.isInventoryOpen = !heroHit.hero.isInventoryOpen;
            gameStateStore.set(this.externalState);
          } else {
            toggleHeroInventory(heroHit.hero);
          }
          this.renderCanvas(true);
        } else if (heroHit.type === 'inventoryClose') {
          soundEffectManager.playButtonClick();
          if (this.externalState) {
            heroHit.hero.isInventoryOpen = false;
            gameStateStore.set(this.externalState);
          } else {
            if (heroHit.hero.isInventoryOpen) {
              toggleHeroInventory(heroHit.hero);
            }
          }
          this.renderCanvas(true);
        } else if (heroHit.type === 'inventoryUseItem') {
          soundEffectManager.playButtonClick();
          if (this.externalState) {
            useItem(this.externalState, heroHit.item);
            gameStateStore.set(this.externalState);
          } else {
            useHeroItem(heroHit.item);
          }
          this.renderCanvas(true);
        }
        return;
      }

      if (hit?.kind === 'eventCard') {
        const eventHit = hit.hit;
        if (eventHit.type === 'toggle') {
          soundEffectManager.playButtonClick();
          this.isEventCardCollapsed = !this.isEventCardCollapsed;
          this.renderUiLayer(true);
        }
        return;
      }

      // Monster cards and the diary consume the click without dispatching.
      if (hit) {
        return;
      }
    }

    const menu = get(radialMenuStore);
    if (menu && this.uiCanvas) {
      const rect = this.uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldPos = screenToWorldPosition(
        screenX,
        screenY,
        rect.width,
        rect.height,
        this.panX,
        this.panY,
        this.cellSize,
        this.startPosition,
      );
      const clickedBtn = findHoveredRadialButton(menu, this.cellSize, worldPos);
      radialMenuStore.set(null);
      this.hover.hoveredRadialIndex = null;
      this.renderUiLayer(true);

      if (clickedBtn) {
        soundEffectManager.playButtonClick();
        const curState = this.externalState ?? get(gameStateStore);
        executeRadialAction(
          curState,
          clickedBtn.entry.action,
          clickedBtn.entry.door,
          clickedBtn.entry.interactable,
          clickedBtn.entry.item,
          clickedBtn.entry.targetHero,
        );
        if (!this.externalState) {
          gameStateStore.set(curState);
        }
      }
      return;
    }

    if (this.externalState) {
      doMouseLogic(event, this.cellSize, this.externalState, {
        panX: this.panX,
        panY: this.panY,
        viewWidth: this.containerWidth,
        viewHeight: this.containerHeight,
        centerPosition: this.startPosition,
      });
      gameStateStore.set(this.externalState);
    } else {
      handleCanvasClick(event, this.cellSize, {
        panX: this.panX,
        panY: this.panY,
        viewWidth: this.containerWidth,
        viewHeight: this.containerHeight,
        centerPosition: this.startPosition,
      });
    }
  };

  public onMouseMove = (event: MouseEvent) => {
    if (this.isDragging) return;
    if (!this.activeState || !this.uiCanvas) {
      this.boardCursor = 'default';
      return;
    }

    const rect = this.uiCanvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const ctx = this.uiCanvas.getContext('2d');

    if (this.containerWidth > 0) {
      // The between-dungeons overlay consumes the whole board while it is
      // open: its hover state updates even when no element is hit.
      if (this.activeState.betweenDungeons) {
        this.applyHover(
          updateBetweenDungeonsHover(
            this.hover,
            getBetweenDungeonsHit(
              this.containerWidth,
              this.containerHeight,
              this.activeState,
              screenX,
              screenY,
            ),
          ),
        );
        return;
      }

      const hit = this.uiHitAt(screenX, screenY, ctx);
      if (hit) {
        this.applyHover(updateHoverForUiHit(this.hover, hit, this.isLogOpen));
        return;
      }

      // Over plain board: drop every UI hover before the radial/board
      // cursor handling below.
      if (clearBoardHovers(this.hover, { radial: false })) {
        this.renderUiLayer(true);
      }
    }

    const menu = get(radialMenuStore);
    if (menu) {
      const worldPos = screenToWorldPosition(
        screenX,
        screenY,
        rect.width,
        rect.height,
        this.panX,
        this.panY,
        this.cellSize,
        this.startPosition,
      );
      const hoveredBtn = findHoveredRadialButton(menu, this.cellSize, worldPos);
      if (hoveredBtn) {
        this.boardCursor = 'pointer';
        if (this.hover.hoveredRadialIndex !== hoveredBtn.index) {
          this.hover.hoveredRadialIndex = hoveredBtn.index;
          this.renderUiLayer(true);
        }
        return;
      } else {
        this.boardCursor = 'default';
        if (this.hover.hoveredRadialIndex !== null) {
          this.hover.hoveredRadialIndex = null;
          this.renderUiLayer(true);
        }
        return;
      }
    }

    const pos = screenToGridPosition(
      screenX,
      screenY,
      rect.width,
      rect.height,
      this.panX,
      this.panY,
      this.cellSize,
      this.startPosition,
    );

    const grid = this.activeState.dungeon?.layout?.grid;
    if (
      !grid ||
      pos.y < 0 ||
      pos.y >= grid.length ||
      pos.x < 0 ||
      pos.x >= (grid[pos.y]?.length ?? 0)
    ) {
      this.boardCursor = 'default';
      return;
    }

    const cursorType = getCursorType(this.activeState, pos);
    this.boardCursor = emojiCursor(cursorType);
  };

  public onMouseLeave = () => {
    this.boardCursor = 'default';
    if (clearBoardHovers(this.hover, { radial: true })) {
      this.renderUiLayer(true);
    }
  };

  public onWheel = (event: WheelEvent) => {
    this.panX -= event.deltaX;
    this.panY -= event.deltaY;
    this.updateAllCanvasTransforms();
    this.renderCanvas(true);
    event.preventDefault();
  };
}
