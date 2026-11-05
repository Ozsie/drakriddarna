// Game side of the @hoard-engine/audio engine package
// (docs/engine-packages.md): the package owns sample playback and
// volume; which game event plays which sample is this cue table, which
// is game knowledge and stays here.

import { SoundEffectManager as EngineSoundEffectManager } from '@hoard-engine/audio';
import type {
  Actor,
  InteractableCell,
  Item,
  Shield,
  TurnEvent,
  Weapon,
} from '../types';

export class SoundEffectManager extends EngineSoundEffectManager {
  public playDoorOpen(): HTMLAudioElement | null {
    return this.playSound('sfx/door_open.mp3');
  }

  public playUnlock(): HTMLAudioElement | null {
    return this.playSound('sfx/unlock.mp3');
  }

  public playLocked(): HTMLAudioElement | null {
    return this.playSound('sfx/locked.mp3');
  }

  public playWeaponAttack(weapon?: Weapon | null): HTMLAudioElement | null {
    return this.playSound(weapon?.attackSound);
  }

  public playActorWalk(actor?: Actor | null): HTMLAudioElement | null {
    return this.playSound(actor?.walkSound);
  }

  public playActorHurt(actor?: Actor | null): HTMLAudioElement | null {
    return this.playSound(actor?.hurtSound);
  }

  public playActorDeath(actor?: Actor | null): HTMLAudioElement | null {
    return this.playSound(actor?.deathSound);
  }

  public playShieldBlockSound(shield?: Shield | null): HTMLAudioElement | null {
    return this.playSound(shield?.blockSound);
  }

  public playEventSound(event?: TurnEvent | null): HTMLAudioElement | null {
    this.playSound('sfx/draw_event.mp3');
    return this.playSound(event?.eventSound);
  }

  public playSearch(searchResult: number): HTMLAudioElement | null {
    if (searchResult < 1) {
      return this.playFailure();
    }
    return this.playSound('sfx/search.mp3');
  }

  public playMiss(): HTMLAudioElement | null {
    return this.playSound('sfx/miss.mp3');
  }

  public playFailure(): HTMLAudioElement | null {
    this.stop();
    return this.playSound('sfx/failure.mp3');
  }

  public playCriticalHit(): HTMLAudioElement | null {
    return this.playSound('sfx/critical_hit.mp3');
  }

  public playItemUse(item?: Item): HTMLAudioElement | null {
    return this.playSound(item?.useSound);
  }

  public playInteractSound(
    interactable?: InteractableCell,
  ): HTMLAudioElement | null {
    return this.playSound(interactable?.interactSound);
  }

  public playDropItem(): HTMLAudioElement | null {
    return this.playSound('sfx/drop.mp3');
  }

  public playPickUpItem(): HTMLAudioElement | null {
    return this.playSound('sfx/pick_up.mp3');
  }

  public playShuffle(): HTMLAudioElement | null {
    return this.playSound('sfx/shuffle.mp3');
  }

  public playFireBall(): HTMLAudioElement | null {
    return this.playSound('sfx/fireball.mp3');
  }

  public playDiaryAdd(): HTMLAudioElement | null {
    return this.playSound('sfx/diary_add.mp3');
  }

  public playParalyze(): HTMLAudioElement | null {
    return this.playSound('sfx/paralyze.mp3');
  }

  public playButtonClick(): HTMLAudioElement | null {
    return this.playSound('sfx/button.mp3');
  }

  public playLevelUp(): HTMLAudioElement | null {
    return this.playSound('sfx/level_up.mp3');
  }
}

export const soundEffectManager = new SoundEffectManager();
