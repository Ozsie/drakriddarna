<script lang="ts">
  import HeroCard from './HeroCard.svelte';
  import { liveHeroesStore, currentHero, gameStateStore } from '../store/gameStateStore';
  import { liveHeroes } from '../hero/HeroLogic';
  import type { GameState } from '../types';

  export let state: GameState | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: heroes = state ? liveHeroes(state) : $liveHeroesStore;
  $: currHero = state ? state.currentActor : $currentHero;
</script>

<style>
  .characters-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  @media screen and (max-width: 600px) {
    .characters-container {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .hero-wrapper {
      flex: 1 1 22%;
      min-width: 70px;
    }
  }

  .hero-wrapper {
    border-radius: var(--radius-md, 8px);
    border: 3px solid transparent;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .is-current-actor {
    border-color: var(--color-border-active, #60a5fa);
    box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
  }

  .not-current-actor {
    border-color: transparent;
  }
</style>

<div class="characters-container">
  {#each heroes as hero (hero.name)}
    <div class="hero-wrapper {hero.name === currHero?.name ? 'is-current-actor' : 'not-current-actor'}">
      <HeroCard {hero} state={activeState}/>
    </div>
  {/each}
</div>
