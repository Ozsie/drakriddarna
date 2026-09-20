<script lang="ts">
  import { browser } from '$app/environment';
  import type { GameState } from '../types';
  import Menu from './Menu.svelte';
  import type { MenuButtonProps } from './ComponentTypes';
  import { locale, setLocale, t } from '$lib/translations';
  import {
    gameStateStore,
    debugModeStore,
    initGame,
    loadGameState,
    saveGame,
    nextTurn,
    endHeroAction,
    moveHero,
    pickLockAction,
    searchAction,
    setDebug,
    setGameLocale,
    winLevel,
    goToTestingGrounds,
  } from '../store/gameStateStore';
  import { act, pickLock, resetLiveHeroes, search } from '../hero/HeroLogic';
  import { endAction, hasWon, init, loadState, next, save } from '../game';
  import { testingGrounds } from '../campaigns/dungeons/testingGrounds';

  export let state: GameState | undefined = undefined;
  export let debugMode: boolean | undefined = undefined;
  export let buildInfo: { date: string; hash: string };

  $: activeState = state ?? $gameStateStore;
  $: activeDebugMode = debugMode ?? $debugModeStore;

  let showMenu: boolean = false;
  let showLoadMenu: boolean = false;
  let savedGames: MenuButtonProps[] = [];
  let mainMenuButtons: MenuButtonProps[] = [];

  const setDebugMode = () => {
    const newDebug = !activeDebugMode;
    if (debugMode !== undefined) {
      debugMode = newDebug;
    }
    if (state) {
      state.settings['debug'] = newDebug;
      gameStateStore.set(state);
    } else {
      setDebug(newDebug);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case '6':
      case 'd':
        handleMove('R');
        break;
      case '9':
      case 'e':
        handleMove('UR');
        break;
      case '8':
      case 'w':
        handleMove('U');
        break;
      case '7':
      case 'q':
        handleMove('UL');
        break;
      case '4':
      case 'a':
        handleMove('L');
        break;
      case '1':
      case 'z':
        handleMove('DL');
        break;
      case '2':
      case 'x':
        handleMove('D');
        break;
      case '3':
      case 'c':
        handleMove('DR');
        break;
      case '0':
      case ' ':
        handleNext();
        break;
      case '-':
      case 'r':
        handlePickLock();
        break;
      case '+':
      case 'f':
        handleSearch();
        break;
      default:
        break;
    }
  };

  const handleMove = (dir: string) => {
    if (state) {
      act(dir, state);
      gameStateStore.set(state);
    } else {
      moveHero(dir);
    }
  };

  const handleNext = () => {
    if (state) {
      state = next(state);
      gameStateStore.set(state);
    } else {
      nextTurn();
    }
  };

  const handleEndAction = () => {
    if (state) {
      endAction(state);
      gameStateStore.set(state);
    } else {
      endHeroAction();
    }
  };

  const handlePickLock = () => {
    if (state) {
      pickLock(state);
      gameStateStore.set(state);
    } else {
      pickLockAction();
    }
  };

  const handleSearch = () => {
    if (state) {
      search(state);
      gameStateStore.set(state);
    } else {
      searchAction();
    }
  };

  const handleWinLevel = () => {
    if (state) {
      hasWon(state);
      gameStateStore.set(state);
    } else {
      winLevel();
    }
  };

  const onNewGame = () => {
    if (state) {
      state = init();
      gameStateStore.set(state);
    } else {
      initGame();
    }
    showMenu = false;
  };

  const onSaveGame = () => {
    if (state) {
      save(state);
    } else {
      saveGame();
    }
    showMenu = false;
  };

  const toTestingGrounds = () => {
    if (state) {
      state.dungeon = testingGrounds;
      resetLiveHeroes(state);
      gameStateStore.set(state);
    } else {
      goToTestingGrounds();
    }
    showMenu = false;
  };

  const onLoadButton = () => {
    showMenu = false;
    showLoadMenu = true;
    savedGames = getSavedGames();
  };

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
      },
    });

    return buttons;
  };

  const getMainMenu = () => [
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.newGame'),
      onClick: onNewGame,
    },
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.saveGame'),
      onClick: onSaveGame,
    },
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.loadGame'),
      onClick: onLoadButton,
    },
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.debug'),
      onClick: setDebugMode,
    },
    {
      debugModeOnly: true,
      label: $t('content.menu.mainMenu.buttons.testingGrounds'),
      onClick: toTestingGrounds,
    },
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.language'),
      onClick: onChangeLanguage,
    },
  ];

  const onClickLoad = (stateString: string) => {
    const loaded = JSON.parse(stateString) as GameState;
    if (state) {
      state = loadState(loaded);
      gameStateStore.set(state);
    } else {
      loadGameState(loaded);
    }
    showMenu = false;
    showLoadMenu = false;
  };

  const onMenuButton = () => {
    mainMenuButtons = getMainMenu();
    if (showLoadMenu) {
      showMenu = false;
    } else {
      showMenu = !showMenu;
    }
    showLoadMenu = false;
  };

  const onChangeLanguage = () => {
    if (locale.get() === 'en') {
      setLocale('sv');
      if (state) {
        state.settings['locale'] = 'sv';
        gameStateStore.set(state);
      } else {
        setGameLocale('sv');
      }
    } else {
      setLocale('en');
      if (state) {
        state.settings['locale'] = 'en';
        gameStateStore.set(state);
      } else {
        setGameLocale('en');
      }
    }
    mainMenuButtons = getMainMenu();
  };

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
  <Menu
    header={$t('content.menu.mainMenu.header')}
    debugMode={activeDebugMode}
    footer={`${buildInfo.date} - ${buildInfo.hash}`}
    bind:showMenu={showMenu}
    bind:buttons={mainMenuButtons}
  />
  <Menu
    header={$t('content.menu.loadGame.header')}
    debugMode={activeDebugMode}
    footer=""
    bind:showMenu={showLoadMenu}
    bind:buttons={savedGames}
  />
  <button class="menuButton" on:click={onMenuButton}>{$t('content.menu.menuButton')}</button>
  <div>
    <button class="menuButton twoColButton" on:click={handleNext}>{$t('content.actions.next')}</button>
    <button class="menuButton twoColButton" style="float:right;" on:click={handleEndAction}>{$t('content.actions.action')}</button>
  </div>
  {#if activeState.dungeon.beaten}
    <button class="menuButton" on:click={handleWinLevel}>{$t('content.actions.nextLevel')}</button>
  {/if}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />
