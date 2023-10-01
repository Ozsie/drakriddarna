<script lang="ts">
  import { hasWon, load, next, save } from '../game';
  import { act, endAction, pickLock, search } from '../hero/HeroLogic';
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
  import { browser } from '$app/environment';
  import type { GameState } from '../types';

  export let state: GameState;
  export let debugMode: boolean;
  let screenSize;

  if (browser) {
    screenSize = window.innerWidth;
  }

  const setDebugMode = () => {
    debugMode = !debugMode;
    state.settings['debug'] = debugMode;
    state.reRender = true;
  }

  const onKeyDown = (e) => {
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
        .commands {
            width: 40%;
            height: 100px;
            background: grey;
            float: left;
        }
    }
    @media screen and (min-width: 601px) {
        .commands {
            height: 100px;
            background: grey;
            float: left;
            padding-right: 10px;
        }
    }
</style>
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
<svelte:window on:keydown|preventDefault={onKeyDown} />
