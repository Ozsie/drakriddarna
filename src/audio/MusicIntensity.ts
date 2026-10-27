import type { GameState } from '../types';
import { distanceInGrid } from '../core';
import { liveHeroes } from '../hero/HeroLogic';
import { findVisibleMonsters } from '../monsters/MonsterLogic';

export type MusicIntensity = 'explore' | 'tension';

// A monster within this many grid steps of any hero raises the music to
// the tension track.
export const TENSION_ENTER_RANGE = 6;
// Once in tension, the nearest monster must be farther away than this to
// fall back to explore. The gap between enter and exit ranges is the
// hysteresis that stops the music from flapping on every monster step.
export const TENSION_EXIT_RANGE = 9;

// Note: this module is intentionally not re-exported from `./index`. The
// monster and hero logic it builds on import the audio index themselves, so
// re-exporting it here would create an import cycle.

export const nearestVisibleMonsterDistance = (state: GameState): number => {
  const heroes = liveHeroes(state);
  const monsters = findVisibleMonsters(state);
  if (heroes.length === 0 || monsters.length === 0) {
    return Infinity;
  }

  let nearest = Infinity;
  for (const monster of monsters) {
    for (const hero of heroes) {
      nearest = Math.min(
        nearest,
        distanceInGrid(hero.position, monster.position),
      );
    }
  }
  return nearest;
};

// Pure and deterministic: the next music intensity depends only on the game
// state and the currently playing intensity (for hysteresis). Audio side
// effects (crossfading) live in MusicManager, driven by the UI layer.
export const selectMusicIntensity = (
  state: GameState,
  currentIntensity: MusicIntensity = 'explore',
): MusicIntensity => {
  const nearest = nearestVisibleMonsterDistance(state);
  const range =
    currentIntensity === 'tension' ? TENSION_EXIT_RANGE : TENSION_ENTER_RANGE;
  return nearest <= range ? 'tension' : 'explore';
};
