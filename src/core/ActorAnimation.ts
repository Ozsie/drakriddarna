import type { Actor, ActorAnimationName, Position } from '../types';
import { soundEffectManager } from '../audio';

export const DEFAULT_ACTOR_MOVEMENT_DURATION_MS = 200;
export const DEFAULT_ACTOR_SPRITE_FRAME_DURATION_MS = 150;
export const DEFAULT_ACTOR_ATTACK_ANIMATION_MS = 300;
export const DEFAULT_ACTOR_DEATH_ANIMATION_MS = 600;

// Sprite-sheet row order for the five supported actor animations
// (see ActorSprite in src/types.ts).
export const ACTOR_SPRITE_ANIMATION_ORDER: ActorAnimationName[] = [
  'idle',
  'walk',
  'attack',
  'hurt',
  'death',
];

let currentMovementDurationMs = DEFAULT_ACTOR_MOVEMENT_DURATION_MS;

export interface MovementWaypoint {
  from: Position;
  to: Position;
  startTime: number;
  duration: number;
}

export interface ActorAnimationState {
  currentPos: Position;
  targetPos: Position;
  waypoints: MovementWaypoint[];
  lastStepEndTime: number;
  flashStartTime?: number;
  flashDurationMs?: number;
  attackStartTime?: number;
  attackDurationMs?: number;
  deathStartTime?: number;
  deathDurationMs?: number;
}

const actorAnimations = new WeakMap<Actor, ActorAnimationState>();
const activeActors = new Set<Actor>();
// Actors whose death animation is still playing. Killed monsters are removed
// from the dungeon layout immediately, so renderers need this list to keep
// drawing them until the death animation finishes (heroes stay in
// state.heroes and are filtered by the hero renderer instead).
const dyingActors: Actor[] = [];

export const setActorMovementDuration = (durationMs: number): void => {
  currentMovementDurationMs = Math.max(10, durationMs);
};

export const getActorMovementDuration = (): number => currentMovementDurationMs;

export const resetActorMovementDuration = (): void => {
  currentMovementDurationMs = DEFAULT_ACTOR_MOVEMENT_DURATION_MS;
};

const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const recordActorStep = (
  actor: Actor,
  to: Position,
  duration: number = currentMovementDurationMs,
  currentTime: number = Date.now(),
): void => {
  if (!actor) return;

  let state = actorAnimations.get(actor);
  if (!state) {
    state = {
      currentPos: { x: actor.position.x, y: actor.position.y },
      targetPos: { x: actor.position.x, y: actor.position.y },
      waypoints: [],
      lastStepEndTime: currentTime,
    };
    actorAnimations.set(actor, state);
  }

  const lastWaypoint = state.waypoints[state.waypoints.length - 1];
  const from: Position = lastWaypoint
    ? { x: lastWaypoint.to.x, y: lastWaypoint.to.y }
    : { x: state.targetPos.x, y: state.targetPos.y };

  if (from.x === to.x && from.y === to.y) {
    return;
  }

  soundEffectManager.playActorWalk(actor);

  const startTime = Math.max(currentTime, state.lastStepEndTime);
  const stepDuration = Math.max(10, duration);

  state.waypoints.push({
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
    startTime,
    duration: stepDuration,
  });

  state.lastStepEndTime = startTime + stepDuration;
  state.targetPos = { x: to.x, y: to.y };
  activeActors.add(actor);
};

