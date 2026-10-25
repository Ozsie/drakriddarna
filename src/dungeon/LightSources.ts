import type { DeclarativeLightOptions } from './dungeonParser';

export const brazier: DeclarativeLightOptions = {
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
