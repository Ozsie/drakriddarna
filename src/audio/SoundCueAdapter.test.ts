import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Actor, GameState, SoundCue } from '../types';
import { SoundEffectManager, soundEffectManager } from './SoundEffectManager';
import { drainSoundCues, playSoundCues } from './SoundCueAdapter';

// The adapter is the game's cue→sample mapper: every cue kind routes to
// the facade method that owns the sample. If a new cue kind is added to
// the SoundCue union, the switch becomes non-exhaustive for TypeScript,
// and this test fails until the mapping is added.
describe('SoundCueAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps every cue kind to its facade method', () => {
    const manager = new SoundEffectManager();
    const actor = { name: 'Actor' } as Actor;
    const payloadCues: SoundCue[] = [
      { cue: 'actorWalk', actor },
      { cue: 'actorHurt', actor },
      { cue: 'actorDeath', actor },
      { cue: 'weaponAttack', weapon: undefined },
      { cue: 'shieldBlock', shield: undefined },
      { cue: 'itemUse', item: undefined },
      { cue: 'interact', interactable: undefined },
      { cue: 'eventSound', event: undefined },
      { cue: 'search', searchResult: 2 },
    ];
    const fixedCues: SoundCue[] = [
      { cue: 'doorOpen' },
      { cue: 'unlock' },
      { cue: 'locked' },
      { cue: 'miss' },
      { cue: 'criticalHit' },
      { cue: 'dropItem' },
      { cue: 'pickUpItem' },
      { cue: 'shuffle' },
      { cue: 'fireBall' },
      { cue: 'diaryAdd' },
      { cue: 'paralyze' },
      { cue: 'levelUp' },
    ];

    const spies = {
      playActorWalk: vi.spyOn(manager, 'playActorWalk'),
      playActorHurt: vi.spyOn(manager, 'playActorHurt'),
      playActorDeath: vi.spyOn(manager, 'playActorDeath'),
      playWeaponAttack: vi.spyOn(manager, 'playWeaponAttack'),
      playShieldBlockSound: vi.spyOn(manager, 'playShieldBlockSound'),
      playItemUse: vi.spyOn(manager, 'playItemUse'),
      playInteractSound: vi.spyOn(manager, 'playInteractSound'),
      playEventSound: vi.spyOn(manager, 'playEventSound'),
      playSearch: vi.spyOn(manager, 'playSearch'),
      playDoorOpen: vi.spyOn(manager, 'playDoorOpen'),
      playUnlock: vi.spyOn(manager, 'playUnlock'),
      playLocked: vi.spyOn(manager, 'playLocked'),
      playMiss: vi.spyOn(manager, 'playMiss'),
      playCriticalHit: vi.spyOn(manager, 'playCriticalHit'),
      playDropItem: vi.spyOn(manager, 'playDropItem'),
      playPickUpItem: vi.spyOn(manager, 'playPickUpItem'),
      playShuffle: vi.spyOn(manager, 'playShuffle'),
      playFireBall: vi.spyOn(manager, 'playFireBall'),
      playDiaryAdd: vi.spyOn(manager, 'playDiaryAdd'),
      playParalyze: vi.spyOn(manager, 'playParalyze'),
      playLevelUp: vi.spyOn(manager, 'playLevelUp'),
    };

    playSoundCues(manager, [...payloadCues, ...fixedCues]);

    expect(spies.playActorWalk).toHaveBeenCalledWith(actor);
    expect(spies.playActorHurt).toHaveBeenCalledWith(actor);
    expect(spies.playActorDeath).toHaveBeenCalledWith(actor);
    expect(spies.playWeaponAttack).toHaveBeenCalledWith(undefined);
    expect(spies.playShieldBlockSound).toHaveBeenCalledWith(undefined);
    expect(spies.playItemUse).toHaveBeenCalledWith(undefined);
    expect(spies.playInteractSound).toHaveBeenCalledWith(undefined);
    expect(spies.playEventSound).toHaveBeenCalledWith(undefined);
    expect(spies.playSearch).toHaveBeenCalledWith(2);
    for (const spy of [
      spies.playDoorOpen,
      spies.playUnlock,
      spies.playLocked,
      spies.playMiss,
      spies.playCriticalHit,
      spies.playDropItem,
      spies.playPickUpItem,
      spies.playShuffle,
      spies.playFireBall,
      spies.playDiaryAdd,
      spies.playParalyze,
      spies.playLevelUp,
    ]) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('drains the cue queue in emission order and clears it in place', () => {
    const state = { soundCues: [{ cue: 'miss' }] } as GameState;
    const playMiss = vi
      .spyOn(soundEffectManager, 'playMiss')
      .mockImplementation(() => null);
    const playCriticalHit = vi
      .spyOn(soundEffectManager, 'playCriticalHit')
      .mockImplementation(() => null);

    drainSoundCues(state);
    expect(playMiss).toHaveBeenCalledTimes(1);
    expect(state.soundCues).toEqual([]);

    // Draining again replays nothing: the queue was cleared.
    drainSoundCues(state);
    expect(playMiss).toHaveBeenCalledTimes(1);

    // In-place clearing: a published envelope sharing the live state's
    // cue array is drained too (the store's set() copies the envelope
    // top level only).
    (state.soundCues as SoundCue[]).push({ cue: 'criticalHit' });
    const envelope = { ...state };
    drainSoundCues(envelope);
    expect(playCriticalHit).toHaveBeenCalledTimes(1);
    expect(state.soundCues).toEqual([]);
  });
});
