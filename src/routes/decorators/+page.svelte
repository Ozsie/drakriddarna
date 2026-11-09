<script lang="ts">
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import type { AssetPath } from '$app/types';
  import type { ItemSprite } from '../../types';
  import type { DecoratorPresetName } from '../../dungeon/Decorators';
  import { DECORATOR_PRESETS } from '../../dungeon/Decorators';

  const decorators = (
    Object.entries(DECORATOR_PRESETS) as [DecoratorPresetName, ItemSprite][]
  ).map(([key, sprite]) => ({
    key,
    sprite,
    width: sprite.sourceRect?.width ?? sprite.size,
    height: sprite.sourceRect?.height ?? sprite.size,
  }));

  let canvases: Record<string, HTMLCanvasElement> = $state({});

  onMount(() => {
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });

    const sources = [...new Set(decorators.map(({ sprite }) => sprite.image))];

    Promise.all(
      sources.map(
        async (source) =>
          [source, await loadImage(asset(source as AssetPath))] as const,
      ),
    ).then((loaded) => {
      const images = new Map(loaded);
      decorators.forEach(({ key, sprite, width, height }) => {
        const canvas = canvases[key];
        const image = images.get(sprite.image);
        if (!canvas || !image) return;

        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = Math.min(80 / width, 80 / height);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const dx = (canvas.width - drawWidth) / 2;
        const dy = (canvas.height - drawHeight) / 2;
        const sourceRect = sprite.sourceRect;

        ctx.drawImage(
          image,
          sourceRect?.x ?? 0,
          sourceRect?.y ?? 0,
          width,
          height,
          dx,
          dy,
          drawWidth,
          drawHeight,
        );
      });
    });
  });
</script>

<div class="catalog">
  <div class="rows">
    {#each decorators as { key, width, height } (key)}
      <div class="row">
        <canvas bind:this={canvases[key]} title={key}></canvas>

        <div>
          <div class="key">{key}</div>
          <div class="size">{width} × {height}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .catalog {
    min-height: 100vh;
    box-sizing: border-box;
    padding: 16px;
    background-color: var(--color-bg-app, #1a1d24);
    color: var(--color-text-primary, #e2e8f0);
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

  .key,
  .size {
    font-family: monospace;
    overflow-wrap: anywhere;
  }

  .key {
    font-size: 13px;
  }

  .size {
    font-size: 11px;
    color: var(--color-text-secondary, #94a3b8);
  }
</style>
