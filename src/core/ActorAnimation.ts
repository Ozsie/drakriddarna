import type { Actor, Position } from '../types';

export const DEFAULT_ACTOR_MOVEMENT_DURATION_MS = 200;
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
}

const actorAnimations = new WeakMap<Actor, ActorAnimationState>();
const activeActors = new Set<Actor>();

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
    activeActors.delete(actor);
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

export const isActorAnimating = (
  actor: Actor,
  currentTime: number = Date.now(),
): boolean => {
  const state = actorAnimations.get(actor);
  if (!state || state.waypoints.length === 0) {
    return false;
  }
  return currentTime < state.lastStepEndTime;
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
  }
  activeActors.delete(actor);
};

export const clearActorAnimations = (): void => {
  activeActors.clear();
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
