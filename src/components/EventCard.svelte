<script lang="ts">
  import type { TurnEvent } from '../types';
  import { t } from '$lib/translations';

  export let event: TurnEvent | undefined;
</script>
<style>
    .event {
        position: absolute;
        max-width: 200px;
        min-width: 175px;
        max-height: 300px;
        min-height: 300px;
        bottom: 118px;
        right: 10px;
        border: 1px solid grey;
        border-radius: 3px;
        overflow: scroll;
        background-color: #5C4033;
        opacity: 0.9;
        margin-left: 4px;
    }
</style>
<div class='event'>
  {#if event}
    <span>{event.number}. {$t(event.name)}</span>
    <p>
      {$t(event.description)}
    </p>
  {/if}
</div>