import { describe, expect, it } from 'vitest';
import { CellAlignment } from '../types';
import * as decorators from './Decorators';
import { parseDecorator } from './dungeonParser';

describe('declarative decorator options', () => {
  it('exports bones sprites for top-down and isometric projections', () => {
    expect(decorators.bones).toEqual({
      sprites: {
        isometric: {
          image: 'isometric/decorators/barrel_E.png',
          size: 256,
          index: 0,
          sourceRect: { x: 79, y: 378, width: 80, height: 83 },
        },
        topDown: {
          image: 'decorators/Bones_shadow3_1.png',
          size: 32,
          index: 0,
        },
      },
    });
  });

  it('uses the top-down sprite by default and preserves projection sprites', () => {
    expect(parseDecorator([2, 3, decorators.bones])).toEqual({
      position: { x: 2, y: 3 },
      alignment: CellAlignment.CENTER,
      sprite: {
        image: 'decorators/Bones_shadow3_1.png',
        size: 32,
        index: 0,
      },
      sprites: decorators.bones.sprites,
    });
  });

  it('exports a cropped isometric decorator option', () => {
    expect(decorators.barrel_E).toEqual({
      sprites: {
        isometric: {
          image: 'isometric/decorators/barrel_E.png',
          size: 256,
          index: 0,
          sourceRect: { x: 79, y: 378, width: 80, height: 83 },
        },
      },
    });
  });

  it('uses an isometric-only sprite when parsing a decorator', () => {
    expect(parseDecorator([4, 5, decorators.barrel_E])).toEqual({
      position: { x: 4, y: 5 },
      alignment: CellAlignment.CENTER,
      sprite: decorators.barrel_E.sprites?.isometric,
      sprites: decorators.barrel_E.sprites,
    });
  });

  it('keeps a requested cell alignment on a decorator', () => {
    expect(
      parseDecorator({
        position: [4, 5],
        alignment: CellAlignment.TOP_LEFT,
        ...decorators.bones,
      }),
    ).toMatchObject({
      position: { x: 4, y: 5 },
      alignment: CellAlignment.TOP_LEFT,
    });
  });
});
