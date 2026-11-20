<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Dungeon from '../components/Dungeon.svelte';
  import { inputManager } from '../input/InputManager';
  import { isBrowserPerfHarnessEnabled } from '../perf/browserBenchmarkGate';

  let dungeonContainer: HTMLElement | undefined = $state();

  onMount(() => {
    inputManager.attach(window);
    if (dungeonContainer) {
      inputManager.attachGestures(dungeonContainer);
    }
    let harnessEnabled: boolean;
    try {
      harnessEnabled = isBrowserPerfHarnessEnabled(
        localStorage.getItem('perfHarness'),
      );
    } catch {
      harnessEnabled = false;
    }
    if (harnessEnabled) {
      void import('../benchmark/browserHarness').then(
        ({ installBrowserBenchmarkHarness }) =>
          installBrowserBenchmarkHarness(),
      );
    }
  });

  onDestroy(() => {
    inputManager.detach();
    inputManager.detachGestures();
  });
</script>

<div class="app-container">
  <div class="main-section">
    <main class="dungeon-view" bind:this={dungeonContainer}>
      <Dungeon />
    </main>
  </div>
</div>

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

  .dungeon-view {
    flex: 1;
    background-color: var(--color-bg-dungeon, #121418);
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    display: flex;
    position: relative;
    min-height: 0;
    min-width: 0;
  }
</style>
