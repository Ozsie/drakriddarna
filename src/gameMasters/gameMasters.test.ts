import { describe, it, expect } from 'vitest';
import {
  gameMasters,
  getGameMaster,
  isKnownGameMaster,
  DEFAULT_GAME_MASTER_ID,
} from './index';
import storyTeller from './storyTeller/gameMaster';
import tactician from './tactician/gameMaster';
import brutalOverlord from './brutalOverlord/gameMaster';
import { shields } from '../items/shields';
import { weapons } from '../items/weapons';
import {
  DifficultLevels,
  getDifficulty,
  getEventMinSpawnDistance,
  getEarliestMonsterEventRound,
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
        attack: 1,
        defense: 0,
        movement: 1,
        search: 2,
        health: 0,
      });
      expect(storyTeller.monsterBehavior?.bowForgottenChance).toBe(0.25);
      expect(storyTeller.events?.minMonsterSpawnDistance).toBe(4);
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
        movement: -1,
        search: 0,
        health: -1,
      });
      expect(brutalOverlord.monsterBehavior?.bowForgottenChance).toBe(0);
      expect(brutalOverlord.events?.minMonsterSpawnDistance).toBe(1);
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

    it('getDifficulty resolves gameMaster or difficulty from state or default', () => {
      expect(getDifficulty(undefined)).toBe(tactician);
      expect(getDifficulty({ difficulty: storyTeller } as never)).toBe(
        storyTeller,
      );
      expect(getDifficulty({ gameMaster: brutalOverlord } as never)).toBe(
        brutalOverlord,
      );
    });

    it('getEventMinSpawnDistance returns appropriate distances for all GM IDs', () => {
      expect(getEventMinSpawnDistance('storyTeller')).toBe(4);
      expect(getEventMinSpawnDistance('easy')).toBe(4);
      expect(getEventMinSpawnDistance('tactician')).toBe(3);
      expect(getEventMinSpawnDistance('normal')).toBe(3);
      expect(getEventMinSpawnDistance('brutalOverlord')).toBe(1);
      expect(getEventMinSpawnDistance('hard')).toBe(1);
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
    it('Storyteller Director eases when party HP is < 50% or hero is dead', () => {
      const getDS = storyTeller.monsterBehavior?.getDirectorState;
      expect(getDS).toBeDefined();
      expect(
        getDS!({
          hasDeadHero: false,
          partyHpPercentage: 0.48,
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

    it('Brutal Overlord boosts aggressive behavior weight by 1.25x', () => {
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

      expect(weightAgg).toBe(12.5);
      expect(weightDef).toBe(10);
    });
  });
});
