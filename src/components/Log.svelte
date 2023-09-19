<script lang="ts">
  import { onMount } from "svelte";
  import type { GameState } from "../types";

  let actionLog: string[] = [];
  export let state: GameState;

  onMount(() => {
    setInterval(() => {
      actionLog = state.actionLog
    }, 500);
  });
</script>
<style>
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
</style>
<div class="log">
  {#key actionLog}
    {#each actionLog as log, index}
      {#if index < 25}
        <p>>{log}</p>
      {/if}
    {/each}
  {/key}
</div>