export const getActorVisualPosition = (
  actor: Actor,
  currentTime: number = Date.now(),
): Position => {
  if (!actor || !actor.position) {
    return { x: 0, y: 0 };
  }

  let state = actorAnimations.get(actor);
  if (!state) {
    state = {
      currentPos: { x: actor.position.x, y: actor.position.y },
      targetPos: { x: actor.position.x, y: actor.position.y },
      waypoints: [],
      lastStepEndTime: currentTime,
    };
    actorAnimations.set(actor, state);
    return { x: actor.position.x, y: actor.position.y };
  }

  // Auto-detect direct position change if no waypoints were queued
  if (
    state.waypoints.length === 0 &&
    (state.targetPos.x !== actor.position.x ||
      state.targetPos.y !== actor.position.y)
  ) {
    const dx = Math.abs(actor.position.x - state.targetPos.x);
    const dy = Math.abs(actor.position.y - state.targetPos.y);
    if (dx + dy <= 3) {
      recordActorStep(
        actor,
        actor.position,
        currentMovementDurationMs,
        state.lastStepEndTime,
      );
    } else {
      state.currentPos = { x: actor.position.x, y: actor.position.y };
      state.targetPos = { x: actor.position.x, y: actor.position.y };
      state.lastStepEndTime = currentTime;
      return { x: actor.position.x, y: actor.position.y };
    }
  }

  // Clean up old finished waypoints that ended before currentTime (keeping only active / future ones)
  while (
    state.waypoints.length > 0 &&
    currentTime >= state.waypoints[0].startTime + state.waypoints[0].duration
  ) {
    const finished = state.waypoints.shift()!;
    state.currentPos = { x: finished.to.x, y: finished.to.y };
  }

  if (state.waypoints.length === 0) {
    state.currentPos = { x: state.targetPos.x, y: state.targetPos.y };
    if (!isActorFlashing(actor, currentTime)) {
      activeActors.delete(actor);
    }
    return { x: state.targetPos.x, y: state.targetPos.y };
  }

  const activeWaypoint = state.waypoints[0];
  if (currentTime < activeWaypoint.startTime) {
    return { x: activeWaypoint.from.x, y: activeWaypoint.from.y };
  }

  const elapsed = currentTime - activeWaypoint.startTime;
  const rawProgress = Math.min(
    Math.max(elapsed / activeWaypoint.duration, 0),
    1,
  );
  const progress = easeInOutQuad(rawProgress);

  const visualX =
    activeWaypoint.from.x +
    (activeWaypoint.to.x - activeWaypoint.from.x) * progress;
  const visualY =
    activeWaypoint.from.y +
    (activeWaypoint.to.y - activeWaypoint.from.y) * progress;

  state.currentPos = { x: visualX, y: visualY };
  return { x: visualX, y: visualY };
};

export const flashActor = (
  actor: Actor,
  durationMs = 200,
  currentTime: number = Date.now(),
): void => {
  if (!actor) return;
  let state = actorAnimations.get(actor);
  if (!state) {
    state = {
      currentPos: { x: actor.position.x, y: actor.position.y },
      targetPos: { x: actor.position.x, y: actor.position.y },
      waypoints: [],
      lastStepEndTime: currentTime,
    };
    actorAnimations.set(actor, state);
  }
  state.flashStartTime = currentTime;
  state.flashDurationMs = Math.max(10, durationMs);
  activeActors.add(actor);
};

export const getActorFlashIntensity = (
  actor: Actor,
  currentTime: number = Date.now(),
): number => {
  if (!actor) return 0;
  const state = actorAnimations.get(actor);
  if (
    !state ||
    state.flashStartTime === undefined ||
    state.flashDurationMs === undefined
  ) {
    return 0;
  }
  const elapsed = currentTime - state.flashStartTime;
  if (elapsed < 0 || elapsed > state.flashDurationMs) {
    return 0;
  }
  const progress = elapsed / state.flashDurationMs;
  return Math.max(0, 1 - progress);
};

export const isActorFlashing = (
  actor: Actor,
  currentTime: number = Date.now(),
): boolean => getActorFlashIntensity(actor, currentTime) > 0;

const getOrCreateAnimationState = (
  actor: Actor,
  currentTime: number,
): ActorAnimationState => {
  let state = actorAnimations.get(actor);
  if (!state) {
    state = {
      currentPos: { x: actor.position.x, y: actor.position.y },
      targetPos: { x: actor.position.x, y: actor.position.y },
      waypoints: [],
      lastStepEndTime: currentTime,
    };
    actorAnimations.set(actor, state);
  }
  return state;
};

export const playActorAttack = (
  actor: Actor,
  durationMs: number = DEFAULT_ACTOR_ATTACK_ANIMATION_MS,
  currentTime: number = Date.now(),
): void => {
  if (!actor) return;
  const state = getOrCreateAnimationState(actor, currentTime);
  state.attackStartTime = currentTime;
  state.attackDurationMs = Math.max(10, durationMs);
  activeActors.add(actor);
};

export const playActorDeath = (
  actor: Actor,
  durationMs: number = DEFAULT_ACTOR_DEATH_ANIMATION_MS,
  currentTime: number = Date.now(),
): void => {
  if (!actor) return;
  const state = getOrCreateAnimationState(actor, currentTime);
  state.deathStartTime = currentTime;
  state.deathDurationMs = Math.max(10, durationMs);
  if (!dyingActors.includes(actor)) {
    dyingActors.push(actor);
  }
  activeActors.add(actor);
};

export const isActorDeathAnimating = (
  actor: Actor,
  currentTime: number = Date.now(),
): boolean => {
  if (!actor) return false;
  const state = actorAnimations.get(actor);
  if (
    !state ||
    state.deathStartTime === undefined ||
    state.deathDurationMs === undefined
  ) {
    return false;
  }
  return (
    currentTime >= state.deathStartTime &&
    currentTime < state.deathStartTime + state.deathDurationMs
  );
};

// Actors whose death animation is still playing; expired entries are pruned.
export const getDyingActors = (currentTime: number = Date.now()): Actor[] => {
  for (let i = dyingActors.length - 1; i >= 0; i--) {
    if (!isActorDeathAnimating(dyingActors[i], currentTime)) {
      dyingActors.splice(i, 1);
    }
  }
  return dyingActors;
};

