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
  import { browser } from "$app/environment";
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';

  let state = init();
  let debugMode = state.settings['debug'];
  let screenSize;

  if (browser) {
    screenSize = window.innerWidth;
  }

  const setDebugMode = () => {
    debugMode = !debugMode;
    state.settings['debug'] = debugMode;
    state.reRender = true;
  }

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
        state = next(state);
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
    @media screen and (max-width: 600px) {
        .container {
            width: 100%;
            background: aqua;
        }
        .characterSide {
            width: 100%;
            height: 10%;
            position: fixed;
        }
        .commands {
            width: 40%;
            height: 100px;
            background: grey;
            float: left;
        }
    }
    @media screen and (min-width: 601px) {
        .container {
            width: 100%;
            background: aqua;
            padding: 2px;
        }
        .characterSide {
            width: 15%;
            max-width: 240px;
            background: grey;
            float: left;
            padding-right: 10px;
        }
        .commands {
            height: 100px;
            background: grey;
            float: left;
            padding-right: 10px;
        }
    }
</style>

<div class='container'>
  <div class="characterSide">
    <Characters {state}/>
  </div>
  <Dungeon bind:state={state} bind:debugMode={debugMode} />
</div>
<div class='container' id='footer'>
  <div class="commands">
    {#if screenSize < 600}
      <table>
        <tr>
          <td><button on:click={() => next(state)}>Next</button></td>
          <td><button on:click={() => endAction(state)}>End action</button></td>
        </tr>
        <tr>
          <td><button on:click={() => save(state)}>Save</button></td>
          <td><button on:click={() => state = load()}>Load</button></td>
        </tr>
        <tr>
          <td><button on:click={() => setDebugMode()}>Debug</button></td>
          {#if debugMode}
            <td><button on:click={() => {state.dungeon = testingGrounds; state.reRender = true;}}>To Testing Grounds</button></td>
          {/if}
        </tr>
      </table>
    {:else}
      <table>
        <tr>
          <td><button on:click={() => act('UL', state)}>UL</button></td>
          <td><button on:click={() => act('U', state)}>U</button></td>
          <td><button on:click={() => act('UR', state)}>UR</button></td>
          <td><button on:click={() => state = next(state)}>Next</button></td>
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
          <td><button on:click={() => setDebugMode()}>Debug</button></td>
          <td><button on:click={() => endAction(state)}>End action</button></td>
          {#if state.dungeon.beaten}
            <button on:click={() => hasWon(state)}>Next level</button>
          {/if}
          {#if debugMode}
            <td><button on:click={() => {state.dungeon = testingGrounds; state.reRender = true;}}>To Testing Grounds</button></td>
          {/if}
        </tr>
      </table>
    {/if}
  </div>
  <Log bind:state={state}/>
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
