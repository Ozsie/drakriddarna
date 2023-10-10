<script lang="ts">
  import { doReRender, hasWon, init, loadState, next, save } from '../game';
  import { act, endAction, pickLock, resetLiveHeroes, search } from '../hero/HeroLogic';
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
  import { browser } from '$app/environment';
  import type { GameState } from '../types';
  import Menu from './Menu.svelte';
  import type { MenuButtonProps } from './ComponentTypes';
  import { locale, setLocale, t } from '$lib/translations';

  export let state: GameState;
  export let debugMode: boolean;
  export let buildInfo: {date: string, hash: string};
  let showMenu: boolean = false;
  let showLoadMenu: boolean = false;
  let savedGames: MenuButtonProps[] = [];
  let mainMenuButtons: MenuButtonProps[] = [];

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
    resetLiveHeroes(state);
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
        label: $t('content.menu.loadGame.buttons.autoSave'),
        onClick: () => onClickLoad(autoSave),
      });
    }

    const manualSave = localStorage.getItem('state') as string;
    if (manualSave) {
      buttons.push({
        debugModeOnly: false,
        label: $t('content.menu.loadGame.buttons.manualSave'),
        onClick: () => onClickLoad(manualSave),
      });
    }

    buttons.push({
      debugModeOnly: false,
      label: $t('content.menu.loadGame.buttons.back'),
      onClick: () => {
        showMenu = true;
        showLoadMenu = false;
      }
    });

    return buttons
  }

  const getMainMenu = () => [
    {debugModeOnly: false, label: $t('content.menu.mainMenu.buttons.newGame'), onClick: onNewGame},
    {debugModeOnly: false, label: $t('content.menu.mainMenu.buttons.saveGame'), onClick: onSaveGame},
    {debugModeOnly: false, label: $t('content.menu.mainMenu.buttons.loadGame'), onClick: onLoadButton},
    {debugModeOnly: false, label: $t('content.menu.mainMenu.buttons.debug'), onClick: setDebugMode},
    {debugModeOnly: true, label: $t('content.menu.mainMenu.buttons.testingGrounds'), onClick: toTestingGrounds},
    {debugModeOnly: false, label: $t('content.menu.mainMenu.buttons.language'), onClick: onChangeLanguage}
  ]

  const onClickLoad = (stateString: string) => {
    state = loadState(JSON.parse(stateString) as GameState);
    showMenu = false;
    showLoadMenu = false;
  }

  const onMenuButton = () => {
    mainMenuButtons = getMainMenu();
    if (showLoadMenu) {
      showMenu = false;
    } else {
      showMenu = !showMenu;
    }
    showLoadMenu = false;
  }

  const onChangeLanguage = () => {
    if (locale.get() === 'en') {
      setLocale('sv');
      state.settings['locale'] = 'sv';
    } else {
      setLocale('en');
      state.settings['locale'] = 'en';
    }
    mainMenuButtons = getMainMenu();
    doReRender(state);
  }

  mainMenuButtons = getMainMenu();

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
  <Menu header={$t('content.menu.mainMenu.header')} bind:debugMode={debugMode} footer={`${buildInfo.date} - ${buildInfo.hash}`} bind:showMenu={showMenu} bind:buttons={mainMenuButtons} />
  <Menu header={$t('content.menu.loadGame.header')} bind:debugMode={debugMode} footer='' bind:showMenu={showLoadMenu} bind:buttons={savedGames}/>
  <button class='menuButton' on:click={onMenuButton}>{$t('content.menu.menuButton')}</button>
  <div>
    <button class='menuButton twoColButton' on:click={() => state = next(state)}>{$t('content.actions.next')}</button>
    <button class='menuButton twoColButton' style='float:right;' on:click={() => endAction(state)}>{$t('content.actions.action')}</button>
  </div>
  {#if state.dungeon.beaten}
    <button class='menuButton' on:click={() => hasWon(state)}>{$t('content.actions.nextLevel')}</button>
  {/if}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
