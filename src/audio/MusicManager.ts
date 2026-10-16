const DEFAULT_TRACK =
  "/music/Lost in The Forest - Silence Unbroken I & II - 01 An Old Wizard's Promise.mp3";

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private volume = 0.5;
  private isMuted = false;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Unlock audio on first user gesture to comply with browser autoplay policies
      const unlock = () => {
        this.isUnlocked = true;
        if (this.audio && this.audio.paused) {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          this.audio.play().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };

      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
  }

  public playDungeonMusic(dungeonTrack?: string) {
    const targetTrack = dungeonTrack || DEFAULT_TRACK;
    if (this.currentTrack === targetTrack) {
      return; // Already playing this track
    }

    this.playTrack(targetTrack);
  }

  private playTrack(trackPath: string) {
    this.currentTrack = trackPath;

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.audio = new Audio(trackPath);
    this.audio.loop = true;
    this.audio.volume = this.isMuted ? 0 : this.volume;

    if (this.isUnlocked && !this.isMuted) {
      this.audio.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Audio playback failed or was blocked by browser:', err);
      });
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.currentTrack = null;
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.isMuted) {
      this.audio.volume = this.volume;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
      if (muted) {
        this.audio.pause();
      } else if (this.isUnlocked && this.audio.paused) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.audio.play().catch(() => {});
      }
    }
  }
}

export const musicManager = new MusicManager();
