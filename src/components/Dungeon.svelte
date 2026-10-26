<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import type { GameState } from '../types';
  import { gameStateStore, debugModeStore } from '../store/gameStateStore';
  import { radialMenuStore } from '../store/radialMenuStore';
  import { locale } from '$lib/translations';
  import { getCampaign } from '../campaigns';
  import { resolveTileset } from '../dungeon/TilesetLogic';
  import { DungeonBoardController } from './DungeonBoardController';

  export let state: GameState | undefined = undefined;
  export let debugMode: boolean | undefined = undefined;

  const board = new DungeonBoardController();

  // Assigning a new external `state` must happen outside the reactive
  // updateProps block, or Svelte detects a cyclical dependency
  // (activeState -> state -> activeState).
  const handleExternalStateChange = (next: GameState) => {
    if (state) {
      state = next;
    }
  };

  let containerWidth = 0;
  let containerHeight = 0;

  $: activeState = state ?? $gameStateStore;
  $: activeDebugMode =
    debugMode !== undefined
      ? debugMode
      : Boolean(activeState?.settings?.['debug'] ?? $debugModeStore);
  $: dungeon = activeState?.dungeon;
  $: campaign = activeState?.campaignId
    ? getCampaign(activeState.campaignId)
    : undefined;
  $: tileset = resolveTileset(dungeon, campaign, groundSprites);
  $: startPosition = dungeon?.startingPositions?.[0];
  $: board.updateProps({
    state,
    activeState,
    debugMode: activeDebugMode,
    dungeon,
    tileset,
    startPosition,
    onExternalStateChange: handleExternalStateChange,
  });
  $: board.setContainerSize(containerWidth, containerHeight);
  $: board.onRadialMenuChange($radialMenuStore);
  $: board.onLocaleChange($locale);

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
      on:click={board.onClick}
      on:mousedown={board.onMouseDown}
      on:mousemove={board.onMouseMove}
      on:mouseleave={board.onMouseLeave}
      on:touchstart={board.onTouchStart}
      on:touchmove={board.onTouchMove}
      on:touchend={board.onTouchEnd}
      on:touchcancel={board.onTouchCancel}
      on:wheel={board.onWheel}
      on:contextmenu|preventDefault
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
