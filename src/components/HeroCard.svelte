<script lang="ts">
  import type { GameState, Hero } from "../types";
  import Inventory from "./Inventory.svelte";
  import { t } from '$lib/translations';
  export let hero: Hero;
  export let state: GameState;

  let inventoryDisplayType = "none"

  const selectTarget = (target: Hero) => {
    if (state.targetActor && target === state.targetActor) {
      state.targetActor = undefined;
    } else {
      state.targetActor = target;
    }
  }

  const toggleInventory = (currentHero: Hero) => {
    const inventoryDiv: HTMLDivElement = document.getElementById(currentHero.name+"s-inventory") as HTMLDivElement;
    if(!inventoryDiv) return;

    currentHero.isInventoryOpen = !currentHero.isInventoryOpen;
    setInventoryDisplayType();
    inventoryDiv.style.display = inventoryDisplayType;
  }

  const setInventoryDisplayType = () => {
    if(hero.isInventoryOpen){
      inventoryDisplayType = "inline-block";
    } else {
      inventoryDisplayType = "none";
    }
  }

  setInventoryDisplayType();
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
{#key state.targetActor}
<div class="hero-card" style="background-color: {hero.colour};" >
  <div class="hero-title">
    <b>{#if state.targetActor === hero}*{/if}{$t(hero.name)} -
    {$t('content.level.' + hero.level)} ({hero.experience})</b>
  </div>
  <!-- {#if state.currentActor == hero} -->
  <div>

    <button on:click={() => selectTarget(hero)} title="select target hero">
      {#if state.targetActor !== hero}
      ⛶
      {:else}
      ☑
      {/if}
    </button>
    <button on:click={() => toggleInventory(hero)} title="Open inventory">🎒</button>
  </div>
  <!-- {/if} -->
  
  <div class="hero-information">
    {#if state.currentActor === hero}
    <div class="hero-inventory" id="{hero.name}s-inventory" style="display: {inventoryDisplayType};">
      
      <Inventory bind:inventory={hero.inventory} state={state}/>
      
    </div>
    {/if}
  </div>

  <div>
    <span>{$t('content.hero.hp')}: {hero.health}</span>

    {#if state.currentActor === hero}
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

{/key}
