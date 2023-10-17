<script lang="ts">
  import { t } from '$lib/translations/index.js';
  import type { GameState } from '../types';
  export let state: GameState;
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
      margin: 5px;
      border-style: groove;
      border-width: 5px;
      border-color: darkgreen;
      border-radius: 4px 4px 10px 10px;
      padding: 2px;
      background: lightgoldenrodyellow;
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
      background-color: darkgreen;
      color: darkgreen;
  }

  @media screen and (max-width: 600px) {
      div {
          display: none;
      }
  }
</style>
<div>
  <span>{$t('content.diary.label', { turn: state.turnCount })} </span>
  {#each state.dungeon.layout.notes as note}
    {#if note.found}
      <hr/>
      <p class='header'>{$t('content.diary.foundOn', { round: note.foundOn })}</p>
      <p class='note'>{$t(note.message)}</p>
    {/if}
  {/each}
</div>