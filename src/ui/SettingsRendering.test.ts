import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CREDITS_ROWS,
  getCreditsHit,
  getCreditsLayout,
  getSettingsHit,
  getSettingsLayout,
  getSliderValueFromX,
  renderCredits,
  renderSettings,
} from './SettingsRendering';
import { DEFAULT_APP_SETTINGS } from '../settings/AppSettings';
import { loadTranslations } from '$lib/translations';

const createMockCtx = (): CanvasRenderingContext2D => {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
    })),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

describe('SettingsRendering', () => {
  beforeAll(async () => {
    // Labels are human-authored translations; without a loaded locale
    // i18n falls back to the raw keys.
    await loadTranslations('en');
  });

  const settings = { ...DEFAULT_APP_SETTINGS };

  describe('settings layout', () => {
    it('returns empty content without view dimensions', () => {
      expect(getSettingsLayout(0, 0, settings).hasContent).toBe(false);
    });

    it('builds the five rows and centers the panel', () => {
      const layout = getSettingsLayout(800, 600, settings);
      expect(layout.hasContent).toBe(true);
      expect(layout.rows.map((row) => row.id)).toEqual([
        'music',
        'audio',
        'musicVolume',
        'audioVolume',
        'credits',
      ]);
      const { panelBounds } = layout;
      expect(
        Math.abs(panelBounds.x * 2 + panelBounds.width - 800),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(panelBounds.y * 2 + panelBounds.height - 600),
      ).toBeLessThanOrEqual(1);
    });

    it('carries the On/Off state in the toggle labels', () => {
      const on = getSettingsLayout(800, 600, settings);
      expect(on.rows[0]?.label).toContain(': On');
      const off = getSettingsLayout(800, 600, {
        ...settings,
        musicOn: false,
      });
      expect(off.rows[0]?.label).toContain(': Off');
    });

    it('dims a muted channel slider and formats volumes as percent', () => {
      const layout = getSettingsLayout(800, 600, {
        ...settings,
        musicOn: false,
        musicVolume: 0.25,
      });
      const musicRow = layout.rows.find((row) => row.id === 'musicVolume');
      expect(musicRow?.dimmed).toBe(true);
      expect(musicRow?.slider?.valueText).toBe('25%');
      const audioRow = layout.rows.find((row) => row.id === 'audioVolume');
      expect(audioRow?.dimmed).toBe(false);
      expect(audioRow?.slider?.valueText).toBe('80%');
    });
  });

  describe('slider value', () => {
    it('maps a track x position linearly onto [0, 1]', () => {
      const track = { x: 100, y: 300, width: 200, height: 8 };
      expect(getSliderValueFromX(track, 100)).toBe(0);
      expect(getSliderValueFromX(track, 200)).toBeCloseTo(0.5);
      expect(getSliderValueFromX(track, 300)).toBe(1);
      // Clamped outside the track.
      expect(getSliderValueFromX(track, 0)).toBe(0);
      expect(getSliderValueFromX(track, 999)).toBe(1);
    });
  });

  describe('settings hit', () => {
    it('hits toggles, sliders, credits and back in their bounds', () => {
      const layout = getSettingsLayout(800, 600, settings);
      const music = layout.rows[0];
      expect(music).toBeDefined();
      if (music) {
        const hit = getSettingsHit(
          800,
          600,
          settings,
          music.bounds.x + 20,
          music.bounds.y + music.bounds.height / 2,
        );
        expect(hit).toEqual({ type: 'toggle', rowId: 'music' });
      }
      const credits = layout.rows[4];
      if (credits) {
        const hit = getSettingsHit(
          800,
          600,
          settings,
          credits.bounds.x + 20,
          credits.bounds.y + credits.bounds.height / 2,
        );
        expect(hit).toEqual({ type: 'credits' });
      }
      const back = getSettingsHit(
        800,
        600,
        settings,
        layout.backButtonBounds.x + 10,
        layout.backButtonBounds.y + 10,
      );
      expect(back).toEqual({ type: 'back' });
    });

    it('hits sliders only on their track, never while dimmed', () => {
      const active = getSettingsLayout(800, 600, settings);
      const musicRow = active.rows.find((row) => row.id === 'musicVolume');
      expect(musicRow?.slider).toBeDefined();
      if (musicRow?.slider) {
        const { trackBounds } = musicRow.slider;
        const hit = getSettingsHit(
          800,
          600,
          settings,
          trackBounds.x + 10,
          trackBounds.y + 4,
        );
        expect(hit).toEqual({ type: 'slider', rowId: 'musicVolume' });
      }
      // Muted channel: the slider does not respond.
      const muted = getSettingsLayout(800, 600, {
        ...settings,
        musicOn: false,
      });
      const mutedRow = muted.rows.find((row) => row.id === 'musicVolume');
      if (mutedRow?.slider) {
        const { trackBounds } = mutedRow.slider;
        const hit = getSettingsHit(
          800,
          600,
          { ...settings, musicOn: false },
          trackBounds.x + 10,
          trackBounds.y + 4,
        );
        expect(hit).toEqual({ type: 'panel' });
      }
    });
  });

  describe('credits', () => {
    it('lists the rights rows with their links next to the definitions', () => {
      expect(CREDITS_ROWS.map((row) => row.id)).toEqual([
        'implementation',
        'music',
        'sfx',
        'graphics',
      ]);
      const layout = getCreditsLayout(800, 600);
      expect(layout.rows).toHaveLength(4);
      expect(layout.rows[1]?.url).toBe(CREDITS_ROWS[1]?.url);
      expect(layout.rows[0]?.url).toBeUndefined();
    });

    it('hits rows and back', () => {
      const layout = getCreditsLayout(800, 600);
      const first = layout.rows[0];
      expect(first).toBeDefined();
      if (first) {
        const hit = getCreditsHit(
          800,
          600,
          first.bounds.x + 20,
          first.bounds.y + first.bounds.height / 2,
        );
        expect(hit).toEqual({
          type: 'row',
          rowId: 'implementation',
          url: undefined,
        });
      }
      const back = getCreditsHit(
        800,
        600,
        layout.backButtonBounds.x + 10,
        layout.backButtonBounds.y + 10,
      );
      expect(back).toEqual({ type: 'back' });
      expect(getCreditsHit(800, 600, 10, 10)).toEqual({
        type: 'backdrop',
      });
    });
  });

  describe('render', () => {
    it('renders the settings panel without errors', () => {
      const ctx = createMockCtx();
      renderSettings(ctx, 800, 600, settings);
      expect(
        (ctx as unknown as { fillText: ReturnType<typeof vi.fn> }).fillText,
      ).toHaveBeenCalled();
    });

    it('renders the credits panel without errors', () => {
      const ctx = createMockCtx();
      renderCredits(ctx, 800, 600);
      expect(
        (ctx as unknown as { fillText: ReturnType<typeof vi.fn> }).fillText,
      ).toHaveBeenCalled();
    });
  });
});
