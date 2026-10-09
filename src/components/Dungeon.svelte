<script lang="ts">
  import type {
    Actor,
    Door,
    GameState,
    Hero,
    InteractableCell,
    Monster,
    Secret,
  } from '../types';
  import { onMount, onDestroy } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import actorSprites from '$lib/Dungeon_Character_3.png';
  import {
    doMouseLogic,
    getCursorType,
    screenToGridPosition,
    screenToWorldPosition,
    executeRadialAction,
  } from '../hero/ClickInputLogic';
  import type { CursorType } from '../hero/ClickInputLogic';
  import { browser } from '$app/environment';
  import { renderHeroes } from '../hero/HeroRendering';
  import { renderMonsters } from '../monsters/MonsterRendering';
  import {
    background,
    renderDoors,
    renderGrid,
    renderInteractables,
    renderPillars,
    renderPortal,
    renderSecrets,
  } from '../dungeon/DungeonRendering';
  import { renderItems } from '../items/ItemRendering';
  import {
    renderRadialMenu,
    findHoveredRadialButton,
    renderTopBar,
    getTopBarHit,
    renderHeroCards,
    getHeroCardsHit,
    renderMonsterCards,
    getMonsterCardsHit,
    renderDiaryAndWinConditions,
    renderEventCard,
    getEventCardHit,
    renderMenuModal,
    getMenuHit,
  } from '../ui/UIRendering';
  import type { MenuView } from '../menu/MenuLogic';
  import buildInfo from '$lib/buildInfo.json';
  import { locale } from '$lib/translations';
  import { useItem } from '../items/ItemLogic';
  import { radialMenuStore } from '../store/radialMenuStore';
  import { renderNotes } from '../notes/NotesRendering';
  import { renderDamageIndicators } from '../combat/DamageIndicatorRendering';
  import { clearTileTextureCache } from '../dungeon/TileTextureCache';
  import { hasActiveActorAnimations } from '../core';
  import {
    gameStateStore,
    debugModeStore,
    handleCanvasClick,
    toggleHeroInventory,
    useHeroItem,
  } from '../store/gameStateStore';
  import DungeonIntro from './DungeonIntro.svelte';

  export let state: GameState | undefined = undefined;
  export let debugMode: boolean | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: activeDebugMode =
    debugMode !== undefined
      ? debugMode
      : Boolean(activeState?.settings?.['debug'] ?? $debugModeStore);
  $: dungeon = activeState?.dungeon;
  $: startPosition = dungeon?.startingPositions?.[0];

  $: cellSize = (activeState?.settings?.['cellSize'] as number) ?? 48;
  let totalReRenderCount = 0;
  let staticRenderCount = 0;
  let dynamicRenderCount = 0;
  let ground: HTMLImageElement | null = null;
  let actors: HTMLImageElement | null = null;
  let isMounted = false;

  let containerElement: HTMLDivElement | null = null;
  let containerWidth = 0;
  let containerHeight = 0;
  let lastContainerWidth = 0;
  let lastContainerHeight = 0;

  let panX = 0;
  let panY = 0;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;
  let hasMovedDuringDrag = false;

  let staticCanvas: HTMLCanvasElement | null = null;
  let actorCanvas: HTMLCanvasElement | null = null;
  let overlayCanvas: HTMLCanvasElement | null = null;
  let uiCanvas: HTMLCanvasElement | null = null;

  let lastStaticSignature = '';
  let lastDynamicSignature = '';
  let lastOverlaySignature = '';
  let lastUiSignature = '';
  let lastCellSize = cellSize;
  let overlayAnimationId: number | null = null;
  let dynamicAnimationId: number | null = null;
  let hoveredRadialIndex: number | null = null;
  let isMenuHovered = false;
  let isDebugHovered = false;
  let isLogHovered = false;
  let isLogHeld = false;
  let isLogOpen = false;
  let isCanvasMenuOpen = false;
  let currentMenuView: MenuView = 'main';
  let hoveredMenuItemId: string | null = null;
  let hoveredInventoryHeroName: string | null = null;
  let hoveredCloseHeroName: string | null = null;
  let hoveredUseItem: { heroName: string; itemIndex: number } | null = null;
  let isEventCardCollapsed = false;
  let isEventCardToggleHovered = false;

  $: menuCallbacks = {
    setView: (view: MenuView) => {
      currentMenuView = view;
      hoveredMenuItemId = null;
      renderUiLayer(true);
    },
    closeMenu: () => {
      isCanvasMenuOpen = false;
      currentMenuView = 'main';
      hoveredMenuItemId = null;
      renderUiLayer(true);
    },
    setState: (newState: GameState) => {
      if (state) {
        state = newState;
      }
      renderCanvas(true);
    },
  };

  const getStaticSignature = (st: GameState, dbg: boolean, size: number) => {
    const d = st?.dungeon;
    if (!d) return '';
    return `${d.name}|${(d.discoveredRooms ?? []).join(',')}|${(d.layout?.doors ?? [])
      .map((dr: Door) => `${dr.x},${dr.y},${dr.open},${dr.locked},${dr.hidden}`)
      .join(';')}|${(d.layout?.secrets ?? [])
      .map((s: Secret) => `${s.position.x},${s.position.y},${s.found}`)
      .join(';')}|${(d.layout?.interactables ?? [])
      .map(
        (i: InteractableCell) =>
          `${i.position.x},${i.position.y},${i.secret},${i.interacted}`,
      )
      .join(';')}|${d.layout?.items?.length ?? 0}|${
      d.layout?.pits?.length ?? 0
    }|${d.portal?.x},${d.portal?.y}|${size}|${dbg}`;
  };

  const getDynamicSignature = (st: GameState, dbg: boolean, size: number) => {
    const heroes = (st?.heroes ?? [])
      .map(
        (h: Actor) =>
          `${h.name},${h.position.x},${h.position.y},${h.health},${h.actions},${h.movement},${h.incapacitated}`,
      )
      .join(';');
    const monsters = (st?.dungeon?.layout?.monsters ?? [])
      .map((m: Monster) => `${m.name},${m.position.x},${m.position.y},${m.health}`)
      .join(';');
    const curActor = `${st?.currentActor?.name},${st?.currentActor?.position?.x},${st?.currentActor?.position?.y}`;
    return `${heroes}|${monsters}|${curActor}|${size}|${dbg}`;
  };

  const getOverlaySignature = (st: GameState, dbg: boolean, size: number) => {
    const curActor = `${st.currentActor?.name},${st.currentActor?.position?.x},${st.currentActor?.position?.y}`;
    const dmgCount = st.damageIndicators?.length ?? 0;
    return `${curActor}|${dmgCount}|${size}|${dbg}`;
  };

  const isReady = (img: HTMLImageElement | null): boolean => {
    return !!img && img.complete && img.naturalWidth > 0;
  };

  const updateAllCanvasTransforms = () => {
    if (!containerWidth || !containerHeight) return;
    const ratio = (browser && window.devicePixelRatio) || 1;
    const centerOffsetX = startPosition
      ? (startPosition.x + 0.5) * cellSize
      : 0;
    const centerOffsetY = startPosition
      ? (startPosition.y + 0.5) * cellSize
      : 0;
    for (const canvas of [staticCanvas, actorCanvas, overlayCanvas, uiCanvas]) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            ratio * (containerWidth / 2 + panX - centerOffsetX),
            ratio * (containerHeight / 2 + panY - centerOffsetY),
          );
        }
      }
    }
  };

  const renderStaticLayer = (force = false) => {
    if (!activeState || !browser || !ground || !staticCanvas) return;
    if (!isReady(ground)) return;
    const sig = getStaticSignature(
      activeState,
      activeDebugMode ?? false,
      cellSize,
    );
    if (!force && sig === lastStaticSignature) return;
    lastStaticSignature = sig;

    const ctx = staticCanvas.getContext('2d');
    if (!ctx) return;

    staticRenderCount++;
    totalReRenderCount++;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
    ctx.restore();

    const gridCols = activeState.dungeon?.layout?.grid?.[0]?.length ?? 40;
    const gridRows = activeState.dungeon?.layout?.grid?.length ?? 30;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cellSize * gridCols, cellSize * gridRows);
    renderGrid(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderSecrets(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderItems(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderInteractables(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderDoors(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderPillars(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderPortal(ctx, cellSize, activeState, activeDebugMode ?? false);
  };

  const renderDynamicLayer = (force = false) => {
    if (!activeState || !browser || !actors || !actorCanvas) return;
    if (!isReady(actors)) return;
    const hasActiveAnimations = hasActiveActorAnimations();
    const sig = getDynamicSignature(
      activeState,
      activeDebugMode ?? false,
      cellSize,
    );
    if (!force && !hasActiveAnimations && sig === lastDynamicSignature) return;
    lastDynamicSignature = sig;

    const ctx = actorCanvas.getContext('2d');
    if (!ctx) return;

    const currentTime = Date.now();
    dynamicRenderCount++;
    totalReRenderCount++;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, actorCanvas.width, actorCanvas.height);
    ctx.restore();

    const hasActiveMonsters = renderMonsters(
      ctx,
      actors,
      cellSize,
      activeState,
      activeDebugMode ?? false,
      currentTime,
    );
    const hasActiveHeroes = renderHeroes(
      ctx,
      actors,
      cellSize,
      activeState,
      activeDebugMode ?? false,
      currentTime,
    );

    if (dynamicAnimationId) {
      cancelAnimationFrame(dynamicAnimationId);
      dynamicAnimationId = null;
    }

    if (
      hasActiveMonsters ||
      hasActiveHeroes ||
      hasActiveActorAnimations(currentTime)
    ) {
      dynamicAnimationId = requestAnimationFrame(() => {
        renderDynamicLayer(true);
      });
    }
  };

  const renderOverlayLayer = (force = false) => {
    if (!activeState || !browser || !actors || !overlayCanvas) return;
    if (!isReady(actors)) return;
    const hasDamageIndicators = (activeState.damageIndicators?.length ?? 0) > 0;
    const sig = getOverlaySignature(
      activeState,
      activeDebugMode ?? false,
      cellSize,
    );
    if (!force && !hasDamageIndicators && sig === lastOverlaySignature && !activeDebugMode) return;
    lastOverlaySignature = sig;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.restore();

    renderNotes(ctx, actors, cellSize, activeState, activeDebugMode ?? false);
    const hasActiveDamage = renderDamageIndicators(
      ctx,
      cellSize,
      activeState,
      Date.now(),
    );
    if (activeDebugMode) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const ratio = (browser && window.devicePixelRatio) || 1;
      ctx.scale(ratio, ratio);
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText(
        `Re-renders: ${totalReRenderCount} (Static: ${staticRenderCount}, Dynamic: ${dynamicRenderCount})`,
        10,
        14,
      );
      ctx.restore();
    }

    if (overlayAnimationId) {
      cancelAnimationFrame(overlayAnimationId);
      overlayAnimationId = null;
    }

    if (hasActiveDamage) {
      overlayAnimationId = requestAnimationFrame(() => {
        renderOverlayLayer(true);
      });
    } else if (hasDamageIndicators) {
      // Clean up finished indicators
      activeState.damageIndicators = [];
      if (!state) {
        gameStateStore.set(activeState);
      }
    }
  };

  const renderUiLayer = (force = false) => {
    if (!browser || !uiCanvas) return;
    const menu = $radialMenuStore;
    const recentLogs = activeState?.actionLog?.slice(0, 8);
    const logSig = recentLogs
      ? recentLogs.map((l) => `${l.turn}:${l.key}`).join(';')
      : '';
    const heroesSig = activeState?.heroes
      ? (activeState.heroes as Hero[])
          .map(
            (h) =>
              `${h.name}:${h.health}:${h.actions}:${h.movement}:${h.isInventoryOpen}:${h.experience}:${h.inventory?.length}`,
          )
          .join(';')
      : '';
    const monstersSig = (activeState?.dungeon?.layout?.monsters ?? [])
      .map((m) => `${m.name}:${m.health}:${m.position.x},${m.position.y}`)
      .join(';');
    const roomsSig = (activeState?.dungeon?.discoveredRooms ?? []).join(',');
    const hoverSig = `${hoveredInventoryHeroName}:${hoveredCloseHeroName}:${hoveredUseItem?.heroName}-${hoveredUseItem?.itemIndex}`;
    const targetSig = `${activeState?.targetActor?.name}:${activeState?.currentActor?.name}`;
    const winSig = `${activeState?.dungeon?.killCount}:${(activeState?.dungeon?.winConditions ?? []).map((w) => `${w.fulfilled}`).join(',')}`;
    const diarySig = `${(activeState?.dungeon?.layout?.notes ?? []).filter((n) => n.found).map((n) => `${n.id}:${n.foundOn}`).join(',')}`;
    const eventSig = `${activeState?.currentEvent?.id ?? ''}:${(activeState?.eventDeck ?? []).map((e) => `${e.number}-${e.used}`).join(',')}:${isEventCardCollapsed}:${isEventCardToggleHovered}`;
    const currentDebug =
      debugMode !== undefined
        ? debugMode
        : Boolean(activeState?.settings?.['debug'] ?? activeDebugMode);
    const menuSig = `${isCanvasMenuOpen}:${currentMenuView}:${hoveredMenuItemId}:${currentDebug}:${$locale}:${activeState?.settings?.['locale']}:${activeState?.difficulty?.id}:${activeState?.dungeon?.beaten}`;
    const sig = `${menu?.x},${menu?.y},${menu?.entries?.length ?? 0},${hoveredRadialIndex},${cellSize},${containerWidth},${containerHeight},${activeState?.turnCount},${logSig},${isMenuHovered},${isDebugHovered},${isLogHovered},${isLogOpen},${heroesSig},${monstersSig},${roomsSig},${hoverSig},${targetSig},${winSig},${diarySig},${eventSig},${menuSig}`;
    if (!force && sig === lastUiSignature) return;
    lastUiSignature = sig;

    const ctx = uiCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    ctx.restore();

    if (containerWidth > 0 && containerHeight > 0 && activeState) {
      const ratio = (browser && window.devicePixelRatio) || 1;
      ctx.save();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderTopBar(ctx, containerWidth, activeState, {
        isMenuHovered,
        isDebugHovered,
        isLogHovered,
        isLogOpen,
        debugMode: currentDebug,
      });
      renderHeroCards(ctx, containerWidth, containerHeight, activeState, {
        hoveredInventoryHeroName,
        hoveredCloseHeroName,
        hoveredUseItem,
      });
      renderMonsterCards(ctx, containerWidth, containerHeight, activeState);
      renderDiaryAndWinConditions(ctx, containerWidth, containerHeight, activeState);
      renderEventCard(ctx, containerWidth, containerHeight, activeState, {
        isCollapsed: isEventCardCollapsed,
        isToggleHovered: isEventCardToggleHovered,
      });
      if (isCanvasMenuOpen) {
        renderMenuModal(ctx, containerWidth, containerHeight, activeState, {
          view: currentMenuView,
          hoveredItemId: hoveredMenuItemId,
          buildInfo,
          debugMode: currentDebug,
          callbacks: menuCallbacks,
        });
      }
      ctx.restore();
    }

    if (menu) {
      renderRadialMenu(ctx, cellSize, menu, hoveredRadialIndex);
    }
  };

  const renderCanvas = (force = false) => {
    renderStaticLayer(force);
    renderDynamicLayer(force);
    renderOverlayLayer(force);
    renderUiLayer(force);
  };

  const initCanvas = (
    canvas: HTMLCanvasElement | null,
    width: number,
    height: number,
    ratio: number,
  ) => {
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const centerOffsetX = startPosition
        ? (startPosition.x + 0.5) * cellSize
        : 0;
      const centerOffsetY = startPosition
        ? (startPosition.y + 0.5) * cellSize
        : 0;
      ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        ratio * (width / 2 + panX - centerOffsetX),
        ratio * (height / 2 + panY - centerOffsetY),
      );
    }
  };

  const updateDimensions = () => {
    if (
      containerWidth !== lastContainerWidth ||
      containerHeight !== lastContainerHeight
    ) {
      lastContainerWidth = containerWidth;
      lastContainerHeight = containerHeight;
      const ratio = (browser && window.devicePixelRatio) || 1;
      initCanvas(staticCanvas, containerWidth, containerHeight, ratio);
      initCanvas(actorCanvas, containerWidth, containerHeight, ratio);
      initCanvas(overlayCanvas, containerWidth, containerHeight, ratio);
      initCanvas(uiCanvas, containerWidth, containerHeight, ratio);
      renderCanvas(true);
    }
  };

  const onWindowMouseMove = (event: MouseEvent) => {
    if (isDragging) {
      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedDuringDrag = true;
      }
      panX = dragStartPanX + dx;
      panY = dragStartPanY + dy;
      updateAllCanvasTransforms();
      renderCanvas(true);
    }
  };

  const onWindowMouseUp = () => {
    if (isLogHeld || isLogOpen) {
      isLogHeld = false;
      isLogOpen = false;
      renderUiLayer(true);
    }
    if (isDragging) {
      isDragging = false;
      if (hasMovedDuringDrag) {
        setTimeout(() => {
          hasMovedDuringDrag = false;
        }, 50);
      }
    }
  };

  onMount(() => {
    isMounted = true;
    ground = new Image();
    actors = new Image();

    if (browser) {
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    }

    const ratio = (browser && window.devicePixelRatio) || 1;
    if (containerWidth && containerHeight) {
      initCanvas(staticCanvas, containerWidth, containerHeight, ratio);
      initCanvas(actorCanvas, containerWidth, containerHeight, ratio);
      initCanvas(overlayCanvas, containerWidth, containerHeight, ratio);
      initCanvas(uiCanvas, containerWidth, containerHeight, ratio);
    }

    if (browser) {
      window.addEventListener('keydown', onWindowKeyDown);
    }

    ground.onload = () => {
      renderStaticLayer(true);
    };
    actors.onload = () => {
      renderDynamicLayer(true);
      renderOverlayLayer(true);
    };

    ground.src = groundSprites;
    actors.src = actorSprites;

    if (isReady(ground)) {
      renderStaticLayer(true);
    }
    if (isReady(actors)) {
      renderDynamicLayer(true);
      renderOverlayLayer(true);
    }
    renderUiLayer(true);
  });

  const onWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && $radialMenuStore) {
      radialMenuStore.set(null);
      hoveredRadialIndex = null;
      renderUiLayer(true);
    }
  };

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('keydown', onWindowKeyDown);
    }
    if (overlayAnimationId) {
      cancelAnimationFrame(overlayAnimationId);
      overlayAnimationId = null;
    }
    if (dynamicAnimationId) {
      cancelAnimationFrame(dynamicAnimationId);
      dynamicAnimationId = null;
    }
  });

  $: if (
    isMounted &&
    (containerWidth !== lastContainerWidth ||
      containerHeight !== lastContainerHeight)
  ) {
    updateDimensions();
  }

  $: if (isMounted && cellSize !== lastCellSize) {
    lastCellSize = cellSize;
    clearTileTextureCache();
    const ratio = (browser && window.devicePixelRatio) || 1;
    initCanvas(staticCanvas, containerWidth, containerHeight, ratio);
    initCanvas(actorCanvas, containerWidth, containerHeight, ratio);
    initCanvas(overlayCanvas, containerWidth, containerHeight, ratio);
    initCanvas(uiCanvas, containerWidth, containerHeight, ratio);
    renderCanvas(true);
  }

  $: if (isMounted && $radialMenuStore !== undefined) {
    renderUiLayer(true);
  }

  $: if (isMounted && activeState && activeDebugMode !== undefined) {
    renderCanvas(false);
  }

  $: if (isMounted && $locale) {
    renderCanvas(true);
  }

  let lastDungeonKey = '';
  $: dungeonKey = dungeon
    ? `${dungeon.name}|${startPosition?.x},${startPosition?.y}`
    : '';
  $: if (isMounted && dungeonKey !== lastDungeonKey) {
    lastDungeonKey = dungeonKey;
    panX = 0;
    panY = 0;
    updateAllCanvasTransforms();
    renderCanvas(true);
  }

  const onMouseDown = (event: MouseEvent) => {
    if (event.button === 0 && uiCanvas && activeState && containerWidth > 0 && containerHeight > 0) {
      const rect = uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const currentDebug =
        debugMode !== undefined
          ? debugMode
          : Boolean(activeState?.settings?.['debug'] ?? activeDebugMode);
      const topBarHit = getTopBarHit(
        containerWidth,
        activeState,
        screenX,
        screenY,
        null,
        { isLogOpen, debugMode: currentDebug },
      );
      if (topBarHit === 'log' || topBarHit === 'logDropdown') {
        isLogHeld = true;
        isLogOpen = true;
        renderUiLayer(true);
        return;
      }
      if (topBarHit) {
        return;
      }
      if (isCanvasMenuOpen) {
        const menuHit = getMenuHit(
          containerWidth,
          containerHeight,
          activeState,
          {
            view: currentMenuView,
            debugMode: currentDebug,
            callbacks: menuCallbacks,
            buildInfo,
          },
          screenX,
          screenY,
        );
        if (menuHit) {
          return;
        }
      }
      const heroHit = getHeroCardsHit(
        containerWidth,
        containerHeight,
        activeState,
        screenX,
        screenY,
      );
      if (heroHit) {
        return;
      }
      const monsterHit = getMonsterCardsHit(
        containerWidth,
        containerHeight,
        activeState,
        screenX,
        screenY,
      );
      if (monsterHit) {
        return;
      }
      const eventHit = getEventCardHit(
        containerWidth,
        containerHeight,
        activeState,
        isEventCardCollapsed,
        screenX,
        screenY,
      );
      if (eventHit) {
        return;
      }
    }

    if (event.button === 2 || event.button === 1) {
      isDragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartPanX = panX;
      dragStartPanY = panY;
      hasMovedDuringDrag = false;
      event.preventDefault();
    }
  };

  const onClick = (event: MouseEvent) => {
    if (hasMovedDuringDrag) {
      hasMovedDuringDrag = false;
      return;
    }
    if (event.button !== 0) return;

    if (uiCanvas && activeState && containerWidth > 0 && containerHeight > 0) {
      const rect = uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const currentDebug =
        debugMode !== undefined
          ? debugMode
          : Boolean(activeState?.settings?.['debug'] ?? activeDebugMode);
      const topBarHit = getTopBarHit(
        containerWidth,
        activeState,
        screenX,
        screenY,
        null,
        { isLogOpen, debugMode: currentDebug },
      );
      if (topBarHit === 'menu') {
        if (isCanvasMenuOpen && currentMenuView === 'main') {
          isCanvasMenuOpen = false;
        } else {
          isCanvasMenuOpen = true;
          currentMenuView = 'main';
        }
        hoveredMenuItemId = null;
        renderUiLayer(true);
        return;
      }
      if (topBarHit === 'debug') {
        if (isCanvasMenuOpen && currentMenuView === 'debug') {
          isCanvasMenuOpen = false;
        } else {
          isCanvasMenuOpen = true;
          currentMenuView = 'debug';
        }
        hoveredMenuItemId = null;
        renderUiLayer(true);
        return;
      }
      if (topBarHit) {
        return;
      }

      if (isCanvasMenuOpen) {
        const currentDebug =
          debugMode !== undefined
            ? debugMode
            : Boolean(activeState?.settings?.['debug'] ?? activeDebugMode);
        const menuHit = getMenuHit(
          containerWidth,
          containerHeight,
          activeState,
          {
            view: currentMenuView,
            debugMode: currentDebug,
            callbacks: menuCallbacks,
            buildInfo,
          },
          screenX,
          screenY,
        );
        if (menuHit) {
          if (menuHit.type === 'item' && menuHit.item) {
            menuHit.item.onClick(activeState);
            renderCanvas(true);
          } else if (menuHit.type === 'backdrop') {
            isCanvasMenuOpen = false;
            currentMenuView = 'main';
            hoveredMenuItemId = null;
            renderUiLayer(true);
          }
          return;
        }
      }

      const heroHit = getHeroCardsHit(
        containerWidth,
        containerHeight,
        activeState,
        screenX,
        screenY,
      );
      if (heroHit) {
        if (heroHit.type === 'inventoryButton') {
          if (state) {
            heroHit.hero.isInventoryOpen = !heroHit.hero.isInventoryOpen;
            gameStateStore.set(state);
          } else {
            toggleHeroInventory(heroHit.hero);
          }
          renderCanvas(true);
        } else if (heroHit.type === 'inventoryClose') {
          if (state) {
            heroHit.hero.isInventoryOpen = false;
            gameStateStore.set(state);
          } else {
            if (heroHit.hero.isInventoryOpen) {
              toggleHeroInventory(heroHit.hero);
            }
          }
          renderCanvas(true);
        } else if (heroHit.type === 'inventoryUseItem') {
          if (state) {
            useItem(state, heroHit.item);
            gameStateStore.set(state);
          } else {
            useHeroItem(heroHit.item);
          }
          renderCanvas(true);
        }
        return;
      }
      const monsterHit = getMonsterCardsHit(
        containerWidth,
        containerHeight,
        activeState,
        screenX,
        screenY,
      );
      if (monsterHit) {
        return;
      }
      const eventHit = getEventCardHit(
        containerWidth,
        containerHeight,
        activeState,
        isEventCardCollapsed,
        screenX,
        screenY,
      );
      if (eventHit) {
        if (eventHit.type === 'toggle') {
          isEventCardCollapsed = !isEventCardCollapsed;
          renderUiLayer(true);
        }
        return;
      }
    }

    const menu = $radialMenuStore;
    if (menu && uiCanvas) {
      const rect = uiCanvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldPos = screenToWorldPosition(
        screenX,
        screenY,
        rect.width,
        rect.height,
        panX,
        panY,
        cellSize,
        startPosition,
      );
      const clickedBtn = findHoveredRadialButton(menu, cellSize, worldPos);
      radialMenuStore.set(null);
      hoveredRadialIndex = null;
      renderUiLayer(true);

      if (clickedBtn) {
        const curState = state ?? $gameStateStore;
        executeRadialAction(
          curState,
          clickedBtn.entry.action,
          clickedBtn.entry.door,
          clickedBtn.entry.interactable,
        );
        if (!state) {
          gameStateStore.set(curState);
        }
      }
      return;
    }

    if (state) {
      doMouseLogic(event, cellSize, state, {
        panX,
        panY,
        viewWidth: containerWidth,
        viewHeight: containerHeight,
        centerPosition: startPosition,
      });
      gameStateStore.set(state);
    } else {
      handleCanvasClick(event, cellSize, {
        panX,
        panY,
        viewWidth: containerWidth,
        viewHeight: containerHeight,
        centerPosition: startPosition,
      });
    }
  };

  const cursorEmojis: Record<CursorType, string> = {
    sword: '⚔️',
    boot: '🥾',
    menu: '📜',
    default: '',
  };

  const emojiCursorCache = new Map<CursorType, string>();

  const emojiCursor = (cursorType: CursorType): string => {
    if (cursorType === 'default') return 'default';
    const cached = emojiCursorCache.get(cursorType);
    if (cached) return cached;
    const emoji = cursorEmojis[cursorType];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><text x='0' y='16' font-size='20'>${emoji}</text></svg>`;
    const cursor = `url("data:image/svg+xml,${encodeURIComponent(
      svg,
    )}") 4 28, pointer`;
    emojiCursorCache.set(cursorType, cursor);
    return cursor;
  };

  let boardCursor = 'default';

  const onMouseMove = (event: MouseEvent) => {
    if (isDragging) return;
    if (!activeState || !uiCanvas) {
      boardCursor = 'default';
      return;
    }

    const rect = uiCanvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    if (containerWidth > 0) {
      const currentDebug =
        debugMode !== undefined
          ? debugMode
          : Boolean(activeState?.settings?.['debug'] ?? activeDebugMode);
      const topBarHit = getTopBarHit(
        containerWidth,
        activeState,
        screenX,
        screenY,
        null,
        { isLogOpen, debugMode: currentDebug },
      );
      if (topBarHit) {
        if (hoveredRadialIndex !== null) {
          hoveredRadialIndex = null;
        }
        let changed = false;
        if (hoveredInventoryHeroName !== null) {
          hoveredInventoryHeroName = null;
          changed = true;
        }
        if (hoveredCloseHeroName !== null) {
          hoveredCloseHeroName = null;
          changed = true;
        }
        if (hoveredUseItem !== null) {
          hoveredUseItem = null;
          changed = true;
        }
        if (topBarHit === 'menu') {
          boardCursor = 'pointer';
          if (!isMenuHovered) {
            isMenuHovered = true;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
        } else if (topBarHit === 'debug') {
          boardCursor = 'pointer';
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (!isDebugHovered) {
            isDebugHovered = true;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
        } else if (
          topBarHit === 'log' ||
          (isLogOpen && topBarHit === 'logDropdown')
        ) {
          boardCursor = 'pointer';
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (!isLogHovered) {
            isLogHovered = true;
            changed = true;
          }
        } else {
          boardCursor = 'default';
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
        }
        if (changed) renderUiLayer(true);
        return;
      }

      if (isCanvasMenuOpen) {
        const menuHit = getMenuHit(
          containerWidth,
          containerHeight,
          activeState,
          {
            view: currentMenuView,
            debugMode: currentDebug,
            callbacks: menuCallbacks,
            buildInfo,
          },
          screenX,
          screenY,
        );
        if (menuHit) {
          if (hoveredRadialIndex !== null) {
            hoveredRadialIndex = null;
          }
          let changed = false;
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
          if (hoveredInventoryHeroName !== null) {
            hoveredInventoryHeroName = null;
            changed = true;
          }
          if (hoveredCloseHeroName !== null) {
            hoveredCloseHeroName = null;
            changed = true;
          }
          if (hoveredUseItem !== null) {
            hoveredUseItem = null;
            changed = true;
          }

          const newHoveredId =
            menuHit.type === 'item' && menuHit.item ? menuHit.item.id : null;
          if (hoveredMenuItemId !== newHoveredId) {
            hoveredMenuItemId = newHoveredId;
            changed = true;
          }

          boardCursor = menuHit.type === 'item' ? 'pointer' : 'default';
          if (changed) renderUiLayer(true);
          return;
        }
      }

      if (containerHeight > 0) {
        const heroHit = getHeroCardsHit(
          containerWidth,
          containerHeight,
          activeState,
          screenX,
          screenY,
        );
        if (heroHit) {
          if (hoveredRadialIndex !== null) {
            hoveredRadialIndex = null;
          }
          let changed = false;
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }

          const newInvHero =
            heroHit.type === 'inventoryButton' ? heroHit.hero.name : null;
          const newCloseHero =
            heroHit.type === 'inventoryClose' ? heroHit.hero.name : null;
          const newUseItem =
            heroHit.type === 'inventoryUseItem'
              ? { heroName: heroHit.hero.name, itemIndex: heroHit.itemIndex }
              : null;

          if (hoveredInventoryHeroName !== newInvHero) {
            hoveredInventoryHeroName = newInvHero;
            changed = true;
          }
          if (hoveredCloseHeroName !== newCloseHero) {
            hoveredCloseHeroName = newCloseHero;
            changed = true;
          }
          if (
            hoveredUseItem?.heroName !== newUseItem?.heroName ||
            hoveredUseItem?.itemIndex !== newUseItem?.itemIndex
          ) {
            hoveredUseItem = newUseItem;
            changed = true;
          }

          if (
            heroHit.type === 'inventoryButton' ||
            heroHit.type === 'inventoryClose' ||
            heroHit.type === 'inventoryUseItem'
          ) {
            boardCursor = 'pointer';
          } else {
            boardCursor = 'default';
          }

          if (changed) renderUiLayer(true);
          return;
        }

        const monsterHit = getMonsterCardsHit(
          containerWidth,
          containerHeight,
          activeState,
          screenX,
          screenY,
        );
        if (monsterHit) {
          if (hoveredRadialIndex !== null) {
            hoveredRadialIndex = null;
          }
          let changed = false;
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
          if (hoveredInventoryHeroName !== null) {
            hoveredInventoryHeroName = null;
            changed = true;
          }
          if (hoveredCloseHeroName !== null) {
            hoveredCloseHeroName = null;
            changed = true;
          }
          if (hoveredUseItem !== null) {
            hoveredUseItem = null;
            changed = true;
          }
          boardCursor = 'default';
          if (changed) renderUiLayer(true);
          return;
        }

        const eventHit = getEventCardHit(
          containerWidth,
          containerHeight,
          activeState,
          isEventCardCollapsed,
          screenX,
          screenY,
        );
        if (eventHit) {
          if (hoveredRadialIndex !== null) {
            hoveredRadialIndex = null;
          }
          let changed = false;
          if (isMenuHovered) {
            isMenuHovered = false;
            changed = true;
          }
          if (isDebugHovered) {
            isDebugHovered = false;
            changed = true;
          }
          if (isLogHovered) {
            isLogHovered = false;
            changed = true;
          }
          if (hoveredInventoryHeroName !== null) {
            hoveredInventoryHeroName = null;
            changed = true;
          }
          if (hoveredCloseHeroName !== null) {
            hoveredCloseHeroName = null;
            changed = true;
          }
          if (hoveredUseItem !== null) {
            hoveredUseItem = null;
            changed = true;
          }
          const isToggle = eventHit.type === 'toggle';
          if (isEventCardToggleHovered !== isToggle) {
            isEventCardToggleHovered = isToggle;
            changed = true;
          }
          boardCursor = isToggle ? 'pointer' : 'default';
          if (changed) renderUiLayer(true);
          return;
        }
      }
    }

    let needsReset = false;
    if (isMenuHovered) {
      isMenuHovered = false;
      needsReset = true;
    }
    if (isDebugHovered) {
      isDebugHovered = false;
      needsReset = true;
    }
    if (isLogHovered) {
      isLogHovered = false;
      needsReset = true;
    }
    if (isEventCardToggleHovered) {
      isEventCardToggleHovered = false;
      needsReset = true;
    }
    if (hoveredInventoryHeroName !== null) {
      hoveredInventoryHeroName = null;
      needsReset = true;
    }
    if (hoveredCloseHeroName !== null) {
      hoveredCloseHeroName = null;
      needsReset = true;
    }
    if (hoveredUseItem !== null) {
      hoveredUseItem = null;
      needsReset = true;
    }
    if (hoveredMenuItemId !== null) {
      hoveredMenuItemId = null;
      needsReset = true;
    }
    if (needsReset) {
      renderUiLayer(true);
    }

    const menu = $radialMenuStore;
    if (menu) {
      const worldPos = screenToWorldPosition(
        screenX,
        screenY,
        rect.width,
        rect.height,
        panX,
        panY,
        cellSize,
        startPosition,
      );
      const hoveredBtn = findHoveredRadialButton(menu, cellSize, worldPos);
      if (hoveredBtn) {
        boardCursor = 'pointer';
        if (hoveredRadialIndex !== hoveredBtn.index) {
          hoveredRadialIndex = hoveredBtn.index;
          renderUiLayer(true);
        }
        return;
      } else {
        boardCursor = 'default';
        if (hoveredRadialIndex !== null) {
          hoveredRadialIndex = null;
          renderUiLayer(true);
        }
        return;
      }
    }

    const pos = screenToGridPosition(
      screenX,
      screenY,
      rect.width,
      rect.height,
      panX,
      panY,
      cellSize,
      startPosition,
    );

    const grid = activeState.dungeon?.layout?.grid;
    if (
      !grid ||
      pos.y < 0 ||
      pos.y >= grid.length ||
      pos.x < 0 ||
      pos.x >= (grid[pos.y]?.length ?? 0)
    ) {
      boardCursor = 'default';
      return;
    }

    const cursorType = getCursorType(activeState, pos);
    boardCursor = emojiCursor(cursorType);
  };

  const onMouseLeave = () => {
    boardCursor = 'default';
    let needsRender = false;
    if (hoveredRadialIndex !== null) {
      hoveredRadialIndex = null;
      needsRender = true;
    }
    if (isMenuHovered) {
      isMenuHovered = false;
      needsRender = true;
    }
    if (isDebugHovered) {
      isDebugHovered = false;
      needsRender = true;
    }
    if (isLogHovered) {
      isLogHovered = false;
      needsRender = true;
    }
    if (isEventCardToggleHovered) {
      isEventCardToggleHovered = false;
      needsRender = true;
    }
    if (hoveredInventoryHeroName !== null) {
      hoveredInventoryHeroName = null;
      needsRender = true;
    }
    if (hoveredCloseHeroName !== null) {
      hoveredCloseHeroName = null;
      needsRender = true;
    }
    if (hoveredUseItem !== null) {
      hoveredUseItem = null;
      needsRender = true;
    }
    if (hoveredMenuItemId !== null) {
      hoveredMenuItemId = null;
      needsRender = true;
    }
    if (needsRender) {
      renderUiLayer(true);
    }
  };

  const onWheel = (event: WheelEvent) => {
    panX -= event.deltaX;
    panY -= event.deltaY;
    updateAllCanvasTransforms();
    renderCanvas(true);
    event.preventDefault();
  };
</script>

<div
  class="dungeon"
  id="gameBoardContainer"
  bind:this={containerElement}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  <div class="canvasContainer">
    <canvas
      id="staticCanvas"
      class="canvasLayer"
      bind:this={staticCanvas}
    ></canvas>
    <canvas
      id="actorCanvas"
      class="canvasLayer"
      bind:this={actorCanvas}
    ></canvas>
    <canvas
      id="gameBoard"
      class="canvasLayer"
      bind:this={overlayCanvas}
    ></canvas>
    <canvas
      id="uiCanvas"
      class="canvasLayer interactiveLayer"
      style="cursor: {boardCursor};"
      bind:this={uiCanvas}
      on:click={onClick}
      on:mousedown={onMouseDown}
      on:mousemove={onMouseMove}
      on:mouseleave={onMouseLeave}
      on:wheel={onWheel}
      on:contextmenu|preventDefault
    ></canvas>
  </div>
  <DungeonIntro {dungeon} state={activeState} />
</div>

<style>
  .dungeon {
    background: var(--color-bg-dungeon, #121418);
    overflow: hidden;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .canvasContainer {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .canvasLayer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .interactiveLayer {
    cursor: pointer;
  }
</style>
