<script lang="ts">
  import type { Item } from "../types";
  import { DESCRIPTION, ACTIVE } from "../items/magicItems";

  export let item: Item
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
    {#if item.properties?.[ACTIVE]}
      <button on:click={() => console.log('used ' + item.name)}>Use</button>
    {/if}
    {item.name}
  </span>
  <div class="description">
    <span>&nbsp;{item.properties?.[DESCRIPTION]}</span>
  </div>
</div>