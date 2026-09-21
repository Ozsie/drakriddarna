<script lang="ts">
  import type { GameState } from '../types';
  import { onMount } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  import { doMouseLogic } from '../hero/ClickInputLogic';
  import { browser } from '$app/environment';
  import { renderHeroes } from '../hero/HeroRendering';
  import { renderMonsters } from '../monsters/MonsterRendering';
  import {
    background,
    renderDoors,
    renderGrid,
    renderPillars,
    renderSecrets,
  } from '../dungeon/DungeonRendering';
  import { renderItems } from '../items/ItemRendering';
  import WinCondition from './WinCondition.svelte';
  import { t } from '$lib/translations';
  import EventCard from './EventCard.svelte';
  import { renderNotes } from '../notes/NotesRendering';
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
  let ground: HTMLImageElement | null = null;
  let actors: HTMLImageElement | null = null;
  let isMounted = false;

  if (browser) {
    screenSize = window.innerHeight;
    footerSize = document.getElementById('footer')?.offsetHeight ?? 0;
  }

  const renderCanvas = () => {
    if (!activeState || !browser || !ground || !actors) return;
    const c: HTMLCanvasElement | null = document.getElementById(
      'gameBoard',
    ) as HTMLCanvasElement | null;
    if (!c) return;
    const ctx: CanvasRenderingContext2D | null = c.getContext('2d');
    if (!ctx) return;

    totalReRenderCount++;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, c.width, c.height);
    renderGrid(ctx, ground, cellSize, activeState, activeDebugMode);
    renderSecrets(ctx, ground, cellSize, activeState, activeDebugMode);
    renderItems(ctx, ground, cellSize, activeState, activeDebugMode);
    renderDoors(ctx, ground, cellSize, activeState, activeDebugMode);
    renderMonsters(ctx, actors, cellSize, activeState, activeDebugMode);
    renderHeroes(ctx, actors, cellSize, activeState, activeDebugMode);
    renderNotes(ctx, actors, cellSize, activeState, activeDebugMode);
    renderPillars(ctx, ground, cellSize, activeState, activeDebugMode);
    if (activeDebugMode) {
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.fillText(`Re-renders: ${totalReRenderCount}`, 2, 10);
    }
  };

  onMount(() => {
    isMounted = true;
    ground = new Image();
    ground.src = groundSprites;

    actors = new Image();
    actors.src = actorSprites;

    const ratio = window.devicePixelRatio || 1;
    const canvas: HTMLCanvasElement = document.getElementById(
      'gameBoard',
    ) as HTMLCanvasElement;

    if (canvas) {
      canvas.width = cellSize * 40 * ratio;
      canvas.height = cellSize * 30 * ratio;
      canvas.style.width = `${cellSize * 40}px`;
      canvas.style.height = `${cellSize * 30}px`;
      canvas.getContext('2d')?.scale(ratio, ratio);
    }

    ground.onload = () => renderCanvas();
    actors.onload = () => renderCanvas();
    renderCanvas();
  });

  $: if (isMounted && activeState && activeDebugMode !== undefined) {
    renderCanvas();
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

<style>
  .dungeon {
      background: var(--color-bg-dungeon, #121418);
      overflow: auto;
      height: 80%;
      position: relative;
  }
  .winConditions {
      position: absolute;
      max-width: 90%;
      min-width: 175px;
      bottom: 118px;
      border: 1px solid grey;
      border-radius: 3px;
      overflow: scroll;
      background-color: #5C4033;
      opacity: 0.9;
      margin-left: 4px;
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

<div style="{getStyle()}" class="dungeon" id="gameBoardContainer">
  <canvas
    width="{cellSize * 40}"
    height="{cellSize * 30}"
    id="gameBoard"
    on:click="{onClick}"
  ></canvas>

  <div class="winConditions {showWinConditions ? '' : 'conditionsHidden'}">
    <div class="buttonDiv">
      <button
        class="hideConditionsButton"
        on:click="{() => (showWinConditions = !showWinConditions)}"
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
          .sort((a, b) => (a.fulfilled === b.fulfilled ? 0 : a.fulfilled ? 1 : -1)) as winCondition}
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
