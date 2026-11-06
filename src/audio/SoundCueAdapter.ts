// Game side of the sound-cue inversion (docs/engine-packages.md): logic
// modules never import the soundEffectManager facade — they append cue
// data to the state, and this adapter drains the queue and maps each cue
// to a sample through the facade, whose play* methods are the game's cue
// table (which game event plays which sample).

import type { GameState, SoundCue } from '../types';
import {
  type SoundEffectManager,
  soundEffectManager,
} from './SoundEffectManager';

const playSoundCue = (manager: SoundEffectManager, cue: SoundCue): void => {
  switch (cue.cue) {
    case 'actorWalk':
      manager.playActorWalk(cue.actor);
      return;
    case 'actorHurt':
      manager.playActorHurt(cue.actor);
      return;
    case 'actorDeath':
      manager.playActorDeath(cue.actor);
      return;
    case 'weaponAttack':
      manager.playWeaponAttack(cue.weapon);
      return;
    case 'shieldBlock':
      manager.playShieldBlockSound(cue.shield);
      return;
    case 'itemUse':
      manager.playItemUse(cue.item);
      return;
    case 'interact':
      manager.playInteractSound(cue.interactable);
      return;
    case 'eventSound':
      manager.playEventSound(cue.event);
      return;
    case 'search':
      manager.playSearch(cue.searchResult);
      return;
    case 'doorOpen':
      manager.playDoorOpen();
      return;
    case 'unlock':
      manager.playUnlock();
      return;
    case 'locked':
      manager.playLocked();
      return;
    case 'miss':
      manager.playMiss();
      return;
    case 'criticalHit':
      manager.playCriticalHit();
      return;
    case 'dropItem':
      manager.playDropItem();
      return;
    case 'pickUpItem':
      manager.playPickUpItem();
      return;
    case 'shuffle':
      manager.playShuffle();
      return;
    case 'fireBall':
      manager.playFireBall();
      return;
    case 'diaryAdd':
      manager.playDiaryAdd();
      return;
    case 'paralyze':
      manager.playParalyze();
      return;
    case 'levelUp':
      manager.playLevelUp();
      return;
  }
};

export const playSoundCues = (
  manager: SoundEffectManager,
  cues: SoundCue[],
): void => {
  for (const cue of cues) {
    playSoundCue(manager, cue);
  }
};

// Drains the state's cue queue in emission order. The queue is cleared in
// place (not reassigned): the store publishes a fresh top-level envelope
// whose nested `soundCues` array is shared with the live state object,
// so an in-place clear keeps already-held references drained too and
// prevents replays on the next publish.
export const drainSoundCues = (state: GameState): void => {
  const cues = state.soundCues;
  if (!cues || cues.length === 0) {
    return;
  }
  const batch = cues.slice();
  cues.length = 0;
  playSoundCues(soundEffectManager, batch);
};
