<script>
  import { init, move, next } from "./game.ts";
  import Dungeon from "./Dungeon.svelte";
  import CharacterCard from "./CharacterCard.svelte";

  let state = init()

</script>

<style>
    .container {
        width: 100%;
        height: 800px;
        background: aqua;
        padding: 2px;
    }

    .one {
        width: 15%;
        height: 800px;
        background: red;
        float: left;
        padding-right: 10px;
    }

    .two {
        margin-left: 15%;
        height: 800px;
        background: gray;
    }
</style>

<div class='container'>
  <div class='one'>
    <ul>
      {#each state.heroes as hero}
        {#key hero}
        <CharacterCard {hero} {state}/>
        {/key}
      {/each}
    </ul>
  </div>
  <div class='two'>
    <div>{state.dungeon.name}</div>
    <Dungeon bind:state={state}/>
  </div>
</div>
<div>
  <table>
    <tr>
      <td><button on:click={move(state.currentActor, 'UL', state)}>UL</button></td>
      <td><button on:click={move(state.currentActor, 'U', state)}>U</button></td>
      <td><button on:click={move(state.currentActor, 'UR', state)}>UR</button></td>
      <td><button on:click={next(state)}>Next</button></td>
    </tr>
    <tr>
      <td><button on:click={move(state.currentActor, 'L', state)}>L</button></td>
      <td></td>
      <td><button on:click={move(state.currentActor, 'R', state)}>R</button></td>
      <td><button>Search</button></td>
    </tr>
  </table>
  <tr>
    <td><button on:click={move(state.currentActor, 'DL', state)}>DL</button></td>
    <td><button on:click={move(state.currentActor, 'D', state)}>D</button></td>
    <td><button on:click={move(state.currentActor, 'DR', state)}>DR</button></td>
  </tr>
</div>