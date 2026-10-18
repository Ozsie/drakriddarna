import type { Actor, Item, Shield, TurnEvent, Weapon } from '../types';

export class SoundEffectManager {
  private volume = 0.5;
  private isMuted = false;
  private isUnlocked = false;
  private activeAudios: Set<HTMLAudioElement> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.isUnlocked = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };

      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
  }

  public playSound(soundPath?: string | null): HTMLAudioElement | null {
    if (!soundPath) {
      return null;
    }
    if (typeof window === 'undefined' && typeof Audio === 'undefined') {
      return null;
    }

    try {
      const audio = new Audio(soundPath);
      audio.volume = this.isMuted ? 0 : this.volume;
      this.activeAudios.add(audio);

      const cleanup = () => {
        this.activeAudios.delete(audio);
        audio.removeEventListener('ended', cleanup);
        audio.removeEventListener('pause', cleanup);
      };
      audio.addEventListener('ended', cleanup);
      audio.addEventListener('pause', cleanup);

      if (!this.isMuted) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        void audio.play().catch(() => {});
      }

      return audio;
    } catch {
      return null;
    }
  }

  public playDoorOpen(): HTMLAudioElement | null {
    return this.playSound('sfx/door_open.mp3');
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

  public playDropItem(): HTMLAudioElement | null {
    return this.playSound('sfx/drop.mp3');
  }

  public playPickUpItem(): HTMLAudioElement | null {
    return this.playSound('sfx/pick_up.mp3');
  }

  public playShuffle(): HTMLAudioElement | null {
    return this.playSound('sfx/shuffle.mp3');
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const audio of this.activeAudios) {
      if (!this.isMuted) {
        audio.volume = this.volume;
      }
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    for (const audio of this.activeAudios) {
      audio.volume = muted ? 0 : this.volume;
      if (muted) {
        audio.pause();
      }
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public stop(): void {
    for (const audio of this.activeAudios) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore errors on stopping
      }
    }
    this.activeAudios.clear();
  }

  public stopAll(): void {
    this.stop();
  }
}

export const soundEffectManager = new SoundEffectManager();
