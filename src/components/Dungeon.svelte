<script lang="ts">
  import type { GameState } from '../types';
  import { onMount, onDestroy } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import actorSprites from '$lib/Dungeon_Character_3.png';
  import { doMouseLogic } from '../hero/ClickInputLogic';
  import { browser } from '$app/environment';
  import { renderHeroes } from '../hero/HeroRendering';
  import { renderMonsters } from '../monsters/MonsterRendering';
  import {
    background,
    renderDoors,
    renderGrid,
    renderPillars,
    renderPortal,
    renderSecrets,
  } from '../dungeon/DungeonRendering';
  import { renderItems } from '../items/ItemRendering';
  import WinCondition from './WinCondition.svelte';
  import { t } from '$lib/translations';
  import EventCard from './EventCard.svelte';
  import { renderNotes } from '../notes/NotesRendering';
  import { renderDamageIndicators } from '../combat/DamageIndicatorRendering';
  import { clearTileTextureCache } from '../dungeon/TileTextureCache';
  import { hasActiveActorAnimations } from '../core';
  import {
    gameStateStore,
    debugModeStore,
    handleCanvasClick,
  } from '../store/gameStateStore';

  export let state: GameState | undefined = undefined;
  export let debugMode: boolean | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: activeDebugMode = debugMode ?? $debugModeStore;

  let showWinConditions = true;
  let footerSize = 0;
  let screenSize = 0;
  $: cellSize = (activeState?.settings?.['cellSize'] as number) ?? 48;
  let totalReRenderCount = 0;
  let staticRenderCount = 0;
  let dynamicRenderCount = 0;
  let ground: HTMLImageElement | null = null;
  let actors: HTMLImageElement | null = null;
  let isMounted = false;

  let staticCanvas: HTMLCanvasElement | null = null;
  let actorCanvas: HTMLCanvasElement | null = null;
  let overlayCanvas: HTMLCanvasElement | null = null;

  let lastStaticSignature = '';
  let lastDynamicSignature = '';
  let lastOverlaySignature = '';
  let lastCellSize = cellSize;
  let overlayAnimationId: number | null = null;
  let dynamicAnimationId: number | null = null;

  if (browser) {
    screenSize = window.innerHeight;
    footerSize = document.getElementById('footer')?.offsetHeight ?? 0;
  }

  const getStaticSignature = (st: GameState, dbg: boolean, size: number) => {
    const d = st.dungeon;
    return `${d.name}|${d.discoveredRooms.join(',')}|${d.layout.doors
      .map((dr) => `${dr.x},${dr.y},${dr.open},${dr.locked},${dr.hidden}`)
      .join(';')}|${d.layout.secrets
      .map((s) => `${s.position.x},${s.position.y},${s.found}`)
      .join(';')}|${d.layout.items.length}|${
      d.layout.pits?.length ?? 0
    }|${d.portal?.x},${d.portal?.y}|${size}|${dbg}`;
  };

  const getDynamicSignature = (st: GameState, dbg: boolean, size: number) => {
    const heroes = st.heroes
      .map(
        (h) =>
          `${h.name},${h.position.x},${h.position.y},${h.health},${h.actions},${h.movement},${h.incapacitated}`,
      )
      .join(';');
    const monsters = st.dungeon.layout.monsters
      .map((m) => `${m.name},${m.position.x},${m.position.y},${m.health}`)
      .join(';');
    const curActor = `${st.currentActor?.name},${st.currentActor?.position?.x},${st.currentActor?.position?.y}`;
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
    ctx.clearRect(0, 0, cellSize * 40, cellSize * 30);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cellSize * 40, cellSize * 30);
    renderGrid(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderSecrets(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
    renderItems(ctx, ground, cellSize, activeState, activeDebugMode ?? false);
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
    ctx.clearRect(0, 0, cellSize * 40, cellSize * 30);
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

    ctx.clearRect(0, 0, cellSize * 40, cellSize * 30);
    renderNotes(ctx, actors, cellSize, activeState, activeDebugMode ?? false);
    const hasActiveDamage = renderDamageIndicators(
      ctx,
      cellSize,
      activeState,
      Date.now(),
    );
    if (activeDebugMode) {
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.fillText(
        `Re-renders: ${totalReRenderCount} (Static: ${staticRenderCount}, Dynamic: ${dynamicRenderCount})`,
        2,
        10,
      );
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

  const renderCanvas = (force = false) => {
    renderStaticLayer(force);
    renderDynamicLayer(force);
    renderOverlayLayer(force);
  };

  const initCanvas = (canvas: HTMLCanvasElement | null, ratio: number) => {
    if (!canvas) return;
    canvas.width = cellSize * 40 * ratio;
    canvas.height = cellSize * 30 * ratio;
    canvas.style.width = `${cellSize * 40}px`;
    canvas.style.height = `${cellSize * 30}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  };

  onMount(() => {
    isMounted = true;
    ground = new Image();
    actors = new Image();

    const ratio = window.devicePixelRatio || 1;
    initCanvas(staticCanvas, ratio);
    initCanvas(actorCanvas, ratio);
    initCanvas(overlayCanvas, ratio);

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
  });

  onDestroy(() => {
    if (overlayAnimationId) {
      cancelAnimationFrame(overlayAnimationId);
      overlayAnimationId = null;
    }
    if (dynamicAnimationId) {
      cancelAnimationFrame(dynamicAnimationId);
      dynamicAnimationId = null;
    }
  });

  $: if (isMounted && cellSize !== lastCellSize) {
    lastCellSize = cellSize;
    clearTileTextureCache();
    const ratio = (browser && window.devicePixelRatio) || 1;
    initCanvas(staticCanvas, ratio);
    initCanvas(actorCanvas, ratio);
    initCanvas(overlayCanvas, ratio);
    renderCanvas(true);
  }

  $: if (isMounted && activeState && activeDebugMode !== undefined) {
    renderCanvas(false);
  }

  const onClick = (event: MouseEvent) => {
    if (state) {
      doMouseLogic(event, cellSize, state);
      gameStateStore.set(state);
    } else {
      handleCanvasClick(event, cellSize);
    }
  };

  const getStyle = () => {
    const maxHeight = screenSize - footerSize - 20;
    return `max-height: ${maxHeight}px; max-width: ${cellSize * 40}px`;
  };
</script>

<div style={getStyle()} class="dungeon" id="gameBoardContainer">
  <div
    class="canvasContainer"
    style="position: relative; width: {cellSize * 40}px; height: {cellSize *
      30}px;"
  >
    <canvas
      width={cellSize * 40}
      height={cellSize * 30}
      id="staticCanvas"
      class="canvasLayer"
      bind:this={staticCanvas}
    ></canvas>
    <canvas
      width={cellSize * 40}
      height={cellSize * 30}
      id="actorCanvas"
      class="canvasLayer"
      bind:this={actorCanvas}
    ></canvas>
    <canvas
      width={cellSize * 40}
      height={cellSize * 30}
      id="gameBoard"
      class="canvasLayer interactiveLayer"
      bind:this={overlayCanvas}
      on:click={onClick}
    ></canvas>
  </div>

  <div class="winConditions {showWinConditions ? '' : 'conditionsHidden'}">
    <div class="buttonDiv">
      <button
        class="hideConditionsButton"
        on:click={() => (showWinConditions = !showWinConditions)}
      >
        {#if showWinConditions}
          {$t('content.winConditions.buttonClose')}
        {:else}
          {$t('content.winConditions.buttonOpen')}
        {/if}
      </button>
    </div>
    {#if showWinConditions}
      <div class="conditionsDiv">
        {#each activeState.dungeon.winConditions
          .slice()
          .sort( (a, b) => (a.fulfilled === b.fulfilled ? 0 : a.fulfilled ? 1 : -1), ) as winCondition}
          <WinCondition condition={winCondition} state={activeState} />
        {/each}
      </div>
    {/if}
  </div>
  {#if activeState.currentEvent}
    <div>
      <EventCard event={activeState.currentEvent} />
    </div>
  {/if}
</div>

<style>
  .dungeon {
    background: var(--color-bg-dungeon, #121418);
    overflow: auto;
    height: 80%;
    position: relative;
  }
  .canvasContainer {
    position: relative;
  }
  .canvasLayer {
    position: absolute;
    top: 0;
    left: 0;
  }
  .interactiveLayer {
    cursor: pointer;
  }
  .winConditions {
    position: absolute;
    max-width: 90%;
    min-width: 175px;
    bottom: 118px;
    border: 1px solid grey;
    border-radius: 3px;
    overflow: scroll;
    background-color: #5c4033;
    opacity: 0.9;
    margin-left: 4px;
    z-index: 10;
  }
  .conditionsHidden {
    min-width: 0;
  }
  .hideConditionsButton {
    float: left;
    margin-right: 4px;
    width: 15px;
    height: 15px;
    font-size: 8pt;
    padding-left: 2px;
    padding-top: 0;
  }
  .buttonDiv {
    float: left;
  }
  .conditionsDiv {
    float: right;
    padding-right: 60px;
  }
</style>
