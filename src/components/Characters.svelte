<script lang="ts">
  import HeroCard from './HeroCard.svelte';
  import { onMount } from 'svelte';
  import { liveHeroes } from '../hero/HeroLogic';
  import type { GameState } from '../types';

  export let state: GameState;
  let uglyUpdateToggle = false;
  
  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    if (state.reRender) {
      uglyUpdateToggle = !uglyUpdateToggle;
    }
    if (!state || !document) return;
  };
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
{#each liveHeroes(state) as hero, i}
  {#key uglyUpdateToggle}
    {#if hero === state.currentActor}
    <div class="is-current-actor">
      <HeroCard hero={hero} state={state}/>
    </div>
    {:else}
    <div class="not-current-actor">
      <HeroCard hero={hero} state={state}/>
    </div>
    {/if}
  {/key}
{/each}
