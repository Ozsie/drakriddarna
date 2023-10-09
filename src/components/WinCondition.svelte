<script lang="ts">
  import type { WinCondition, GameState } from '../types';
  import { ConditionType } from '../types';
  import { onMount } from 'svelte';
  import { t } from '$lib/translations';

  export let condition: WinCondition;
  export let state: GameState;
  let uglyUpdateToggle: boolean = false;

  const renderWinCondition =  (condition: WinCondition) => {
    let additionalDescription = '';
    if (condition.additionalDescription) {
      additionalDescription = ` ${$t(condition.additionalDescription)}`;
    }
    switch (condition.type) {
      case ConditionType.KILL_ALL: return $t('content.winConditions.killAll') + additionalDescription;
      case ConditionType.KILL_ALL_OF_TYPE: return $t('content.winConditions.killAll', { type: condition.targetMonsterType }) + additionalDescription;
      case ConditionType.KILL_AT_LEAST: return $t('content.winConditions.killAtLeast', { minKills: condition.killMinCount }) + ` (${state.dungeon.killCount}/${condition.killMinCount})` + additionalDescription;
      case ConditionType.OPEN_DOOR: return $t('content.winConditions.openDoor') + additionalDescription;
      case ConditionType.REACH_CELL: return $t('content.winConditions.reachCell') + additionalDescription;
    }
  }

  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    if (state.reRender) {
      uglyUpdateToggle = !uglyUpdateToggle;
    }
    if (!state || !document) return;
  };
</script>
<style>
  p {
      padding-left: 10px;
      font-size: 8pt;
  }
  .fulfilled {
      text-decoration: line-through;
      color: wheat;
      margin: 0;
  }

  .notFulfilled {
      text-decoration: none;
      color: wheat;
      margin: 0;
  }
</style>
{#key uglyUpdateToggle}
<p class='{condition.fulfilled ? "fulfilled" : "notFulfilled"}'>❇️ {renderWinCondition(condition)}</p>
{/key}
