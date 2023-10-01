<script lang="ts">
  import { onMount } from "svelte";
  import type { GameState } from "../types";

  export let state: GameState;
  let uglyUpdateToggle = false;

  onMount(() => {
    render();
    setInterval(render, 500);
  });
  const render = () => {
    if (state.reRender) {
      uglyUpdateToggle = !uglyUpdateToggle;
    }
    if (!state || !document) return;
  };
</script>
<style>
    @media screen and (max-width: 600px) {
        .log {
            height: 100px;
            background: green;
            overflow: scroll;
        }

        p {
            font-size: 10pt;
            margin-top: 0;
            margin-bottom: 1px;
        }
    }
    @media screen and (min-width: 601px) {
        .log {
            margin-left: 15%;
            height: 100px;
            background: green;
            overflow: scroll;
        }

        p {
            font-size: 10pt;
            margin-top: 0;
            margin-bottom: 1px;
        }
    }
</style>
<div class="log">
  {#key uglyUpdateToggle}
    {#each state.actionLog as log, index}
      {#if index < 25}
        <p>>{log}</p>
      {/if}
    {/each}
  {/key}
</div>