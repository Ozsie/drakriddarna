<script lang="ts">
  import { onMount } from "svelte";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  import { doMouseLogic } from "../hero/ClickInputLogic";
  import { browser } from '$app/environment';
  import { renderHeroes } from "../hero/HeroRendering";
  import { renderMonsters } from "../monsters/MonsterRendering";
  import { renderDoors, renderGrid, renderSecrets } from "../dungeon/DungeonRendering";
  import type { GameState } from "../types";
  import { renderItems } from "../items/ItemRendering.ts";

  export let state: GameState;
  export let debugMode: boolean;

  let footerSize;
  let screenSize;
  const cellSize = state?.settings['cellSize'] ?? 48;

  if (browser) {
    screenSize = window.innerHeight;
    footerSize = document.getElementById('footer').offsetHeight;
  }

  onMount(() => {
    const ground = new Image();
    ground.src = groundSprites;

    const actors = new Image();
    actors.src = actorSprites;

    setInterval(() => render(ground, actors), 10);
  });

  const render = (ground, actors) => {
    if (!state || !document) return;
    const c: HTMLCanvasElement = document.getElementById("gameBoard") as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, c.width, c.height);
    renderGrid(ctx, ground, cellSize, state, debugMode);
    renderSecrets(ctx, ground, cellSize, state);
    renderItems(ctx, ground, cellSize, state)
    renderDoors(ctx, ground, cellSize, state, debugMode)
    renderMonsters(ctx, actors, cellSize, state, debugMode);
    renderHeroes(ctx, actors, cellSize, state, debugMode);
  }

  const onClick = (event) => {
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
</style>
<div style="{getStyle()}" class="dungeon" id="gameBoardContainer">
  <canvas width="{cellSize * 40}" height="{cellSize * 30}" id="gameBoard" on:click="{onClick}"></canvas>
</div>