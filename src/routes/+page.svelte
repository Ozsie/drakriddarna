<script>
  import { act, defaultHeroes, init, load, next, pickLock, save, search, updateStartingPositions } from "./game.ts";
  import Dungeon from "./Dungeon.svelte";
  import Characters from "./Characters.svelte";
  import { onMount } from "svelte";
    import Stat from "./Stat.svelte";

  let state = init()

  onMount(() => {
    render();
    setInterval(render, 500);
    setInterval(hasWon, 1000)
  });

  function onKeyDown(e)
  {
    switch (e.key) {
      case "6":
        act('R', state);
        break;
      case "9":
        act('UR', state);
        break;
      case "8":
        act('U', state);
        break;
      case "7":
        act('UL', state);
        break;
      case "4":
        act('L', state);
        break;
      case "1":
        act('DL', state);
        break;
      case "2":
        act('D', state);
        break;
      case "3":
        act('DR', state);
        break;
      case "0":
        next(state);
        break;
      case "-":
        pickLock(state);
        break;
      case "+":        
        search(state);      
        break;
      default:
        break;
    }
    
  }


  const hasWon = () => {
    if (state.dungeon.beaten && state.dungeon.nextDungeon) {
      state.dungeon = state.dungeon.nextDungeon;
      const missingHeroes = defaultHeroes.filter((dh) => !state.heroes.find((h) => dh.name === h.name))
      state.heroes.push(...missingHeroes)
      updateStartingPositions(state.heroes, state.dungeon);
      state.actionLog = [];
      state.actionLog.push('You have reached ' + state.dungeon.name);
    }
  }

  const render = () => {
    if (!state || !document) return;
    const c = document.getElementById("logs");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    state.actionLog.slice(-10).reverse().forEach((log, i) => {
      ctx.font = "12px Arial";
      ctx.fillStyle = 'black'
      ctx.fillText('> ' + log, 2, ((i+1) * 12) + 2);
      ctx.stroke();
    })
  }
</script>

<style>
    .container {
        width: 100%;
        height: 800px;
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

    .boardSide {
        margin-left: 15%;
        height: 800px;
        background: black;
    }

    .commands {
        width: 15%;
        height: 100px;
        background: gray;
        float: left;
        padding-right: 10px;
    }

    .log {
        margin-left: 15%;
        height: 100px;
        background: green;
    }
</style>

<div class='container'>
  <div class="characterSide">
    <Characters {state}/>
  </div>
  <div class="boardSide">
    <Dungeon bind:state={state}/>
  </div>
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
  {#key state.actionLog}
  <div class="log">
    <canvas width="860" height="100" id="logs"></canvas>
  </div>
  {/key}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />