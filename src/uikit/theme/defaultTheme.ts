import type { UiTheme } from './theme';

// Today's pixels as tokens: every value is copied verbatim from the
// renderer it was extracted from, so the default theme reproduces the
// pre-kit output exactly (proven by the parity snapshots). The same value
// in different roles is a separate token so a theme can split them later.

export const defaultTheme: UiTheme = {
  palette: {
    text: {
      bright: '#ffffff',
      strong: '#f8fafc',
      body: '#e2e8f0',
      faint: 'rgba(226, 232, 240, 0.5)',
      debug: 'white',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.2)',
      soft: 'rgba(255, 255, 255, 0.6)',
      ring: 'rgba(255, 255, 255, 0.9)',
      ringHover: '#ffffff',
    },
    surface: {
      panelMenu: 'rgba(28, 33, 40, 0.96)',
      item: 'rgba(37, 41, 50, 0.9)',
      itemHover: 'rgba(71, 85, 105, 0.95)',
    },
    overlay: {
      scrim: 'rgba(0, 0, 0, 0.45)',
      scrimStrong: 'rgba(0, 0, 0, 0.75)',
      tooltip: 'rgba(0, 0, 0, 0.85)',
    },
    hover: {
      radialFill: 'rgba(255, 255, 255, 0.35)',
    },
  },
  typography: {
    families: {
      ui: 'Arial, Helvetica, sans-serif',
      plain: 'sans-serif',
      compact: 'Arial, sans-serif',
      debug: 'Arial',
    },
    sizes: {
      xs: 10,
      sm: 11,
      md: 12,
      lg: 13,
      xl: 14,
      xxl: 15,
      xxxl: 16,
      title: 18,
      display: 20,
    },
    weights: {
      regular: '',
      bold: 'bold ',
      italic: 'italic ',
    },
  },
  shape: {
    strokeWidth: {
      thin: 1,
      regular: 2,
    },
  },
};
