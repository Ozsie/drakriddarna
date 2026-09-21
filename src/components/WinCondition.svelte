<script lang="ts">
  import type { WinCondition, GameState } from '../types';
  import { ConditionType } from '../types';
  import { t } from '$lib/translations';
  import { gameStateStore } from '../store/gameStateStore';
  import { i18n } from '../core';

  export let condition: WinCondition;
  export let state: GameState | undefined = undefined;

  $: activeState = state ?? $gameStateStore;
  $: killCount = activeState.dungeon.killCount;

  const renderWinCondition = (cond: WinCondition, count: number) => {
    let additionalDescription = '';
    if (cond.additionalDescription) {
      additionalDescription = ` ${$t(cond.additionalDescription)}`;
    }
    switch (cond.type) {
      case ConditionType.KILL_ALL:
        return $t('content.winConditions.killAll') + additionalDescription;
      case ConditionType.KILL_ALL_OF_TYPE:
        return (
          i18n('content.winConditions.killAll', {
            type: cond.targetMonsterType ?? '',
          }) + additionalDescription
        );
      case ConditionType.KILL_AT_LEAST:
        return (
          i18n('content.winConditions.killAtLeast', {
            minKills: `${cond.killMinCount ?? 0}`,
          }) +
          ` (${count}/${cond.killMinCount})` +
          additionalDescription
        );
      case ConditionType.OPEN_DOOR:
        return $t('content.winConditions.openDoor') + additionalDescription;
      case ConditionType.REACH_CELL:
        return $t('content.winConditions.reachCell') + additionalDescription;
    }
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

<p class="{condition.fulfilled ? 'fulfilled' : 'notFulfilled'}">❇️ {renderWinCondition(condition, killCount)}</p>
