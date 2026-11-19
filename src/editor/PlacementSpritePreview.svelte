<script lang="ts">
  import {
    resolveSpritePreviewFrame,
    type SpritePreview,
  } from './placementSpritePreview';

  let { sprite }: { sprite: SpritePreview | null } = $props();
  let imageWidth = $state(0);
  let imageHeight = $state(0);

  const frame = $derived(
    sprite && imageWidth > 0 && imageHeight > 0
      ? resolveSpritePreviewFrame(sprite, imageWidth, imageHeight)
      : null,
  );

  $effect(() => {
    const imageUrl = sprite?.imageUrl ?? '';
    imageWidth = 0;
    imageHeight = 0;
    if (!imageUrl) return;

    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
    };
    image.onerror = () => {
      if (!active) return;
      imageWidth = 0;
      imageHeight = 0;
    };
    image.src = imageUrl;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  });
</script>

{#if sprite && frame}
  <svg
    class="sprite-preview"
    viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <image
      href={sprite.imageUrl}
      x="0"
      y="0"
      width={imageWidth}
      height={imageHeight}
    />
  </svg>
{:else}
  <span class="sprite-preview empty" aria-hidden="true"></span>
{/if}

<style>
  .sprite-preview {
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border: 1px solid var(--color-panel-border, #3a414d);
    background: var(--color-bg-app, #1a1d24);
  }

  .empty {
    display: inline-block;
  }
</style>
