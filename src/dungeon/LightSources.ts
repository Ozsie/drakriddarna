import type { DeclarativeLightOptions } from './dungeonParser';
import { CellAlignment } from '../types.ts';

export const brazier: DeclarativeLightOptions = {
  sprite: {
    image: 'decorators/pixor-library-brazier-standing-selout-64px-8-sides.png',
    x: 0,
    y: 0,
    size: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    frameRate: 6,
    scale: 0.6,
    alignmentOffsets: {
      [CellAlignment.TOP_RIGHT]: { x: 6, y: -14 },
      [CellAlignment.BOTTOM_RIGHT]: { x: 8, y: 4 },
      [CellAlignment.CENTER_RIGHT]: { x: 8, y: -8 },
      [CellAlignment.CENTER_BOTTOM]: { x: 0, y: 4 },
      [CellAlignment.BOTTOM_LEFT]: { x: -8, y: 4 },
      [CellAlignment.CENTER_LEFT]: { x: -8, y: -8 },
      [CellAlignment.TOP_LEFT]: { x: -8, y: -14 },
      [CellAlignment.CENTER_TOP]: { x: 0, y: -14 },
      [CellAlignment.CENTER]: { x: 0, y: -8 },
    },
  },
  color: '#c29042',
  radius: 3,
  intensity: 0.5,
  softness: 0.7,
  effect: 'flicker',
};

export const chandelier: DeclarativeLightOptions = {
  color: '#f5dfc2',
  radius: 4,
  intensity: 0.3,
  softness: 0.7,
  effect: 'sway',
  rate: 0.2,
};

export const torch: DeclarativeLightOptions = {
  sprite: {
    image: 'decorators/Torch Animated.png',
    x: 0,
    y: 0,
    size: 64,
    scale: 0.75,
    frameCount: 8,
    frameRate: 8,
    alignmentOffsets: {
      [CellAlignment.TOP_RIGHT]: { x: 6, y: -34 },
      [CellAlignment.BOTTOM_RIGHT]: { x: 14, y: 6 },
      [CellAlignment.CENTER_RIGHT]: { x: 14, y: -12 },
      [CellAlignment.CENTER_BOTTOM]: { x: 0, y: 6 },
      [CellAlignment.BOTTOM_LEFT]: { x: -12, y: 6 },
      [CellAlignment.CENTER_LEFT]: { x: -12, y: -12 },
      [CellAlignment.TOP_LEFT]: { x: -12, y: -34 },
      [CellAlignment.CENTER_TOP]: { x: 0, y: -34 },
      [CellAlignment.CENTER]: { x: 0, y: -12 },
    },
  },
  color: '#e8963c',
  radius: 2,
  intensity: 0.45,
  softness: 0.5,
  effect: 'flicker',
  rate: 2,
};

// Deep-red torch used to hint at hidden doors and buried secrets.
export const ember: DeclarativeLightOptions = {
  color: '#dc572d',
  radius: 2,
  intensity: 0.45,
  softness: 0.5,
  effect: 'flicker',
  rate: 2,
};

// Cold variant of the brazier, e.g. for an ice dragon's lair.
export const iceBrazier: DeclarativeLightOptions = {
  color: '#a0ccff',
  radius: 3,
  intensity: 0.5,
  softness: 0.7,
  effect: 'flicker',
  rate: 1,
};

// Pale bioluminescent glow, e.g. for a mushroom grotto.
export const glow: DeclarativeLightOptions = {
  color: '#9fd8b8',
  radius: 1,
  intensity: 0.3,
  softness: 0.8,
  effect: 'flicker',
  rate: 0.5,
};

// Warm golden light, e.g. for a treasure-lit abyss.
export const goldenGlow: DeclarativeLightOptions = {
  color: '#f0c34e',
  radius: 3,
  intensity: 0.4,
  softness: 0.7,
  effect: 'flicker',
  rate: 0.5,
};
