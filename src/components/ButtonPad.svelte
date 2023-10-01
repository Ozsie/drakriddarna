<script lang="ts">
  import { doReRender, hasWon, init, load, next, save } from '../game';
  import { act, endAction, pickLock, search } from '../hero/HeroLogic';
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
  import { browser } from '$app/environment';
  import type { GameState } from '../types';

  export let state: GameState;
  export let debugMode: boolean;
  export let buildInfo: {date: string, hash: string};
  let screenSize: number;
  let showMenu: boolean = false;

  if (browser) {
    screenSize = window.innerWidth;
  }

  const setDebugMode = () => {
    debugMode = !debugMode;
    state.settings['debug'] = debugMode;
    doReRender(state);
  }

  const onKeyDown = (e: KeyboardEvent) => {
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

  const newGame = () => {
    state = init();
    doReRender(state);
    showMenu = false;
  }

</script>
<style>
    .commands {
        background: grey;
        float: left;
    }
    @media screen and (max-width: 600px) {
        .commands {
            width: 25%;
            padding: 4px;
        }
    }
    @media screen and (min-width: 601px) {
        .commands {
            width: 15%;
            padding: 10px 10px 0 10px;
            height: 90px;
        }
    }
    .menuClosed {
        display: none;
    }
    .menuOpen {
        background: cornsilk;
        margin: auto;
        position: absolute;
        bottom: 110px;
        max-width: 240px;
        width: 15%;
        padding: 10px;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
    }
    @media screen and (max-width: 600px) {
        .menuOpen {
            width: 80%;
            max-width: 80%;
        }
    }
    @media screen and (min-width: 601px) {
        .menuOpen {
            max-width: 240px;
        }
    }
    .menuButton {
        margin: auto;
        width: 100%;
        margin-bottom: 10px;
        border-top-right-radius: 8px;
        border-bottom-left-radius: 8px;
    }
    .infoRow {
        display: block;
        margin: auto;
        width: 100%;
        text-align: center;
        font-size: 7pt;
    }
    .twoColButton {
        width: 48%;
    }
</style>
<div class="commands">
  <div class='  {showMenu ? "menuOpen" : "menuClosed"}'>
    <button class='menuButton' on:click={newGame}>New Game</button>
    <button class='menuButton' on:click={() => save(state)}>Save</button>
    <button class='menuButton' on:click={() => state = load(state)}>Load</button>
    <button class='menuButton' on:click={() => setDebugMode()}>Debug</button>
    {#if debugMode}
      <button class='menuButton' on:click={() => {state.dungeon = testingGrounds; doReRender(state);}}>To Testing Grounds</button>
    {/if}
    <span class='infoRow'>{buildInfo.date} - {buildInfo.hash}</span>
  </div>
  <button class='menuButton' on:click={() => showMenu = !showMenu}>Menu</button>
  <div>
    <button class='menuButton twoColButton' on:click={() => state = next(state)}>Next</button>
    <button class='menuButton twoColButton' style='float:right;' on:click={() => endAction(state)}>Action</button>
  </div>
  {#if state.dungeon.beaten}
    <button class='menuButton' on:click={() => hasWon(state)}>Next level</button>
  {/if}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
