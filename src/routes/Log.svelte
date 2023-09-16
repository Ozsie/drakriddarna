<script>
  import { onMount } from "svelte";

  let actionLog = [];
  export let state

  onMount(() => {
    setInterval(() => {
      actionLog = state.actionLog
    }, 1000);
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
        <p>{log}</p>
      {/if}
    {/each}
  {/key}
</div>