<script lang="ts">
  import type { GameState, Item } from "../types";
  import { ACTIVE, DESCRIPTION, USED, useItem } from '../items/ItemLogic';

  export let item: Item
  export let state: GameState
</script>
<style>

  .bottom-border{
    border-bottom: 1px solid rgb(201, 138, 80);
  }
  .item{
    margin-bottom: 6px;
  }

  .item-icon{
    grid-column-start: 1;
    grid-column-end: 1;
    height: 40px; 
    width: 40px; 
  }
  
  .item-description {
    grid-column-start: 2;
    grid-column-end: 2;
    overflow: scroll;

  }

  .item-action{
    grid-column-start: 3;
    grid-column-end: 3;
    height: 40px; 
    width: 40px; 
  }

  .item-description span
  {
    display: block; 
    font-size: 11px;
    text-wrap: wrap;
  }
  .item-description b
  {
    display: block; 
    font-size: 12px;
  }
  .item-action button{
    margin: 10%;
    height: 80%;
    width: 80%;
    font-size: 10px;
    padding: 1px;
  }
  
</style>

  <div class="item item-icon">
  
  </div>
  <div class="item item-description bottom-border">
    <b>{item.name}</b>
    <span>{item.properties?.[DESCRIPTION]} {item.properties?.[DESCRIPTION]}</span>
  </div>
  <div class="item item-action">
  {#if item.properties?.[ACTIVE] && !item.properties?.[USED]}
    <button on:click={() => useItem(state, item)}>Use</button>
  {:else if item.properties?.[ACTIVE]}
    <button disabled>Used</button>
  {/if}
  </div>

