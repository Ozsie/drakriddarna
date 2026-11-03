<script lang="ts">
  import { onMount } from 'svelte';
  import groundSprites from '$lib/DungeonTiles.png';
  import actorSprites from '$lib/Dungeon_Character_3.png';
  import {
    ACTOR_TILES,
    DUNGEON_TILES,
    ITEM_TILES,
    type TileRef,
    type TileSheet,
  } from '../../dungeon/tiles';

  // Debug-only catalog of the named tiles: every registry entry drawn from
  // its sheet, next to its key. Deliberately free of authored copy — the
  // group headers are the const names and the row labels are the keys —
  // so no i18n entries are needed.
  const groups: { name: string; tiles: Record<string, TileRef> }[] = [
    { name: 'DUNGEON_TILES', tiles: { ...DUNGEON_TILES } },
    { name: 'ACTOR_TILES', tiles: { ...ACTOR_TILES } },
    { name: 'ITEM_TILES', tiles: { ...ITEM_TILES } },
  ];

  const sheetSources: Record<TileSheet, string> = {
    dungeon: groundSprites,
    actors: actorSprites,
  };

  let canvases: Record<string, HTMLCanvasElement> = {};

  const drawAll = (images: Partial<Record<TileSheet, HTMLImageElement>>) => {
    groups.forEach(({ tiles }) => {
      Object.entries(tiles).forEach(([key, tile]) => {
        const canvas = canvases[key];
        const image = images[tile.sheet];
        if (!canvas || !image) return;
        canvas.width = tile.size;
        canvas.height = tile.size;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(
          image,
          tile.x,
          tile.y,
          tile.size,
          tile.size,
          0,
          0,
          tile.size,
          tile.size,
        );
      });
    });
  };

  onMount(() => {
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });

    Promise.all(
      Object.entries(sheetSources).map(async ([sheet, src]) => [
        sheet as TileSheet,
        await loadImage(src),
      ]),
    ).then((entries) => {
      drawAll(Object.fromEntries(entries));
    });
  });
</script>

<style>
  .catalog {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 16px;
    background-color: var(--color-bg-app, #1a1d24);
    color: var(--color-text-primary, #e2e8f0);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .group-name {
    font-family: monospace;
    font-size: 14px;
    color: var(--color-text-secondary, #94a3b8);
    border-bottom: 1px solid var(--color-panel-border, #3a414d);
    padding-bottom: 4px;
  }

  .rows {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(220px, 1fr)
    );
    gap: 8px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: var(--radius-md, 8px);
    padding: 6px;
    background-color: var(--color-bg-dungeon, #121418);
  }

  canvas {
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    image-rendering: pixelated;
  }

  .key {
    font-family: monospace;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .slot {
    font-family: monospace;
    font-size: 11px;
    color: var(--color-text-secondary, #94a3b8);
  }
</style>

<div class="catalog">
  {#each groups as group (group.name)}
    <section class="group">
      <h2 class="group-name">{group.name}</h2>
      <div class="rows">
        {#each Object.entries(group.tiles) as [key, tile] (key)}
          <div class="row">
            <canvas bind:this={canvases[key]} title={key}></canvas>
            <div>
              <div class="key">{key}</div>
              <div class="slot">
                {tile.sheet} · {tile.x},{tile.y} · {tile.size}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>
