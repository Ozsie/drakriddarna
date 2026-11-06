import type { GameState, SoundCue } from '../types';

// Logic's side of the audio inversion (docs/engine-packages.md): logic
// modules never import the soundEffectManager facade. They append cue
// data to the state with this helper, and the game's sound-cue adapter
// (src/audio/SoundCueAdapter.ts) drains the queue on publish and maps
// each cue to a sample.
export const emitSoundCue = (state: GameState, cue: SoundCue): void => {
  if (!state.soundCues) {
    state.soundCues = [];
  }
  state.soundCues.push(cue);
};
