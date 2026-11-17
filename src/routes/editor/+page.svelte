<script lang="ts">
  import { campaigns } from '../../campaigns';
  import { CellAlignment } from '../../types';
  import type { CellAlignment as CellAlignmentType } from '../../types';
  import { t } from '../../lib/translations';
  import {
    createDungeonEditorExport,
    createDungeonEditorState,
    decoratorOptionNames,
    type DecoratorOptionName,
    isFloorCell,
    LIGHT_PRESETS,
    placeDecorator,
    placeLight,
    removePlacement,
  } from '../../editor/dungeonEditor';
  import type {
    DungeonEditorState,
    LightPresetName,
  } from '../../editor/dungeonEditor';

  const campaignOptions = Object.values(campaigns).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const lightPresetNames = Object.keys(LIGHT_PRESETS) as LightPresetName[];
  const alignments = Object.values(CellAlignment);

  let campaignId = $state(campaignOptions[0]?.id ?? '');
  let dungeonIndex = $state(0);
  let selectedToolKind = $state<'light' | 'decorator'>('light');
  let selectedLightPreset = $state<LightPresetName>('brazier');
  let selectedDecoratorOption = $state<DecoratorOptionName>('bones');
  let selectedAlignment = $state<CellAlignmentType>(CellAlignment.CENTER);
  let editor = $state<DungeonEditorState | null>(null);

  const selectedCampaign = $derived(campaigns[campaignId]);
  const selectedDungeon = $derived(selectedCampaign?.dungeons[dungeonIndex]);

  $effect(() => {
    const campaign = campaigns[campaignId];
    const dungeon = campaign?.dungeons[dungeonIndex];
    editor =
      campaign && dungeon
        ? createDungeonEditorState(campaign.id, dungeon)
        : null;
  });

  function chooseCampaign() {
    dungeonIndex = 0;
  }

  function placeAt(x: number, y: number) {
    if (!editor) return;
    const position = { x, y };
    editor =
      selectedToolKind === 'light'
        ? placeLight(editor, selectedLightPreset, position, selectedAlignment)
        : placeDecorator(
            editor,
            selectedDecoratorOption,
            position,
            selectedAlignment,
          );
  }

  function removeAt(kind: 'light' | 'decorator', index: number) {
    if (!editor) return;
    editor = removePlacement(editor, kind, index);
  }

  function exportDungeon() {
    if (!editor) return;

    const json = JSON.stringify(createDungeonEditorExport(editor), null, 2);
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editor.campaignId}-${dungeonIndex}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{$t('content.editor.heading')}</title>
</svelte:head>

