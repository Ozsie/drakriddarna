import { describe, expect, it } from 'vitest';
import { CellAlignment } from '../types';
import {
  bonesVariant1,
  bonesVariant2,
  createDecoratorPreset,
  plantVariant4,
  rockVariant4,
  ruinVariant5,
  suppliesObject,
} from './Decorators';

describe('decorator presets', () => {
  it('creates a positioned decorator for a standalone sprite', () => {
    expect(plantVariant4({ x: 2, y: 3 })).toEqual({
      position: { x: 2, y: 3 },
      alignment: CellAlignment.CENTER,
      sprite: {
        image: 'decorators/Plant__shadow2_4.png',
        size: 32,
        index: 0,
      },
    });
  });

  it('uses the standalone image dimensions for the sprite frame', () => {
    expect(bonesVariant1({ x: 1, y: 1 }).sprite.size).toBe(32);
    expect(bonesVariant2({ x: 1, y: 1 }).sprite.size).toBe(16);
    expect(rockVariant4({ x: 1, y: 1 }).sprite.size).toBe(32);
    expect(ruinVariant5({ x: 1, y: 1 }).sprite.size).toBe(32);
  });

  it('selects a frame from the supplies sheet', () => {
    expect(suppliesObject({ x: 4, y: 5 }, 12)).toEqual({
      position: { x: 4, y: 5 },
      alignment: CellAlignment.CENTER,
      sprite: {
        image: 'decorators/supplies_objects.png',
        size: 16,
        index: 12,
      },
    });
  });

  it('creates a precisely cropped supplies atlas preset', () => {
    expect(createDecoratorPreset('suppliesObject001', { x: 4, y: 5 })).toEqual({
      position: { x: 4, y: 5 },
      alignment: CellAlignment.CENTER,
      sprite: {
        image: 'decorators/supplies_objects.png',
        size: 45,
        index: 0,
        sourceRect: { x: 146, y: 10, width: 29, height: 45 },
      },
    });
  });

  it('keeps a requested cell alignment on a preset', () => {
    expect(
      createDecoratorPreset(
        'bonesVariant1',
        { x: 4, y: 5 },
        CellAlignment.TOP_LEFT,
      ),
    ).toMatchObject({ alignment: CellAlignment.TOP_LEFT });
  });
});
