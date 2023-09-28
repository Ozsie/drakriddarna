<script lang="ts">
  import type { GameState } from '../types';
  import { onMount } from "svelte";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  import { doMouseLogic } from "../hero/ClickInputLogic";
  import { browser } from '$app/environment';
  import { renderHeroes } from "../hero/HeroRendering";
  import { renderMonsters } from "../monsters/MonsterRendering";
  import { renderDoors, renderGrid, renderSecrets } from "../dungeon/DungeonRendering";
  import { renderItems } from '../items/ItemRendering';
  import WinCondition from './WinCondition.svelte';

  export let state: GameState;
  export let debugMode: boolean;

  let footerSize: number;
  let screenSize: number;
  const cellSize: number = state?.settings['cellSize'] as number ?? 48;
  let totalReRenderCount = 0;
  let reRenderCount = 0;
  const stopReRenderTimeout = 10;

  if (browser) {
    screenSize = window.innerHeight;
    footerSize = document.getElementById('footer')?.offsetHeight ?? 0;
  }

  onMount(() => {
    const ground = new Image();
    ground.src = groundSprites;

    const actors = new Image();
    actors.src = actorSprites;

    setInterval(() => render(ground, actors), 10);
  });

  const render = (ground: HTMLImageElement, actors: HTMLImageElement) => {
    if (!state || !document) return;
    const c: HTMLCanvasElement = document.getElementById("gameBoard") as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = c.getContext("2d") as CanvasRenderingContext2D;
    if (state.reRender) {
      reRenderCount++;
      totalReRenderCount++;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, c.width, c.height);
      renderGrid(ctx, ground, cellSize, state, debugMode);
      renderSecrets(ctx, ground, cellSize, state, debugMode);
      renderItems(ctx, ground, cellSize, state);
      renderDoors(ctx, ground, cellSize, state, debugMode);
      renderMonsters(ctx, actors, cellSize, state, debugMode);
      renderHeroes(ctx, actors, cellSize, state, debugMode);
      if (debugMode) {
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.fillText(`Re-renders: ${totalReRenderCount}`, 2, 10);
        ctx.fillText(`FPS: ${reRenderCount / (stopReRenderTimeout / 1000)}`, 2, 20);
      }
      setTimeout(() => {
        state.reRender = false;
        reRenderCount = 0;
      }, stopReRenderTimeout);
    }
  }

  const onClick = (event: MouseEvent) => {
    doMouseLogic(event, cellSize, state);
  }

  const getStyle = () => {
    const maxHeight = screenSize - footerSize - 20;
    return `max-height: ${maxHeight}px; max-width: ${cellSize * 40}`;
  }

</script>
<style>
  .dungeon {
      background: yellow;
      overflow: scroll;
      height: 80%;
  }
  @media screen and (min-width: 601px) {
      .winConditions {
          position: absolute;
          bottom: 113px;
          width: 100%;
          border: 1px solid red;
          overflow: scroll;
      }
  }
  @media screen and (max-width: 600px) {
      .winConditions {
          position: absolute;
          bottom: 100px;
          width: 100%;
          border: 1px solid red;
          overflow: scroll;
      }
  }
</style>
<div style="{getStyle()}" class="dungeon" id="gameBoardContainer">
  <canvas width="{cellSize * 40}" height="{cellSize * 30}" id="gameBoard" on:click="{onClick}"></canvas>

  <div class='winConditions'>
    {#each state.dungeon.winConditions.sort((a, b) => (a.fulfilled === b.fulfilled)? 0 : a.fulfilled? 1 : -1) as winCondition}
      <WinCondition bind:condition={winCondition} bind:state={state}/>
    {/each}
  </div>
</div>