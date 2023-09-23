<script lang="ts">
  import type { GameState, Hero } from "../types";
  import Inventory from "./Inventory.svelte";
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

  const toggleInventory = (currentHero: Hero) =>
  {
    const inventoryDiv =  document.getElementById(currentHero.name+"s-inventory");
    console.log(currentHero.isInventoryOpen);
    if(inventoryDiv == null)
      return; 

    currentHero.isInventoryOpen = !currentHero.isInventoryOpen;
    setInvetoryDisplayTyp();
    inventoryDiv.style.display = inventoryDisplayType;
  }

  const setInvetoryDisplayTyp = () =>
  {
    if(hero.isInventoryOpen){
      inventoryDisplayType = "inline-block";
    }
    else{
      inventoryDisplayType = "none";
    }
  }

  setInvetoryDisplayTyp();

  
</script>
<style>
    .hero-card{
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
    .hero-inventory
    {
      position: absolute;
      opacity: 90%;
      background-color: bisque;
      padding: 2px;
      border-radius: 3px;
      border: 1px solid black;
      width: calc(100% - 6px);
      min-height: 50px;
      margin-top: 4px;
      word-wrap: break-word;      

    }
    .hero-inventory > *{
      position:relative;
      float: left;
      margin: 1px;
      word-wrap: break-word;
    }
    .hero-stats-and-equipmnet{

    }
    .hero-action-bittons{
      
    }
</style>
{#key state.targetActor}
<div class="hero-card" style="background-color: {hero.colour};">
  <div class="hero-title">
    <b>{#if state.targetActor === hero}*{/if}{hero.name} - </b>
    <b> {hero.level} ({hero.experience})</b>
  </div>
  {#if state.currentActor == hero}
  <div class="hero-action-bittons">

    <button on:click={() => selectTarget(hero)} title="select target hero">
      {#if state.targetActor !== hero}
      ⛶
      {:else}
      ☑
      {/if}
    </button>
    <button on:click={() => toggleInventory(hero)} title="Open inventory">🎒</button>
  </div>

  
  <div class="hero-information">
  
    <div class="hero-inventory" id="{hero.name}s-inventory" style="display: {inventoryDisplayType};">
      
      <Inventory bind:inventory={hero.inventory} state={state}/>
      
    </div>
    
  </div>

  <div class="hero-stats-and-equipmnet">
    <span>HP: {hero.health}</span>
    <span>Actions: {hero.actions}</span>
    <span>Moves: {hero.movement}</span>
    <span>Equipment: </span>
    <div class="equipment">
      <span>🗡️ {hero.weapon.name} ({hero.weapon.dice}) </span>
      <span>
        🧱
        {#if hero.armour}
          {hero.armour.name} ({hero.armour.defense})
        {:else}
          None (0)
        {/if}
      </span>
      <span>
        🛡️
        {#if hero.shield}
          {hero.shield.name} ({hero.shield.dice})
        {:else}
          None (0)
        {/if}
      </span>
    </div>
  </div>
  {/if}
</div>

{/key}