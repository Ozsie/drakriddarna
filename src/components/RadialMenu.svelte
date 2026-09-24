<script lang="ts">
  import { radialMenuStore } from '../store/radialMenuStore';
  import { RadialAction } from '../hero/RadialMenuLogic';
  import { executeRadialAction } from '../hero/ClickInputLogic';
  import { gameStateStore } from '../store/gameStateStore';
  import { t } from '$lib/translations';

  import type { GameState } from '../types';

  export let cellSize: number;
  export let state: GameState | undefined = undefined;

  const icons: Record<RadialAction, string> = {
    [RadialAction.SEARCH]: '🔍',
    [RadialAction.PICK_LOCK]: '🗝️',
    [RadialAction.OPEN_DOOR]: '🚪',
    [RadialAction.PICK_UP_ITEM]: '🎒',
    [RadialAction.NEXT]: '→'
  };

  const labels: Record<RadialAction, string> = {
    [RadialAction.SEARCH]: 'content.radialMenu.search',
    [RadialAction.PICK_LOCK]: 'content.radialMenu.pickLock',
    [RadialAction.OPEN_DOOR]: 'content.radialMenu.openDoor',
    [RadialAction.PICK_UP_ITEM]: 'content.radialMenu.pickUpItem',
    [RadialAction.NEXT]: 'content.radialMenu.next',
  };

  $: menu = $radialMenuStore;
  $: radius = cellSize * 1.1;
  $: centerX = menu ? menu.x * cellSize + cellSize / 2 : 0;
  $: centerY = menu ? menu.y * cellSize + cellSize / 2 : 0;

  const close = () => radialMenuStore.set(null);

  const onSelect = (action: RadialAction) => {
    const activeState = state ?? $gameStateStore;
    executeRadialAction(activeState, action);
    if (!state) {
      gameStateStore.set(activeState);
    }
  };
</script>

{#if menu}
  <div class="radialOverlay" on:click|self={close}>
    {#each menu.actions as action, i}
      {@const angle = (i / menu.actions.length) * 2 * Math.PI - Math.PI / 2}
      {@const x = centerX + radius * Math.cos(angle)}
      {@const y = centerY + radius * Math.sin(angle)}
      <button
        class="radialButton"
        style="left: {x}px; top: {y}px;"
        title={$t(labels[action])}
        on:click={() => onSelect(action)}
      >
        {icons[action]}
      </button>
    {/each}
  </div>
{/if}

<style>
  .radialOverlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 20;
  }
  .radialButton {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid white;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 16px;
    cursor: pointer;
  }
  .radialButton:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
