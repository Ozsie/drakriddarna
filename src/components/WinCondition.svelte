<script lang="ts">
  import type { WinCondition, GameState } from '../types';
  import { ConditionType } from '../types';
  import { onMount } from 'svelte';

  export let condition: WinCondition;
  export let state: GameState;
  let uglyUpdateToggle: boolean = false;

  const renderWinCondition =  (condition: WinCondition) => {
    switch (condition.type) {
      case ConditionType.KILL_ALL: return 'Kill all monsters';
      case ConditionType.KILL_ALL_OF_TYPE: return `Kill all ${condition.targetMonsterType}`;
      case ConditionType.KILL_AT_LEAST: return `Kill at least ${condition.killMinCount} monsters. (${state.dungeon.killCount}/${condition.killMinCount})`;
      case ConditionType.OPEN_DOOR: return `Open a certain door`;
      case ConditionType.REACH_CELL: return 'Reach a certain cell'
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