// Picks which of the five sprite animations an actor is currently in.
// Priority: death > attack > hurt (flash) > walk (moving) > idle.
export const getActorAnimationName = (
  actor: Actor,
  currentTime: number = Date.now(),
): ActorAnimationName => {
  if (!actor) return 'idle';
  if (isActorDeathAnimating(actor, currentTime)) return 'death';
  const state = actorAnimations.get(actor);
  if (!state) return 'idle';
  if (
    state.attackStartTime !== undefined &&
    state.attackDurationMs !== undefined &&
    currentTime >= state.attackStartTime &&
    currentTime < state.attackStartTime + state.attackDurationMs
  ) {
    return 'attack';
  }
  if (isActorFlashing(actor, currentTime)) return 'hurt';
  if (state.waypoints.length > 0 && currentTime < state.lastStepEndTime) {
    return 'walk';
  }
  return 'idle';
};

export const getActorSpriteFrameDurationMs = (actor: Actor): number =>
  Math.max(
    1,
    actor.sprite?.frameDurationMs ?? DEFAULT_ACTOR_SPRITE_FRAME_DURATION_MS,
  );

// Index of the frame to show within the animation's row: looping for
// idle/walk, clipped to the last frame for attack/hurt/death.
export const getActorAnimationFrameIndex = (
  actor: Actor,
  animation: ActorAnimationName,
  frameCount: number,
  currentTime: number = Date.now(),
): number => {
  if (!frameCount || frameCount < 1) return 0;
  const state = actorAnimations.get(actor);
  const frameDurationMs = getActorSpriteFrameDurationMs(actor);
  let startTime: number | undefined;
  if (animation === 'attack') startTime = state?.attackStartTime;
  else if (animation === 'hurt') startTime = state?.flashStartTime;
  else if (animation === 'death') startTime = state?.deathStartTime;
  if (animation === 'idle' || animation === 'walk' || startTime === undefined) {
    return Math.floor(currentTime / frameDurationMs) % frameCount;
  }
  const elapsed = Math.max(0, currentTime - startTime);
  return Math.min(Math.floor(elapsed / frameDurationMs), frameCount - 1);
};

// Whether the actor's sprite animation may still advance (keeps the render
// loop ticking). Looping animations (idle/walk) are always active; one-shot
// animations are only active during their time window, which
// getActorAnimationName already encodes.
export const isActorSpriteAnimationActive = (
  actor: Actor,
  currentTime: number = Date.now(),
): boolean => {
  if (!actor?.sprite) return false;
  const name = getActorAnimationName(actor, currentTime);
  return (
    name === 'idle' ||
    name === 'walk' ||
    name === 'attack' ||
    name === 'hurt' ||
    name === 'death'
  );
};

export const isActorAnimating = (
  actor: Actor,
  currentTime: number = Date.now(),
): boolean => {
  const state = actorAnimations.get(actor);
  if (!state) {
    return false;
  }
  const isMoving =
    state.waypoints.length > 0 && currentTime < state.lastStepEndTime;
  const isFlashing =
    state.flashStartTime !== undefined &&
    state.flashDurationMs !== undefined &&
    currentTime >= state.flashStartTime &&
    currentTime < state.flashStartTime + state.flashDurationMs;
  return isMoving || isFlashing;
};

export const hasActiveActorAnimations = (
  currentTime: number = Date.now(),
): boolean => {
  if (activeActors.size === 0) return false;

  let hasActive = false;
  for (const actor of activeActors) {
    if (isActorAnimating(actor, currentTime)) {
      hasActive = true;
    } else {
      activeActors.delete(actor);
    }
  }
  return hasActive;
};

export const snapActorPosition = (
  actor: Actor,
  position: Position = actor.position,
): void => {
  if (!actor) return;
  const state = actorAnimations.get(actor);
  if (state) {
    state.waypoints = [];
    state.currentPos = { x: position.x, y: position.y };
    state.targetPos = { x: position.x, y: position.y };
    state.lastStepEndTime = Date.now();
    delete state.flashStartTime;
    delete state.flashDurationMs;
  }
  activeActors.delete(actor);
};

export const clearActorAnimations = (): void => {
  activeActors.clear();
  dyingActors.length = 0;
};

export const getActorRemainingAnimationDuration = (
  actor: Actor,
  currentTime: number = Date.now(),
): number => {
  if (!actor) return 0;
  const state = actorAnimations.get(actor);
  if (!state || state.waypoints.length === 0) {
    return 0;
  }
  return Math.max(0, state.lastStepEndTime - currentTime);
};

export const sleep = (ms: number): Promise<void> => {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
};
