<script lang="ts">
  import type { GameState, LogEvent } from '../types';
  import { t } from '$lib/translations';
  import { actionLogs } from '../store/gameStateStore';

  export let state: GameState | undefined = undefined;

  $: logs = state ? state.actionLog : $actionLogs;

  const renderLog = (log: LogEvent) => {
    return `(${log.turn}) ${$t(log.key, log.properties)}`;
  };
</script>

<style>
  .log {
    height: 100px;
    background: var(--color-log-bg, #14281d);
    color: var(--color-log-text, #86efac);
    border: 1px solid var(--color-log-border, #1e4732);
    border-radius: var(--radius-sm, 4px);
    padding: 6px 8px;
    overflow-y: auto;
    font-family: var(--font-family-mono, monospace),monospace;
    width: 100%;
    box-sizing: border-box;
  }

  p {
    font-size: 11px;
    margin-top: 0;
    margin-bottom: 2px;
    line-height: 1.3;
  }
</style>

<div class="log">
  {#each logs as log, index}
    {#if index < 25}
      <p>>{renderLog(log)}</p>
    {/if}
  {/each}
</div>
