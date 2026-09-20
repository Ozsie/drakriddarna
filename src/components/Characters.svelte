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
    @media screen and (max-width: 600px) {
        .is-current-actor{
            border-color: lightblue;
            border-width: 4px;
            border-style: solid;
            border-radius: 10px;
            margin: 4px 4px -4px 4px;
            width: 20%;
            float: left;
        }

        .not-current-actor{
            border-color: transparent;
            border-width: 4px;
            border-style: solid;
            border-radius: 10px;
            margin: 4px 4px -4px 4px;
            width: 20%;
            float: left;
        }
    }

    @media screen and (min-width: 601px) {
        .is-current-actor {
            border-color: lightblue;
            border-width: 4px;
            border-style: solid;
            border-radius: 10px;
            margin: 4px 4px -4px 4px;
        }

        .not-current-actor {
            border-color: transparent;
            border-width: 4px;
            border-style: solid;
            border-radius: 10px;
            margin: 4px 4px -4px 4px;
        }
    }
</style>

{#each heroes as hero (hero.name)}
  {#if hero.name === currHero?.name}
    <div class="is-current-actor">
      <HeroCard {hero} state={activeState}/>
    </div>
  {:else}
    <div class="not-current-actor">
      <HeroCard {hero} state={activeState}/>
    </div>
  {/if}
{/each}
