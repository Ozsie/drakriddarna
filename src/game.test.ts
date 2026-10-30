import { describe, it, expect } from 'vitest';
import {
  init,
  endAction,
  loadState,
  next,
  hasWon,
  restartDungeonAfterWipe,
} from './game';
import {
  completeBetweenDungeonsAndStartNext,
  openPartyWipe,
} from './dungeon/BetweenDungeonsLogic';
import { liveHeroes } from './hero/HeroLogic';
import { getCampaign } from './campaigns';
import { buildSelectedHeroes } from './ui/HeroSelectionRendering';
import { eventEffects } from './events/EventsLogic';
import { Level, TerrainType } from './types';
import type { Dungeon, GameMaster, Hero, GameState } from './types';

describe('game orchestrator', () => {
  it('init initializes campaign and hero state properly', () => {
    const state = init();
    expect(state.heroes.length).toBeGreaterThan(0);
    expect(state.dungeon).toBeDefined();
    expect(state.currentActor).toBeDefined();
    expect(state.actionLog.length).toBeGreaterThan(0);
    expect(state.reRender).toBe(true);
    expect(state.gameMaster?.id).toBe('tactician');
    expect(state.gameMaster?.id).toBe('tactician');
  });

  it('init with easy difficulty equips heroes with starting shields', () => {
    const state = init('iceDragonTreasure', 'easy');
    expect(state.gameMaster?.id).toBe('storyTeller');
    expect(state.gameMaster?.id).toBe('storyTeller');
    expect(state.heroes.length).toBeGreaterThan(0);
    state.heroes.forEach((hero) => {
      expect(hero.shield).toBeDefined();
    });
  });

  it('init with hard difficulty initializes with hard difficulty and without extra starting shields', () => {
    const state = init('iceDragonTreasure', 'hard');
    expect(state.gameMaster?.id).toBe('brutalOverlord');
    expect(state.gameMaster?.id).toBe('brutalOverlord');
    expect(state.heroes.length).toBeGreaterThan(0);
    state.heroes.forEach((hero) => {
      expect(hero.shield).toBeUndefined();
    });
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

  describe('dungeon timer', () => {
    it('init creates a timer that waits for the first dungeon intro to close', () => {
      const state = init();
      expect(state.timer).toEqual({
        runningFrom: undefined,
        dungeonElapsedMs: 0,
        campaignElapsedMs: 0,
      });
    });

    it('loadState rebases a running timer so the offline gap is not counted', () => {
      const state = init();
      state.timer = {
        runningFrom: Date.now() - 3_600_000,
        dungeonElapsedMs: 5_000,
        campaignElapsedMs: 0,
      };

      const loaded = loadState(state);

      expect(loaded.timer?.dungeonElapsedMs).toBe(5_000);
      expect(loaded.timer?.runningFrom).toBeDefined();
      expect(loaded.timer?.runningFrom ?? 0).toBeGreaterThanOrEqual(
        Date.now() - 1_000,
      );
    });

    it('loadState does not start a timer that was not running when saved', () => {
      const state = init();
      state.timer = { dungeonElapsedMs: 5_000, campaignElapsedMs: 0 };

      const loaded = loadState(state);

      expect(loaded.timer?.runningFrom).toBeUndefined();
    });
  });

  describe('speedrun seed', () => {
    it('init without a seed leaves speedrunSeed undefined', () => {
      const state = init();
      expect(state.speedrunSeed).toBeUndefined();
    });

    it('init with a heroes override replaces the roster without touching the campaign registry', () => {
      const campaign = getCampaign('iceDragonTreasure');
      const rosterNames = campaign.heroes.map((hero) => hero.name);
      const rosterSize = campaign.heroes.length;

      const override = buildSelectedHeroes(
        campaign,
        [campaign.heroes[2]?.id, campaign.heroes[0]?.id].filter(
          (id): id is string => typeof id === 'string',
        ),
        { [campaign.heroes[0]?.id ?? '']: 'Renowned One' },
      );
      const state = init('iceDragonTreasure', 'tactician', undefined, override);

      // The selected, possibly renamed heroes are the run's party, in
      // roster order; the current actor is the first of them.
      expect(state.heroes).toHaveLength(2);
      expect(state.heroes.map((hero) => hero.id)).toEqual(
        override.map((hero) => hero.id),
      );
      expect(state.heroes[0]?.name).toBe('Renowned One');
      expect(state.currentActor?.id).toBe(override[0]?.id);

      // The registered campaign object is never mutated.
      const after = getCampaign('iceDragonTreasure');
      expect(after.heroes).toHaveLength(rosterSize);
      expect(after.heroes.map((hero) => hero.name)).toEqual(rosterNames);
    });

    it('init with a seed records it and shuffles decks deterministically', () => {
      const first = init('iceDragonTreasure', 'tactician', 42);
      const second = init('iceDragonTreasure', 'tactician', 42);
      const third = init('iceDragonTreasure', 'tactician', 43);

      expect(first.speedrunSeed).toBe(42);
      expect(second.speedrunSeed).toBe(42);
      expect(first.itemDeck.map((item) => item.name)).toEqual(
        second.itemDeck.map((item) => item.name),
      );
      expect(first.eventDeck.map((event) => event.id)).toEqual(
        second.eventDeck.map((event) => event.id),
      );
      expect(third.speedrunSeed).toBe(43);
    });

    it('loadState re-applies the seed of the loaded state', () => {
      const seeded = init('iceDragonTreasure', 'tactician', 42);
      const loaded = loadState(seeded);
      expect(loaded.speedrunSeed).toBe(42);

      const normal = init();
      delete normal.speedrunSeed;
      const loadedNormal = loadState(normal);
      expect(loadedNormal.speedrunSeed).toBeUndefined();
    });
  });

  it('clears actions and movement to 0 when a hero ends their turn', async () => {
    const state = init();
    expect(state.currentActor).toBeDefined();

    const hero0 = state.heroes[0];
    const hero1 = state.heroes[1];
    expect(hero0.actions).toBe(2);
    expect(hero0.movement).toBeGreaterThan(0);

    // End hero 0 turn
    await next(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    // Hero 0 must have actions and movement cleared to 0
    expect(hero0.actions).toBe(0);
    expect(hero0.movement).toBe(0);

    // Hero 1 is now active
    expect(state.currentActor?.name).toBe(hero1.name);
    expect(hero1.actions).toBe(2);
    expect(hero1.movement).toBeGreaterThan(0);
  });

  it('the hero after a middle hero downed by turn-end lava acts, without starting a new round', async () => {
    const state = init();
    expect(state.heroes.length).toBeGreaterThanOrEqual(3);

    // The middle hero ends its turn standing on lava hot enough to
    // down it.
    const middleHero = state.heroes[1] as Hero;
    state.currentActor = middleHero;
    state.dungeon.layout.terrain = [
      ...(state.dungeon.layout.terrain ?? []),
      {
        position: { x: middleHero.position.x, y: middleHero.position.y },
        type: TerrainType.LAVA,
        damageOnEnter: 1,
        damageOnTurnEnd: middleHero.health,
      },
    ];
    const turnCountBefore = state.turnCount ?? 0;
    const heroAfter = state.heroes[2];

    await next(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    // The turn-end toll downed the middle hero.
    expect(middleHero.health).toBeLessThanOrEqual(0);

    // The hero after them acts, with a fresh turn...
    expect(state.currentActor?.name).toBe(heroAfter.name);
    expect(state.currentActor?.actions).toBe(2);

    // ...and the round did not wrap: no new round, no turn counter
    // increment, no event redraw.
    expect(state.turnCount ?? 0).toBe(turnCountBefore);
    expect(state.currentEvent).toBeUndefined();
  });

  it('a first hero downed by turn-end lava hands the turn to the next hero without starting a new round', async () => {
    const state = init();

    const firstHero = state.heroes[0] as Hero;
    state.currentActor = firstHero;
    state.dungeon.layout.terrain = [
      ...(state.dungeon.layout.terrain ?? []),
      {
        position: { x: firstHero.position.x, y: firstHero.position.y },
        type: TerrainType.LAVA,
        damageOnEnter: 1,
        damageOnTurnEnd: firstHero.health,
      },
    ];
    const turnCountBefore = state.turnCount ?? 0;

    await next(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    expect(firstHero.health).toBeLessThanOrEqual(0);
    // The second hero acts...
    expect(state.currentActor?.name).toBe(state.heroes[1].name);
    // ...without the round restarting.
    expect(state.turnCount ?? 0).toBe(turnCountBefore);
  });

  it('endAction decrements actions and clears movement when actions hit 0', async () => {
    const state = init();
    const hero0 = state.heroes[0] as Hero;
    hero0.actions = 1;
    hero0.movement = 2;
    state.currentActor = hero0;

    await endAction(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    expect(hero0.actions).toBe(0);
    expect(hero0.movement).toBe(0);
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

      expect(state.betweenDungeons).toBeDefined();
      expect(state.betweenDungeons?.step).toBe('levelUp');
      expect(state.betweenDungeons?.completedDungeonName).toBe(
        'campaign.iceDragon.e1m0.name',
      );

      // Complete between dungeons and start next dungeon
      completeBetweenDungeonsAndStartNext(state);

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

      expect(state.betweenDungeons).toBeDefined();
      expect(state.betweenDungeons?.step).toBe('levelUp');

      completeBetweenDungeonsAndStartNext(state);

      expect(state.dungeon.name).toBe('campaign.iceDragon.e1m1.name');
      expect(state.heroes[0].position).toEqual({ x: 5, y: 5 });
      expect(state.turnCount).toBe(0);
    });

    it('awards the scenario score once, when win conditions are first fulfilled', async () => {
      const state = init();
      const nextDungeon = {
        ...state.dungeon,
        name: 'campaign.iceDragon.e1m1.name',
        startingPositions: [{ x: 5, y: 5 }],
        winConditions: [],
        beaten: false,
      };

      state.dungeon.layout.monsters = [];
      state.dungeon.winConditions = [];
      state.dungeon.layout.secrets = [];
      state.dungeon.nextDungeon = nextDungeon;
      state.turnCount = 3;
      const heroHealth = state.heroes.reduce(
        (partial, hero) => partial + Math.max(0, hero.health),
        0,
      );
      const expectedScore = 50 * heroHealth - 2 * 3;

      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.dungeon.beaten).toBe(true);
      expect(state.dungeon.score?.total).toBe(expectedScore);
      expect(state.score).toBe(expectedScore);
      expect(state.betweenDungeons?.scenarioScore?.total).toBe(expectedScore);
      expect(state.betweenDungeons?.campaignScore).toBe(expectedScore);

      // A re-check while already beaten must not add the score twice
      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.score).toBe(expectedScore);
    });

    it('opens the campaign-complete screen when the last dungeon is beaten', async () => {
      const state = init();
      state.dungeon.layout.monsters = [];
      state.dungeon.winConditions = [];
      state.dungeon.layout.secrets = [];
      state.dungeon.nextDungeon = undefined;
      state.turnCount = 2;
      const xpBefore = state.heroes.map((hero) => hero.experience);

      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.dungeon.beaten).toBe(true);
      expect(state.betweenDungeons?.step).toBe('campaignComplete');
      expect(state.betweenDungeons?.nextDungeon).toBeUndefined();
      expect(state.betweenDungeons?.levelUps).toEqual([]);
      expect(state.betweenDungeons?.scenarioScore?.total).toBe(state.score);
      expect(state.scenarioScores?.length).toBe(1);
      expect(state.scenarioScores?.[0].rounds).toBe(2);
      // No between-dungeons progression on the final screen: heroes keep
      // the experience they ended the campaign with.
      expect(state.heroes.map((hero) => hero.experience)).toEqual(xpBefore);

      // Re-checking the beaten final dungeon does not duplicate records
      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });
      expect(state.scenarioScores?.length).toBe(1);
      expect(state.score).toBe(state.scenarioScores?.[0].score.total);
    });

    it('opens the party-wipe screen when every hero falls', async () => {
      const state = init();
      state.heroes.forEach((hero) => {
        hero.health = 0;
      });

      await next(state, {
        delayBetweenMonsters: 0,
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.currentActor).toBeUndefined();
      expect(liveHeroes(state).length).toBe(0);
      expect(state.betweenDungeons?.step).toBe('partyWipe');
      expect(state.dungeon.beaten).toBe(false);
      expect(state.betweenDungeons?.campaignScore).toBe(state.score);
      expect(state.betweenDungeons?.wipeHighScores).toEqual([]);
    });

    it('restartDungeonAfterWipe revives the party with lost xp and levels', () => {
      const state = init();
      state.heroes.forEach((hero) => {
        hero.health = 0;
        hero.experience = 10;
        hero.level = Level.KNIGHT;
      });
      openPartyWipe(state);
      expect(state.betweenDungeons?.step).toBe('partyWipe');

      const updated = restartDungeonAfterWipe(state);

      expect(liveHeroes(updated).length).toBe(updated.heroes.length);
      updated.heroes.forEach((hero) => {
        expect(hero.health).toBeGreaterThan(0);
        expect(hero.experience).toBe(0);
        expect(hero.level).toBe(Level.APPRENTICE);
      });
      expect(updated.currentActor).toBeDefined();
      expect(updated.betweenDungeons).toBeUndefined();
    });
  });
});

