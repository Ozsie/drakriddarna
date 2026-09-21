<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Dungeon from '../components/Dungeon.svelte';
  import Characters from '../components/Characters.svelte';
  import Log from '../components/Log.svelte';
  import ButtonPad from '../components/ButtonPad.svelte';
  import buildInfo from '$lib/buildInfo.json';
  import Diary from '../components/Diary.svelte';
  import { inputManager } from '../input/InputManager';

  let dungeonContainer: HTMLElement;

  onMount(() => {
    inputManager.attach(window);
    if (dungeonContainer) {
      inputManager.attachGestures(dungeonContainer);
    }
  });

  onDestroy(() => {
    inputManager.detach();
    inputManager.detachGestures();
  });
</script>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--color-bg-app, #1a1d24);
    color: var(--color-text-primary, #e2e8f0);
    box-sizing: border-box;
    padding: 6px;
    gap: 6px;
  }

  .main-section {
    display: flex;
    flex: 1;
    gap: 6px;
    min-height: 0;
  }

  .character-sidebar {
    width: 240px;
    min-width: 200px;
    max-width: 260px;
    background-color: var(--color-panel-bg, #252932);
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: var(--radius-md, 8px);
    padding: 6px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dungeon-view {
    flex: 1;
    background-color: var(--color-bg-dungeon, #121418);
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: var(--radius-md, 8px);
    overflow: auto;
    display: flex;
    position: relative;
  }

  .footer-section {
    display: flex;
    gap: 6px;
    width: 100%;
  }

  .controls-panel {
    width: 240px;
    min-width: 200px;
    max-width: 260px;
    box-sizing: border-box;
  }

  .log-panel {
    flex: 1;
    box-sizing: border-box;
    min-width: 0;
  }

  @media screen and (max-width: 768px) {
    .main-section {
      flex-direction: column;
    }

    .character-sidebar {
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .footer-section {
      flex-direction: column;
    }

    .controls-panel {
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }
  }
</style>

<div class="app-container">
  <div class="main-section">
    <aside class="character-sidebar">
      <Characters />
      <Diary />
    </aside>
    <main class="dungeon-view" bind:this={dungeonContainer}>
      <Dungeon />
    </main>
  </div>
  <footer class="footer-section" id="footer">
    <div class="controls-panel">
      <ButtonPad buildInfo={buildInfo} />
    </div>
    <div class="log-panel">
      <Log />
    </div>
  </footer>
</div>
