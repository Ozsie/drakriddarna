import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { SoundEffectManager, soundEffectManager } from './SoundEffectManager';
import { takeDamage } from '../core';
import { recordActorStep, clearActorAnimations } from '../core';
import { createMonster } from '../dungeon/DungeonLogic';
import { registerMonsterTemplate } from '../monsters/MonsterRegistry';
import { Colour, ItemType, Level } from '../types';
import type { Actor, GameState, Weapon } from '../types';

describe('SoundEffectManager', () => {
  let playSpy: Mock;
  let pauseSpy: Mock;
  let mockAudioInstance: {
    play: Mock;
    pause: Mock;
    volume: number;
    currentTime: number;
    addEventListener: Mock;
    removeEventListener: Mock;
  };

  beforeEach(() => {
    playSpy = vi.fn().mockImplementation(() => Promise.resolve());
    pauseSpy = vi.fn();
    mockAudioInstance = {
      play: playSpy,
      pause: pauseSpy,
      volume: 1,
      currentTime: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock global Audio
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => mockAudioInstance),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    soundEffectManager.setMuted(false);
    soundEffectManager.setVolume(0.5);
  });

  it('initializes with default volume and not muted', () => {
    const manager = new SoundEffectManager();
    expect(manager.getVolume()).toBe(0.5);
    expect(manager.isSoundMuted()).toBe(false);
  });

  it('updates volume clamped between 0 and 1', () => {
    const manager = new SoundEffectManager();
    manager.setVolume(0.8);
    expect(manager.getVolume()).toBe(0.8);
    manager.setVolume(1.5);
    expect(manager.getVolume()).toBe(1);
    manager.setVolume(-0.5);
    expect(manager.getVolume()).toBe(0);
  });

  it('updates muted state', () => {
    const manager = new SoundEffectManager();
    manager.setMuted(true);
    expect(manager.isSoundMuted()).toBe(true);
    manager.setMuted(false);
    expect(manager.isSoundMuted()).toBe(false);
  });

  it('plays sound file when unmuted', () => {
    const manager = new SoundEffectManager();
    const audio = manager.playSound('/sounds/sword_slash.mp3');

    expect(Audio).toHaveBeenCalledWith('/sounds/sword_slash.mp3');
    expect(playSpy).toHaveBeenCalled();
    expect(audio).toBeDefined();
  });

  it('does not call play() when muted', () => {
    const manager = new SoundEffectManager();
    manager.setMuted(true);
    manager.playSound('/sounds/sword_slash.mp3');

    expect(Audio).toHaveBeenCalledWith('/sounds/sword_slash.mp3');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('returns null if sound path is empty or undefined', () => {
    const manager = new SoundEffectManager();
    expect(manager.playSound('')).toBeNull();
    expect(manager.playSound(undefined)).toBeNull();
    expect(manager.playSound(null)).toBeNull();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('stops active sounds on stop() / stopAll()', () => {
    const manager = new SoundEffectManager();
    manager.playSound('/sounds/test.mp3');
    manager.stop();
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('playWeaponAttack, playActorWalk, playActorHurt, playActorDeath trigger sound playback', () => {
    const playSoundSpy = vi.spyOn(soundEffectManager, 'playSound');

    const weapon: Weapon = {
      name: 'Mace',
      attackSound: '/sounds/mace.mp3',
      dice: 3,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      amountInDeck: 1,
      type: ItemType.WEAPON,
      value: 10,
      ignoresShield: false,
      ignoresArmour: false,
    };

    const actor: Actor = {
      name: 'Orc',
      walkSound: '/sounds/orc_walk.mp3',
      hurtSound: '/sounds/orc_hurt.mp3',
      deathSound: '/sounds/orc_death.mp3',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 2,
      maxHealth: 2,
      colour: Colour.Green,
      experience: 1,
      position: { x: 1, y: 1 },
      level: Level.APPRENTICE,
      weapon,
      inventory: [],
    };

    soundEffectManager.playWeaponAttack(weapon);
    expect(playSoundSpy).toHaveBeenCalledWith('/sounds/mace.mp3');

    soundEffectManager.playActorWalk(actor);
    expect(playSoundSpy).toHaveBeenCalledWith('/sounds/orc_walk.mp3');

    soundEffectManager.playActorHurt(actor);
    expect(playSoundSpy).toHaveBeenCalledWith('/sounds/orc_hurt.mp3');

    soundEffectManager.playActorDeath(actor);
    expect(playSoundSpy).toHaveBeenCalledWith('/sounds/orc_death.mp3');
  });
});

describe('Sound system integration with gameplay events', () => {
  let playWeaponAttackSpy: Mock;
  let playActorWalkSpy: Mock;
  let playActorHurtSpy: Mock;
  let playActorDeathSpy: Mock;

  beforeEach(() => {
    playWeaponAttackSpy = vi.spyOn(
      soundEffectManager,
      'playWeaponAttack',
    ) as unknown as Mock;
    playActorWalkSpy = vi.spyOn(
      soundEffectManager,
      'playActorWalk',
    ) as unknown as Mock;
    playActorHurtSpy = vi.spyOn(
      soundEffectManager,
      'playActorHurt',
    ) as unknown as Mock;
    playActorDeathSpy = vi.spyOn(
      soundEffectManager,
      'playActorDeath',
    ) as unknown as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearActorAnimations();
  });

  const createTestState = (): GameState => ({
    heroes: [],
    dungeon: {
      name: 'Test',
      intro: '',
      layout: {
        grid: [],
        corridors: [],
        doors: [],
        items: [],
        monsters: [],
        notes: [],
        pillars: [],
        pits: [],
        secrets: [],
        corners: [],
      },
      startingPositions: [],
      discoveredRooms: [],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: false,
  });

  it('takeDamage plays weapon attack sound and target hurt sound when target survives', () => {
    const state = createTestState();
    const attackerWeapon: Weapon = {
      name: 'Sword',
      attackSound: '/sounds/sword_attack.mp3',
      dice: 10,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      amountInDeck: 1,
      type: ItemType.WEAPON,
      value: 10,
      ignoresShield: false,
      ignoresArmour: false,
    };

    const attacker: Actor = {
      name: 'Hero',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 10,
      maxHealth: 10,
      colour: Colour.Red,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.MASTER,
      weapon: attackerWeapon,
      inventory: [],
    };

    const defender: Actor = {
      name: 'Troll',
      hurtSound: '/sounds/troll_hurt.mp3',
      deathSound: '/sounds/troll_death.mp3',
      actions: 2,
      movement: 2,
      maxMovement: 2,
      defense: 0,
      health: 10,
      maxHealth: 10,
      colour: Colour.Green,
      experience: 2,
      position: { x: 1, y: 0 },
      level: Level.APPRENTICE,
      weapon: attackerWeapon,
      inventory: [],
    };

    state.heroes = [attacker];

    takeDamage(state, attacker, defender, false);

    expect(playWeaponAttackSpy).toHaveBeenCalledWith(attackerWeapon);
    expect(defender.health).toBeLessThan(10);
    expect(defender.health).toBeGreaterThan(0);
    expect(playActorHurtSpy).toHaveBeenCalledWith(defender);
    expect(playActorDeathSpy).not.toHaveBeenCalled();
  });

  it('takeDamage plays weapon attack sound and target death sound when target dies', () => {
    const state = createTestState();
    const attackerWeapon: Weapon = {
      name: 'Sword',
      attackSound: '/sounds/sword_attack.mp3',
      dice: 10,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      amountInDeck: 1,
      type: ItemType.WEAPON,
      value: 10,
      ignoresShield: false,
      ignoresArmour: false,
    };

    const attacker: Actor = {
      name: 'Hero',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 10,
      maxHealth: 10,
      colour: Colour.Red,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.MASTER,
      weapon: attackerWeapon,
      inventory: [],
    };

    const defender: Actor = {
      name: 'Orc',
      hurtSound: '/sounds/orc_hurt.mp3',
      deathSound: '/sounds/orc_death.mp3',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 1,
      maxHealth: 1,
      colour: Colour.Green,
      experience: 1,
      position: { x: 1, y: 0 },
      level: Level.APPRENTICE,
      weapon: attackerWeapon,
      inventory: [],
    };

    state.heroes = [attacker];

    takeDamage(state, attacker, defender, false);

    expect(playWeaponAttackSpy).toHaveBeenCalledWith(attackerWeapon);
    expect(defender.health).toBe(0);
    expect(playActorDeathSpy).toHaveBeenCalledWith(defender);
  });

  it('recordActorStep plays walk sound when actor moves to a new position', () => {
    const actor: Actor = {
      name: 'Hero',
      walkSound: '/sounds/footstep.mp3',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 10,
      maxHealth: 10,
      colour: Colour.Red,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Sword',
        dice: 3,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        amountInDeck: 1,
        type: ItemType.WEAPON,
        value: 10,
        ignoresShield: false,
        ignoresArmour: false,
      },
      inventory: [],
    };

    recordActorStep(actor, { x: 1, y: 0 });
    expect(playActorWalkSpy).toHaveBeenCalledWith(actor);

    playActorWalkSpy.mockClear();
    // Same position step should not trigger walk sound
    recordActorStep(actor, { x: 1, y: 0 });
    expect(playActorWalkSpy).not.toHaveBeenCalled();
  });

  it('monster templates support walkSound, hurtSound, and deathSound overrides', () => {
    registerMonsterTemplate('SoundMonster', {
      walkSound: '/sounds/monster_walk.mp3',
      hurtSound: '/sounds/monster_hurt.mp3',
      deathSound: '/sounds/monster_death.mp3',
    });

    const monster = createMonster('SoundMonster', Colour.Red, 2, 3);
    expect(monster.walkSound).toBe('/sounds/monster_walk.mp3');
    expect(monster.hurtSound).toBe('/sounds/monster_hurt.mp3');
    expect(monster.deathSound).toBe('/sounds/monster_death.mp3');
  });
});
