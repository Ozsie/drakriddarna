<script lang="ts">
  import HeroCard from "./HeroCard.svelte";
  import { onMount } from "svelte";
  export let state: any ;
  let uglyUpdateToggle = false;;
  
  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    uglyUpdateToggle = !uglyUpdateToggle;
    if (!state || !document) return;  
  }
  
</script>
{#each state.heroes as hero, i}

  {#key uglyUpdateToggle}
    {#if hero === state.currentActor}
    <div class="is-current-actor">
      <HeroCard hero={hero} />
    </div>
    {:else}
    <div class="not-current-actor">
      <HeroCard hero={hero} />
    </div>
    {/if}
  {/key}
{/each}

<style>
  .is-current-actor{
    border-color: lightblue;
    border-width: 4px;
    border-style: solid;
    border-radius: 10px;
    margin: 4px 4px -4px 4px;
  }

  .not-current-actor{
    border-color: transparent;
    border-width: 4px;
    border-style: solid;
    border-radius: 10px;
    margin: 4px 4px -4px 4px;
  }
</style>