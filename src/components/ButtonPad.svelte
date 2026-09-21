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
    setDebug,
    setGameLocale,
    winLevel,
    goToTestingGrounds,
  } from '../store/gameStateStore';
  import { resetLiveHeroes } from '../hero/HeroLogic';
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
    background: var(--color-panel-bg, #252932);
    color: var(--color-text-primary, #e2e8f0);
    padding: 8px;
    border-radius: var(--radius-sm, 4px);
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
  }
  .menuButton {
    margin: 0;
    width: 100%;
    border-top-right-radius: 8px;
    border-bottom-left-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
  }
  .buttonGroup {
    display: flex;
    gap: 6px;
    width: 100%;
  }
  .twoColButton {
    flex: 1;
    width: 100%;
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
  <div class="buttonGroup">
    <button class="menuButton twoColButton" on:click={handleNext}>{$t('content.actions.next')}</button>
    <button class="menuButton twoColButton" on:click={handleEndAction}>{$t('content.actions.action')}</button>
  </div>
  {#if activeState.dungeon.beaten}
    <button class="menuButton" on:click={handleWinLevel}>{$t('content.actions.nextLevel')}</button>
  {/if}
</div>
