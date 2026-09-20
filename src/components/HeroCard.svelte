<script lang="ts">
  import type { GameState, Hero } from "../types";
  import Inventory from "./Inventory.svelte";
  import { t } from '$lib/translations';
  import { gameStateStore, selectTargetHero, toggleHeroInventory } from '../store/gameStateStore';

  export let hero: Hero;
  export let state: GameState | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: isTarget = activeState.targetActor?.name === hero.name;
  $: isCurrent = activeState.currentActor?.name === hero.name;

  let inventoryDisplayType = hero.isInventoryOpen ? "inline-block" : "none";
  $: inventoryDisplayType = hero.isInventoryOpen ? "inline-block" : "none";

  const selectTarget = (target: Hero) => {
    if (state) {
      if (state.targetActor && state.targetActor.name === target.name) {
        state.targetActor = undefined;
      } else {
        state.targetActor = target;
      }
      gameStateStore.set(state);
    } else {
      selectTargetHero(target);
    }
  };

  const toggleInventory = (currentHero: Hero) => {
    if (state) {
      currentHero.isInventoryOpen = !currentHero.isInventoryOpen;
      gameStateStore.set(state);
    } else {
      toggleHeroInventory(currentHero);
    }
  };
</script>

<style>
    .hero-card {
        font-size: 0.9em;
        font-family: Arial, Helvetica, sans-serif;
        margin: 4px;
        padding: 4px;
        white-space: nowrap;
        overflow: hidden;
        max-width: 235px;
        border-radius: 5px;
    }

    .hero-title {
        display: inline-block;
    }

    .hero-title b {
        float: left;
    }

    .hero-card span {
        display: block;
    }

    .hero-card .equipment {
        float: left;
        margin: 0 4px;
        font-size: 0.75em;
    }

    .hero-information{
      position: relative
    }

    .hero-inventory {
        position: fixed;
        opacity: 90%;
        background-color: burlywood;
        padding: 2px;
        border-radius: 4px;
        border: 2px solid #5C4033;
        min-height: 50px;
        word-wrap: break-word;
    }
    @media screen and (max-width: 600px) {
      .hero-inventory {
        top: 205px;
        left: 15px;
        width: calc(92% - 6px);

      }
    }
    @media screen and (min-width: 601px) {
      .hero-inventory {
        top: 15px;
        left: 20%;
        width: calc(60%);
        margin-top: 4px;
      }
    }
</style>

<div class="hero-card" style="background-color: {hero.colour};" >
  <div class="hero-title">
    <b>{#if isTarget}*{/if}{$t(hero.name)} -
    {$t('content.level.' + hero.level)} ({hero.experience})</b>
  </div>
  <div>
    <button on:click={() => selectTarget(hero)} title="select target hero">
      {#if !isTarget}
      ⛶
      {:else}
      ☑
      {/if}
    </button>
    <button on:click={() => toggleInventory(hero)} title="Open inventory">🎒</button>
  </div>
  
  <div class="hero-information">
    {#if isCurrent}
    <div class="hero-inventory" id="{hero.name}s-inventory" style="display: {inventoryDisplayType};">
      <Inventory inventory={hero.inventory} state={activeState}/>
    </div>
    {/if}
  </div>

  <div>
    <span>{$t('content.hero.hp')}: {hero.health}</span>

    {#if isCurrent}
    <span>{$t('content.hero.actions')}: {hero.actions}</span>
    <span>{$t('content.hero.moves')}: {hero.movement}</span>
    <span>{$t('content.hero.equipment')}: </span>
    <div class="equipment">
      <span>🗡️ {$t(hero.weapon.name)} ({hero.weapon.dice}) </span>
      <span>
        🧱
        {#if hero.armour}
          {$t(hero.armour.name)} ({hero.armour.defense})
        {:else}
          {$t('content.hero.none')} (0)
        {/if}
      </span>
      <span>
        🛡️
        {#if hero.shield}
          {$t(hero.shield.name)} ({hero.shield.dice})
        {:else}
          {$t('content.hero.none')} (0)
        {/if}
      </span>
    </div>
    {/if}
  </div>
  
</div>
