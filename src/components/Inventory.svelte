<script lang="ts">
  import ItemCard from "./ItemCard.svelte";
  import type { GameState, Item } from "../types";
  import { onMount } from "svelte";
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
  }
  .hero-card .inventory span {
    display: inline-block;
  }
</style>
<div class="inventory">
  <span>Inventory</span>
  {#key uglyUpdateToggle}
    {#each inventory as item}
      <ItemCard bind:item={item} state={state} />
    {/each}
  {/key}
</div>
