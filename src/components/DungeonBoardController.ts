import type { CameraView } from '@hoard-engine/camera';
import { get } from 'svelte/store';
import { browser } from '$app/env';
import actorSprites from '#lib/Dungeon_Character_3.png';
import buildInfo from '#lib/buildInfo.json';
import { locale } from '#lib/translations/index.js';
import type { Dungeon, GameState, Hero, Position } from '../types';
import type { DebugMenuView, MenuCallbacks } from '../menu/MenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import { radialMenuStore } from '../store/radialMenuStore';
import {
  gameStateStore,
  handleCanvasClick,
  saveGame,
  syncStore,
  toggleHeroInventory,
  useHeroItem,
} from '../store/gameStateStore';
import {
  enterGamePhase,
  enterWelcomePhase,
  setWelcomeView,
  type AppPhase,
  type WelcomeView,
} from '../store/appPhaseStore';
import {
  doMouseLogic,
  getCursorType,
  screenToGridPosition,
  screenToWorldPosition,
  executeRadialAction,
} from '../hero/ClickInputLogic';
import { renderHeroOverlays } from '../hero/HeroRendering';
import { renderActors, renderMonsterHealthBars } from '../scene/ActorRendering';
import {
  background,
  dungeonViewBackdrop,
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
import type { LightViewport } from '@hoard-engine/lighting';
import { renderItems } from '../items/ItemRendering';
import {
  renderRadialMenu,
  findHoveredRadialButton,
  renderTopBar,
  renderHeroCards,
  renderMonsterCards,
  renderDiaryAndWinConditions,
  renderEventCard,
  renderDebugMenuModal,
  renderSaveLoadDialog,
  type SaveLoadDialogMode,
  renderNewGameDialog,
  type NewGameDialogOptions,
  renderDungeonIntro,
  shouldShowDungeonIntro,
  dismissDungeonIntro,
  renderBetweenDungeons,
  getBetweenDungeonsHit,
  renderDebugPrintout,
  renderWelcome,
  renderWelcomeBackground,
  renderWelcomeFooter,
  getWelcomeHit,
  getNewGameDialogHit,
  getSaveLoadDialogHit,
  renderHeroSelection,
  getHeroSelectionHit,
  getHeroSelectionLayout,
  buildSelectedHeroes,
  getDefaultSelectedHeroIds,
  getMaxHeroes,
  toggleHeroSelection,
  getHeroRenameValue,
  applyHeroRenameKey,
  isHeroSelectionStartEnabled,
  renderSettings,
  renderCredits,
  getSettingsHit,
  getCreditsHit,
  getSettingsLayout,
  getSliderValueFromX,
  emojiCursor,
  isCompactUi,
  type HeroSelectionHitResult,
  type HeroSelectionOptions,
  type NewGameDialogHitResult,
  type SaveLoadDialogHitResult,
  type SettingsRowId,
  type WelcomeButtonId,
} from '../ui/UIRendering';
import { createUiEnv, defaultUiEnv, envIdentity } from '../ui/env';
import type { UiEnv } from '@hoard-engine/uikit';
import { getCampaign } from '../campaigns';
import {
  appSettingsStore,
  applyAppSettings,
  mirrorMusicSetting,
  updateAppSettings,
} from '../settings/AppSettings';
import {
  setBetweenDungeonsStep,
  selectTradeItem,
  tradeItem,
  completeBetweenDungeonsAndStartNext,
} from '../dungeon/BetweenDungeonsLogic';
import { restartDungeonAfterWipe, DEFAULT_SPEEDRUN_SEED } from '../game';
import { useItem } from '../items/ItemLogic';
import {
  renderDamageIndicators,
  renderBloodSplatters,
  renderProjectiles,
  renderFlameEffects,
  activeShakes,
  shakeJitter,
} from '../combat';
import { clearTileTextureCache } from '@hoard-engine/scene';
import { clearFogCloudCaches } from '@hoard-engine/scene';
import {
  hasActiveActorAnimations,
  i18n,
  DEFAULT_GAME_MASTER_ID,
} from '../core';
import { setImageLoadedListener } from '../core/ImageCache';
import { MAX_SAVE_NAME_LENGTH } from '../saves/SavesLogic';
import { onChangeLanguage, onNewGame, onSaveGame } from '../menu/MenuLogic';
import { DEFAULT_CAMPAIGN_ID } from '../campaigns';
import { getTouchCentroid } from '@hoard-engine/input';
import {
  createPinchZoomState,
  handlePinchZoomEnd,
  handlePinchZoomMove,
  handlePinchZoomStart,
} from '../input/PinchZoomLogic';
import {
  activateTouchHoldPan,
  cancelTouchHoldPan,
  createTouchHoldPanState,
  beginTouchHoldPan,
  endTouchHoldPan,
  handleTouchHoldPanMove,
  TOUCH_HOLD_PAN_DELAY_MS,
} from '../input/TouchHoldPanLogic';
import {
  classifyWheelEvent,
  createWheelGestureState,
} from '../input/WheelGestureLogic';
import {
  screenToWorldZoomed,
  worldToScreenZoomed,
  zoomAtAnchor,
  zoomByStep,
  zoomFromWheelDelta,
  ZOOM_DEFAULT,
} from '../camera/ZoomLogic';
import { inputManager } from '../input/InputManager';
import { musicManager, soundEffectManager } from '../audio';
import { selectMusicIntensity } from '../audio/MusicIntensity';
import {
  getStaticSignature,
  getDynamicSignature,
  getOverlaySignature,
} from './DungeonBoardSignatures';
import { findUiHit, type UiHit } from './DungeonBoardUiHit';
import {
  createFrameRateGovernor,
  trackFrameCost,
  type FrameRateGovernor,
} from './DungeonBoardFrameRate';
import {
  clearBoardHovers,
  createBoardHoverState,
  updateBetweenDungeonsHover,
  updateHoverForUiHit,
  updateNewGameDialogHover,
  updateSaveLoadDialogHover,
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

// Rolling frames-per-second trackers for the continuously repainted
// layers (dynamic actors/lights, overlay effects). Every layer render
// counts as a frame, whatever triggered it; the snapshot is the frame
// count in the trailing second, refreshed at most once a second. While
// nothing animates the layer stops repainting, so the last shown value
// freezes along with the canvas itself.
interface FpsTracker {
  frames: number[];
  fps: number;
  lastSnapshot: number;
}

// Repaint cadence for the speedrun timer chip, which ticks in hundredths
// of a second: ~33 repaints per second is fast enough for the display to
// look live without redrawing the UI layer every animation frame.
const UI_TIMER_REPAINT_MS = 30;

const createFpsTracker = (): FpsTracker => ({
  frames: [],
  fps: 0,
  lastSnapshot: 0,
});

const trackFps = (tracker: FpsTracker, now: number): void => {
  tracker.frames.push(now);
  const cutoff = now - 1000;
  while (tracker.frames.length > 0 && tracker.frames[0] < cutoff) {
    tracker.frames.shift();
  }
  if (now - tracker.lastSnapshot >= 1000) {
    tracker.fps = tracker.frames.length;
    tracker.lastSnapshot = now;
  }
};

export class DungeonBoardController {
  // Ambient-only dynamic frames (light effects, terrain, fog) render at
  // most this often; actor-driven frames render at most once per the
  // frame-rate governor's locked target interval (30 or 60 fps).
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
  // The world transform last applied to the canvases, as a signature. The
  // static light layer's pixels are baked under that transform and copied
  // in device space, and its cache key is built from props — the two can
  // disagree in time, so a changed transform must invalidate the cached
  // layer even when its key did not change.
  private lastWorldTransformSig = '';
  private lastStaticSignature = '';
  private lastDynamicSignature = '';
  private lastAmbientSignature = '';
  private lastOverlaySignature = '';
  private lastUiSignature = '';

  // The UI env (theme, layout mode, translator) is rebuilt only when the
  // locale or the width-derived layout mode changes, then reused by every
  // renderer call in a paint.
  private uiEnv: UiEnv = defaultUiEnv;
  private uiEnvKey = '';

  private ensureUiEnv = (): UiEnv => {
    const currentLocale = String(get(locale));
    const key = `${currentLocale}:${this.containerWidth}`;
    if (key !== this.uiEnvKey) {
      this.uiEnv = createUiEnv(this.containerWidth, currentLocale);
      this.uiEnvKey = key;
    }
    return this.uiEnv;
  };
  private overlayAnimationId: number | null = null;
  private overlayTimerId: ReturnType<typeof setTimeout> | null = null;
  private dynamicAnimationId: number | null = null;
  private shakeAnimationId: number | null = null;
  private panRenderAnimationId: number | null = null;
  private dynamicFpsTracker = createFpsTracker();
  private overlayFpsTracker = createFpsTracker();
  // Locks the dynamic loop's frame rate to 60 fps, dropping to 30 on
  // machines whose painted frames cannot hold the 60 fps budget (with
  // hysteresis, see DungeonBoardFrameRate).
  private frameRateGovernor: FrameRateGovernor = createFrameRateGovernor();
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
  private touchHoldPanState = createTouchHoldPanState();
  // The one-finger hold-to-pan timer: arms on a single-finger touchstart
  // and promotes the gesture to a pan when it elapses without movement.
  // Cleared on any lift, cancel or second finger.
  private holdPanTimerId: ReturnType<typeof setTimeout> | null = null;
  // Board zoom: 1 by default, clamped between ZOOM_MIN (0.5) and
  // ZOOM_MAX (1.5). Keyboard '+/-', wheel scrolling and two-finger
  // pinching all drive the same value, anchored so the world point under
  // the cursor/centroid stays put.
  private zoom = ZOOM_DEFAULT;
  private pinchZoomState = createPinchZoomState();
  // Wheel burst classifier: one wheel stream pans *or* zooms per burst —
  // never both — so a trackpad drag does not smear sideways while it
  // zooms. Ctrl+wheel (the trackpad pinch) always zooms.
  private wheelGestureState = createWheelGestureState();
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
  private isDebugMenuOpen = false;
  private currentDebugMenuView: DebugMenuView = 'debug';
  // Centered save/load dialog, a sibling of the between-dungeons overlay
  // rather than a canvas-menu view. Opened from the main menu, closed by
  // its buttons, the backdrop, or Escape.
  private saveLoadDialogMode: SaveLoadDialogMode | null = null;
  // Text typed into the save dialog's name input, owned by the controller
  // because the dialog is drawn on the UI canvas rather than the DOM.
  private saveNameInput = '';
  // Centered new-game dialog (campaign + game master columns, the
  // speedrunner checkbox and its seed input), a sibling of the save/load
  // dialog. Selection state lives here for the same reason as the save
  // name: the input is canvas-drawn.
  private isNewGameDialogOpen = false;
  private newGameCampaignId: string | undefined = undefined;
  private newGameGameMasterId: string | undefined = undefined;
  private newGameSpeedrunMode = false;
  private newGameSeedInput = String(DEFAULT_SPEEDRUN_SEED);
  private uiTimerId: ReturnType<typeof setTimeout> | null = null;
  private isEventCardCollapsed = false;
  private isDungeonIntroDismissed = false;
  private showDungeonIntro = false;
  // On narrow (compact) screens the events and diary panels collapse into
  // corner squares; these flags remember whether the player has opened
  // them. On wide screens the panels are always open and the flags are
  // ignored.
  private mobileEventsOpen = false;
  private mobileDiaryOpen = false;
  // --- welcome phase --------------------------------------------------------
  // The app phase and the welcome sub view, pushed from the stores by the
  // Svelte component (same glue as the radial menu and locale). In the
  // 'welcome' phase the board renders the welcome UI and gates every
  // gameplay surface off.
  private appPhase: AppPhase = 'welcome';
  private welcomeView: WelcomeView = 'main';
  private hoveredWelcomeButton: WelcomeButtonId | null = null;
  // Hero selection (reached only from the new-game dialog in the welcome
  // phase). The selected ids are in roster order; names are the player's
  // typed overrides by hero id.
  private heroSelectionCampaignId: string | null = null;
  private heroSelectionGameMasterId: string | undefined;
  private heroSelectionSpeedrunSeed: number | undefined;
  private heroSelectionIds: string[] = [];
  private heroSelectionNames: Record<string, string> = {};
  private heroSelectionFocusedId: string | null = null;
  private hoveredHeroSelectionId: string | null = null;
  private isHsActionHovered = false;
  private isHsSecondaryHovered = false;
  // Settings/credits hovers and the live volume-slider drag (the drag
  // keeps tracking the pointer until it is released, even outside the
  // track).
  private hoveredSettingsRowId: SettingsRowId | null = null;
  private isSettingsBackHovered = false;
  private hoveredCreditsRowId: string | null = null;
  private isCreditsBackHovered = false;
  private settingsSliderDrag: 'musicVolume' | 'audioVolume' | null = null;
  // True while the click that follows a slider press should be ignored
  // (the press already applied the value).
  private settingsSliderPressHandled = false;

  private menuCallbacks: MenuCallbacks = {
    setView: (view: DebugMenuView) => {
      this.currentDebugMenuView = view;
      this.hover.hoveredMenuItemId = null;
      this.renderUiLayer(true);
    },
    closeMenu: () => {
      this.isDebugMenuOpen = false;
      this.currentDebugMenuView = 'debug';
      this.hover.hoveredMenuItemId = null;
      this.syncGameInputEnabled();
      this.renderUiLayer(true);
    },
    setState: (nextState: GameState) => {
      if (this.appPhase === 'welcome') {
        // The welcome phase has no external state: adopting a dialog-built
        // state goes through the store so the reload guard is written and
        // the phase switches to the game (the dialog logic already ran
        // loadState on it).
        syncStore(nextState, true);
        enterGamePhase();
      } else {
        this.props.onExternalStateChange(nextState);
      }
      this.renderCanvas(true);
    },
    closeDialog: () => {
      this.closeSaveLoadDialog();
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
    // The intro and the between-dungeons overlay (party wipe and campaign
    // win included) suppress game input, so re-sync whenever they change.
    this.syncGameInputEnabled();

    if (browser) {
      // The app settings are the single source of truth for audio: they
      // are applied to both managers and the music state mirrors into
      // the game state's saved field (loading a save never overwrites
      // the app setting).
      const appSettings = get(appSettingsStore);
      applyAppSettings(appSettings);
      if (props.activeState) {
        mirrorMusicSetting(appSettings);
      }
      if (props.dungeon && appSettings.musicOn) {
        musicManager.playDungeonMusic(
          props.dungeon.music,
          props.dungeon.musicTension,
        );
        if (props.activeState) {
          musicManager.setIntensity(
            selectMusicIntensity(
              props.activeState,
              musicManager.getIntensity(),
            ),
          );
        }
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
        { alpha: false },
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

    // Dungeon change: re-center the view before any render below, so no
    // layer bakes pixels under the previous dungeon's world transform.
    const dungeonKey = props.dungeon
      ? `${String(String(String(props.dungeon.name)))}|${String(
          props.startPosition?.x,
        )},${String(String(String(props.startPosition?.y)))}`
      : '';
    if (dungeonKey !== this.lastDungeonKey) {
      this.lastDungeonKey = dungeonKey;
      this.panX = 0;
      this.panY = 0;
      this.zoom = ZOOM_DEFAULT;
      this.updateAllCanvasTransforms();
      this.renderCanvas(true);
    }

    if (props.activeState && props.debugMode !== undefined) {
      this.renderCanvas(false);
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
      this.initCanvas(this.staticCanvas, width, height, ratio, {
        alpha: false,
      });
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
  onLocaleChange(next: string | undefined): void {
    if (this.mounted && next && next !== this.lastLocale) {
      this.lastLocale = next;
      this.renderCanvas(true);
    }
  }

  /** Called by the component when the app phase or welcome view changes. */
  onAppPhaseChange(phase: AppPhase, view: WelcomeView): void {
    const phaseChanged = phase !== this.appPhase;
    const viewChanged = view !== this.welcomeView;
    if (!phaseChanged && !viewChanged) return;
    this.appPhase = phase;
    this.welcomeView = view;
    if (phaseChanged) {
      this.hoveredWelcomeButton = null;
      this.isDebugMenuOpen = false;
      this.currentDebugMenuView = 'debug';
    }
    this.syncGameInputEnabled();
    if (this.mounted) {
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
      // The touch handlers are attached here rather than through Svelte
      // event attributes: Svelte marks touchstart/touchmove listeners
      // passive by default, and the pan/pinch gestures need
      // preventDefault. The canvas listener also runs before the input
      // manager's container listener, so the end-of-gesture
      // stopPropagation can keep pans and pinches from turning into
      // swipes. Touch events stick to the element they started on, so
      // the ui canvas — the top layer covering the board — receives
      // every event of a board gesture.
      if (this.uiCanvas) {
        this.uiCanvas.addEventListener('touchstart', this.onTouchStart, {
          passive: false,
        });
        this.uiCanvas.addEventListener('touchmove', this.onTouchMove, {
          passive: false,
        });
        this.uiCanvas.addEventListener('touchend', this.onTouchEnd, {
          passive: false,
        });
        this.uiCanvas.addEventListener('touchcancel', this.onTouchCancel);
      }
      window.addEventListener('keydown', this.onWindowKeyDown);
    }

    const ratio = this.canvasRatio;
    if (this.containerWidth && this.containerHeight) {
      this.initCanvas(
        this.staticCanvas,
        this.containerWidth,
        this.containerHeight,
        ratio,
        { alpha: false },
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
    // Item and interactable sprite sheets load lazily through the shared
    // image cache: the first draw that references a sheet starts the
    // load and shows the fallback art meanwhile. Without this hook the
    // cached static and UI layers would keep showing their fallbacks
    // until the next state change; a completed load repaints them.
    setImageLoadedListener(() => {
      this.renderStaticLayer(true);
      this.renderUiLayer(true);
    });

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
    // The input manager is a singleton outliving the board; never leave
    // it disabled if a modal or overlay was open at teardown.
    if (
      this.isDebugMenuOpen ||
      this.saveLoadDialogMode ||
      this.isNewGameDialogOpen ||
      this.showDungeonIntro ||
      this.activeState?.betweenDungeons
    ) {
      inputManager.setEnabled(true);
    }
    if (browser) {
      window.removeEventListener('mousemove', this.onWindowMouseMove);
      window.removeEventListener('mouseup', this.onWindowMouseUp);
      if (this.uiCanvas) {
        this.uiCanvas.removeEventListener('touchstart', this.onTouchStart);
        this.uiCanvas.removeEventListener('touchmove', this.onTouchMove);
        this.uiCanvas.removeEventListener('touchend', this.onTouchEnd);
        this.uiCanvas.removeEventListener('touchcancel', this.onTouchCancel);
      }
      window.removeEventListener('keydown', this.onWindowKeyDown);
      musicManager.stop();
      soundEffectManager.stop();
    }
    if (this.overlayAnimationId) {
      cancelAnimationFrame(this.overlayAnimationId);
      this.overlayAnimationId = null;
    }
    if (this.overlayTimerId) {
      clearTimeout(this.overlayTimerId);
      this.overlayTimerId = null;
    }
    if (this.uiTimerId) {
      clearTimeout(this.uiTimerId);
      this.uiTimerId = null;
    }
    this.clearHoldPanTimer();
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
    // The image-cache listener points at this board; drop it so a
    // teardown cannot repaint into detached canvases if a lazily loaded
    // sheet completes afterwards.
    setImageLoadedListener(null);
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
      // Only the static canvas is opaque: it fills a solid backdrop, so
      // the browser can skip blending it into the page. Every other
      // layer composites over the ones below and needs its alpha.
      this.initCanvas(
        canvas,
        width,
        height,
        ratio,
        canvas === this.staticCanvas ? { alpha: false } : undefined,
      );
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

  private cameraView = (
    width = this.containerWidth,
    height = this.containerHeight,
  ): CameraView => ({
    width,
    height,
    centerX: this.startPosition
      ? (this.startPosition.x + 0.5) * this.cellSize
      : 0,
    centerY: this.startPosition
      ? (this.startPosition.y + 0.5) * this.cellSize
      : 0,
    panX: this.panX,
    panY: this.panY,
  });

  // Applies a zoom step around a screen-space anchor (the cursor for the
  // wheel, the touch centroid for pinch, the view centre for the
  // keyboard): the world point under the anchor stays under it. Returns
  // false when the zoom was already clamped at the limit, so callers
  // with their own pan changes can still repaint. Full-quality repaint —
  // the pinch path applies the same math inline under the pan drag's
  // reduced quality and coalesced rAF instead.
  private applyZoom = (
    nextZoomRaw: number,
    anchorX: number,
    anchorY: number,
  ): boolean => {
    const next = zoomAtAnchor(this.cameraView(), this.zoom, nextZoomRaw, {
      x: anchorX,
      y: anchorY,
    });
    if (next.zoom === this.zoom) return false;
    this.zoom = next.zoom;
    this.panX = next.panX;
    this.panY = next.panY;
    this.updateAllCanvasTransforms();
    this.renderCanvas(true);
    return true;
  };

  // Keyboard zoom around the view centre, shared by the +/- handlers.
  private zoomByKeyboard = (steps: number): void => {
    this.applyZoom(
      zoomByStep(this.zoom, steps),
      this.containerWidth / 2,
      this.containerHeight / 2,
    );
  };

  private updateAllCanvasTransforms = () => {
    if (!this.containerWidth || !this.containerHeight) return;
    const ratio = this.canvasRatio;
    const view = this.cameraView();
    const origin = worldToScreenZoomed({ x: 0, y: 0 }, view, this.zoom);
    // The transform change invalidates the static light layer: its cached
    // pixels were drawn under the previous transform and are copied into
    // the light mask in device space, so they would sit offset relative
    // to the re-transformed world.
    const transformSig = `${String(ratio)},${String(
      this.containerWidth,
    )},${String(this.containerHeight)},${String(this.panX)},${String(
      this.panY,
    )},${String(view.centerX)},${String(view.centerY)},${String(this.zoom)}`;
    if (transformSig !== this.lastWorldTransformSig) {
      this.lastWorldTransformSig = transformSig;
      this.lastStaticLightKey = '';
    }
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
            ratio * this.zoom,
            0,
            0,
            ratio * this.zoom,
            ratio * origin.x,
            ratio * origin.y,
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
    // The static context is opaque (alpha: false), so instead of clearing,
    // the whole canvas is painted with the dungeon view's backdrop colour:
    // opaque paints let the browser skip blending this layer, and the area
    // outside the dungeon world stays the colour the CSS background used
    // to show through the transparent canvas.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = dungeonViewBackdrop;
    ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.restore();

    const gridCols = this.activeState.dungeon?.layout?.grid?.[0]?.length ?? 40;
    const gridRows = this.activeState.dungeon?.layout?.grid?.length ?? 30;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, this.cellSize * gridCols, this.cellSize * gridRows);
    renderGrid(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderTerrain(
      ctx,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderSecrets(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState.dungeon,
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
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderWalls(
      ctx,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderDoors(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderPillars(
      ctx,
      this.ground,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
    renderPortal(
      ctx,
      this.cellSize,
      this.activeState.dungeon,
      this.debugMode ?? false,
    );
  };

  private renderDynamicLayer = (force = false) => {
    if (!this.activeState || !browser || !this.actors || !this.actorCanvas)
      return;
    if (!this.isReady(this.actors)) return;
    const currentTime = Date.now();
    trackFps(this.dynamicFpsTracker, currentTime);
    this.lastDynamicFrameTs = performance.now();
    const debugMode = this.debugMode ?? false;
    // The visible part of the world, in cells: lights whose glow cannot
    // reach it are culled from rendering and animation alike. The zoom
    // shrinks the visible world area accordingly.
    const worldOrigin = screenToWorldZoomed(
      { x: 0, y: 0 },
      this.cameraView(),
      this.zoom,
    );
    const lightViewport: LightViewport = {
      x: worldOrigin.x / this.cellSize,
      y: worldOrigin.y / this.cellSize,
      width: this.containerWidth / this.zoom / this.cellSize,
      height: this.containerHeight / this.zoom / this.cellSize,
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
      this.activeState.dungeon,
      debugMode,
      lightViewport,
    );
    // The painted frame also depends on where the view sits and which
    // surface it was painted on: panning moves every world pixel (the
    // canvas transform only affects new draws, not existing ones), and
    // a canvas resize clears them. Folding both into the ambient
    // signature keeps a forced repaint after a pan or a canvas
    // reinitialization from being mistaken for a redundant one.
    const surfaceSig = `${String(this.zoom)},${String(this.panX)},${String(
      this.panY,
    )},${String(this.actorCanvas?.width ?? 0)},${String(
      this.actorCanvas?.height ?? 0,
    )}`;
    const ambientSig =
      hasLightEffects || hasTerrainEffects
        ? `${lightSig}|${
            hasTerrainEffects
              ? Math.floor(currentTime / TERRAIN_ANIMATION_STEP_MS)
              : ''
          }|${surfaceSig}`
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
        this.activeState.dungeon,
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
        this.activeState.dungeon,
        debugMode,
        lightViewport,
      );
    }

    // Animated terrain material (water shimmer, lava pulse) sits above the
    // lit scene but below the actors, so figures wading stand on top of it.
    renderTerrainAnimation(
      ctx,
      this.cellSize,
      this.activeState.dungeon,
      debugMode,
      currentTime,
      lightViewport,
    );

    // Monsters and heroes draw as one row-sorted pass: sprites taller
    // than a cell overlap the actor on the cell above, so the draw keeps
    // whoever stands south in front (see src/scene/ActorRendering.ts).
    const hasActiveActors = renderActors(
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
        this.activeState.dungeon,
        debugMode,
      );
    }

    // Room fog drifts above the actors and pillar shafts, but below the
    // darkness veil so unlit fog darkens with the room.
    renderRoomFog(
      ctx,
      this.cellSize,
      this.activeState.dungeon,
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

    // Monster health bars draw above the lights and the darkness veil
    // (the actor pass below lights them), so they stay fully readable on
    // unlit cells.
    renderMonsterHealthBars(
      ctx,
      this.actors,
      this.cellSize,
      this.activeState,
      this.debugMode ?? false,
      currentTime,
    );

    // The hero turn UI (walkable outline, reticule, colour bar, health
    // bar, action and step markers) is drawn above the lights and the
    // darkness veil, so it stays fully visible even on unlit cells.
    renderHeroOverlays(ctx, this.cellSize, this.activeState, currentTime);

    if (this.dynamicAnimationId) {
      cancelAnimationFrame(this.dynamicAnimationId);
      this.dynamicAnimationId = null;
    }

    // The layer actually painted, so this frame's wall-clock cost is
    // real: feed it to the frame-rate governor, which locks the loop at
    // 60 fps and drops it to 30 once painted frames stop fitting the
    // 60 fps budget (recovering 60 when they fit again). The record
    // reference was taken at the top of this call.
    trackFrameCost(
      this.frameRateGovernor,
      performance.now() - this.lastDynamicFrameTs,
      performance.now(),
    );

    if (
      hasActiveActors ||
      hasLightEffects ||
      hasTerrainEffects ||
      hasActiveActorAnimations(currentTime)
    ) {
      // Actor movement renders at the governor's locked target rate
      // (60 fps, or 30 on a slower machine — never above 60, whatever
      // the display refreshes at); ambient effects (flickering torches,
      // water, fog) render at half rate, halving the continuous CPU
      // cost of an animated dungeon.
      const fullRate = hasActiveActors || hasActiveActorAnimations(currentTime);
      this.scheduleDynamicFrame(fullRate);
    }
  };

  // Schedules the next dynamic-layer frame. Every rAF tick optimistically
  // reschedules, but only renders once enough time has passed since the
  // last processed frame: ambient-only frames wait at least
  // AMBIENT_FRAME_MIN_MS, actor-driven frames at least the governor's
  // target interval (1000/60 or 1000/30). The rAF keeps ticking at full
  // rate so the heavy per-frame work (ray casting, blur blits,
  // full-canvas composites) never runs above the locked frame rate,
  // while a high-refresh display simply skips renders.
  private scheduleDynamicFrame = (fullRate: boolean): void => {
    this.dynamicAnimationId = requestAnimationFrame(() => {
      const now = performance.now();
      const minFrameIntervalMs = fullRate
        ? 1000 / this.frameRateGovernor.targetFps
        : DungeonBoardController.AMBIENT_FRAME_MIN_MS;
      if (now - this.lastDynamicFrameTs < minFrameIntervalMs) {
        this.scheduleDynamicFrame(fullRate);
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
    trackFps(this.overlayFpsTracker, now);
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
          dynamicFps: this.dynamicFpsTracker.fps,
          dynamicTargetFps: this.frameRateGovernor.targetFps,
          overlayFps: this.overlayFpsTracker.fps,
        },
        this.uiEnv.theme,
      );
    }

    if (this.overlayAnimationId) {
      cancelAnimationFrame(this.overlayAnimationId);
      this.overlayAnimationId = null;
    }
    if (this.overlayTimerId) {
      clearTimeout(this.overlayTimerId);
      this.overlayTimerId = null;
    }

    if (hasActiveEffects) {
      this.overlayAnimationId = requestAnimationFrame(() => {
        this.renderOverlayLayer(true);
      });
    } else if (this.debugTimerRunning()) {
      // The debug printout shows the live dungeon timer, which ticks
      // once per second: repaint the overlay on the next whole-second
      // boundary instead of looping every frame.
      if (this.overlayTimerId === null) {
        this.overlayTimerId = setTimeout(
          () => {
            this.overlayTimerId = null;
            this.renderOverlayLayer(true);
          },
          1001 - (Date.now() % 1000),
        );
      }
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

  // The welcome phase's UI layer: background image (or fallback), the
  // active welcome view's panel, the build footer, and any open dialog on
  // top. The dialogs capture all input while open, exactly as they do
  // from the canvas menu.
  private renderWelcomeLayer = (ctx: CanvasRenderingContext2D): void => {
    const env = this.ensureUiEnv();
    renderWelcomeBackground(ctx, this.containerWidth, this.containerHeight, {
      env,
    });
    if (this.welcomeView === 'heroSelection' && this.heroSelectionCampaignId) {
      renderHeroSelection(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.heroSelectionCampaignId,
        { ...this.heroSelectionOptions(), env },
      );
    } else if (this.welcomeView === 'settings') {
      renderSettings(
        ctx,
        this.containerWidth,
        this.containerHeight,
        get(appSettingsStore),
        {
          hoveredRowId: this.hoveredSettingsRowId,
          hoveredBack: this.isSettingsBackHovered,
          env,
        },
      );
    } else if (this.welcomeView === 'credits') {
      renderCredits(ctx, this.containerWidth, this.containerHeight, {
        hoveredRowId: this.hoveredCreditsRowId,
        hoveredBack: this.isCreditsBackHovered,
        env,
      });
    } else {
      renderWelcome(ctx, this.containerWidth, this.containerHeight, {
        buildInfo,
        hasOngoingRun: this.hasOngoingRun,
        hoveredButton:
          this.welcomeView === 'main' ? this.hoveredWelcomeButton : null,
        env,
      });
    }
    renderWelcomeFooter(
      ctx,
      this.containerWidth,
      this.containerHeight,
      buildInfo,
      env,
    );
    if (this.isNewGameDialogOpen) {
      renderNewGameDialog(ctx, this.containerWidth, this.containerHeight, {
        ...this.newGameDialogOptions(),
        env,
      });
    }
    if (this.saveLoadDialogMode) {
      renderSaveLoadDialog(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          mode: this.saveLoadDialogMode,
          callbacks: this.menuCallbacks,
          saveName: this.saveNameInput,
          hoveredItemId: this.hover.hoveredMenuItemId,
          hoveredAction: this.hover.isSdActionHovered,
          hoveredSecondary: this.hover.isSdSecondaryHovered,
          env,
        },
      );
    }
  };

  private renderUiLayer = (force = false) => {
    if (!browser || !this.uiCanvas) return;
    const uiEnv = this.ensureUiEnv();
    const eventCardCollapsed = this.effectiveEventCardCollapsed;
    const diaryCollapsed = this.effectiveDiaryCollapsed;
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
      .join(',')}:${String(String(String(diaryCollapsed)))}`;
    const eventSig = `${String(
      String(this.activeState?.currentEvent?.id ?? ''),
    )}:${(this.activeState?.eventDeck ?? [])
      .map(
        (e) =>
          `${String(String(String(e.number)))}-${String(
            String(String(e.used)),
          )}`,
      )
      .join(',')}:${String(String(String(eventCardCollapsed)))}:${String(
      this.hover.isEventCardToggleHovered,
    )}:${String(this.hover.isDiaryToggleHovered)}`;
    const introSig = `${String(String(String(this.showDungeonIntro)))}:${String(
      this.hover.isDungeonIntroCloseHovered,
    )}:${String(String(String(this.activeState?.dungeon?.intro ?? '')))}`;
    const currentDebug = this.debugMode;
    const welcomeSig = `${String(this.appPhase)}:${String(
      this.welcomeView,
    )}:${String(this.hoveredWelcomeButton)}`;
    const menuSig = `${String(String(String(this.isDebugMenuOpen)))}:${String(
      this.currentDebugMenuView,
    )}:${String(String(this.hover.hoveredMenuItemId))}:${String(
      String(currentDebug),
    )}:${String(String(get(locale)))}:${String(
      this.activeState?.settings?.['locale'],
    )}:${String(String(this.activeState?.gameMaster?.id))}:${String(
      this.activeState?.dungeon?.beaten,
    )}:${String(String(this.activeState?.settings?.['music']))}:${String(
      this.saveLoadDialogMode,
    )}:${String(this.saveNameInput)}:${String(
      String(this.hover.isSdActionHovered),
    )}:${String(String(this.hover.isSdSecondaryHovered))}:${String(
      this.isNewGameDialogOpen,
    )}:${String(this.newGameCampaignId)}:${String(
      this.newGameGameMasterId,
    )}:${String(this.newGameSpeedrunMode)}:${String(
      this.newGameSeedInput,
    )}:${String(this.hover.hoveredNgCampaignId)}:${String(
      this.hover.hoveredNgGameMasterId,
    )}:${String(this.hover.isNgCheckboxHovered)}:${String(
      this.hover.isNgActionHovered,
    )}:${String(this.hover.isNgSecondaryHovered)}:${envIdentity(
      uiEnv,
      String(get(locale)),
    )}`;
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
    )},${String(String(welcomeSig))}`;
    if (!force && sig === this.lastUiSignature) return;
    this.lastUiSignature = sig;

    const ctx = this.uiCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    ctx.restore();

    // Welcome phase: the welcome UI owns the whole layer; no board or
    // gameplay UI is drawn behind it.
    if (this.appPhase === 'welcome') {
      if (this.containerWidth > 0 && this.containerHeight > 0) {
        const ratio = this.canvasRatio;
        ctx.save();
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.renderWelcomeLayer(ctx);
        ctx.restore();
      }
      return;
    }

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
        env: uiEnv,
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
          env: uiEnv,
        },
      );
      renderMonsterCards(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          env: uiEnv,
        },
      );
      renderDiaryAndWinConditions(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          isCollapsed: diaryCollapsed,
          isToggleHovered: this.hover.isDiaryToggleHovered,
          env: uiEnv,
        },
      );
      renderEventCard(
        ctx,
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          isCollapsed: eventCardCollapsed,
          isToggleHovered: this.hover.isEventCardToggleHovered,
          env: uiEnv,
        },
      );
      if (this.isDebugMenuOpen) {
        renderDebugMenuModal(
          ctx,
          this.containerWidth,
          this.containerHeight,
          this.activeState,
          {
            view: this.currentDebugMenuView,
            hoveredItemId: this.hover.hoveredMenuItemId,
            callbacks: this.menuCallbacks,
            env: uiEnv,
          },
        );
      }
      if (this.saveLoadDialogMode) {
        renderSaveLoadDialog(
          ctx,
          this.containerWidth,
          this.containerHeight,
          this.activeState,
          {
            mode: this.saveLoadDialogMode,
            callbacks: this.menuCallbacks,
            saveName: this.saveNameInput,
            hoveredItemId: this.hover.hoveredMenuItemId,
            hoveredAction: this.hover.isSdActionHovered,
            hoveredSecondary: this.hover.isSdSecondaryHovered,
            env: uiEnv,
          },
        );
      }
      if (this.isNewGameDialogOpen) {
        renderNewGameDialog(ctx, this.containerWidth, this.containerHeight, {
          ...this.newGameDialogOptions(),
          env: uiEnv,
        });
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
            env: uiEnv,
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
            hoveredWipeAction: this.hover.hoveredBdWipeAction,
            env: uiEnv,
          },
        );
      }
      ctx.restore();
    }

    if (menu) {
      renderRadialMenu(
        ctx,
        this.cellSize,
        menu,
        this.hover.hoveredRadialIndex,
        uiEnv,
      );
    }

    // The speedrun timer chip in the top bar ticks in hundredths of a
    // second; its text is deliberately not part of the signature, so the
    // UI layer is repainted at a fixed cadence while it is running.
    this.scheduleUiTimerRepaint();
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
      const worldCenter = screenToWorldZoomed(
        { x: this.containerWidth / 2, y: this.containerHeight / 2 },
        this.cameraView(),
        this.zoom,
      );
      const viewCenter = {
        x: worldCenter.x / this.cellSize,
        y: worldCenter.y / this.cellSize,
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
    options?: CanvasRenderingContext2DSettings,
  ) => {
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${String(String(String(width)))}px`;
    canvas.style.height = `${String(String(String(height)))}px`;
    const ctx = canvas.getContext('2d', options);
    if (ctx) {
      // The actor layer is pixel art: its cached sprite frames upscale
      // nearest-neighbour on high-DPI displays instead of the default
      // smoothing that softens them. The other layers stay smoothed —
      // lights and text are gradients and vector shapes.
      if (canvas === this.actorCanvas) {
        ctx.imageSmoothingEnabled = false;
      }
      const origin = worldToScreenZoomed(
        { x: 0, y: 0 },
        this.cameraView(width, height),
        this.zoom,
      );
      ctx.setTransform(
        ratio * this.zoom,
        0,
        0,
        ratio * this.zoom,
        ratio * origin.x,
        ratio * origin.y,
      );
      // Resizing a canvas clears it and this call re-applies the world
      // transform, so the cached static light layer no longer matches the
      // surface it was drawn on.
      this.lastStaticLightKey = '';
    }
  };

  private onWindowMouseMove = (event: MouseEvent) => {
    // A volume-slider drag keeps tracking the pointer (even outside the
    // track) until it is released.
    if (this.settingsSliderDrag) {
      const point = this.screenPointFromEvent(event);
      if (point) {
        this.updateSliderFromPointer(point);
      }
      return;
    }
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
    if (this.settingsSliderDrag) {
      this.settingsSliderDrag = null;
    }
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

  // Touch model: one finger tap = click (move/interact, via the
  // synthesized click), one finger held then dragged = pan, two fingers =
  // pinch zoom. The hold starts panning only after TOUCH_HOLD_PAN_DELAY_MS
  // without movement; movement before that hands the gesture back to
  // tap/swipe so hero movement stays reachable.
  private scheduleHoldPanTimer = (): void => {
    this.clearHoldPanTimer();
    this.holdPanTimerId = setTimeout(() => {
      this.holdPanTimerId = null;
      activateTouchHoldPan(this.touchHoldPanState);
      // Nothing to render yet: panning shows once the finger moves.
    }, TOUCH_HOLD_PAN_DELAY_MS);
  };

  private clearHoldPanTimer = (): void => {
    if (this.holdPanTimerId !== null) {
      clearTimeout(this.holdPanTimerId);
      this.holdPanTimerId = null;
    }
  };

  public onTouchStart = (event: TouchEvent) => {
    if (this.appPhase === 'welcome') {
      const touch = event.touches[0];
      if (touch) {
        const point = this.screenPointFromEvent(touch);
        if (point && this.beginSettingsSliderPress(point)) {
          // The press owns the gesture; keep the browser from also
          // synthesizing mouse/click events for it.
          if (event.cancelable) {
            event.preventDefault();
          }
        }
      }
      return;
    }
    if (event.touches.length === 1) {
      beginTouchHoldPan(
        event.touches[0],
        { x: this.panX, y: this.panY },
        this.touchHoldPanState,
      );
      this.scheduleHoldPanTimer();
    } else {
      // Any second (or third) finger cancels the held pan candidate; two
      // of them carry the pinch. preventDefault keeps the browser from
      // synthesizing mouse/click events for the pinch sequence.
      cancelTouchHoldPan(this.touchHoldPanState);
      this.clearHoldPanTimer();
      if (handlePinchZoomStart(event.touches, this.zoom, this.pinchZoomState)) {
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    }
  };

  public onTouchMove = (event: TouchEvent) => {
    if (this.appPhase === 'welcome') {
      if (this.settingsSliderDrag) {
        const touch = event.touches[0];
        if (touch) {
          const point = this.screenPointFromEvent(touch);
          if (point) {
            this.updateSliderFromPointer(point);
          }
          if (event.cancelable) {
            event.preventDefault();
          }
        }
      }
      return;
    }
    // One finger, held then dragged: pan. handleTouchHoldPanMove only
    // reports once the hold elapsed (activateTouchHoldPan scheduled from
    // the touchstart timer); earlier movement cancels the candidate and
    // the gesture stays a tap or swipe on release.
    const pan = handleTouchHoldPanMove(event.touches, this.touchHoldPanState);
    if (pan) {
      this.panX = pan.panX;
      this.panY = pan.panY;
      this.hasMovedDuringDrag = true;
      this.schedulePanRender();
      if (event.cancelable) {
        event.preventDefault();
      }
    }
    // Two fingers: pinch zoom, anchored at the touch centroid so the
    // world point under the centroid stays under it. Scaled from the
    // anchored pinch start, so drift between move events cancels out.
    const pinch = handlePinchZoomMove(event.touches, this.pinchZoomState);
    const centroid = pinch ? getTouchCentroid(event.touches) : null;
    if (pinch && centroid) {
      const next = zoomAtAnchor(
        this.cameraView(),
        this.zoom,
        pinch.zoom,
        centroid,
      );
      this.zoom = next.zoom;
      this.panX = next.panX;
      this.panY = next.panY;
      this.schedulePanRender();
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  };

  public onTouchEnd = (event: TouchEvent) => {
    if (this.appPhase === 'welcome') {
      if (this.settingsSliderDrag && event.touches.length === 0) {
        this.settingsSliderDrag = null;
        this.settingsSliderPressHandled = false;
      }
      return;
    }
    if (event.touches.length === 2) {
      // A third finger lifting back to two re-anchors the pinch at the
      // current zoom.
      handlePinchZoomStart(event.touches, this.zoom, this.pinchZoomState);
    } else if (handlePinchZoomEnd(event.touches, this.pinchZoomState)) {
      // The pinch owned its sequence: the release must neither synthesize
      // a click (move/interact) nor reach the input manager's swipe
      // classifier, so it stops at the board.
      this.exitLowQualityPan();
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      if (this.hasMovedDuringDrag) {
        setTimeout(() => {
          this.hasMovedDuringDrag = false;
        }, 50);
      }
    }
    if (event.touches.length === 0) {
      this.clearHoldPanTimer();
      const ended = endTouchHoldPan(this.touchHoldPanState);
      if (ended.wasPanning) {
        // A hold without movement resolves as a plain press-release.
        this.exitLowQualityPan();
      }
      if (ended.moved) {
        // The pan owned its sequence: same release suppression as the
        // pinch — no synthesized click, no swipe classification.
        if (event.cancelable) {
          event.preventDefault();
        }
        event.stopPropagation();
        if (this.hasMovedDuringDrag) {
          setTimeout(() => {
            this.hasMovedDuringDrag = false;
          }, 50);
        }
      }
    }
  };

  public onTouchCancel = () => {
    this.settingsSliderDrag = null;
    this.settingsSliderPressHandled = false;
    this.clearHoldPanTimer();
    cancelTouchHoldPan(this.touchHoldPanState);
    this.pinchZoomState.isPinching = false;
    this.exitLowQualityPan();
    if (this.hasMovedDuringDrag) {
      setTimeout(() => {
        this.hasMovedDuringDrag = false;
      }, 50);
    }
  };
  private onWindowKeyDown = (event: KeyboardEvent) => {
    // While the new-game dialog is open it captures every key: Escape
    // dismisses it, Enter begins the run, digits edit the seed input.
    if (this.isNewGameDialogOpen) {
      this.handleNewGameDialogKeyDown(event);
      return;
    }
    // While the save/load dialog is open it captures every key: the save
    // mode feeds the name input, both modes dismiss on Escape.
    if (this.saveLoadDialogMode) {
      this.handleSaveLoadDialogKeyDown(event);
      return;
    }
    if (this.appPhase === 'welcome') {
      // Escape acts as Back on the welcome sub views; on the main view
      // there is nothing to dismiss. While a rename input is focused it
      // only defocuses the input.
      if (this.welcomeView === 'heroSelection') {
        if (this.heroSelectionFocusedId) {
          this.handleHeroRenameKeyDown(event);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          this.backFromHeroSelection();
        }
        return;
      }
      if (event.key === 'Escape') {
        if (this.welcomeView === 'settings') {
          setWelcomeView('main');
        } else if (this.welcomeView === 'credits') {
          setWelcomeView('settings');
        }
      }
      return;
    }
    if (event.key === 'Escape' && get(radialMenuStore)) {
      radialMenuStore.set(null);
      this.hover.hoveredRadialIndex = null;
      this.renderUiLayer(true);
    }
    // Board zoom: '+' (or '=' on unshifted-plus layouts) zooms in, '-'
    // (or '_') zooms out, anchored at the view centre. The dialogs and
    // welcome views above capture their keys first, so the board owns
    // these keys here.
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomByKeyboard(1);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomByKeyboard(-1);
    }
  };

  private handleSaveLoadDialogKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSaveLoadDialog();
      return;
    }
    if (this.saveLoadDialogMode !== 'save') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmSaveDialog();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.saveNameInput = this.saveNameInput.slice(0, -1);
      this.renderUiLayer(true);
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      this.saveNameInput.length < MAX_SAVE_NAME_LENGTH
    ) {
      event.preventDefault();
      this.saveNameInput += event.key;
      this.renderUiLayer(true);
    }
  };

  /**
   * Game keyboard/touch input is suppressed while any modal surface is
   * open: the canvas debug menu, the save/load dialog, the new-game
   * dialog, the
   * dungeon intro, or the between-dungeons overlay (party wipe and
   * campaign win included). The save-name and seed inputs are
   * canvas-drawn, so the InputManager's DOM-text-input guard cannot see
   * them — enablement is driven explicitly here instead.
   */
  private syncGameInputEnabled(): void {
    inputManager.setEnabled(
      this.appPhase !== 'welcome' &&
        !this.isDebugMenuOpen &&
        !this.saveLoadDialogMode &&
        !this.isNewGameDialogOpen &&
        !this.showDungeonIntro &&
        !this.activeState?.betweenDungeons,
    );
  }

  // Whether the debug printout shows a ticking dungeon timer (and the
  // overlay layer therefore needs its once-per-second repaints).
  private debugTimerRunning(): boolean {
    return (
      Boolean(this.debugMode) &&
      this.activeState?.timer?.runningFrom !== undefined
    );
  }

  /** Opens the centered save/load dialog and closes the canvas menu. */
  private openSaveLoadDialog(mode: SaveLoadDialogMode): void {
    this.isDebugMenuOpen = false;
    this.currentDebugMenuView = 'debug';
    this.saveLoadDialogMode = mode;
    this.syncGameInputEnabled();
    if (mode === 'save') {
      // Prefill the save name with the current dungeon's name.
      const dungeon = this.activeState?.dungeon;
      this.saveNameInput = dungeon
        ? i18n(dungeon.nameTranslationKey ?? dungeon.name)
        : '';
    }
    this.hover.hoveredMenuItemId = null;
    this.renderUiLayer(true);
  }

  private closeSaveLoadDialog(): void {
    if (!this.saveLoadDialogMode) return;
    this.saveLoadDialogMode = null;
    this.syncGameInputEnabled();
    this.hover.hoveredMenuItemId = null;
    this.hover.isSdActionHovered = false;
    this.hover.isSdSecondaryHovered = false;
    this.renderUiLayer(true);
  }

  /** Saves under the current input name and closes the dialog. */
  private confirmSaveDialog = () => {
    const activeState = this.activeState;
    if (!activeState) return;
    if (this.externalState) {
      onSaveGame(activeState, this.saveNameInput);
      gameStateStore.set(this.externalState);
    } else {
      saveGame(this.saveNameInput);
    }
    this.saveLoadDialogMode = null;
    this.syncGameInputEnabled();
    this.hover.hoveredMenuItemId = null;
    this.hover.isSdActionHovered = false;
    this.hover.isSdSecondaryHovered = false;
    this.renderCanvas(true);
  };

  // --- new-game dialog -------------------------------------------------------

  /** Selection/hover options shared by the hit tester and the renderer. */
  private newGameDialogOptions(): NewGameDialogOptions {
    return {
      selectedCampaignId: this.newGameCampaignId,
      selectedGameMasterId: this.newGameGameMasterId,
      speedrunMode: this.newGameSpeedrunMode,
      seedInput: this.newGameSeedInput,
      hoveredCampaignId: this.hover.hoveredNgCampaignId,
      hoveredGameMasterId: this.hover.hoveredNgGameMasterId,
      isCheckboxHovered: this.hover.isNgCheckboxHovered,
      hoveredAction: this.hover.isNgActionHovered,
      hoveredSecondary: this.hover.isNgSecondaryHovered,
    };
  }

  /** Opens the centered new-game dialog, preselecting the current run. */
  private openNewGameDialog(): void {
    this.isDebugMenuOpen = false;
    this.currentDebugMenuView = 'debug';
    const activeState = this.activeState;
    // In the welcome phase there is no run to preselect from: keep the
    // previous dialog selections so returning from hero selection (Back)
    // restores them.
    this.newGameCampaignId =
      activeState?.campaignId ?? this.newGameCampaignId ?? DEFAULT_CAMPAIGN_ID;
    this.newGameGameMasterId =
      activeState?.gameMaster?.id ??
      this.newGameGameMasterId ??
      DEFAULT_GAME_MASTER_ID;
    if (activeState) {
      this.newGameSpeedrunMode = false;
      this.newGameSeedInput = String(DEFAULT_SPEEDRUN_SEED);
    }
    this.isNewGameDialogOpen = true;
    this.syncGameInputEnabled();
    this.hover.hoveredMenuItemId = null;
    this.renderUiLayer(true);
  }

  private closeNewGameDialog(): void {
    if (!this.isNewGameDialogOpen) return;
    this.isNewGameDialogOpen = false;
    this.syncGameInputEnabled();
    this.hover.hoveredMenuItemId = null;
    this.hover.hoveredNgCampaignId = null;
    this.hover.hoveredNgGameMasterId = null;
    this.hover.isNgCheckboxHovered = false;
    this.hover.isNgActionHovered = false;
    this.hover.isNgSecondaryHovered = false;
    this.renderUiLayer(true);
  }

  /** Starts the selected campaign/game master and closes the dialog. */
  private confirmNewGameDialog = () => {
    const parsedSeed = parseInt(this.newGameSeedInput, 10);
    const seed = this.newGameSpeedrunMode
      ? Number.isNaN(parsedSeed)
        ? DEFAULT_SPEEDRUN_SEED
        : parsedSeed
      : undefined;
    if (this.appPhase === 'welcome') {
      // Begin advances to the hero selection step; Start there begins
      // the run with the selected, possibly renamed party.
      const campaignId = this.newGameCampaignId ?? DEFAULT_CAMPAIGN_ID;
      this.heroSelectionCampaignId = campaignId;
      this.heroSelectionGameMasterId =
        this.newGameGameMasterId ?? DEFAULT_GAME_MASTER_ID;
      this.heroSelectionSpeedrunSeed = seed;
      this.heroSelectionIds = getDefaultSelectedHeroIds(
        getCampaign(campaignId),
      );
      this.heroSelectionNames = {};
      this.heroSelectionFocusedId = null;
      this.hoveredHeroSelectionId = null;
      this.isHsActionHovered = false;
      this.isHsSecondaryHovered = false;
      this.isNewGameDialogOpen = false;
      this.syncGameInputEnabled();
      setWelcomeView('heroSelection');
      return;
    }
    const activeState = this.activeState;
    if (!activeState) return;
    onNewGame(
      this.newGameCampaignId ?? DEFAULT_CAMPAIGN_ID,
      this.newGameGameMasterId ?? DEFAULT_GAME_MASTER_ID,
      activeState,
      this.props.onExternalStateChange,
      seed,
    );
    this.isNewGameDialogOpen = false;
    this.syncGameInputEnabled();
    this.panX = 0;
    this.panY = 0;
    this.zoom = ZOOM_DEFAULT;
    this.updateAllCanvasTransforms();
    this.renderCanvas(true);
  };

  /**
   * The new-game dialog captures every key while open: Escape and Cancel
   * dismiss it, Enter begins the run, and in speedrunner mode digits and
   * Backspace edit the seed input.
   */
  private handleNewGameDialogKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeNewGameDialog();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmNewGameDialog();
      return;
    }
    if (!this.newGameSpeedrunMode) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.newGameSeedInput = this.newGameSeedInput.slice(0, -1);
      this.renderUiLayer(true);
      return;
    }
    if (
      event.key.length === 1 &&
      event.key >= '0' &&
      event.key <= '9' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      this.newGameSeedInput.length < 9
    ) {
      event.preventDefault();
      this.newGameSeedInput += event.key;
      this.renderUiLayer(true);
    }
  }

  // Whether the speedrun timer chip shows a ticking dungeon timer (and
  // the UI layer therefore needs its high-frequency repaints).
  private speedrunTimerRunning(): boolean {
    return (
      this.activeState?.speedrunSeed !== undefined &&
      this.activeState?.timer?.runningFrom !== undefined
    );
  }

  private scheduleUiTimerRepaint(): void {
    if (!this.speedrunTimerRunning()) {
      if (this.uiTimerId) {
        clearTimeout(this.uiTimerId);
        this.uiTimerId = null;
      }
      return;
    }
    if (this.uiTimerId === null) {
      this.uiTimerId = setTimeout(() => {
        this.uiTimerId = null;
        this.renderUiLayer(true);
      }, UI_TIMER_REPAINT_MS);
    }
  }

  // --- UI input helpers ------------------------------------------------------

  /** Narrow-screen mode: corner squares, only the active actor's cards. */
  private get isCompactUiActive(): boolean {
    return isCompactUi(this.containerWidth);
  }

  /**
   * Collapsed state actually passed to the renderers. Compact mode keeps
   * its own open flags (both panels start collapsed); wide screens keep
   * the classic behaviour (diary always open, events per user toggle).
   */
  private get effectiveEventCardCollapsed(): boolean {
    return this.isCompactUiActive
      ? !this.mobileEventsOpen
      : this.isEventCardCollapsed;
  }

  private get effectiveDiaryCollapsed(): boolean {
    return this.isCompactUiActive && !this.mobileDiaryOpen;
  }

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
      isDebugMenuOpen: this.isDebugMenuOpen,
      debugMenuView: this.currentDebugMenuView,
      menuCallbacks: this.menuCallbacks,
      eventCardCollapsed: this.effectiveEventCardCollapsed,
      diaryCollapsed: this.effectiveDiaryCollapsed,
      saveLoadDialogMode: this.saveLoadDialogMode,
      saveName: this.saveNameInput,
      isNewGameDialogOpen: this.isNewGameDialogOpen,
      newGameDialog: this.newGameDialogOptions(),
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

  // --- welcome phase input ---------------------------------------------------

  /** Board pixel position of a pointer event, or null without a canvas. */
  private screenPointFromEvent(
    event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  ): { x: number; y: number } | null {
    if (!this.uiCanvas) return null;
    const rect = this.uiCanvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /**
   * Whether a run is parked in the store while the welcome screen is up
   * (fresh visits have none): gates the Continue and Save buttons. A
   * run whose final dungeon is beaten is a finished campaign, not an
   * ongoing run.
   */
  private get hasOngoingRun(): boolean {
    const state = this.activeState;
    if (!state) return false;
    return !state.dungeon?.beaten || Boolean(state.dungeon?.nextDungeon);
  }

  /**
   * Opens the welcome screen — the menu button's target since the main
   * menu folded into it. The run (if any) stays in the store; the
   * welcome screen's Continue button returns to it.
   */
  private openWelcomeScreen(): void {
    this.isDebugMenuOpen = false;
    this.currentDebugMenuView = 'debug';
    this.hover.hoveredMenuItemId = null;
    enterWelcomePhase();
    this.syncGameInputEnabled();
    this.renderCanvas(true);
  }

  /** Dispatches a new-game dialog click (game and welcome phases alike). */
  private handleNewGameDialogHit(ngHit: NewGameDialogHitResult): void {
    if (ngHit.type === 'campaign') {
      soundEffectManager.playButtonClick();
      this.newGameCampaignId = ngHit.campaignId;
      this.renderUiLayer(true);
    } else if (ngHit.type === 'gameMaster') {
      soundEffectManager.playButtonClick();
      this.newGameGameMasterId = ngHit.gameMasterId;
      this.renderUiLayer(true);
    } else if (ngHit.type === 'checkbox') {
      soundEffectManager.playButtonClick();
      this.newGameSpeedrunMode = !this.newGameSpeedrunMode;
      if (this.newGameSpeedrunMode) {
        this.newGameSeedInput = String(DEFAULT_SPEEDRUN_SEED);
      }
      this.renderUiLayer(true);
    } else if (ngHit.type === 'action') {
      soundEffectManager.playButtonClick();
      this.confirmNewGameDialog();
    } else if (ngHit.type === 'secondary' || ngHit.type === 'backdrop') {
      soundEffectManager.playButtonClick();
      this.closeNewGameDialog();
    }
  }

  /** Dispatches a save/load dialog click (game and welcome phases alike). */
  private handleSaveLoadDialogHit(dialogHit: SaveLoadDialogHitResult): void {
    if (dialogHit.type === 'row' && dialogHit.item) {
      soundEffectManager.playButtonClick();
      dialogHit.item.onClick(this.activeState ?? null);
      this.renderCanvas(true);
    } else if (dialogHit.type === 'action') {
      soundEffectManager.playButtonClick();
      if (this.saveLoadDialogMode === 'save') {
        this.confirmSaveDialog();
      } else {
        this.closeSaveLoadDialog();
      }
    } else if (dialogHit.type === 'secondary') {
      soundEffectManager.playButtonClick();
      this.closeSaveLoadDialog();
    } else if (dialogHit.type === 'backdrop') {
      this.closeSaveLoadDialog();
    }
  }

  /** Pointer hover while the welcome phase owns the screen. */
  private handleWelcomeMouseMove(event: MouseEvent): void {
    const point = this.screenPointFromEvent(event);
    if (!point || this.containerWidth <= 0 || this.containerHeight <= 0) {
      this.boardCursor = 'default';
      return;
    }
    if (this.isNewGameDialogOpen) {
      const hit = getNewGameDialogHit(
        this.containerWidth,
        this.containerHeight,
        point.x,
        point.y,
        this.newGameDialogOptions(),
      );
      if (hit) {
        this.applyHover(updateNewGameDialogHover(this.hover, hit));
      } else {
        this.boardCursor = 'default';
      }
      return;
    }
    if (this.saveLoadDialogMode) {
      const hit = getSaveLoadDialogHit(
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          mode: this.saveLoadDialogMode,
          callbacks: this.menuCallbacks,
        },
        point.x,
        point.y,
      );
      if (hit) {
        this.applyHover(updateSaveLoadDialogHover(this.hover, hit));
      } else {
        this.boardCursor = 'default';
      }
      return;
    }
    if (this.welcomeView === 'settings') {
      const settings = get(appSettingsStore);
      const hit = getSettingsHit(
        this.containerWidth,
        this.containerHeight,
        settings,
        point.x,
        point.y,
      );
      const rowId =
        hit &&
        (hit.type === 'toggle' ||
          hit.type === 'slider' ||
          hit.type === 'button')
          ? hit.rowId
          : null;
      const isBack = hit?.type === 'back';
      let changed = false;
      if (this.hoveredSettingsRowId !== rowId) {
        this.hoveredSettingsRowId = rowId;
        changed = true;
      }
      if (this.isSettingsBackHovered !== Boolean(isBack)) {
        this.isSettingsBackHovered = Boolean(isBack);
        changed = true;
      }
      if (changed) {
        this.renderUiLayer(true);
      }
      this.boardCursor = rowId !== null || isBack ? 'pointer' : 'default';
      return;
    }
    if (this.welcomeView === 'credits') {
      const hit = getCreditsHit(
        this.containerWidth,
        this.containerHeight,
        point.x,
        point.y,
      );
      const rowId = hit?.type === 'row' ? hit.rowId : null;
      const isBack = hit?.type === 'back';
      let changed = false;
      if (this.hoveredCreditsRowId !== rowId) {
        this.hoveredCreditsRowId = rowId;
        changed = true;
      }
      if (this.isCreditsBackHovered !== Boolean(isBack)) {
        this.isCreditsBackHovered = Boolean(isBack);
        changed = true;
      }
      if (changed) {
        this.renderUiLayer(true);
      }
      this.boardCursor = rowId !== null || isBack ? 'pointer' : 'default';
      return;
    }
    if (this.welcomeView === 'heroSelection') {
      if (!this.heroSelectionCampaignId) {
        this.boardCursor = 'default';
        return;
      }
      const hit = getHeroSelectionHit(
        this.containerWidth,
        this.containerHeight,
        this.heroSelectionCampaignId,
        point.x,
        point.y,
        this.heroSelectionOptions(),
      );
      const layout = getHeroSelectionLayout(
        this.containerWidth,
        this.containerHeight,
        this.heroSelectionCampaignId,
        this.heroSelectionOptions(),
      );
      const hoveredRowId =
        hit &&
        (hit.type === 'checkbox' ||
          hit.type === 'row' ||
          hit.type === 'nameInput')
          ? hit.heroId
          : null;
      // Dimmed rows (party full) are not interactive.
      const dimmedRow = layout.rows.find((r) => r.heroId === hoveredRowId);
      const effectiveRowId =
        dimmedRow && dimmedRow.dimmed && hit?.type !== 'nameInput'
          ? null
          : hoveredRowId;
      const isAction = hit?.type === 'start';
      const isSecondary = hit?.type === 'back';
      let changed = false;
      if (this.hoveredHeroSelectionId !== effectiveRowId) {
        this.hoveredHeroSelectionId = effectiveRowId;
        changed = true;
      }
      if (this.isHsActionHovered !== Boolean(isAction)) {
        this.isHsActionHovered = Boolean(isAction);
        changed = true;
      }
      if (this.isHsSecondaryHovered !== Boolean(isSecondary)) {
        this.isHsSecondaryHovered = Boolean(isSecondary);
        changed = true;
      }
      if (changed) {
        this.renderUiLayer(true);
      }
      this.boardCursor =
        effectiveRowId !== null || isAction || isSecondary
          ? 'pointer'
          : 'default';
      return;
    }
    if (this.welcomeView !== 'main') {
      this.boardCursor = 'default';
      return;
    }
    const hit = getWelcomeHit(
      this.containerWidth,
      this.containerHeight,
      point.x,
      point.y,
      { hasOngoingRun: this.hasOngoingRun },
    );
    if (hit !== this.hoveredWelcomeButton) {
      this.hoveredWelcomeButton = hit;
      this.renderUiLayer(true);
    }
    this.boardCursor = hit ? 'pointer' : 'default';
  }

  /** Pointer click while the welcome phase owns the screen. */
  private handleWelcomeClick(event: MouseEvent): void {
    const point = this.screenPointFromEvent(event);
    if (!point || this.containerWidth <= 0 || this.containerHeight <= 0) {
      return;
    }
    // A slider press already applied the value (and armed the drag, which
    // the window mouseup has since ended); only clicks without a matching
    // press fall through to set it here.
    const sliderPressHandled = this.settingsSliderPressHandled;
    this.settingsSliderPressHandled = false;
    if (this.isNewGameDialogOpen) {
      const hit = getNewGameDialogHit(
        this.containerWidth,
        this.containerHeight,
        point.x,
        point.y,
        this.newGameDialogOptions(),
      );
      if (hit) {
        this.handleNewGameDialogHit(hit);
      }
      return;
    }
    if (this.saveLoadDialogMode) {
      const hit = getSaveLoadDialogHit(
        this.containerWidth,
        this.containerHeight,
        this.activeState,
        {
          mode: this.saveLoadDialogMode,
          callbacks: this.menuCallbacks,
        },
        point.x,
        point.y,
      );
      if (hit) {
        this.handleSaveLoadDialogHit(hit);
      }
      return;
    }
    if (this.welcomeView === 'settings') {
      const settings = get(appSettingsStore);
      const hit = getSettingsHit(
        this.containerWidth,
        this.containerHeight,
        settings,
        point.x,
        point.y,
      );
      if (!hit) return;
      if (hit.type === 'toggle' && hit.rowId === 'music') {
        soundEffectManager.playButtonClick();
        updateAppSettings({ musicOn: !settings.musicOn });
        this.renderUiLayer(true);
        return;
      }
      if (hit.type === 'toggle' && hit.rowId === 'audio') {
        soundEffectManager.playButtonClick();
        updateAppSettings({ sfxOn: !settings.sfxOn });
        this.renderUiLayer(true);
        return;
      }
      if (hit.type === 'toggle' && hit.rowId === 'debug') {
        soundEffectManager.playButtonClick();
        // The app setting is the source of truth; it mirrors into the
        // run's settings while one exists.
        updateAppSettings({ debugOn: !settings.debugOn });
        this.renderUiLayer(true);
        return;
      }
      if (hit.type === 'slider') {
        if (!sliderPressHandled) {
          this.setSliderValueFromPoint(hit.rowId, point);
        }
        return;
      }
      if (hit.type === 'button' && hit.rowId === 'language') {
        soundEffectManager.playButtonClick();
        onChangeLanguage(this.activeState ?? null);
        this.renderUiLayer(true);
        return;
      }
      if (hit.type === 'button' && hit.rowId === 'credits') {
        soundEffectManager.playButtonClick();
        setWelcomeView('credits');
        return;
      }
      if (hit.type === 'back') {
        soundEffectManager.playButtonClick();
        setWelcomeView('main');
      }
      return;
    }
    if (this.welcomeView === 'credits') {
      const hit = getCreditsHit(
        this.containerWidth,
        this.containerHeight,
        point.x,
        point.y,
      );
      if (!hit) return;
      if (hit.type === 'row') {
        soundEffectManager.playButtonClick();
        if (hit.url && typeof window !== 'undefined' && window.open) {
          window.open(hit.url, '_blank', 'noopener, noreferrer');
        }
        return;
      }
      if (hit.type === 'back') {
        soundEffectManager.playButtonClick();
        setWelcomeView('settings');
      }
      return;
    }
    if (this.welcomeView === 'heroSelection') {
      if (!this.heroSelectionCampaignId) return;
      const hit = getHeroSelectionHit(
        this.containerWidth,
        this.containerHeight,
        this.heroSelectionCampaignId,
        point.x,
        point.y,
        this.heroSelectionOptions(),
      );
      if (hit) {
        this.handleHeroSelectionHit(hit);
      }
      return;
    }
    if (this.welcomeView !== 'main') {
      return;
    }
    const hit = getWelcomeHit(
      this.containerWidth,
      this.containerHeight,
      point.x,
      point.y,
      { hasOngoingRun: this.hasOngoingRun },
    );
    if (!hit) return;
    soundEffectManager.playButtonClick();
    if (hit === 'continue') {
      // The parked run is still in the store; the game phase renders it.
      enterGamePhase();
      this.renderCanvas(true);
    } else if (hit === 'newGame') {
      this.openNewGameDialog();
    } else if (hit === 'save') {
      this.openSaveLoadDialog('save');
    } else if (hit === 'loadGame') {
      this.openSaveLoadDialog('load');
    } else if (hit === 'settings') {
      setWelcomeView('settings');
    }
  }

  /** Selection/hover options shared by the hero selection hit and render. */
  private heroSelectionOptions(): HeroSelectionOptions {
    return {
      selectedHeroIds: this.heroSelectionIds,
      names: this.heroSelectionNames,
      focusedHeroId: this.heroSelectionFocusedId,
      hoveredHeroId: this.hoveredHeroSelectionId,
      hoveredAction: this.isHsActionHovered,
      hoveredSecondary: this.isHsSecondaryHovered,
    };
  }

  private resetHeroSelectionState(): void {
    this.heroSelectionCampaignId = null;
    this.heroSelectionGameMasterId = undefined;
    this.heroSelectionSpeedrunSeed = undefined;
    this.heroSelectionIds = [];
    this.heroSelectionNames = {};
    this.heroSelectionFocusedId = null;
    this.hoveredHeroSelectionId = null;
    this.isHsActionHovered = false;
    this.isHsSecondaryHovered = false;
  }

  /** Starts the run with the selected, possibly renamed party. */
  private confirmHeroSelection = (): void => {
    const campaignId = this.heroSelectionCampaignId;
    if (!campaignId) return;
    if (!isHeroSelectionStartEnabled(this.heroSelectionIds)) return;
    const heroes = buildSelectedHeroes(
      getCampaign(campaignId),
      this.heroSelectionIds,
      this.heroSelectionNames,
    );
    this.resetHeroSelectionState();
    // The welcome phase has no state to build on: the store dispatcher
    // starts the run (writing the reload guard) and switches the phase.
    onNewGame(
      campaignId,
      this.heroSelectionGameMasterId ?? DEFAULT_GAME_MASTER_ID,
      undefined,
      undefined,
      this.heroSelectionSpeedrunSeed,
      heroes,
    );
  };

  /** Back: returns to the new-game dialog, selections remembered. */
  private backFromHeroSelection = (): void => {
    this.heroSelectionFocusedId = null;
    setWelcomeView('main');
    this.openNewGameDialog();
  };

  /**
   * While a rename input is focused the hero selection screen captures
   * every key: characters and Backspace edit the prefilled name (the
   * typed name, or the roster default while none is typed), Escape and
   * Enter defocus it.
   */
  private handleHeroRenameKeyDown(event: KeyboardEvent): void {
    const heroId = this.heroSelectionFocusedId;
    const campaignId = this.heroSelectionCampaignId;
    if (!heroId || !campaignId) return;
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      this.heroSelectionFocusedId = null;
      this.renderUiLayer(true);
      return;
    }

    const isRenameKey =
      event.key === 'Backspace' ||
      (event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey);

    if (!isRenameKey) return;
    event.preventDefault();
    this.heroSelectionNames[heroId] = applyHeroRenameKey(
      getHeroRenameValue(
        getCampaign(campaignId),
        heroId,
        this.heroSelectionNames,
      ),
      event.key,
    );
    this.renderUiLayer(true);
  }

  /** Dispatches a hero selection click (welcome phase only). */
  private handleHeroSelectionHit(hit: HeroSelectionHitResult): void {
    if (hit.type === 'nameInput') {
      soundEffectManager.playButtonClick();
      this.heroSelectionFocusedId = hit.heroId;
      this.renderUiLayer(true);
      return;
    }
    if (hit.type === 'checkbox' || hit.type === 'row') {
      const layout = getHeroSelectionLayout(
        this.containerWidth,
        this.containerHeight,
        this.heroSelectionCampaignId ?? '',
        this.heroSelectionOptions(),
      );
      const row = layout.rows.find((r) => r.heroId === hit.heroId);
      // Rows beyond the maximum are a no-op while the party is full.
      if (row && !row.dimmed) {
        soundEffectManager.playButtonClick();
        this.heroSelectionIds = toggleHeroSelection(
          layout.rows.map((r) => r.heroId),
          this.heroSelectionIds,
          hit.heroId,
          // layout counts only the visible rows; the cap comes from the
          // campaign itself.
          getMaxHeroes(getCampaign(this.heroSelectionCampaignId ?? '')),
        );
        this.renderUiLayer(true);
      }
      return;
    }
    if (hit.type === 'start') {
      if (isHeroSelectionStartEnabled(this.heroSelectionIds)) {
        soundEffectManager.playButtonClick();
        this.confirmHeroSelection();
      }
      return;
    }
    if (hit.type === 'back') {
      soundEffectManager.playButtonClick();
      this.backFromHeroSelection();
      return;
    }
    // panel and backdrop: nothing to dismiss.
  }

  /**
   * Sets the dragged slider's value from the pointer x position,
   * applying it live (the volume changes audibly while dragging).
   */
  private updateSliderFromPointer(point: { x: number; y: number }): void {
    if (!this.settingsSliderDrag) return;
    this.setSliderValueFromPoint(this.settingsSliderDrag, point);
  }

  /** Applies a slider value for a pointer position, clamped to the track. */
  private setSliderValueFromPoint(
    rowId: 'musicVolume' | 'audioVolume',
    point: { x: number; y: number },
  ): void {
    const layout = getSettingsLayout(
      this.containerWidth,
      this.containerHeight,
      get(appSettingsStore),
    );
    const row = layout.rows.find((r) => r.id === rowId);
    if (!row?.slider) return;
    const value = getSliderValueFromX(row.slider.trackBounds, point.x);
    updateAppSettings(
      rowId === 'musicVolume' ? { musicVolume: value } : { sfxVolume: value },
    );
    this.renderUiLayer(true);
  }

  /**
   * Starts a volume-slider drag at a pointer press. Returns true when the
   * press hit a slider (and the value was applied at the press position).
   */
  private beginSettingsSliderPress(point: { x: number; y: number }): boolean {
    if (this.welcomeView !== 'settings') return false;
    if (this.containerWidth <= 0 || this.containerHeight <= 0) return false;
    const hit = getSettingsHit(
      this.containerWidth,
      this.containerHeight,
      get(appSettingsStore),
      point.x,
      point.y,
    );
    if (hit?.type !== 'slider') return false;
    this.settingsSliderDrag = hit.rowId;
    this.settingsSliderPressHandled = true;
    this.setSliderValueFromPoint(hit.rowId, point);
    return true;
  }

  public onMouseDown = (event: MouseEvent) => {
    // The welcome phase has no board to pan and no gameplay UI, but a
    // volume-slider press starts its drag immediately: the value is set
    // at press and tracks the pointer until release.
    if (this.appPhase === 'welcome') {
      if (event.button === 0) {
        const point = this.screenPointFromEvent(event);
        if (point) {
          this.beginSettingsSliderPress(point);
        }
      }
      return;
    }
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
    if (this.appPhase === 'welcome') {
      this.handleWelcomeClick(event);
      return;
    }

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
        if (bdHit.type === 'wipeButton') {
          soundEffectManager.playButtonClick();
          if (bdHit.action === 'restartCampaign') {
            onNewGame(
              activeState.campaignId ?? DEFAULT_CAMPAIGN_ID,
              activeState.gameMaster?.id ?? DEFAULT_GAME_MASTER_ID,
              activeState,
              this.props.onExternalStateChange,
            );
            this.renderCanvas(true);
          } else if (bdHit.action === 'restartDungeon') {
            const updated = restartDungeonAfterWipe(activeState);
            this.props.onExternalStateChange(updated);
            if (activeState.dungeon?.startingPositions?.[0]) {
              this.panX = 0;
              this.panY = 0;
              this.zoom = ZOOM_DEFAULT;
              this.updateAllCanvasTransforms();
            }
            this.renderCanvas(true);
          } else {
            // The load dialog opens on top of the wipe overlay; cancelling
            // it returns to the wipe screen.
            this.openSaveLoadDialog('load');
            this.renderUiLayer(true);
          }
          return;
        }
        if (bdHit.type === 'actionButton') {
          soundEffectManager.playButtonClick();
          if (activeState.betweenDungeons.step === 'campaignComplete') {
            // Final screen dismissed: the campaign is over, so the player
            // returns to the welcome screen (the former main menu).
            activeState.betweenDungeons = undefined;
            this.openWelcomeScreen();
          } else if (activeState.betweenDungeons.step === 'levelUp') {
            setBetweenDungeonsStep(activeState, 'trade');
          } else {
            completeBetweenDungeonsAndStartNext(activeState);
            if (activeState.dungeon?.startingPositions?.[0]) {
              this.panX = 0;
              this.panY = 0;
              this.zoom = ZOOM_DEFAULT;
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

      if (hit?.kind === 'newGameDialog') {
        this.handleNewGameDialogHit(hit.hit);
        return;
      }

      if (hit?.kind === 'saveLoadDialog') {
        this.handleSaveLoadDialogHit(hit.hit);
        return;
      }

      if (hit?.kind === 'topBar') {
        const topBarHit = hit.hit;
        if (topBarHit === 'menu') {
          soundEffectManager.playButtonClick();
          // The menu button opens the welcome screen — the main menu
          // folded into it. The run stays in the store; its Continue
          // button returns to the game.
          this.openWelcomeScreen();
          return;
        }
        if (topBarHit === 'debug') {
          soundEffectManager.playButtonClick();
          if (this.isDebugMenuOpen) {
            this.isDebugMenuOpen = false;
          } else {
            this.isDebugMenuOpen = true;
            this.currentDebugMenuView = 'debug';
          }
          this.hover.hoveredMenuItemId = null;
          this.syncGameInputEnabled();
          this.renderUiLayer(true);
          return;
        }
        return;
      }

      if (hit?.kind === 'debugMenu') {
        const debugMenuHit = hit.hit;
        if (debugMenuHit.type === 'item' && debugMenuHit.item) {
          soundEffectManager.playButtonClick();
          debugMenuHit.item.onClick(activeState);
          this.renderCanvas(true);
        } else if (debugMenuHit.type === 'backdrop') {
          this.isDebugMenuOpen = false;
          this.currentDebugMenuView = 'debug';
          this.hover.hoveredMenuItemId = null;
          this.syncGameInputEnabled();
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
          if (this.isCompactUiActive) {
            this.mobileEventsOpen = !this.mobileEventsOpen;
          } else {
            this.isEventCardCollapsed = !this.isEventCardCollapsed;
          }
          this.renderUiLayer(true);
        }
        return;
      }

      if (hit?.kind === 'diary') {
        // The diary only dispatches in compact mode, where its corner
        // square (or the panel's close button) toggles it open/closed.
        if (hit.hit.type === 'toggle') {
          soundEffectManager.playButtonClick();
          this.mobileDiaryOpen = !this.mobileDiaryOpen;
          this.renderUiLayer(true);
        }
        return;
      }

      // Monster cards and the open diary consume the click without
      // dispatching.
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
        this.zoom,
      );
      const clickedBtn = findHoveredRadialButton(menu, this.cellSize, worldPos);
      radialMenuStore.set(null);
      this.hover.hoveredRadialIndex = null;
      this.renderUiLayer(true);

      if (clickedBtn) {
        soundEffectManager.playButtonClick();
        const curState = this.externalState ?? get(gameStateStore);
        if (curState) {
          executeRadialAction(
            curState,
            clickedBtn.entry.action,
            clickedBtn.entry.door,
            clickedBtn.entry.interactable,
            clickedBtn.entry.item,
            clickedBtn.entry.targetHero,
            clickedBtn.entry.itemLocation,
          );
          if (!this.externalState) {
            gameStateStore.set(curState);
          }
        }
      }
      return;
    }

    if (this.externalState) {
      doMouseLogic(event, this.cellSize, this.externalState, {
        panX: this.panX,
        panY: this.panY,
        zoom: this.zoom,
        viewWidth: this.containerWidth,
        viewHeight: this.containerHeight,
        centerPosition: this.startPosition,
      });
      gameStateStore.set(this.externalState);
    } else {
      handleCanvasClick(event, this.cellSize, {
        panX: this.panX,
        panY: this.panY,
        zoom: this.zoom,
        viewWidth: this.containerWidth,
        viewHeight: this.containerHeight,
        centerPosition: this.startPosition,
      });
    }
  };

  public onMouseMove = (event: MouseEvent) => {
    if (this.isDragging) return;
    if (this.appPhase === 'welcome') {
      this.handleWelcomeMouseMove(event);
      return;
    }
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
      // open: its hover state updates even when no element is hit. The
      // save/load dialog sits on top of it, so while the dialog is open its
      // hover wins instead.
      if (
        this.activeState.betweenDungeons &&
        !this.saveLoadDialogMode &&
        !this.isNewGameDialogOpen
      ) {
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
        this.zoom,
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
      this.zoom,
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
    if (this.hoveredWelcomeButton !== null) {
      this.hoveredWelcomeButton = null;
      if (this.appPhase === 'welcome') {
        this.renderUiLayer(true);
      }
    }
    if (clearBoardHovers(this.hover, { radial: true })) {
      this.renderUiLayer(true);
    }
  };

  public onWheel = (event: WheelEvent) => {
    // Nothing to zoom or pan on the welcome screen; still swallow the
    // scroll.
    if (this.appPhase === 'welcome') {
      event.preventDefault();
      return;
    }
    const rect = this.uiCanvas?.getBoundingClientRect();
    const anchorX = rect ? event.clientX - rect.left : this.containerWidth / 2;
    const anchorY = rect ? event.clientY - rect.top : this.containerHeight / 2;
    // One wheel burst resolves to a single gesture: trackpad scrolls
    // (small/fractional pixel deltas, or line-mode on their own) pan,
    // while discrete mouse-wheel notches and ctrl+wheel (trackpad pinch)
    // zoom. The classification sticks for a burst mid-stream so a trackpad
    // flick never flips gestures halfway.
    const mode = classifyWheelEvent(
      this.wheelGestureState,
      {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey,
      },
      Date.now(),
    );
    if (mode === 'pan') {
      const startPanX = this.panX;
      const startPanY = this.panY;
      this.panX -= event.deltaX;
      this.panY -= event.deltaY;
      if (this.panX !== startPanX || this.panY !== startPanY) {
        this.updateAllCanvasTransforms();
        this.renderCanvas(true);
      }
    } else {
      // Sideways deltas in a zoom burst belong to tilt wheels; pure zoom
      // streams carry none, so this never mixes a trackpad's pan into the
      // zoom.
      const startPanX = this.panX;
      this.panX -= event.deltaX;
      const zoomed = this.applyZoom(
        zoomFromWheelDelta(this.zoom, event.deltaY),
        anchorX,
        anchorY,
      );
      if (!zoomed && this.panX !== startPanX) {
        this.updateAllCanvasTransforms();
        this.renderCanvas(true);
      }
    }
    event.preventDefault();
  };
}
