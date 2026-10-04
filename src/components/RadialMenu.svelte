<script lang="ts">
  import { radialMenuStore } from '../store/radialMenuStore';
  import { RadialAction } from '../hero/RadialMenuLogic';
  import { executeRadialAction } from '../hero/ClickInputLogic';
  import { gameStateStore } from '../store/gameStateStore';
  import { t } from '$lib/translations';

  import type { GameState, Position } from '../types';
  import type { RadialMenuEntry } from '../hero/RadialMenuLogic';

  export let cellSize: number;
  export let state: GameState | undefined = undefined;
  export let panX = 0;
  export let panY = 0;
  export let viewWidth = 0;
  export let viewHeight = 0;
  export let startPosition: Position | undefined = undefined;

  const icons: Record<RadialAction, string> = {
    [RadialAction.SEARCH]: '🔍',
    [RadialAction.PICK_LOCK]: '🗝️',
    [RadialAction.OPEN_DOOR]: '🚪',
    [RadialAction.PICK_UP_ITEM]: '🎒',
    [RadialAction.INTERACT]: '⚡',
    [RadialAction.NEXT]: '→'
  };

  const labels: Record<RadialAction, string> = {
    [RadialAction.SEARCH]: 'content.radialMenu.search',
    [RadialAction.PICK_LOCK]: 'content.radialMenu.pickLock',
    [RadialAction.OPEN_DOOR]: 'content.radialMenu.openDoor',
    [RadialAction.PICK_UP_ITEM]: 'content.radialMenu.pickUpItem',
    [RadialAction.INTERACT]: 'content.radialMenu.interact',
    [RadialAction.NEXT]: 'content.radialMenu.next',
  };

  $: menu = $radialMenuStore;
  $: radius = cellSize * 1.1;
  $: activeStartPosition =
    startPosition ?? (state ?? $gameStateStore)?.dungeon?.startingPositions?.[0];
  $: centerOffsetX = activeStartPosition
    ? (activeStartPosition.x + 0.5) * cellSize
    : 0;
  $: centerOffsetY = activeStartPosition
    ? (activeStartPosition.y + 0.5) * cellSize
    : 0;
  $: originX = viewWidth > 0 ? viewWidth / 2 + panX - centerOffsetX : 0;
  $: originY = viewHeight > 0 ? viewHeight / 2 + panY - centerOffsetY : 0;
  $: centerX = menu ? originX + menu.x * cellSize + cellSize / 2 : 0;
  $: centerY = menu ? originY + menu.y * cellSize + cellSize / 2 : 0;

  const close = () => radialMenuStore.set(null);

  const onSelect = (entry: RadialMenuEntry) => {
    const activeState = state ?? $gameStateStore;
    executeRadialAction(activeState, entry.action, entry.door, entry.interactable);
    if (!state) {
      gameStateStore.set(activeState);
    }
  };
</script>

{#if menu}
  <div
    class="radialOverlay"
    role="presentation"
    on:click|self={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
  >
    {#each menu.entries as entry, i}
      {@const angle = (i / menu.entries.length) * 2 * Math.PI - Math.PI / 2}
      {@const x = centerX + radius * Math.cos(angle)}
      {@const y = centerY + radius * Math.sin(angle)}
      <button
        class="radialButton"
        style="left: {x}px; top: {y}px;"
        title={$t(entry.interactable?.nameTranslationKey ?? labels[entry.action]) + (entry.door ? ` (${entry.door.side})` : '')}
        on:click={() => onSelect(entry)}
      >
        {entry.interactable?.icon ?? icons[entry.action]}
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
