import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_MASTER_ID,
  gameMasters,
  getGameMaster,
  isKnownGameMaster,
} from './index';
import storyTeller from './storyTeller/gameMaster';
import tactician from './tactician/gameMaster';
import brutalOverlord from './brutalOverlord/gameMaster';
import { shields } from '../items/shields';
import { weapons } from '../items/weapons';
import {
  DifficultLevels,
  getDifficulty,
  getEarliestMonsterEventRound,
  getEventMinSpawnDistance,
} from '../core';

describe('Game Master System', () => {
  it('auto-discovers and registers the three default Game Masters', () => {
    expect(gameMasters['storyTeller']).toBeDefined();
    expect(gameMasters['tactician']).toBeDefined();
    expect(gameMasters['brutalOverlord']).toBeDefined();
    expect(Object.keys(gameMasters)).toEqual(
      expect.arrayContaining(['storyTeller', 'tactician', 'brutalOverlord']),
    );
  });

  it('sets DEFAULT_GAME_MASTER_ID to tactician', () => {
    expect(DEFAULT_GAME_MASTER_ID).toBe('tactician');
    expect(getGameMaster()).toBe(tactician);
  });

  describe('Storyteller Game Master (Easy)', () => {
    it('defines correct modifiers and properties for Storyteller', () => {
      expect(storyTeller.id).toBe('storyTeller');
      expect(storyTeller.nameTranslationKey).toBe(
        'content.gameMaster.storyTeller.name',
      );
      expect(storyTeller.descriptionTranslationKey).toBe(
        'content.gameMaster.storyTeller.description',
      );
      expect(storyTeller.modifiers).toEqual({
        attack: 0,
        defense: 0,
        movement: 0,
        search: 2,
        health: 1,
      });
      expect(storyTeller.monsterBehavior?.bowForgottenChance).toBe(0.2);
      expect(storyTeller.events?.minMonsterSpawnDistance).toBe(3);
      expect(storyTeller.events?.earliestMonsterRound).toBe(4);
      expect(storyTeller.events?.skipHungryTrollBelowHalfHealth).toBe(true);
      expect(storyTeller.startingEquipment?.shield).toEqual(shields[1]);
      expect(storyTeller.startingEquipment?.weapon).toEqual(weapons[0]);
    });

    it('resolves aliases easy, storyteller, and story-teller to Storyteller', () => {
      expect(getGameMaster('easy')).toBe(storyTeller);
      expect(getGameMaster('storyteller')).toBe(storyTeller);
      expect(getGameMaster('storyTeller')).toBe(storyTeller);
      expect(getGameMaster('story-teller')).toBe(storyTeller);
      expect(getGameMaster('story teller')).toBe(storyTeller);
    });
  });

  describe('Tactician Game Master (Medium / Normal)', () => {
    it('defines correct modifiers and properties for Tactician', () => {
      expect(tactician.id).toBe('tactician');
      expect(tactician.nameTranslationKey).toBe(
        'content.gameMaster.tactician.name',
      );
      expect(tactician.descriptionTranslationKey).toBe(
        'content.gameMaster.tactician.description',
      );
      expect(tactician.modifiers).toEqual({
        attack: 0,
        defense: 0,
        movement: 0,
        search: 0,
        health: 0,
      });
      expect(tactician.monsterBehavior?.bowForgottenChance).toBe(0.15);
      expect(tactician.events?.minMonsterSpawnDistance).toBe(3);
      expect(tactician.events?.earliestMonsterRound).toBe(3);
      expect(tactician.events?.skipHungryTrollBelowHalfHealth).toBe(true);
      expect(tactician.startingEquipment?.shield).toBeUndefined();
      expect(tactician.startingEquipment?.weapon).toEqual(weapons[0]);
    });

    it('resolves aliases normal, medium, and tactician to Tactician', () => {
      expect(getGameMaster('normal')).toBe(tactician);
      expect(getGameMaster('medium')).toBe(tactician);
      expect(getGameMaster('tactician')).toBe(tactician);
    });
  });

  describe('Brutal Overlord Game Master (Hard)', () => {
    it('defines correct modifiers and properties for Brutal Overlord', () => {
      expect(brutalOverlord.id).toBe('brutalOverlord');
      expect(brutalOverlord.nameTranslationKey).toBe(
        'content.gameMaster.brutalOverlord.name',
      );
      expect(brutalOverlord.descriptionTranslationKey).toBe(
        'content.gameMaster.brutalOverlord.description',
      );
      expect(brutalOverlord.modifiers).toEqual({
        attack: 0,
        defense: 0,
        movement: 0,
        search: 0,
        health: -1,
      });
      expect(brutalOverlord.monsterBehavior?.bowForgottenChance).toBe(0);
      expect(brutalOverlord.events?.minMonsterSpawnDistance).toBe(2);
      expect(brutalOverlord.events?.earliestMonsterRound).toBe(2);
      expect(brutalOverlord.events?.skipHungryTrollBelowHalfHealth).toBe(false);
      expect(brutalOverlord.startingEquipment?.shield).toBeUndefined();
      expect(brutalOverlord.startingEquipment?.weapon).toEqual(weapons[0]);
    });

    it('resolves aliases hard, overlord, and brutalOverlord to Brutal Overlord', () => {
      expect(getGameMaster('hard')).toBe(brutalOverlord);
      expect(getGameMaster('overlord')).toBe(brutalOverlord);
      expect(getGameMaster('brutalOverlord')).toBe(brutalOverlord);
      expect(getGameMaster('brutal-overlord')).toBe(brutalOverlord);
      expect(getGameMaster('brutal overlord')).toBe(brutalOverlord);
    });
  });

  describe('Helper functions & fallback behavior', () => {
    it('isKnownGameMaster recognizes primary IDs and aliases', () => {
      expect(isKnownGameMaster('storyTeller')).toBe(true);
      expect(isKnownGameMaster('tactician')).toBe(true);
      expect(isKnownGameMaster('brutalOverlord')).toBe(true);
      expect(isKnownGameMaster('easy')).toBe(true);
      expect(isKnownGameMaster('medium')).toBe(true);
      expect(isKnownGameMaster('normal')).toBe(true);
      expect(isKnownGameMaster('hard')).toBe(true);
      expect(isKnownGameMaster('nonExistentGM')).toBe(false);
    });

    it('getGameMaster falls back to default Game Master when unknown ID is given', () => {
      expect(getGameMaster('unknown_id')).toBe(tactician);
    });

    it('DifficultLevels array contains all three Game Masters', () => {
      expect(DifficultLevels).toHaveLength(3);
      expect(DifficultLevels).toContain(storyTeller);
      expect(DifficultLevels).toContain(tactician);
      expect(DifficultLevels).toContain(brutalOverlord);
    });

    it('getDifficulty resolves the game master from state or defaults', () => {
      expect(getDifficulty(undefined)).toBe(tactician);
      expect(getDifficulty({ gameMaster: storyTeller } as never)).toBe(
        storyTeller,
      );
      expect(getDifficulty({ gameMaster: brutalOverlord } as never)).toBe(
        brutalOverlord,
      );
    });

    it('getEventMinSpawnDistance returns appropriate distances for all GM IDs', () => {
      expect(getEventMinSpawnDistance('storyTeller')).toBe(3);
      expect(getEventMinSpawnDistance('easy')).toBe(3);
      expect(getEventMinSpawnDistance('tactician')).toBe(3);
      expect(getEventMinSpawnDistance('normal')).toBe(3);
      expect(getEventMinSpawnDistance('brutalOverlord')).toBe(2);
      expect(getEventMinSpawnDistance('hard')).toBe(2);
    });

    it('getEarliestMonsterEventRound returns appropriate rounds for all GM IDs', () => {
      expect(getEarliestMonsterEventRound('storyTeller')).toBe(4);
      expect(getEarliestMonsterEventRound('easy')).toBe(4);
      expect(getEarliestMonsterEventRound('tactician')).toBe(3);
      expect(getEarliestMonsterEventRound('normal')).toBe(3);
      expect(getEarliestMonsterEventRound('brutalOverlord')).toBe(2);
      expect(getEarliestMonsterEventRound('hard')).toBe(2);
    });
  });

  describe('Game Master Director State & Behavior Hooks', () => {
    it('Storyteller Director eases when party HP is < 45% or hero is dead', () => {
      const getDS = storyTeller.monsterBehavior?.getDirectorState;
      expect(getDS).toBeDefined();
      expect(
        getDS!({
          hasDeadHero: false,
          partyHpPercentage: 0.44,
          aliveMonsterCount: 2,
        }),
      ).toBe('EASE');
      expect(
        getDS!({
          hasDeadHero: true,
          partyHpPercentage: 0.9,
          aliveMonsterCount: 1,
        }),
      ).toBe('EASE');
      expect(
        getDS!({
          hasDeadHero: false,
          partyHpPercentage: 0.9,
          aliveMonsterCount: 1,
        }),
      ).toBe('PUSH');
      expect(
        getDS!({
          hasDeadHero: false,
          partyHpPercentage: 0.7,
          aliveMonsterCount: 2,
        }),
      ).toBe('NEUTRAL');
    });

    it('Brutal Overlord Director is aggressive and pushes aggressively', () => {
      const getDS = brutalOverlord.monsterBehavior?.getDirectorState;
      expect(getDS).toBeDefined();
      expect(
        getDS!({
          hasDeadHero: false,
          partyHpPercentage: 0.7,
          aliveMonsterCount: 3,
        }),
      ).toBe('PUSH');
      expect(
        getDS!({
          hasDeadHero: true,
          partyHpPercentage: 0.5,
          aliveMonsterCount: 2,
        }),
      ).toBe('PUSH');
      expect(
        getDS!({
          hasDeadHero: true,
          partyHpPercentage: 0.2,
          aliveMonsterCount: 3,
        }),
      ).toBe('EASE');
    });

    it('Brutal Overlord boosts aggressive behavior weight by 1.1x', () => {
      const calcWeight =
        brutalOverlord.monsterBehavior?.calculateBehaviorWeight;
      expect(calcWeight).toBeDefined();

      const aggressiveBehavior = {
        name: 'Strike',
        slots: ['melee', 'melee'] as ['melee', 'melee'],
        tags: ['aggressive'] as ['aggressive'],
        isEligible: () => true,
        getBaseWeight: () => 10,
      };

      const defensiveBehavior = {
        name: 'Retreat',
        slots: ['move_away', 'hold'] as ['move_away', 'hold'],
        tags: ['defensive'] as ['defensive'],
        isEligible: () => true,
        getBaseWeight: () => 10,
      };

      const weightAgg = calcWeight!(aggressiveBehavior, {} as never, 10);
      const weightDef = calcWeight!(defensiveBehavior, {} as never, 10);

      expect(weightAgg).toBe(11);
      expect(weightDef).toBe(10);
    });
  });

  describe('Game Master Lifecycle Hooks & State Persistence', () => {
    it('initializes gameMasterState via initialState and invokes onGameInit and onHeroTurnStart in init()', async () => {
      const { init } = await import('../game');
      gameMasters['customLifecycleGM'] = {
        id: 'customLifecycleGM',
        nameTranslationKey: 'custom',
        initialState: () => ({ threatLevel: 5, logs: [] }),
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        onGameInit: (state) => {
          (state.gameMasterState as { threatLevel: number }).threatLevel += 1;
        },
        onHeroTurnStart: (hero, state) => {
          (state.gameMasterState as { logs: string[] }).logs.push(
            `turn-${hero.name}`,
          );
        },
      };

      const state = init('iceDragonTreasure', 'customLifecycleGM');
      expect(state.gameMasterState).toBeDefined();
      expect(
        (state.gameMasterState as { threatLevel: number }).threatLevel,
      ).toBe(6);
      expect((state.gameMasterState as { logs: string[] }).logs).toContain(
        `turn-${state.heroes[0].name}`,
      );
    });

    it('invokes onRoundStart, onHeroPhaseEnd, and onMonsterPhaseEnd during next() loop', async () => {
      const { init, next } = await import('../game');
      const roundStarts: number[] = [];
      let heroPhaseEnded = false;
      let monsterPhaseEnded = false;
      gameMasters['turnFlowGM'] = {
        id: 'turnFlowGM',
        nameTranslationKey: 'turnFlow',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        onRoundStart: (round) => {
          roundStarts.push(round);
        },
        onHeroPhaseEnd: () => {
          heroPhaseEnded = true;
        },
        onMonsterPhaseEnd: () => {
          monsterPhaseEnded = true;
        },
      };
      const state = init('iceDragonTreasure', 'turnFlowGM');

      // End turns for each live hero once to cycle round
      const heroCount = state.heroes.length;
      for (let i = 0; i < heroCount; i++) {
        await next(state);
      }

      expect(heroPhaseEnded).toBe(true);
      expect(monsterPhaseEnded).toBe(true);
      expect(roundStarts.length).toBeGreaterThan(0);
    });

    it('invokes onPartyDefeat when all heroes die or level resets', async () => {
      const { init, resetLevel } = await import('../game');
      let defeatCalled = false;
      gameMasters['defeatGM'] = {
        id: 'defeatGM',
        nameTranslationKey: 'defeat',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        onPartyDefeat: () => {
          defeatCalled = true;
        },
      };
      const state = init('iceDragonTreasure', 'defeatGM');
      resetLevel(state);

      expect(defeatCalled).toBe(true);
    });

    it('invokes onDungeonComplete when dungeon win conditions are beaten', async () => {
      const { init, next } = await import('../game');
      let dungeonCompleteCalled = false;
      gameMasters['completeGM'] = {
        id: 'completeGM',
        nameTranslationKey: 'complete',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        onDungeonComplete: () => {
          dungeonCompleteCalled = true;
        },
      };
      const state = init('iceDragonTreasure', 'completeGM');
      state.dungeon.layout.monsters.forEach((m) => (m.health = 0));

      await next(state);
      expect(dungeonCompleteCalled).toBe(true);
    });
  });

  describe('Game Master Combat and Search Rules', () => {
    it('applies modifySearchRoll and onSearchFailed hooks', async () => {
      const { searchForSecret } = await import('../secrets/SecretsLogic');
      let searchFailedHero: string | undefined;

      const customGM: import('../types').GameMaster = {
        id: 'searchRulesGM',
        nameTranslationKey: 'searchRules',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        modifySearchRoll: (baseRoll) => baseRoll + 10,
        onSearchFailed: (hero) => {
          searchFailedHero = hero.name;
        },
      };

      const hero = {
        name: 'Tester',
        level: 1,
        inventory: [],
        position: { x: 0, y: 0 },
      } as unknown as import('../types').Hero;

      const state = {
        heroes: [hero],
        currentActor: hero,
        gameMaster: customGM,
        dungeon: {
          layout: {
            grid: [],
            secrets: [],
            doors: [],
            monsters: [],
            interactables: [],
          },
        },
        actionLog: [],
      } as unknown as import('../types').GameState;

      searchForSecret(state);
      expect(searchFailedHero).toBe('Tester');
    });

    it('applies modifyHeroDamageDealt, modifyMonsterDamageDealt, and onHeroDowned', async () => {
      const { takeDamage } = await import('../core/combat');
      let downedHero: string | undefined;

      const customGM: import('../types').GameMaster = {
        id: 'combatRulesGM',
        nameTranslationKey: 'combatRules',
        modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
        modifyHeroDamageDealt: (damage) => damage + 3,
        modifyMonsterDamageDealt: (damage) => damage + 5,
        onHeroDowned: (hero) => {
          downedHero = hero.name;
        },
      };

      const hero = {
        name: 'HeroOne',
        level: 1,
        health: 2,
        defense: 0,
        position: { x: 1, y: 1 },
        inventory: [],
        weapon: { dice: 3, range: 1, ignoresArmour: true, ignoresShield: true },
      } as unknown as import('../types').Hero;

      const monster = {
        name: 'Goblin',
        level: 1,
        health: 10,
        defense: 0,
        position: { x: 1, y: 2 },
        inventory: [],
        weapon: { dice: 2, range: 1, ignoresArmour: true, ignoresShield: true },
      } as unknown as import('../types').Monster;

      const state = {
        heroes: [hero],
        currentActor: hero,
        gameMaster: customGM,
        actionLog: [],
        damageIndicators: [],
        bloodSplatters: [],
      } as unknown as import('../types').GameState;

      // Monster attacks Hero (should apply modifyMonsterDamageDealt and trigger onHeroDowned)
      takeDamage(state, monster, hero, false);
      expect(hero.health).toBe(0);
      expect(downedHero).toBe('HeroOne');

      // Hero attacks Monster (modifyHeroDamageDealt should be active)
      takeDamage(state, hero, monster, false);
      expect(monster.health).toBeLessThan(10);
    });
  });
});
