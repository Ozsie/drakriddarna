import { readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildDecoratorViewModels } from '../scene/adapters';
import type { GameState } from '../types';
import * as decorators from './Decorators';
import { parseDecorator } from './dungeonParser';

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string) =>
    ({ naturalWidth: 256, naturalHeight: 512, src: url }) as HTMLImageElement,
}));

const assetNames = readdirSync(
  new URL('../../static/isometric/decorators/', import.meta.url),
)
  .filter((name) => name.endsWith('.png'))
  .map((name) => name.slice(0, -4))
  .sort();

const decoratorOptions = Object.entries(decorators).filter(
  ([name]) => name !== 'bones',
);

describe('isometric decorator options', () => {
  it('exports every isometric asset with an in-bounds source crop', () => {
    expect(decoratorOptions.map(([name]) => name).sort()).toEqual(assetNames);

    for (const [name, options] of decoratorOptions) {
      const sprite = options.sprites?.isometric;
      expect(sprite).toMatchObject({
        image: `isometric/decorators/${name}.png`,
        size: 256,
        index: 0,
      });
      expect(sprite?.sourceRect).toBeDefined();
      const sourceRect = sprite?.sourceRect;
      if (!sourceRect) continue;

      expect(sourceRect.x).toBeGreaterThanOrEqual(0);
      expect(sourceRect.y).toBeGreaterThanOrEqual(0);
      expect(sourceRect.width).toBeGreaterThan(0);
      expect(sourceRect.height).toBeGreaterThan(0);
      expect(sourceRect.x + sourceRect.width).toBeLessThanOrEqual(256);
      expect(sourceRect.y + sourceRect.height).toBeLessThanOrEqual(512);
    }
  });

  it('parses and selects an exported sprite for isometric rendering', () => {
    const decorator = parseDecorator([0, 0, decorators.barrel_E]);
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['A'],
          decorators: [decorator],
        },
      },
    } as GameState;
    const [view] = buildDecoratorViewModels(
      state,
      {} as CanvasImageSource,
      48,
      true,
      'isometric',
    );

    expect(decorator.sprite).toEqual(decorators.barrel_E.sprites?.isometric);
    expect(decorator.sprite.image).toBe('isometric/decorators/barrel_E.png');
    expect(view?.sprite).toMatchObject({ sx: 79, sy: 378, sw: 80, sh: 83 });
    expect(view?.isometricSpriteOverride).toBe(true);
  });
});