type LegacyGameMasterState = GameState & {
  difficulty?: GameMaster;
  gameMasterId?: string;
};

describe('loadState legacy save migration', () => {
  it('resolves the game master from a legacy difficulty field and removes both legacy fields', () => {
    const state = init('iceDragonTreasure', 'easy');
    const legacy = state as LegacyGameMasterState;
    legacy.difficulty = state.gameMaster as GameMaster;
    state.saveVersion = undefined; // legacy save: no version stamp
    legacy.gameMasterId = state.gameMaster?.id;
    legacy.gameMaster = undefined;

    loadState(state);

    expect(state.gameMaster?.id).toBe('storyTeller');
    expect('difficulty' in state).toBe(false);
    expect('gameMasterId' in state).toBe(false);
  });

  it('resolves the game master from a legacy gameMasterId when difficulty is absent', () => {
    const state = init('iceDragonTreasure', 'hard');
    const legacy = state as LegacyGameMasterState;
    legacy.gameMasterId = 'brutalOverlord';
    state.saveVersion = undefined; // legacy save: no version stamp
    legacy.gameMaster = undefined;

    loadState(state);

    expect(state.gameMaster?.id).toBe('brutalOverlord');
    expect('difficulty' in state).toBe(false);
    expect('gameMasterId' in state).toBe(false);
  });

  it('resolves a legacy difficulty without modifiers by its id', () => {
    const state = init();
    const legacy = state as LegacyGameMasterState;
    legacy.difficulty = { id: 'easy' } as unknown as GameMaster;
    state.saveVersion = undefined; // legacy save: no version stamp
    legacy.gameMaster = undefined;

    loadState(state);

    expect(state.gameMaster?.id).toBe('storyTeller');
    expect('difficulty' in state).toBe(false);
  });

  it('falls back to the default game master when no legacy field resolves', () => {
    const state = init();
    const legacy = state as LegacyGameMasterState;
    legacy.gameMaster = undefined;
    state.saveVersion = undefined; // legacy save: no version stamp

    loadState(state);

    expect(state.gameMaster?.id).toBe('tactician');
  });
});

