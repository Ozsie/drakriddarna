<script lang="ts">
  import { doReRender, hasWon, init, loadState, next, save } from '../game';
  import { act, endAction, pickLock, search } from '../hero/HeroLogic';
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
  import { browser } from '$app/environment';
  import type { GameState } from '../types';
  import Menu from './Menu.svelte';
  import type { MenuButtonProps } from './ComponentTypes';

  export let state: GameState;
  export let debugMode: boolean;
  export let buildInfo: {date: string, hash: string};
  let showMenu: boolean = false;
  let showLoadMenu: boolean = false;
  let savedGames: MenuButtonProps[] = [];

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

  const onNewGame = () => {
    state = init();
    doReRender(state);
    showMenu = false;
  }

  const onSaveGame = () => {
    save(state);
    showMenu = false;
  }

  const toTestingGrounds = () => {
    state.dungeon = testingGrounds;
    doReRender(state);
    showMenu = false;
  }

  const onLoadButton = () => {
    showMenu = false;
    showLoadMenu = true;
    savedGames = getSavedGames();
  }

  const getSavedGames = () => {
    if (!browser) return [];
    const buttons: MenuButtonProps[] = [];
    const autoSave = localStorage.getItem('autosave') as string;
    if (autoSave) {
      buttons.push({
        debugModeOnly: false,
        label: 'Autosave',
        onClick: () => onClickLoad(autoSave),
      });
    }

    const manualSave = localStorage.getItem('state') as string;
    if (manualSave) {
      buttons.push({
        debugModeOnly: false,
        label: 'Manual Save',
        onClick: () => onClickLoad(manualSave),
      });
    }

    buttons.push({
      debugModeOnly: false,
      label: 'Back',
      onClick: () => {
        showMenu = true;
        showLoadMenu = false;
      }
    });

    return buttons
  }

  const onClickLoad = (stateString: string) => {
    state = loadState(JSON.parse(stateString) as GameState);
    showMenu = false;
    showLoadMenu = false;
  }

  const onMenuButton = () => {
    if (showLoadMenu) {
      showMenu = false;
    } else {
      showMenu = !showMenu;
    }
    showLoadMenu = false;
  }

  const mainMenuButtons: MenuButtonProps[] = [
    {debugModeOnly: false, label: 'New Game', onClick: onNewGame},
    {debugModeOnly: false, label: 'Save', onClick: onSaveGame},
    {debugModeOnly: false, label: 'Load', onClick: onLoadButton},
    {debugModeOnly: false, label: 'Debug', onClick: setDebugMode},
    {debugModeOnly: true, label: 'To Testing Grounds', onClick: toTestingGrounds}
  ]

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
    .menuButton {
        margin: auto;
        width: 100%;
        margin-bottom: 10px;
        border-top-right-radius: 8px;
        border-bottom-left-radius: 8px;
    }
    .twoColButton {
        width: 48%;
    }
</style>
<div class="commands">
  <Menu header='Main Menu' bind:debugMode={debugMode} footer={`${buildInfo.date} - ${buildInfo.hash}`} bind:showMenu={showMenu} buttons={mainMenuButtons} />
  <Menu header='Load Game' bind:debugMode={debugMode} footer='' bind:showMenu={showLoadMenu} bind:buttons={savedGames}/>
  <button class='menuButton' on:click={onMenuButton}>Menu</button>
  <div>
    <button class='menuButton twoColButton' on:click={() => state = next(state)}>Next</button>
    <button class='menuButton twoColButton' style='float:right;' on:click={() => endAction(state)}>Action</button>
  </div>
  {#if state.dungeon.beaten}
    <button class='menuButton' on:click={() => hasWon(state)}>Next level</button>
  {/if}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
