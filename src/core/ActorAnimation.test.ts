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
  flashActor,
  playActorAttack,
  playActorDeath,
  isActorDeathAnimating,
  isActorSpriteAnimationActive,
  getActorAnimationName,
  getActorAnimationFrameIndex,
  getDyingActors,
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

describe('Actor Sprite Animations', () => {
  beforeEach(() => {
    clearActorAnimations();
    resetActorMovementDuration();
  });

  const createSpriteActor = (
    frameDurationMs?: number,
    animations?: Record<string, number>,
  ): Actor => {
    const actor = createMockActor('SpriteHero', 1, 1);
    actor.sprite = {
      image: 'hero-sprite.png',
      frameWidth: 32,
      frameHeight: 32,
      ...(frameDurationMs !== undefined ? { frameDurationMs } : {}),
      ...(animations !== undefined ? { animations } : {}),
    };
    return actor;
  };

  it('is idle when nothing is happening', () => {
    const actor = createSpriteActor();
    expect(getActorAnimationName(actor, 1000)).toBe('idle');
  });

  it('uses walk while movement waypoints are active', () => {
    const actor = createSpriteActor();
    recordActorStep(actor, { x: 2, y: 1 }, 200, 1000);
    expect(getActorAnimationName(actor, 1100)).toBe('walk');
    expect(getActorAnimationName(actor, 1200)).toBe('idle');
  });

  it('uses hurt while the actor is flashing', () => {
    const actor = createSpriteActor();
    flashActor(actor, 200, 1000);
    expect(getActorAnimationName(actor, 1100)).toBe('hurt');
    expect(getActorAnimationName(actor, 1300)).toBe('idle');
  });

  it('uses attack during the attack window', () => {
    const actor = createSpriteActor();
    playActorAttack(actor, 300, 1000);
    expect(getActorAnimationName(actor, 1000)).toBe('attack');
    expect(getActorAnimationName(actor, 1299)).toBe('attack');
    expect(getActorAnimationName(actor, 1300)).toBe('idle');
  });

  it('uses death from trigger until the death window ends', () => {
    const actor = createSpriteActor();
    playActorDeath(actor, 600, 1000);
    expect(isActorDeathAnimating(actor, 1000)).toBe(true);
    expect(getActorAnimationName(actor, 1599)).toBe('death');
    expect(isActorDeathAnimating(actor, 1600)).toBe(false);
    expect(getActorAnimationName(actor, 1600)).toBe('idle');
  });

  it('prioritizes death over attack and hurt', () => {
    const actor = createSpriteActor();
    playActorAttack(actor, 300, 1000);
    flashActor(actor, 200, 1000);
    playActorDeath(actor, 600, 1000);
    expect(getActorAnimationName(actor, 1100)).toBe('death');
  });

  it('prioritizes attack over hurt and walk', () => {
    const actor = createSpriteActor();
    recordActorStep(actor, { x: 2, y: 1 }, 200, 1000);
    flashActor(actor, 200, 1000);
    playActorAttack(actor, 300, 1000);
    expect(getActorAnimationName(actor, 1100)).toBe('attack');
  });

  it('prioritizes hurt over walk', () => {
    const actor = createSpriteActor();
    recordActorStep(actor, { x: 2, y: 1 }, 200, 1000);
    flashActor(actor, 200, 1000);
    expect(getActorAnimationName(actor, 1100)).toBe('hurt');
  });

  it('loops idle and walk frames', () => {
    const actor = createSpriteActor(150);
    const idleIndex = getActorAnimationFrameIndex(actor, 'idle', 4, 1500);
    expect(idleIndex).toBe(Math.floor(1500 / 150) % 4);

    recordActorStep(actor, { x: 2, y: 1 }, 200, 1000);
    const walkIndex = getActorAnimationFrameIndex(actor, 'walk', 3, 1400);
    expect(walkIndex).toBe(Math.floor(1400 / 150) % 3);
  });

  it('clips one-shot animations to the last frame', () => {
    const actor = createSpriteActor(100);
    playActorAttack(actor, 300, 1000);
    expect(getActorAnimationFrameIndex(actor, 'attack', 4, 1000)).toBe(0);
    expect(getActorAnimationFrameIndex(actor, 'attack', 4, 1250)).toBe(2);
    expect(getActorAnimationFrameIndex(actor, 'attack', 4, 9999)).toBe(3);
  });

  it('clamps elapsed time for future animation starts', () => {
    const actor = createSpriteActor(100);
    flashActor(actor, 200, 1500);
    expect(getActorAnimationFrameIndex(actor, 'hurt', 2, 1000)).toBe(0);
  });

  it('reports sprite animations active only for actors with a sprite', () => {
    const withSprite = createSpriteActor();
    const withoutSprite = createMockActor('PlainHero', 1, 1);
    expect(isActorSpriteAnimationActive(withSprite, 1000)).toBe(true);
    expect(isActorSpriteAnimationActive(withoutSprite, 1000)).toBe(false);
  });

  it('tracks dying actors until their death animation expires', () => {
    const actor = createSpriteActor();
    playActorDeath(actor, 600, 1000);
    expect(getDyingActors(1100)).toContain(actor);

    clearActorAnimations();
    expect(getDyingActors(1100)).not.toContain(actor);

    playActorDeath(actor, 600, 1000);
    expect(getDyingActors(1599)).toContain(actor);
    expect(getDyingActors(1600)).not.toContain(actor);
  });

  it('does not list an actor as dying twice', () => {
    const actor = createSpriteActor();
    playActorDeath(actor, 600, 1000);
    playActorDeath(actor, 600, 1100);
    expect(getDyingActors(1200).length).toBe(1);
  });
});
