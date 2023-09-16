<script>
  import { act, defaultHeroes, init, load, next, pickLock, save, search, updateStartingPositions } from "./game.ts";
  import Dungeon from "./Dungeon.svelte";
  import Characters from "./Characters.svelte";
  import Log from "./Log.svelte";
  import { onMount } from "svelte";

  let state = init();

  onMount(() => {
    setInterval(hasWon, 1000)
  });

  const hasWon = () => {
    if (state.dungeon.beaten && state.dungeon.nextDungeon) {
      state.dungeon = state.dungeon.nextDungeon;
      const missingHeroes = defaultHeroes.filter((dh) => !state.heroes.find((h) => dh.name === h.name))
      state.heroes.push(...missingHeroes)
      updateStartingPositions(state.heroes, state.dungeon);
      state.actionLog = ['You have reached ' + state.dungeon.name];
    }
  }
</script>

<style>
    .container {
        width: 100%;
        background: aqua;
        padding: 2px;
    }

    .characterSide {
        width: 15%;
        height: 800px;
        background: gray;
        float: left;
        padding-right: 10px;
    }

    .commands {
        width: 15%;
        height: 100px;
        background: gray;
        float: left;
        padding-right: 10px;
    }
</style>

<div class='container'>
  <div class="characterSide">
    <Characters {state}/>
  </div>
  <Dungeon bind:state={state}/>
</div>
<div class='container'>
  <div class="commands">
    <table>
      <tr>
        <td><button on:click={act('UL', state)}>UL</button></td>
        <td><button on:click={act('U', state)}>U</button></td>
        <td><button on:click={act('UR', state)}>UR</button></td>
        <td><button on:click={next(state)}>Next</button></td>
      </tr>
      <tr>
        <td><button on:click={act('L', state)}>L</button></td>
        <td></td>
        <td><button on:click={act('R', state)}>R</button></td>
        <td><button on:click={search(state)}>Search</button></td>
      </tr>
      <tr>
        <td><button on:click={act('DL', state)}>DL</button></td>
        <td><button on:click={act('D', state)}>D</button></td>
        <td><button on:click={act('DR', state)}>DR</button></td>
        <td><button on:click={pickLock(state)}>Pick lock</button></td>
      </tr>
      <tr>
        <td><button on:click={save(state)}>Save</button></td>
        <td><button on:click={() => state = load()}>Load</button></td>
      </tr>
    </table>
  </div>
  <Log bind:state={state}/>
</div>