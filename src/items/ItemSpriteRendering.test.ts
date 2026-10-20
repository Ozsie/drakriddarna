import { describe, it, expect } from 'vitest';
import { getItemSpriteSourceRect } from './ItemSpriteRendering';
import type { ItemSprite } from '../types';

const sprite = (index: number, size = 32): ItemSprite => ({
  image: 'items.png',
  size,
  index,
});

describe('getItemSpriteSourceRect', () => {
  it('picks frames from a single-row strip', () => {
    expect(getItemSpriteSourceRect(sprite(0), 128, 32)).toEqual({
      sx: 0,
      sy: 0,
    });
    expect(getItemSpriteSourceRect(sprite(2), 128, 32)).toEqual({
      sx: 64,
      sy: 0,
    });
    expect(getItemSpriteSourceRect(sprite(3), 128, 32)).toEqual({
      sx: 96,
      sy: 0,
    });
  });

  it('wraps into rows for a rectangular grid', () => {
    // 3 columns x 2 rows of 32px frames
    expect(getItemSpriteSourceRect(sprite(4), 96, 64)).toEqual({
      sx: 32,
      sy: 32,
    });
    expect(getItemSpriteSourceRect(sprite(5), 96, 64)).toEqual({
      sx: 64,
      sy: 32,
    });
  });

  it('clamps the index to the last available frame', () => {
    expect(getItemSpriteSourceRect(sprite(99), 96, 64)).toEqual({
      sx: 64,
      sy: 32,
    });
  });

  it('treats a negative index as the first frame', () => {
    expect(getItemSpriteSourceRect(sprite(-3), 96, 64)).toEqual({
      sx: 0,
      sy: 0,
    });
  });

  it('supports configurable frame sizes', () => {
    // 2 columns x 1 row of 64px frames
    expect(getItemSpriteSourceRect(sprite(3, 64), 128, 64)).toEqual({
      sx: 64,
      sy: 0,
    });
  });
});
