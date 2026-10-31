import type { GameState, Item, ScenarioScore } from '../types';
import { ItemType } from '../types';

// Scenario scoring: a light-weight meta game on top of the win conditions,
// rewarding a fast, healthy and thorough clear of a dungeon. The breakdown
// is computed once when a scenario is first beaten (see `awardScenarioScore`)
// and shown on the between-dungeons screen; the totals accumulate into
// `state.score` across the whole campaign.

export const SCORE_POINTS_PER_HP = 50;
export const SCORE_POINTS_PER_MONSTER_XP = 30;
export const SCORE_POINTS_PER_ITEM_VALUE = 25;
export const SCORE_MAGIC_ITEM_POINTS = 100;
export const SCORE_POINTS_PER_SECRET = 50;
export const SCORE_PENALTY_PER_ROUND = 2;

/**
 * Points awarded when a hero picks up an item: 25 per item `value` for
 * regular equipment, and a flat 100 for magic items (whose `value` is 0).
 * Awarded on pickup only; dropping or trading an item later never reverses
 * the points.
 */
export const itemPickupScore = (item: Item): number =>
  item.type === ItemType.MAGIC
    ? SCORE_MAGIC_ITEM_POINTS
    : item.value * SCORE_POINTS_PER_ITEM_VALUE;

/**
 * Computes the score breakdown for the current scenario from the live
 * state: remaining hero health, the XP of monsters killed by the heroes
 * (tracked at kill time in `dungeon.killedMonsterXp`), points from picked
 * up items, found secrets and a per-round penalty.
 */
export const computeScenarioScore = (state: GameState): ScenarioScore => {
  const healthPoints =
    SCORE_POINTS_PER_HP *
    state.heroes.reduce(
      (partial, hero) => partial + Math.max(0, hero.health),
      0,
    );
  const killPoints =
    SCORE_POINTS_PER_MONSTER_XP * (state.dungeon.killedMonsterXp ?? 0);
  const itemPoints = state.dungeon.pickedUpItemPoints ?? 0;
  const secretPoints =
    SCORE_POINTS_PER_SECRET *
    state.dungeon.layout.secrets.filter((secret) => secret.found).length;
  // -0 and 0 are the same penalty, but keep the value a clean +0 so
  // equality assertions and serialized saves stay canonical.
  const roundPenalty =
    state.turnCount === undefined || state.turnCount === 0
      ? 0
      : -SCORE_PENALTY_PER_ROUND * state.turnCount;
  return {
    healthPoints,
    killPoints,
    itemPoints,
    secretPoints,
    roundPenalty,
    total: healthPoints + killPoints + itemPoints + secretPoints + roundPenalty,
  };
};

/**
 * Snapshots the scenario score onto the dungeon (so later state changes
 * cannot alter it), appends a per-scenario record to the campaign
 * statistics and adds the total to the running campaign score. Called
 * once, at the moment a scenario's win conditions are first fulfilled.
 */
export const awardScenarioScore = (state: GameState): ScenarioScore => {
  const score = computeScenarioScore(state);
  state.dungeon.score = score;
  state.score = (state.score ?? 0) + score.total;
  state.scenarioScores = [
    ...(state.scenarioScores ?? []),
    {
      dungeonName: state.dungeon.name,
      score,
      rounds: state.turnCount ?? 0,
      kills: state.dungeon.killCount,
    },
  ];
  return score;
};
