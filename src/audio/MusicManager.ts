// Game side of the @hoard-engine/audio engine package
// (docs/engine-packages.md): the package owns the crossfade; the game
// injects the asset-resolved fallback tracks, replacing the direct
// `$app/paths` import the engine package must not have.

import { assetUrl } from '#lib/assets.js';
import {
  CROSSFADE_MS,
  CROSSFADE_TICK_MS,
  MusicManager as EngineMusicManager,
} from '@hoard-engine/audio';

export { CROSSFADE_MS, CROSSFADE_TICK_MS };

export class MusicManager extends EngineMusicManager {
  constructor() {
    super({
      defaultExploreTrack: assetUrl('music/explore.mp3'),
      defaultTensionTrack: assetUrl('music/tension.mp3'),
    });
  }
}

export const musicManager = new MusicManager();
