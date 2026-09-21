import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordActorStep,
  getActorVisualPosition,
  isActorAnimating,
  hasActiveActorAnimations,
  clearActorAnimations,
  snapActorPosition,
  setActorMovementDuration,
  getActorMovementDuration,
  resetActorMovementDuration,
  DEFAULT_ACTOR_MOVEMENT_DURATION_MS,
} from './ActorAnimation';
import type { Actor } from '../types';
import { Colour, Level } from '../types';
import { weapons } from '../items/weapons';

const createMockActor = (name = 'TestHero', x = 1, y = 1): Actor => ({
  name,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  defense: 0,
  level: Level.APPRENTICE,
  health: 7,
  maxHealth: 7,
  colour: Colour.Red,
  experience: 0,
  position: { x, y },
  weapon: weapons[0],
  inventory: [],
});

describe('ActorAnimation Module', () => {
  beforeEach(() => {
    clearActorAnimations();
    resetActorMovementDuration();
  });

  it('returns exact position when actor is stationary and uninitialized', () => {
    const actor = createMockActor('Hero1', 2, 3);
    const visualPos = getActorVisualPosition(actor, 1000);
    expect(visualPos).toEqual({ x: 2, y: 3 });
    expect(isActorAnimating(actor, 1000)).toBe(false);
    expect(hasActiveActorAnimations(1000)).toBe(false);
  });

  it('interpolates position over time when single step is recorded', () => {
    const actor = createMockActor('Hero1', 1, 1);
    const startTime = 1000;
    const duration = 200;

    // Start at (1, 1) and record step to (2, 1)
    recordActorStep(actor, { x: 2, y: 1 }, duration, startTime);

    expect(isActorAnimating(actor, startTime)).toBe(true);
    expect(hasActiveActorAnimations(startTime)).toBe(true);

    // At startTime: should be at starting point (1, 1)
    const atStart = getActorVisualPosition(actor, startTime);
    expect(atStart.x).toBeCloseTo(1, 4);
    expect(atStart.y).toBeCloseTo(1, 4);

    // At midpoint (startTime + 100): should be midway between 1 and 2
    const atMid = getActorVisualPosition(actor, startTime + 100);
    expect(atMid.x).toBeCloseTo(1.5, 2);
    expect(atMid.y).toBeCloseTo(1, 4);

    // At end (startTime + 200): should reach target (2, 1)
    const atEnd = getActorVisualPosition(actor, startTime + 200);
    expect(atEnd.x).toBeCloseTo(2, 4);
    expect(atEnd.y).toBeCloseTo(1, 4);
    expect(isActorAnimating(actor, startTime + 200)).toBe(false);
    expect(hasActiveActorAnimations(startTime + 200)).toBe(false);
  });

  it('handles diagonal cell-to-cell movement smoothly', () => {
    const actor = createMockActor('HeroDiag', 2, 2);
    const startTime = 5000;
    const duration = 200;

    recordActorStep(actor, { x: 3, y: 4 }, duration, startTime);

    const atMid = getActorVisualPosition(actor, startTime + 100);
    expect(atMid.x).toBeCloseTo(2.5, 2);
    expect(atMid.y).toBeCloseTo(3.0, 2);

    const atEnd = getActorVisualPosition(actor, startTime + 200);
    expect(atEnd.x).toBeCloseTo(3, 4);
    expect(atEnd.y).toBeCloseTo(4, 4);
  });

  it('queues multiple sequential movement steps taking time per cell', () => {
    const actor = createMockActor('Monster1', 1, 1);
    const startTime = 2000;
    const stepDuration = 150;

    // Simulate multi-cell path: (1,1) -> (2,1) -> (3,1) -> (3,2)
    recordActorStep(actor, { x: 2, y: 1 }, stepDuration, startTime);
    recordActorStep(actor, { x: 3, y: 1 }, stepDuration, startTime);
    recordActorStep(actor, { x: 3, y: 2 }, stepDuration, startTime);

    // Step 1: (1,1) -> (2,1) [2000ms - 2150ms]
    const midStep1 = getActorVisualPosition(actor, 2075);
    expect(midStep1.x).toBeCloseTo(1.5, 2);
    expect(midStep1.y).toBeCloseTo(1.0, 2);

    // Step 2: (2,1) -> (3,1) [2150ms - 2300ms]
    const midStep2 = getActorVisualPosition(actor, 2225);
    expect(midStep2.x).toBeCloseTo(2.5, 2);
    expect(midStep2.y).toBeCloseTo(1.0, 2);

    // Step 3: (3,1) -> (3,2) [2300ms - 2450ms]
    const midStep3 = getActorVisualPosition(actor, 2375);
    expect(midStep3.x).toBeCloseTo(3.0, 2);
    expect(midStep3.y).toBeCloseTo(1.5, 2);

    // End of all steps
    const finalPos = getActorVisualPosition(actor, 2450);
    expect(finalPos).toEqual({ x: 3, y: 2 });
    expect(isActorAnimating(actor, 2450)).toBe(false);
  });

  it('supports custom duration and duration configuration', () => {
    setActorMovementDuration(300);
    expect(getActorMovementDuration()).toBe(300);

    const actor = createMockActor('HeroCustom', 0, 0);
    recordActorStep(actor, { x: 1, y: 0 }, undefined, 1000);

    expect(isActorAnimating(actor, 1250)).toBe(true);
    expect(isActorAnimating(actor, 1300)).toBe(false);

    resetActorMovementDuration();
    expect(getActorMovementDuration()).toBe(DEFAULT_ACTOR_MOVEMENT_DURATION_MS);
  });

  it('snaps actor position immediately without animation', () => {
    const actor = createMockActor('HeroSnap', 1, 1);
    recordActorStep(actor, { x: 2, y: 1 }, 200, 1000);

    snapActorPosition(actor, { x: 5, y: 5 });
    actor.position = { x: 5, y: 5 };

    expect(isActorAnimating(actor, 1050)).toBe(false);
    expect(hasActiveActorAnimations(1050)).toBe(false);
    expect(getActorVisualPosition(actor, 1050)).toEqual({ x: 5, y: 5 });
  });

  it('auto-detects unrecorded single-cell position changes', () => {
    const actor = createMockActor('HeroAuto', 1, 1);
    getActorVisualPosition(actor, 1000); // initialize

    actor.position = { x: 2, y: 1 }; // direct modification
    const visual = getActorVisualPosition(actor, 1050);

    expect(isActorAnimating(actor, 1050)).toBe(true);
    expect(visual.x).toBeGreaterThan(1);
    expect(visual.x).toBeLessThan(2);
  });
});
