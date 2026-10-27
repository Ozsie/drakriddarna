import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { CROSSFADE_TICK_MS, MusicManager } from './MusicManager';

type MockAudio = {
  play: Mock;
  pause: Mock;
  volume: number;
  currentTime: number;
  loop: boolean;
  paused: boolean;
};

describe('MusicManager', () => {
  let audioInstances: MockAudio[];

  const lastAudio = (): MockAudio => audioInstances[audioInstances.length - 1];

  const advanceCrossfade = () => vi.advanceTimersByTime(1500);

  beforeEach(() => {
    vi.useFakeTimers();
    audioInstances = [];
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => {
        const audio: MockAudio = {
          play: vi.fn(),
          pause: vi.fn(),
          volume: 1,
          currentTime: 0,
          loop: false,
          paused: true,
        };
        audio.play.mockImplementation(() => {
          audio.paused = false;
          return Promise.resolve();
        });
        audio.pause.mockImplementation(() => {
          audio.paused = true;
        });
        audioInstances.push(audio);
        return audio;
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('plays the default explore track and fades it in', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();

    expect(audioInstances).toHaveLength(1);
    const explore = lastAudio();
    expect(Audio).toHaveBeenCalledWith('/music/explore.mp3');
    expect(explore.loop).toBe(true);
    expect(explore.play).toHaveBeenCalled();
    expect(explore.volume).toBe(0);

    advanceCrossfade();
    expect(explore.volume).toBeCloseTo(0.5);
  });

  it('does not play before the first user gesture unlocks audio', () => {
    const manager = new MusicManager();
    manager.playDungeonMusic();

    const explore = lastAudio();
    expect(explore.play).not.toHaveBeenCalled();

    manager.unlock();
    expect(explore.play).toHaveBeenCalled();
  });

  it('crossfades to the default tension track and back', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.setIntensity('tension');
    expect(manager.getIntensity()).toBe('tension');
    expect(Audio).toHaveBeenLastCalledWith('/music/tension.mp3');
    const tension = lastAudio();
    expect(tension.play).toHaveBeenCalled();

    vi.advanceTimersByTime(750);
    expect(tension.volume).toBeCloseTo(0.25);
    expect(explore.volume).toBeCloseTo(0.25);

    advanceCrossfade();
    expect(tension.volume).toBeCloseTo(0.5);
    expect(explore.volume).toBeCloseTo(0);
    expect(explore.pause).toHaveBeenCalled();
    expect(explore.currentTime).toBe(0);

    manager.setIntensity('explore');
    expect(manager.getIntensity()).toBe('explore');
    expect(Audio).toHaveBeenLastCalledWith('/music/explore.mp3');
  });

  it('uses the tension track defined by the dungeon', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic('/music/dungeon-x.mp3', '/music/dungeon-t.mp3');
    advanceCrossfade();

    manager.setIntensity('tension');
    expect(Audio).toHaveBeenLastCalledWith('/music/dungeon-t.mp3');

    manager.setIntensity('explore');
    expect(Audio).toHaveBeenLastCalledWith('/music/dungeon-x.mp3');
  });

  it('does not restart when the dungeon tracks are unchanged', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    manager.setIntensity('tension');
    advanceCrossfade();

    manager.playDungeonMusic();
    expect(audioInstances).toHaveLength(2);
    expect(manager.getIntensity()).toBe('tension');
  });

  it('does not switch tracks when the intensity is unchanged', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();

    manager.setIntensity('explore');
    manager.setIntensity('explore');
    expect(audioInstances).toHaveLength(1);
  });

  it('does nothing before dungeon tracks are registered', () => {
    const manager = new MusicManager();
    manager.setIntensity('tension');
    expect(audioInstances).toHaveLength(0);
    expect(manager.getIntensity()).toBe('explore');
  });

  it('stops the music and clears the registered tracks', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.stop();
    expect(explore.pause).toHaveBeenCalled();
    expect(manager.getIntensity()).toBe('explore');

    manager.setIntensity('tension');
    expect(audioInstances).toHaveLength(1);
  });

  it('mutes by pausing and silencing the current track', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.setMuted(true);
    expect(explore.volume).toBe(0);
    expect(explore.pause).toHaveBeenCalled();

    manager.setMuted(false);
    expect(explore.volume).toBeCloseTo(0.5);
    expect(explore.play).toHaveBeenCalled();
  });

  it('pauses the outgoing track when muted mid-crossfade', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.setIntensity('tension');
    const tension = lastAudio();
    manager.setMuted(true);

    expect(explore.pause).toHaveBeenCalled();
    expect(tension.pause).toHaveBeenCalled();
  });

  it('silences the outgoing track immediately when the volume is set to 0 mid-crossfade', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.setIntensity('tension');
    const tension = lastAudio();
    // Partway through the crossfade, the outgoing track is fading down.
    vi.advanceTimersByTime(500);
    expect(explore.volume).toBeGreaterThan(0);
    expect(explore.volume).toBeLessThan(0.5);

    // setVolume(0) must silence it on the next fade tick, not continue
    // fading from the captured volume.
    manager.setVolume(0);
    vi.advanceTimersByTime(CROSSFADE_TICK_MS);
    expect(explore.volume).toBe(0);
    // The incoming track follows the new setting too.
    expect(tension.volume).toBe(0);
  });

  it('keeps the outgoing fade progression when the volume setting rises mid-crossfade', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();
    const explore = lastAudio();

    manager.setIntensity('tension');
    vi.advanceTimersByTime(500);
    const midFadeVolume = explore.volume;

    // Raising the setting must not jump the outgoing track louder than
    // the level its fade progression reached.
    manager.setVolume(1);
    vi.advanceTimersByTime(CROSSFADE_TICK_MS);
    expect(explore.volume).toBeLessThanOrEqual(midFadeVolume);
  });

  it('clamps the volume between 0 and 1', () => {
    const manager = new MusicManager();
    manager.unlock();
    manager.playDungeonMusic();
    advanceCrossfade();

    manager.setVolume(1.5);
    expect(lastAudio().volume).toBe(1);
    manager.setVolume(-0.5);
    expect(lastAudio().volume).toBe(0);
  });
});
