<script lang="ts">
  import ItemCard from "./ItemCard.svelte";
  import type { GameState, Item } from "../types";
  import { onMount } from "svelte";
  import { t } from '$lib/translations'
  export let inventory: Item[];
  export let state: GameState;
  let uglyUpdateToggle = false;

  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    uglyUpdateToggle = !uglyUpdateToggle;
    if (!inventory || !document) return;
  };
</script>
<style>
  .inventory {
    display: grid;
    width: 99%; 
    overflow:hidden;
    margin: 2px 4px; 

  }


  h4 {
    display: inline-block;
    margin-left: 50px;
  }
</style>
<h4>{$t('content.inventory.label', { hero: $t(state.currentActor?.name) })}</h4>
<div class="inventory">
  {#key uglyUpdateToggle}
    {#each inventory as item}
      {#if item}
        <ItemCard bind:item={item} state={state} />
      {/if}
    {/each}
  {/key}
</div>
