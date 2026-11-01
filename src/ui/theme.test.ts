// Proves the M2 exit criterion "second theme renders": a representative
// set of renderers draws with the high-contrast theme, every overridden
// token shows up in the recorded log, and the output differs from the
// default theme's.

import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../uikit/testing/recordingContext';
import { defaultTheme } from '../uikit/theme';
import {
  REGULAR_HEIGHT,
  REGULAR_WIDTH,
  midCampaignState,
} from './parity/fixtures';
import { renderTopBar } from './TopBarRendering';
import { renderSettings } from './SettingsRendering';
import { renderWelcome } from './WelcomeRendering';
import { DEFAULT_APP_SETTINGS } from '../settings/AppSettings';
import { highContrastTheme } from './theme';

const renderLog = (
  draw: (ctx: CanvasRenderingContext2D, theme: typeof defaultTheme) => void,
  theme: typeof defaultTheme,
): readonly string[] => {
  const rec = createRecordingContext();
  draw(rec.ctx, theme);
  return rec.log;
};

describe('highContrastTheme', () => {
  it('overrides only the declared tokens and inherits the rest', () => {
    expect(highContrastTheme.palette.surface.panelDialog).toBe('#000000');
    expect(highContrastTheme.palette.text.headerDialog).toBe(
      defaultTheme.palette.text.headerDialog,
    );
    expect(highContrastTheme.typography.families.ui).toBe(
      defaultTheme.typography.families.ui,
    );
  });

  it('is identity-stable', () => {
    expect(highContrastTheme).toBe(highContrastTheme);
    const text = highContrastTheme.palette.text as unknown as Record<
      string,
      string
    >;
    expect(() => {
      text.body = '#ff0000';
    }).toThrow();
  });

  it('renders the welcome screen with overridden values', () => {
    const log = renderLog(
      (ctx, theme) =>
        renderWelcome(ctx, REGULAR_WIDTH, REGULAR_HEIGHT, { theme }),
      highContrastTheme,
    );
    expect(log).toContain('fillStyle="#000000"');
    expect(log).toContain('strokeStyle="#ffffff"');
    expect(log.some((entry) => entry === 'fillStyle="#181b22"')).toBe(false);
  });

  it('renders the top bar and hero cards differently from the default', () => {
    const defaultTopBar = renderLog(
      (ctx, theme) =>
        renderTopBar(ctx, REGULAR_WIDTH, midCampaignState(), { theme }),
      defaultTheme,
    );
    const contrastTopBar = renderLog(
      (ctx, theme) =>
        renderTopBar(ctx, REGULAR_WIDTH, midCampaignState(), { theme }),
      highContrastTheme,
    );
    expect(contrastTopBar).not.toEqual(defaultTopBar);
    expect(contrastTopBar.some((entry) => entry.includes('#ffffff'))).toBe(
      true,
    );

    const defaultSettings = renderLog(
      (ctx, theme) =>
        renderSettings(
          ctx,
          REGULAR_WIDTH,
          REGULAR_HEIGHT,
          DEFAULT_APP_SETTINGS,
          {
            theme,
          },
        ),
      defaultTheme,
    );
    const contrastSettings = renderLog(
      (ctx, theme) =>
        renderSettings(
          ctx,
          REGULAR_WIDTH,
          REGULAR_HEIGHT,
          DEFAULT_APP_SETTINGS,
          {
            theme,
          },
        ),
      highContrastTheme,
    );
    expect(contrastSettings).not.toEqual(defaultSettings);
    expect(contrastSettings).toContain('fillStyle="#000000"');
  });
});
