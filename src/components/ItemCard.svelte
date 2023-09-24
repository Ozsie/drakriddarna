<script lang="ts">
  import type { GameState, Item } from "../types";
  import { ACTIVE, DESCRIPTION, USED, useItem } from '../items/ItemLogic';

  export let item: Item
  export let state: GameState
</script>
<style>
  .item-card span {
    float: left;
    margin: 0 4px;
    font-size: 0.75em;
  }

  .description span {
      float: left;
      margin: 0 4px;
      font-size: 0.65em;
  }
</style>
<div class="item-card">
  <span>
    {#if item.properties?.[ACTIVE] && !item.properties?.[USED]}
      <button on:click={() => useItem(state, item)}>Use</button>
    {/if}
    {item.name}
  </span>
  <div class="description">
    <span>&nbsp;{item.properties?.[DESCRIPTION]}</span>
  </div>
</div>