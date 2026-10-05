<script lang="ts">
  import { t } from '$lib/translations';
  import type { Dungeon, GameState } from '../types';
  import { turnCountStore, gameStateStore } from '../store/gameStateStore';
  import { addLog } from '../core';

  export let dungeon: Dungeon | undefined = undefined;
  export let state: GameState | undefined = undefined;

  let dismissed = false;
  let lastDungeon: Dungeon | undefined = undefined;
  let lastDungeonName: string | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: activeDungeon = dungeon ?? activeState?.dungeon;
  $: activeTurnCount = state ? (state.turnCount ?? 0) : ($turnCountStore ?? 0);

  // Reset dismissal whenever the dungeon actually changes (new level -> new intro).
  // Comparing by name/identity avoids resetting `dismissed` when the prop is
  // merely re-passed with the same dungeon (e.g. after a gameStateStore.set call).
  $: if (activeDungeon !== lastDungeon || activeDungeon?.name !== lastDungeonName) {
    lastDungeon = activeDungeon;
    lastDungeonName = activeDungeon?.name;
    dismissed = false;
  }

  $: isFirstRound = activeTurnCount <= 0;
  $: showIntro = !!activeDungeon?.intro && isFirstRound && !dismissed;

  const onClose = () => {
    dismissed = true;
    if (activeDungeon?.intro && activeState) {
      addLog(activeState, activeDungeon.intro);
      if (!state) {
        gameStateStore.set(activeState);
      }
    }
  };
</script>

{#if showIntro && activeDungeon}
  <div class="dungeonIntro">
    <p>{$t(activeDungeon.intro)}</p>
    <button on:click={onClose}>
      {$t('content.winConditions.buttonClose')}
    </button>
  </div>
{/if}

<style>
    .dungeonIntro {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 2rem;
        text-align: center;
    }
</style>