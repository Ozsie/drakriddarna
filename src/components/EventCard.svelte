<script lang="ts">
  import type { TurnEvent } from '../types';
  import { t } from '$lib/translations';

  export let event: TurnEvent | undefined;
  let showEvent = true;
</script>
<style>
    .eventOpen {
        max-height: 200px;
        min-height: 175px;
    }
    .event {
        position: absolute;
        max-width: 120px;
        min-width: 100px;
        bottom: 118px;
        right: 10px;
        border: 1px solid grey;
        border-radius: 3px;
        background-color: #5C4033;
        opacity: 0.9;
        margin-left: 4px;
        padding: 4px;
    }
    .hideEventButton {
        float: left;
        margin-right: 4px;
        width: 15px;
        height: 15px;
        font-size: 8pt;
        padding-left: 2px;
        padding-top: 0;
    }
    span {
        font-family: serif;
        font-size: 12pt;
        font-weight: bold;
        color: wheat;
    }
    p {
        font-family: sans-serif;
        font-size: 8pt;
        color: wheat;
    }
</style>
<div class='event {showEvent ? "eventOpen" : ""}'>
  {#if event}
    <div>
      <button class='hideEventButton' on:click={() => showEvent = !showEvent}>
        {#if showEvent}
          {$t('content.winConditions.buttonClose')}
        {:else}
          {$t('content.winConditions.buttonOpen')}
        {/if}
      </button>
      {#if showEvent}
        <p>{$t('content.event.current')}</p>
      {/if}
    </div>
    <div>
      <span>{event.number}. {$t(event.name)}</span>
      {#if showEvent}
        <p>
          {$t(event.description)}
        </p>
      {/if}
    </div>
  {/if}
</div>