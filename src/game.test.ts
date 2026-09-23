import { describe, it, expect } from 'vitest';
import { init, endAction, loadState, next } from './game';

describe('game orchestrator', () => {
  it('init initializes campaign and hero state properly', () => {
    const state = init();
    expect(state.heroes.length).toBeGreaterThan(0);
    expect(state.dungeon).toBeDefined();
    expect(state.currentActor).toBeDefined();
    expect(state.actionLog.length).toBeGreaterThan(0);
    expect(state.reRender).toBe(true);
  });

  it('endAction decrements actor actions and triggers next when actions reach 0', async () => {
    const state = init();
    expect(state.currentActor).toBeDefined();
    if (!state.currentActor) return;

    state.currentActor.actions = 2;
    await endAction(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });
    expect(state.currentActor.actions).toBe(1);

    await endAction(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    }); // actions reached 0, triggers next(state)
    expect(state.reRender).toBe(true);
  });

  it('loadState restores currentActor reference and logs load', () => {
    const state = init();
    const loaded = loadState(state);
    expect(loaded.currentActor?.name).toBe(state.heroes[0].name);
    expect(loaded.actionLog[0].key).toBe('logs.gameLoaded');
  });

  it('next() does not lock up when the last hero in turn order is incapacitated', async () => {
    const state = init();
    expect(state.currentActor).toBeDefined();
    if (!state.currentActor) return;

    // Make the last hero incapacitated so that skipping it would push
    // nextIndex out of bounds if wraparound isn't handled correctly.
    const lastHero = state.heroes[state.heroes.length - 1];
    lastHero.incapacitated = true;

    // Advance turns through all heroes.
    for (let i = 0; i < state.heroes.length; i++) {
      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });
    }

    // The game must not lock up: a current actor must always be assigned
    // after advancing turns, instead of becoming undefined.
    expect(state.currentActor).toBeDefined();
  });
});
