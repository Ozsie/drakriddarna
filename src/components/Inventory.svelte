<script lang="ts">
  import ItemCard from './ItemCard.svelte';
  import type { GameState, Item } from '../types';
  import { t } from '$lib/translations';
  import { gameStateStore, currentHero } from '../store/gameStateStore';
  import { i18n } from '../core/logger';

  export let inventory: Item[] | undefined = undefined;
  export let state: GameState | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: activeHero = state ? state.currentActor : $currentHero;
  $: items = inventory ?? activeHero?.inventory ?? [];
  $: inventoryLabel = i18n('content.inventory.label', {
    hero: activeHero?.name ? i18n(activeHero.name) : '',
  });
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

<h4>{inventoryLabel}</h4>
<div class="inventory">
  {#each items as item}
    {#if item}
      <ItemCard {item} state={activeState} />
    {/if}
  {/each}
</div>
