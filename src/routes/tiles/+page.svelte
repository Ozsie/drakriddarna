<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import groundSprites from '$lib/DungeonTiles.png';
  import characterSprites from '$lib/Dungeon_Character.png';
  import character2Sprites from '$lib/Dungeon_Character_2.png';
  import actorSprites from '$lib/Dungeon_Character_3.png';
  import tileset1Sprites from '$lib/Tileset 1.png';
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

  // `lib/<file>` tileset params resolve through these imports, so hashed
  // build URLs keep working in production; anything else is treated as a
  // path under the site root, e.g. a file in static/.
  const libImages: Record<string, string> = {
    'lib/DungeonTiles.png': groundSprites,
    'lib/Dungeon_Character.png': characterSprites,
    'lib/Dungeon_Character_2.png': character2Sprites,
    'lib/Dungeon_Character_3.png': actorSprites,
    'lib/Tileset 1.png': tileset1Sprites,
  };

  // The sheet a tile is drawn from and its slot in it. The registry refs
  // are authored on the built-in 48px grid, so a custom `size` re-derives
  // the slot position at that grid; actor tiles are not affected by the
  // dungeon tileset override.
  const effectiveTile = (
    tile: TileRef,
    dungeonSource: string,
    customSize: number | null,
  ): { source: string; x: number; y: number; size: number } => {
    const overridden = tile.sheet === 'dungeon';
    const size = overridden && customSize ? customSize : tile.size;
    const source = overridden ? dungeonSource : sheetSources[tile.sheet];
    return {
      source,
      x: (tile.x / tile.size) * size,
      y: (tile.y / tile.size) * size,
      size,
    };
  };

  // Active query parameters, echoed back as data (no authored copy).
  let queryInfo = $state('');

  let canvases: Record<string, HTMLCanvasElement> = $state({});

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const tilesetParam = params.get('tileset');
    const sizeParam = Number(params.get('size'));
    const customSize = Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : null;

    const dungeonSource = tilesetParam
      ? (libImages[tilesetParam] ??
        `${base}/${tilesetParam.replace(/^\/+/, '')}`)
      : sheetSources.dungeon;

    queryInfo = `${tilesetParam ? `tileset=${tilesetParam} ` : ''}${customSize ? `size=${customSize}` : ''}`.trim();

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });

    const uniqueSources = [
      ...new Set(
        groups.flatMap(({ tiles }) =>
          Object.values(tiles).map((tile) =>
            effectiveTile(tile, dungeonSource, customSize).source,
          ),
        ),
      ),
    ];

    Promise.all(
      uniqueSources.map(async (src) => [src, await loadImage(src)] as const),
    ).then((loaded) => {
      const images = new Map(loaded);
      groups.forEach(({ tiles }) => {
        Object.entries(tiles).forEach(([key, tile]) => {
          const canvas = canvases[key];
          if (!canvas) return;
          const { source, x, y, size } = effectiveTile(
            tile,
            dungeonSource,
            customSize,
          );
          const image = images.get(source);
          if (!image) return;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(image, x, y, size, size, 0, 0, size, size);
        });
      });
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

  .query-info {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-secondary, #94a3b8);
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
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  {#if queryInfo}
    <div class="query-info">{queryInfo}</div>
  {/if}
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
