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
      muted: '#94a3b8',
      panelHeader: '#f3f4f6',
      panelBody: '#cbd5e1',
      success: '#86efac',
      diaryHeader: '#fef3c7',
      eventTitle: '#fbbf24',
      introTitle: '#f6ad55',
      introBody: 'rgba(235, 240, 245, 0.95)',
      cardTitle: '#111827',
      cardStat: '#1f2937',
      cardDetail: '#374151',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.2)',
      soft: 'rgba(255, 255, 255, 0.6)',
      ring: 'rgba(255, 255, 255, 0.9)',
      ringHover: '#ffffff',
      hairline: 'rgba(255, 255, 255, 0.12)',
      panelCornerHover: 'rgba(255, 255, 255, 0.4)',
      divider: 'rgba(255, 255, 255, 0.10)',
      separator: 'rgba(255, 255, 255, 0.08)',
      toggle: 'rgba(255, 255, 255, 0.15)',
      panelIntro: 'rgba(255, 215, 0, 0.4)',
      buttonIntroHover: 'rgba(99, 179, 237, 0.95)',
      card: 'rgba(0, 0, 0, 0.4)',
    },
    surface: {
      panelMenu: 'rgba(28, 33, 40, 0.96)',
      item: 'rgba(37, 41, 50, 0.9)',
      itemHover: 'rgba(71, 85, 105, 0.95)',
      panelCorner: 'rgba(20, 24, 33, 0.90)',
      panelCornerHover: 'rgba(40, 46, 58, 0.95)',
      panelIntro: 'rgba(24, 28, 36, 0.96)',
      buttonIntro: 'rgba(45, 55, 72, 0.9)',
      buttonIntroHover: 'rgba(49, 130, 206, 0.9)',
      toggle: 'rgba(255, 255, 255, 0.08)',
      toggleHover: 'rgba(255, 255, 255, 0.2)',
      cardFallback: '#CD5C5C',
    },
    overlay: {
      scrim: 'rgba(0, 0, 0, 0.45)',
      scrimStrong: 'rgba(0, 0, 0, 0.75)',
      tooltip: 'rgba(0, 0, 0, 0.85)',
    },
    hover: {
      radialFill: 'rgba(255, 255, 255, 0.35)',
    },
    status: {
      monsterCurrent: '#ef4444',
      monsterTarget: '#ffd700',
      hoverCard: '#ffffff',
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
      xxs: 10,
      xs: 10.5,
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
      medium: 1.5,
      regular: 2,
      heavy: 2.5,
    },
  },
};
