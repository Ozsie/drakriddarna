<script lang="ts">
  import { t } from '$lib/translations/index.js';
  import type { GameState } from '../types';
  import { gameStateStore } from '../store/gameStateStore';
  import { i18n } from '../core';

  export let state: GameState | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
</script>

<style>
  .header {
      font-size: 10pt;
      font-weight: bold;
      margin-top: 5px;
      margin-bottom: 2px;
  }
  .note {
      font-size: 10pt;
      margin-top: 5px;
      margin-bottom: 2px;
  }
  div {
      margin: 5px 0;
      border-style: groove;
      border-width: 4px;
      border-color: var(--color-diary-border, #15803d);
      border-radius: 4px 4px 10px 10px;
      padding: 4px;
      background: var(--color-diary-bg, #fefce8);
      color: var(--color-diary-text, #1e293b);
  }
  div span {
      font-family: sans-serif;
      text-align: center;
      font-weight: bold;
      text-decoration: underline;
      width: 100%;
      display: block;
  }
  div hr {
      height: 2px;
      background-color: var(--color-diary-border, #15803d);
      color: var(--color-diary-border, #15803d);
      border: none;
  }

  @media screen and (max-width: 600px) {
      div {
          display: none;
      }
  }
</style>

<div>
  <span>{i18n('content.diary.label', { turn: `${activeState.turnCount ?? 0}` })} </span>
  {#each activeState.dungeon.layout.notes as note}
    {#if note.found}
      <hr/>
      <p class='header'>{i18n('content.diary.foundOn', { round: `${note.foundOn ?? ''}` })}</p>
      <p class='note'>{$t(note.message)}</p>
    {/if}
  {/each}
</div>
