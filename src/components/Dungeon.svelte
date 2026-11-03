<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import type { GameState } from '../types';
  import { gameStateStore, debugModeStore } from '../store/gameStateStore';
  import {
    appPhaseStore,
    welcomeViewStore,
  } from '../store/appPhaseStore';
  import { radialMenuStore } from '../store/radialMenuStore';
  import { locale } from '$lib/translations';
  import { getCampaign } from '../campaigns';
  import { resolveTileset } from '../dungeon/TilesetLogic';
  import { isDebugModeAvailable } from '../settings/debugMode';
  import { DungeonBoardController } from './DungeonBoardController';

  interface Props {
    gameState?: GameState | undefined;
    debugMode?: boolean | undefined;
  }

  let { gameState = undefined, debugMode = undefined }: Props = $props();

  const board = new DungeonBoardController();

  // Assigning a new external `gameState` must happen outside the reactive
  // updateProps block, or Svelte detects a cyclical dependency
  // (activeState -> gameState -> activeState).
  const handleExternalStateChange = (next: GameState) => {
    if (gameState) {
      gameState = next;
    }
  };

  let containerWidth = $state(0);
  let containerHeight = $state(0);

  const activeState = $derived(
    gameState ?? ($gameStateStore as GameState | null) ?? undefined
  );
  // Debug mode (overlays included) exists only in dev builds; a
  // production deploy never activates it, whatever a save carries.
  const activeDebugMode = $derived(
    isDebugModeAvailable() &&
      (debugMode !== undefined
        ? debugMode
        : Boolean(activeState?.settings?.['debug'] ?? $debugModeStore))
  );
  const dungeon = $derived(activeState?.dungeon);
  const campaign = $derived(
    activeState?.campaignId ? getCampaign(activeState.campaignId) : undefined
  );
  const tileset = $derived(resolveTileset(dungeon, campaign, groundSprites));
  const startPosition = $derived(dungeon?.startingPositions?.[0]);

  $effect.pre(() => {
    board.updateProps({
      state: gameState,
      activeState,
      debugMode: activeDebugMode,
      dungeon,
      tileset,
      startPosition,
      onExternalStateChange: handleExternalStateChange,
    });
  });
  $effect.pre(() => {
    board.setContainerSize(containerWidth, containerHeight);
  });
  $effect.pre(() => {
    board.onRadialMenuChange($radialMenuStore);
  });
  $effect.pre(() => {
    board.onLocaleChange($locale);
  });
  $effect.pre(() => {
    board.onAppPhaseChange($appPhaseStore, $welcomeViewStore);
  });

  onMount(() => {
    board.mount();
  });

  onDestroy(() => {
    board.destroy();
  });
</script>

<div
  class="dungeon"
  id="gameBoardContainer"
  bind:this={board.containerElement}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  <div class="canvasContainer">
    <canvas
      id="staticCanvas"
      class="canvasLayer"
      bind:this={board.staticCanvas}
    ></canvas>
    <canvas
      id="actorCanvas"
      class="canvasLayer"
      bind:this={board.actorCanvas}
    ></canvas>
    <canvas
      id="gameBoard"
      class="canvasLayer"
      bind:this={board.overlayCanvas}
    ></canvas>
    <canvas
      id="uiCanvas"
      class="canvasLayer interactiveLayer"
      style="cursor: default;"
      bind:this={board.uiCanvas}
      onclick={board.onClick}
      onmousedown={board.onMouseDown}
      onmousemove={board.onMouseMove}
      onmouseleave={board.onMouseLeave}
      ontouchstart={board.onTouchStart}
      ontouchmove={board.onTouchMove}
      ontouchend={board.onTouchEnd}
      ontouchcancel={board.onTouchCancel}
      onwheel={board.onWheel}
      oncontextmenu={(event) => event.preventDefault()}
    ></canvas>
  </div>
</div>

<style>
  .dungeon {
    background: var(--color-bg-dungeon, #121418);
    overflow: hidden;
    width: 100%;
    height: 100%;
    position: relative;
    touch-action: none;
    /* iOS paints a gray flash over the tapped canvas otherwise. */
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
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
