<script lang="ts">
  import ItemCard from "./ItemCard.svelte";
  import type { Item } from "../types";
  import { onMount } from "svelte";
  export let inventory: Item[];
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
      <ItemCard bind:item={item} />
    {/each}
  {/key}
</div>