<main class="editor">
  <header class="topbar">
    <h1>{$t('content.editor.heading')}</h1>
    <button class="export" onclick={exportDungeon} disabled={!editor}>
      {$t('content.editor.export')}
    </button>
  </header>

  {#if editor && selectedCampaign && selectedDungeon}
    <section class="controls">
      <label>
        {$t('content.editor.campaign')}
        <select bind:value={campaignId} onchange={chooseCampaign}>
          {#each campaignOptions as campaign (campaign.id)}
            <option value={campaign.id}>{$t(campaign.name)}</option>
          {/each}
        </select>
      </label>

      <label>
        {$t('content.editor.dungeon')}
        <select bind:value={dungeonIndex}>
          {#each selectedCampaign.dungeons as dungeon, index (index)}
            <option value={index}
              >{$t(dungeon.nameTranslationKey ?? dungeon.name)}</option
            >
          {/each}
        </select>
      </label>

      <fieldset>
        <legend>{$t('content.editor.tools')}</legend>
        <label>
          {$t('content.editor.toolType')}
          <select bind:value={selectedToolKind}>
            <option value="light">{$t('content.editor.light')}</option>
            <option value="decorator">{$t('content.editor.decorator')}</option>
          </select>
        </label>

        {#if selectedToolKind === 'light'}
          <label>
            {$t('content.editor.light')}
            <select bind:value={selectedLightPreset}>
              {#each lightPresetNames as preset (preset)}
                <option value={preset}>{preset}</option>
              {/each}
            </select>
          </label>
        {:else}
          <label>
            {$t('content.editor.decorator')}
            <select bind:value={selectedDecoratorOption}>
              {#each decoratorOptionNames as option (option)}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </label>
        {/if}

        <label>
          {$t('content.editor.alignment')}
          <select bind:value={selectedAlignment}>
            {#each alignments as alignment (alignment)}
              <option value={alignment}>{alignment}</option>
            {/each}
          </select>
        </label>
      </fieldset>
    </section>

    <section class="workspace">
      <div class="grid-scroll">
        <div class="grid" aria-label={$t('content.editor.dungeon')}>
          {#each editor.grid as row, y (y)}
            <div
              class="row"
              style={`grid-template-columns: repeat(${row.length}, 28px)`}
            >
              {#each Array.from(row) as cell, x (`${x}-${y}`)}
                {@const position = { x, y }}
                {@const floor = isFloorCell(editor.grid, position)}
                {@const lights = editor.lights.filter(
                  (light) => light.position.x === x && light.position.y === y,
                )}
                {@const decorators = editor.decorators.filter(
                  (decorator) =>
                    decorator.position.x === x && decorator.position.y === y,
                )}
                <button
                  class="cell"
                  class:floor
                  class:wall={!floor}
                  disabled={!floor}
                  title={`${x}, ${y}`}
                  aria-label={`${x}, ${y}`}
                  onclick={() => placeAt(x, y)}
                >
                  <span class="cell-code">{floor ? cell : ''}</span>
                  <span class="markers">
                    {#each lights as light}
                      <span
                        class="light-marker"
                        style={`--marker-color: ${light.color ?? '#f5dfc2'}`}
                      ></span>
                    {/each}
                    {#each decorators as _decorator}
                      <span class="decorator-marker"></span>
                    {/each}
                  </span>
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </div>

      <aside class="placements">
        <h2>{$t('content.editor.light')}</h2>
        {#each editor.lights as light, index (`${index}-${light.position.x}-${light.position.y}`)}
          <button class="placement" onclick={() => removeAt('light', index)}>
            × {light.id ?? light.effect ?? light.color ?? 'static'}
            ({light.position.x}, {light.position.y})
          </button>
        {/each}
        <h2>{$t('content.editor.decorator')}</h2>
        {#each editor.decorators as decorator, index (`${index}-${decorator.position.x}-${decorator.position.y}`)}
          <button
            class="placement"
            onclick={() => removeAt('decorator', index)}
          >
            × {decorator.sprite.image} ({decorator.position.x}, {decorator
              .position.y})
          </button>
        {/each}
      </aside>
    </section>
  {:else}
    <p>{$t('content.editor.nothingLoaded')}</p>
  {/if}
</main>

<style>
  .editor {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 16px;
    background: var(--color-bg-app, #1a1d24);
    color: var(--color-text-primary, #e2e8f0);
    font-family: sans-serif;
  }

  .topbar,
  .controls,
  .workspace {
    display: flex;
    gap: 12px;
  }

  .topbar {
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  h1,
  h2 {
    margin: 0 0 8px;
  }

  h1 {
    font-size: 1.4rem;
  }

  h2 {
    margin-top: 12px;
    font-size: 1rem;
  }

  .controls {
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  label,
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  fieldset {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: 6px;
  }

  legend {
    padding: 0 4px;
  }

  select,
  button {
    min-height: 32px;
    border: 1px solid var(--color-panel-border, #3a414d);
    border-radius: 4px;
    padding: 4px 8px;
    background: var(--color-bg-dungeon, #121418);
    color: inherit;
  }

  button:not(:disabled) {
    cursor: pointer;
  }

  .export {
    padding-inline: 16px;
  }

  .workspace {
    align-items: flex-start;
    min-height: 0;
  }

  .grid-scroll {
    max-width: 100%;
    overflow: auto;
    border: 1px solid var(--color-panel-border, #3a414d);
    background: #08090c;
  }

  .grid {
    width: max-content;
  }

  .row {
    display: grid;
  }

  .cell {
    position: relative;
    display: flex;
    width: 28px;
    height: 28px;
    min-height: 0;
    align-items: center;
    justify-content: center;
    border: 1px solid #252a32;
    border-radius: 0;
    padding: 0;
    font: 11px monospace;
  }

  .cell.floor {
    background: #303943;
  }

  .cell.wall {
    background: #08090c;
  }

  .cell:disabled {
    opacity: 1;
  }

  .cell-code {
    color: #aab4c0;
  }

  .markers {
    position: absolute;
    right: 2px;
    bottom: 2px;
    display: flex;
    gap: 2px;
  }

  .light-marker,
  .decorator-marker {
    width: 7px;
    height: 7px;
    border: 1px solid #08090c;
  }

  .light-marker {
    border-radius: 50%;
    background: var(--marker-color);
  }

  .decorator-marker {
    background: #9da8b5;
  }

  .placements {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    max-height: 70vh;
    min-width: 220px;
    overflow: auto;
  }

  .placement {
    text-align: left;
    overflow-wrap: anywhere;
  }

  @media (max-width: 700px) {
    .workspace {
      flex-direction: column;
    }

    .placements {
      width: 100%;
      min-width: 0;
    }
  }
</style>
