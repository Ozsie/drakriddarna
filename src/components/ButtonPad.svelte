<script lang="ts">
  import { browser } from '$app/environment';
  import type { GameState, TurnEvent } from '../types';
  import Menu from './Menu.svelte';
  import type { MenuButtonProps } from './ComponentTypes';
  import { locale, setLocale, t } from '$lib/translations';
  import {
    debugModeStore,
    dispatch,
    gameStateStore,
    goToTestingGrounds,
    initGame,
    loadGameState,
    saveGame,
    setDebug,
    setDifficulty,
    setGameLocale,
    winLevel,
  } from '../store/gameStateStore';
  import { resetLiveHeroes } from '../hero/HeroLogic';
  import { addLog, DifficultLevels, getDifficulty, hasWon, init, loadState, save } from '../game';
  import { testingGrounds } from '../dungeon/testingGrounds';
  import { getEventsForDungeon, selectNextEvent, shuffleEventDeck } from '../events/EventsLogic';
  import { campaigns } from '../campaigns';

  export let state: GameState | undefined = undefined;
  export let debugMode: boolean | undefined = undefined;
  export let buildInfo: { date: string; hash: string };

  $: activeState = state ?? $gameStateStore;
  $: activeDebugMode = debugMode ?? $debugModeStore;

  let showMenu: boolean = false;
  let showLoadMenu: boolean = false;
  let showEventMenu: boolean = false;
  let showCampaignMenu: boolean = false;
  let savedGames: MenuButtonProps[] = [];
  let mainMenuButtons: MenuButtonProps[] = [];
  let eventMenuButtons: MenuButtonProps[] = [];
  let campaignMenuButtons: MenuButtonProps[] = [];

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

  const handleWinLevel = () => {
    if (state) {
      hasWon(state);
      gameStateStore.set(state);
    } else {
      winLevel();
    }
  };

  const onNewGame = (campaignId: string) => {
    if (state) {
      state = init(campaignId);
      gameStateStore.set(state);
    } else {
      initGame(campaignId);
    }
    showMenu = false;
    showCampaignMenu = false;
  };

  const getCampaignMenu = (): MenuButtonProps[] => {
    const buttons = Object.values(campaigns).map((campaign) => ({
      debugModeOnly: false,
      label: $t(campaign.name),
      onClick: () => onNewGame(campaign.id),
    }));
    buttons.push({
      debugModeOnly: false,
      label: $t('content.menu.loadGame.buttons.back'),
      onClick: () => {
        showMenu = true;
        showCampaignMenu = false;
      },
    });
    return buttons;
  };

  const onNewGameButton = () => {
    showMenu = false;
    showCampaignMenu = true;
    campaignMenuButtons = getCampaignMenu();
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
      state.eventDeck = getEventsForDungeon(state.dungeon);
      resetLiveHeroes(state);
      gameStateStore.set(state);
    } else {
      goToTestingGrounds();
    }
    showMenu = false;
  };

  const onShuffleDeck = () => {
    if (state) {
      shuffleEventDeck(state);
      gameStateStore.set(state);
    } else {
      dispatch(shuffleEventDeck);
    }
    showMenu = false;
  };

  const onSelectNextEvent = (event: TurnEvent) => {
    if (state) {
      selectNextEvent(state, event.id);
      gameStateStore.set(state);
    } else {
      dispatch((currentState) => selectNextEvent(currentState, event.id));
    }
    showEventMenu = false;
  };

  const getEventMenu = (): MenuButtonProps[] => {
    const buttons = activeState.eventDeck
      .sort((a, b) => a.number - b.number)
      .map((event) => ({
        debugModeOnly: false,
        label: $t(event.nameTranslationKey ?? event.name),
        onClick: () => onSelectNextEvent(event),
      }));
    buttons.push({
      debugModeOnly: false,
      label: $t('content.menu.loadGame.buttons.back'),
      onClick: () => {
        showMenu = true;
        showEventMenu = false;
      },
    });
    return buttons;
  };

  const onSelectNextEventButton = () => {
    showMenu = false;
    showEventMenu = true;
    eventMenuButtons = getEventMenu();
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
      onClick: onNewGameButton,
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
      debugModeOnly: true,
      label: $t('content.menu.mainMenu.buttons.shuffleDeck'),
      onClick: onShuffleDeck,
    },
    {
      debugModeOnly: true,
      label: $t('content.menu.mainMenu.buttons.selectNextEvent'),
      onClick: onSelectNextEventButton,
    },
    {
      debugModeOnly: false,
      label: $t('content.menu.mainMenu.buttons.language'),
      onClick: onChangeLanguage,
    },
    {
      debugModeOnly: false,
      label: getDifficultyMenuLabel(),
      onClick: onClickDifficulty,
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
    if (showLoadMenu || showEventMenu || showCampaignMenu) {
      showMenu = false;
    } else {
      showMenu = !showMenu;
    }
    showLoadMenu = false;
    showEventMenu = false;
    showCampaignMenu = false;
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

  const onClickDifficulty = () => {
    const difficulty = getDifficulty(activeState);
    const index = DifficultLevels.findIndex((level) => level.id === difficulty.id);
    const nextIndex = (index + 1) % DifficultLevels.length;
    const nextDifficulty = DifficultLevels[nextIndex];
    if (state) {
      state.difficulty = nextDifficulty;
      addLog(state, nextDifficulty.descriptionTranslationKey ?? '');
      gameStateStore.set(state);
    } else {
      setDifficulty(nextDifficulty);
      addLog(activeState, nextDifficulty.descriptionTranslationKey ?? '');
      gameStateStore.set(activeState);
    }
    mainMenuButtons = getMainMenu();
  };

  const getDifficultyMenuLabel = () => {
    const difficulty = getDifficulty(activeState);
    return $t('content.menu.mainMenu.buttons.difficulty') + ' ' + $t(difficulty?.nameTranslationKey);
  }

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
  <Menu
    header={$t('content.menu.selectNextEvent.header')}
    debugMode={activeDebugMode}
    footer=""
    bind:showMenu={showEventMenu}
    bind:buttons={eventMenuButtons}
  />
  <Menu
    header={$t('content.menu.selectCampaign.header')}
    debugMode={activeDebugMode}
    footer=""
    bind:showMenu={showCampaignMenu}
    bind:buttons={campaignMenuButtons}
  />
  <button class="menuButton" on:click={onMenuButton}>{$t('content.menu.menuButton')}</button>
  {#if activeState.dungeon.beaten}
    <button class="menuButton" on:click={handleWinLevel}>{$t('content.actions.nextLevel')}</button>
  {/if}
</div>
