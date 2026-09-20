<script lang="ts">
  import type { GameState, LogEvent } from '../types';
  import { t } from '$lib/translations';
  import { gameStateStore, actionLogs } from '../store/gameStateStore';

  export let state: GameState | undefined = undefined;

  $: logs = state ? state.actionLog : $actionLogs;

  const renderLog = (log: LogEvent) => {
    return `(${log.turn}) ${$t(log.key, log.properties)}`;
  };
</script>

<style>
    @media screen and (max-width: 600px) {
        .log {
            height: 100px;
            background: green;
            overflow: scroll;
        }

        p {
            font-size: 10pt;
            margin-top: 0;
            margin-bottom: 1px;
        }
    }
    @media screen and (min-width: 601px) {
        .log {
            margin-left: 15%;
            height: 100px;
            background: green;
            overflow: scroll;
        }

        p {
            font-size: 10pt;
            margin-top: 0;
            margin-bottom: 1px;
        }
    }
</style>

<div class="log">
  {#each logs as log, index}
    {#if index < 25}
      <p>>{renderLog(log)}</p>
    {/if}
  {/each}
</div>
