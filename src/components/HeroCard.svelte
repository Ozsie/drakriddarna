<script lang="ts">
  import type { GameState, Hero } from "../types";
  import Inventory from "./Inventory.svelte";
  export let hero: Hero;
  export let state: GameState;
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

    .hero-card .equipment span {
        float: left;
        margin: 0 4px;
        font-size: 0.75em;
    }
</style>
<div class="hero-card" style="background-color: {hero.colour};">
  <div class="hero-title">
    <b>{hero.name} - </b>
    <b> {hero.level} ({hero.experience})</b>
  </div>
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
  {#if hero === state.currentActor}
    <div class="equipment">
      <Inventory bind:inventory={hero.inventory}/>
    </div>
  {/if}
</div>
