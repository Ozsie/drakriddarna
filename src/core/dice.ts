// Game-side facade over the @hoard-engine/rng engine package (published
// on npm, consumed as a dependency). The package is game-agnostic: it
// rolls dice against a numeric success threshold. The mapping from the
// hero Level enum to that threshold is game knowledge and stays here
// (see docs/engine-packages.md).

import {
  createSeededRng,
  nextRandom,
  randomInt,
  resetRng,
  roll as rollSuccesses,
  setRng,
  shuffle,
} from '@hoard-engine/rng';
import { Level } from '../types';

const successThreshold = (level: Level): number => {
  switch (level) {
    case Level.APPRENTICE:
      return 5;
    case Level.KNIGHT:
    case Level.HERO:
      return 4;
    case Level.LORD:
    case Level.MASTER:
      return 3;
  }
};

/** Rolls `dice` d6 and counts successes for the given hero level. */
export const roll = (level: Level, dice: number): number =>
  rollSuccesses(successThreshold(level), dice);

export { createSeededRng, nextRandom, randomInt, resetRng, setRng, shuffle };
