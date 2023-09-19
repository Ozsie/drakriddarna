<script>
  import {
    hasWon,
    init,
    load,
    next,
    save
  } from "../game.ts";
  import Dungeon from '../components/Dungeon.svelte';
  import Characters from '../components/Characters.svelte';
  import Log from '../components/Log.svelte';
  import { onMount } from 'svelte';
  import {
    search,
    endAction,
    act,
    pickLock
  } from "../hero/HeroLogic.ts";

  let state = init();
  let debugMode = false;

  onMount(() => {
    setInterval(() => {
      return hasWon(state);
    }, 1000);
  });

  function onKeyDown(e)
  {
    switch (e.key) {
      case "6":
      case "d":
        act('R', state);
        break;
      case "9":
      case "e":
        act('UR', state);
        break;
      case "8":
      case "w":
        act('U', state);
        break;
      case "7":
      case "q":
        act('UL', state);
        break;
      case "4":
      case "a":
        act('L', state);
        break;
      case "1":
      case "z":
        act('DL', state);
        break;
      case "2":
      case "x":
        act('D', state);
        break;
      case "3":
      case "c":
        act('DR', state);
        break;
      case "0":
      case " ":
        next(state);
        break;
      case "-":
      case "r":
        pickLock(state);
        break;
      case "+":        
      case "f":
        search(state);      
        break;
      default:
        break;
    }
    
  }
</script>

<style>
    .container {
        width: 100%;
        background: aqua;
        padding: 2px;
    }
    @media screen and (max-width: 600px) {
        .characterSide {
            visibility: hidden;
            clear: both;
            float: left;
            margin: 10px auto 5px 20px;
            width: 28%;
            display: none;
        }
    }
    .characterSide {
        width: 15%;
        max-width: 240px;
        background: gray;
        float: left;
        padding-right: 10px;
    }
    .commands {
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
  <Dungeon bind:state={state} bind:debugMode={debugMode}/>
</div>
<div class='container' id='footer'>
  <div class="commands">
    <table>
      <tr>
        <td><button on:click={() => act('UL', state)}>UL</button></td>
        <td><button on:click={() => act('U', state)}>U</button></td>
        <td><button on:click={() => act('UR', state)}>UR</button></td>
        <td><button on:click={() => next(state)}>Next</button></td>
      </tr>
      <tr>
        <td><button on:click={() => act('L', state)}>L</button></td>
        <td></td>
        <td><button on:click={() => act('R', state)}>R</button></td>
        <td><button on:click={() => search(state)}>Search</button></td>
      </tr>
      <tr>
        <td><button on:click={() => act('DL', state)}>DL</button></td>
        <td><button on:click={() => act('D', state)}>D</button></td>
        <td><button on:click={() => act('DR', state)}>DR</button></td>
        <td><button on:click={() => pickLock(state)}>Pick lock</button></td>
      </tr>
      <tr>
        <td><button on:click={() => save(state)}>Save</button></td>
        <td><button on:click={() => state = load()}>Load</button></td>
        <td><button on:click={() => debugMode = !debugMode}>Debug</button></td>
        <td><button on:click={() => endAction(state)}>End action</button></td>
      </tr>
    </table>
  </div>
  <Log bind:state={state}/>
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
