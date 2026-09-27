<script lang="ts">
  import { t } from '$lib/translations';
  import type { Dungeon } from '../types';
  import { turnCountStore, gameStateStore } from '../store/gameStateStore';
  import { addLog } from '../core';

  export let dungeon: Dungeon;

  let dismissed = false;
  let lastDungeonName: string | undefined = undefined;

  // Reset dismissal whenever the dungeon actually changes (new level -> new intro).
  // Comparing by name (identity) avoids resetting `dismissed` when the prop is
  // merely re-passed with the same dungeon (e.g. after a gameStateStore.set call).
  $: if (dungeon?.name !== lastDungeonName) {
    lastDungeonName = dungeon?.name;
    dismissed = false;
  }

  $: isFirstRound = ($turnCountStore ?? 0) <= 0; // adjust to your round counting convention
  $: showIntro = !!dungeon?.intro && isFirstRound && !dismissed;

  const onClose = () => {
    dismissed = true;
    if (dungeon?.intro && $gameStateStore) {
      addLog($gameStateStore, dungeon.intro);
      gameStateStore.set($gameStateStore);
    }
  };
</script>

{#if showIntro}
  <div class="dungeonIntro">
    <p>{$t(dungeon.intro)}</p>
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