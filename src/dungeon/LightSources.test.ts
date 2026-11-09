import { describe, expect, it } from 'vitest';
import { brazier, torch } from './LightSources';

describe('light source sprites', () => {
  it('uses the full brazier image', () => {
    expect(brazier.sprite).toEqual({
      image:
        'decorators/nobg-1293999211a5-1791660715455_1791660715455_dw9f2h0x.png',
      x: 0,
      y: 0,
      size: 540,
      frameWidth: 540,
      frameHeight: 639,
      scale: 0.6,
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
    });
  });
});
