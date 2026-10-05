import { describe, it, expect } from 'vitest';
import { init, endAction, loadState, next, hasWon } from './game';
import { liveHeroes } from './hero/HeroLogic';
import { eventEffects } from './events/EventsLogic';

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

  it('timePortal event grants +1 action to every hero for the whole round, not just the first', async () => {
    const state = init();
    expect(state.currentActor).toBeDefined();
    if (!state.currentActor) return;

    // Simulate the first hero's turn triggering the round event.
    eventEffects.timePortal(state, {
      effect: 'timePortal',
      used: false,
    } as never);

    const heroes = liveHeroes(state);
    // First hero got the bonus applied directly.
    expect(heroes[0].actions).toBe(3);

    // End the first hero's turn 3 times to move to the next hero.
    for (let i = 0; i < 3; i++) {
      await endAction(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });
    }

    // Every subsequent hero should also start their turn with the +1 bonus applied.
    for (let i = 1; i < heroes.length; i++) {
      expect(state.currentActor?.actions).toBe(3);
      for (let j = 0; j < 3; j++) {
        await endAction(state, {
          delayBetweenMonsters: 0,
          delayBetweenActions: 0,
          delayAfterAttack: 0,
          waitForMovement: false,
        });
      }
    }
  });

  describe('moving to the next level', () => {
    it('resets hero positions, events, debuffs, and turn count when moving to the next dungeon', () => {
      const state = init();
      const hero1 = state.heroes[0];
      const hero2 = state.heroes[1];

      // Mutate heroes positions during play
      hero1.position = { x: 10, y: 10 };
      hero2.position = { x: 11, y: 11 };
      hero1.blinded = true;
      hero1.weakened = true;
      if (hero1.weapon) hero1.weapon.elemental = true;
      hero1.inventory = [{ name: 'torch', disabled: true } as never];

      state.turnCount = 5;
      state.currentEvent = state.eventDeck[0];
      state.roundActionsDelta = 1;

      // Define next dungeon with known starting positions
      const nextDungeon = {
        ...state.dungeon,
        name: 'campaign.iceDragon.e1m1.name',
        intro: 'campaign.iceDragon.e1m1.intro',
        startingPositions: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
        ],
        winConditions: [],
        beaten: false,
      };

      state.dungeon.beaten = true;
      state.dungeon.nextDungeon = nextDungeon;

      hasWon(state);

      expect(state.dungeon.name).toBe('campaign.iceDragon.e1m1.name');
      expect(state.turnCount).toBe(0);
      expect(state.currentEvent).toBeUndefined();
      expect(state.drawEvents).toBe(true);
      expect(state.roundActionsDelta).toBe(0);

      // Heroes positions should be reset to new start positions
      expect(state.heroes[0].position).toEqual({ x: 1, y: 1 });
      expect(state.heroes[1].position).toEqual({ x: 2, y: 1 });
      expect(state.heroes[2].position).toEqual({ x: 3, y: 1 });
      expect(state.heroes[3].position).toEqual({ x: 4, y: 1 });

      // Debuffs and temporary effects should be reset
      expect(state.heroes[0].blinded).toBe(false);
      expect(state.heroes[0].weakened).toBe(false);
      expect(state.heroes[0].weapon?.elemental).toBe(false);
      expect(state.heroes[0].inventory[0]?.disabled).toBe(false);

      // First hero is active
      expect(state.currentActor?.name).toBe(state.heroes[0].name);

      // Verify mutating hero position does not mutate dungeon startingPositions
      state.heroes[0].position.x = 99;
      expect(state.dungeon.startingPositions[0].x).toBe(1);
    });

    it('advances to next dungeon via next() when dungeon is beaten', async () => {
      const state = init();
      const nextDungeon = {
        ...state.dungeon,
        name: 'campaign.iceDragon.e1m1.name',
        startingPositions: [{ x: 5, y: 5 }],
        winConditions: [],
        beaten: false,
      };

      state.dungeon.layout.monsters = [];
      state.dungeon.winConditions.forEach((w) => {
        w.fulfilled = true;
      });
      state.dungeon.beaten = true;
      state.dungeon.nextDungeon = nextDungeon;

      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.dungeon.name).toBe('campaign.iceDragon.e1m1.name');
      expect(state.heroes[0].position).toEqual({ x: 5, y: 5 });
      expect(state.turnCount).toBe(0);
    });
  });
});
