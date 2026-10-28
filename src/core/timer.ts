import type { GameState } from '../types';

// Wall-clock timing of a campaign run, kept in `state.timer` (see the
// `DungeonTimer` type in src/types.ts). The timer starts when a dungeon's
// intro is closed (or immediately when the dungeon has no intro) and stops
// when the between-dungeons screen opens; the current dungeon time is
// shown in the debug overlay, the final time on the between-dungeons
// screen and the accumulated campaign time on the campaign-complete
// screen. Pure presentation data: nothing in the game logic reads it, so
// the deterministic core is unaffected.
//
// Time is kept as an accumulated `dungeonElapsedMs` plus the wall-clock
// `runningFrom` of the currently running segment, so the live time can be
// computed on every frame without writing to the state. Serialization
// points checkpoint the running segment into the accumulator
// (`checkpointDungeonTimer`) and deserialization points drop the offline
// gap by rebasing it (`resumeDungeonTimer`).

/**
 * Resets the timer's per-dungeon segment for a dungeon that is about to
 * begin: the accumulated dungeon time goes back to zero, and the timer
 * starts immediately unless the dungeon shows an intro (in which case it
 * starts when the intro is dismissed, see `startDungeonTimer`). The
 * campaign total is kept.
 */
export const beginDungeonTiming = (
  state: GameState,
  hasIntro: boolean,
  now: number = Date.now(),
): void => {
  if (!state.timer) {
    state.timer = { dungeonElapsedMs: 0, campaignElapsedMs: 0 };
  }
  state.timer.dungeonElapsedMs = 0;
  state.timer.runningFrom = hasIntro ? undefined : now;
};

/**
 * Starts the timer for the current dungeon: the moment the intro is
 * closed. A no-op when the timer already runs, so a dungeon that starts
 * without an intro (started by `beginDungeonTiming`) is not reset.
 */
export const startDungeonTimer = (
  state: GameState,
  now: number = Date.now(),
): void => {
  if (state.timer?.runningFrom !== undefined) return;
  if (!state.timer) {
    state.timer = { dungeonElapsedMs: 0, campaignElapsedMs: 0 };
  }
  state.timer.runningFrom = now;
};

/**
 * Stops the timer: the running segment is folded into the accumulated
 * dungeon time and `runningFrom` is cleared. Idempotent.
 */
export const stopDungeonTimer = (
  state: GameState,
  now: number = Date.now(),
): void => {
  const timer = state.timer;
  if (!timer || timer.runningFrom === undefined) return;
  timer.dungeonElapsedMs += Math.max(0, now - timer.runningFrom);
  timer.runningFrom = undefined;
};

/**
 * Folds the stopped dungeon time into the campaign total. Called on the
 * victory paths only — a failed attempt (party wipe) does not count.
 */
export const addDungeonTimeToCampaign = (state: GameState): void => {
  if (!state.timer) return;
  state.timer.campaignElapsedMs += state.timer.dungeonElapsedMs;
};

/**
 * Called before a state is serialized: folds the running segment into the
 * accumulated dungeon time and rebases `runningFrom` to now, so the saved
 * snapshot carries the full elapsed time under a fresh base. Idempotent
 * and invisible to the live display.
 */
export const checkpointDungeonTimer = (
  state: GameState,
  now: number = Date.now(),
): void => {
  const timer = state.timer;
  if (!timer || timer.runningFrom === undefined) return;
  timer.dungeonElapsedMs += Math.max(0, now - timer.runningFrom);
  timer.runningFrom = now;
};

/**
 * Called after a state is deserialized: rebases the running segment to
 * now, so the time between saving and loading is not counted, while the
 * accumulated time from the save is kept. Does not start a timer that
 * was not running when the state was saved.
 */
export const resumeDungeonTimer = (
  state: GameState,
  now: number = Date.now(),
): void => {
  if (state.timer?.runningFrom !== undefined) {
    state.timer.runningFrom = now;
  }
};

/** Live elapsed time of the current dungeon, including a running segment. */
export const getCurrentDungeonTimeMs = (
  state: GameState,
  now: number = Date.now(),
): number => {
  const timer = state.timer;
  if (!timer) return 0;
  const running =
    timer.runningFrom === undefined ? 0 : Math.max(0, now - timer.runningFrom);
  return timer.dungeonElapsedMs + running;
};

/**
 * Total time spent on the campaign so far: the accumulated completed
 * dungeons plus the current dungeon's live time.
 */
export const getCampaignTimeMs = (
  state: GameState,
  now: number = Date.now(),
): number => {
  const timer = state.timer;
  if (!timer) return 0;
  return timer.campaignElapsedMs + getCurrentDungeonTimeMs(state, now);
};

/**
 * Formats milliseconds as a duration: `m:ss` under an hour, `h:mm:ss`
 * above. Rounded down to whole seconds, or to hundredths of a second
 * with `{ hundredths: true }` (the live speedrun display).
 */
export const formatDuration = (
  ms: number,
  options?: { hundredths?: boolean },
): string => {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const base = hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
  if (!options?.hundredths) return base;
  const hundredths = Math.floor((clamped % 1000) / 10);
  return `${base}.${String(hundredths).padStart(2, '0')}`;
};
