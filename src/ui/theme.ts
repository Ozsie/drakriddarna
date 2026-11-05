// Game-side theme composition. The default theme reproduces the
// pre-kit pixels exactly; the high-contrast theme is the first proof
// that the renderers are truly parameterized (M2): a second theme
// drops in without touching a single component. Overrides only touch
// tokens; everything else inherits the default.

import { resolveTheme } from '@hoard-engine/primitives';
import { Colour } from '../types';
import type { ActorColourKey } from '@hoard-engine/uikit';

export const highContrastTheme = resolveTheme({
  palette: {
    text: {
      bright: '#ffffff',
      strong: '#ffffff',
      body: '#ffffff',
      faint: '#e2e8f0',
      muted: '#cbd5e1',
      secondary: '#e2e8f0',
      panelHeader: '#ffffff',
      dimmed: '#94a3b8',
      dialogValue: '#ffffff',
    },
    surface: {
      panelDialog: '#000000',
      panelMenu: 'rgba(0, 0, 0, 0.92)',
      panelCorner: 'rgba(0, 0, 0, 0.92)',
      panelIntro: 'rgba(0, 0, 0, 0.92)',
      row: 'rgba(255, 255, 255, 0.08)',
      rowHover: 'rgba(255, 255, 255, 0.2)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.6)',
      hairline: 'rgba(255, 255, 255, 0.5)',
      row: 'rgba(255, 255, 255, 0.5)',
      rowHover: '#ffffff',
      panelDialog: '#ffffff',
      buttonSecondary: '#ffffff',
    },
    overlay: {
      scrimDialog: 'rgba(0, 0, 0, 0.92)',
      scrim: 'rgba(0, 0, 0, 0.7)',
    },
  },
});

// The game's actor colours map onto the theme's actor-dot tokens. These
// two mappings are the game-side glue between the Colour enum and the
// kit's semantic colour keys.

/** Maps a hero's game colour onto its theme actor-dot key. */
export const actorColourKey = (colour: Colour): ActorColourKey =>
  colour === Colour.Red
    ? 'red'
    : colour === Colour.Blue
      ? 'blue'
      : colour === Colour.Yellow
        ? 'yellow'
        : 'green';

/** The reverse mapping, for the facades' historical Colour-carrying shapes. */
export const actorColour = (key: ActorColourKey): Colour =>
  key === 'red'
    ? Colour.Red
    : key === 'blue'
      ? Colour.Blue
      : key === 'yellow'
        ? Colour.Yellow
        : Colour.Green;
