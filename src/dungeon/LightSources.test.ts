import { describe, expect, it } from 'vitest';
import { brazier, torch } from './LightSources';
import { CellAlignment } from '../types.ts';

describe('light source sprites', () => {
  it('uses the full brazier image', () => {
    expect(brazier.sprite).toEqual({
      image:
        'decorators/pixor-library-brazier-standing-selout-64px-8-sides.png',
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
    });
  });

  it('uses the animated torch sprite sheet', () => {
    expect(torch.sprite).toEqual({
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
    });
  });
});