describe('loadState legacy collapsed corridor migration', () => {
  type LegacyCollapsedDungeon = Dungeon & {
    collapsedCorridor?: string;
  };

  it('migrates a legacy collapsedCorridor into a collapsedCorridors group', () => {
    const state = init();
    const dungeon = state.dungeon as LegacyCollapsedDungeon;
    dungeon.layout.grid = ['#####', '#AA?#', '#####'];
    dungeon.collapsedCorridor = 'B';
    state.saveVersion = undefined; // legacy save: no version stamp

    loadState(state);

    expect(dungeon.collapsedCorridors).toEqual([
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
    expect('collapsedCorridor' in dungeon).toBe(false);
  });

  it('preserves existing collapsedCorridors groups when migrating', () => {
    const state = init();
    const dungeon = state.dungeon as LegacyCollapsedDungeon;
    const existingGroup = { letter: 'C', cells: [{ x: 9, y: 9 }] };
    dungeon.collapsedCorridors = [existingGroup];
    dungeon.layout.grid = ['#####', '#AA?#', '#####'];
    dungeon.collapsedCorridor = 'B';
    state.saveVersion = undefined; // legacy save: no version stamp

    loadState(state);

    expect(dungeon.collapsedCorridors).toEqual([
      existingGroup,
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
  });

  it('drops a legacy collapsedCorridor that has no collapsed cells left', () => {
    const state = init();
    const dungeon = state.dungeon as LegacyCollapsedDungeon;
    dungeon.collapsedCorridor = 'B';
    state.saveVersion = undefined; // legacy save: no version stamp

    loadState(state);

    expect(dungeon.collapsedCorridors).toBeUndefined();
    expect('collapsedCorridor' in dungeon).toBe(false);
  });

  it('migrates the next dungeon chain too', () => {
    const state = init();
    const nextDungeon = structuredClone(
      state.dungeon,
    ) as LegacyCollapsedDungeon;
    nextDungeon.layout.grid = ['#####', '#AA?#', '#####'];
    nextDungeon.collapsedCorridor = 'B';
    state.saveVersion = undefined; // legacy save: no version stamp
    state.dungeon.nextDungeon = nextDungeon;

    loadState(state);

    expect('collapsedCorridor' in nextDungeon).toBe(false);
    expect(nextDungeon.collapsedCorridors).toEqual([
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
  });
});
