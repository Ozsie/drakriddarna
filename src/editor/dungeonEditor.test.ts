import { describe, expect, it } from 'vitest';
import { CellAlignment } from '../types';
import {
  createDungeonEditorExport,
  createDungeonEditorState,
  DECORATOR_OPTIONS,
  decoratorOptionNames,
  isFloorCell,
  placeDecorator,
  placeLight,
  removePlacement,
} from './dungeonEditor';

const grid = ['#####', '#ABC#', '#####'];

const source = {
  name: 'test.dungeon',
  layout: {
    grid,
    lights: [
      {
        position: { x: 1, y: 1 },
        alignment: CellAlignment.CEILING,
        color: '#123456',
        radius: 5,
        sprite: {
          image: 'decorators/Torch Animated.png',
          x: 0,
          y: 0,
          size: 64,
          frameCount: 8,
          alignmentOffsets: {
            [CellAlignment.CENTER]: { x: 1, y: 2 },
          },
        },
      },
    ],
    decorators: [
      {
        position: { x: 2, y: 1 },
        alignment: CellAlignment.TOP_LEFT,
        sprite: {
          image: 'decorators/Objects.png',
          size: 32,
          index: 4,
          sourceRect: { x: 1, y: 2, width: 10, height: 12 },
        },
      },
    ],
  },
};

describe('dungeon editor', () => {
  it('exposes the available declarative decorator options', () => {
    expect(decoratorOptionNames).toEqual(['bones']);
  });

  it('keeps the original grid and clones existing placements and sprite options', () => {
    const state = createDungeonEditorState('sample', source);

    expect(state.grid).toBe(grid);
    expect(state.lights[0]).not.toBe(source.layout.lights[0]);
    expect(state.lights[0].position).not.toBe(source.layout.lights[0].position);
    expect(state.lights[0].sprite?.alignmentOffsets).not.toBe(
      source.layout.lights[0].sprite?.alignmentOffsets,
    );
    expect(state.lights[0]).toEqual(source.layout.lights[0]);
    expect(state.decorators[0]).not.toBe(source.layout.decorators[0]);
    expect(state.decorators[0].sprite.sourceRect).not.toBe(
      source.layout.decorators[0].sprite.sourceRect,
    );
    expect(state.decorators[0]).toEqual(source.layout.decorators[0]);
  });

  it('recognizes only in-bounds floor cells', () => {
    expect(isFloorCell(grid, { x: 1, y: 1 })).toBe(true);
    expect(isFloorCell(grid, { x: 0, y: 0 })).toBe(false);
    expect(isFloorCell([' A '], { x: 0, y: 0 })).toBe(false);
    expect(isFloorCell(grid, { x: 5, y: 1 })).toBe(false);
    expect(isFloorCell(grid, { x: -1, y: 1 })).toBe(false);
    expect(isFloorCell(grid, { x: 1.5, y: 1 })).toBe(false);
  });

  it('places multiple lights and decorators without changing source placements', () => {
    const initial = createDungeonEditorState('sample', source);
    const withLight = placeLight(
      initial,
      'torch',
      { x: 3, y: 1 },
      CellAlignment.BOTTOM_RIGHT,
    );
    const withDecorator = placeDecorator(
      withLight,
      'bones',
      { x: 1, y: 1 },
      CellAlignment.TOP_RIGHT,
    );

    expect(withDecorator.lights).toHaveLength(2);
    expect(withDecorator.lights[1]).toMatchObject({
      position: { x: 3, y: 1 },
      alignment: CellAlignment.BOTTOM_RIGHT,
      color: '#e8963c',
      effect: 'flicker',
      sprites: { topDown: { image: 'decorators/Torch Animated.png' } },
    });
    expect(withDecorator.decorators).toHaveLength(2);
    expect(withDecorator.decorators[1]).toMatchObject({
      position: { x: 1, y: 1 },
      alignment: CellAlignment.TOP_RIGHT,
      sprite: { image: 'decorators/Bones_shadow3_1.png' },
      sprites: DECORATOR_OPTIONS.bones.sprites,
    });
    expect(withDecorator.decorators[1].sprite).not.toBe(
      DECORATOR_OPTIONS.bones.sprites?.topDown,
    );
    expect(withDecorator.decorators[1].sprites?.isometric).not.toBe(
      DECORATOR_OPTIONS.bones.sprites?.isometric,
    );
    expect(initial.lights).toHaveLength(1);
    expect(initial.decorators).toHaveLength(1);
  });

  it('uses center alignment when placing a decorator without an alignment', () => {
    const initial = createDungeonEditorState('sample', source);

    const placed = placeDecorator(initial, 'bones', { x: 1, y: 1 });

    expect(placed.decorators[1].alignment).toBe(CellAlignment.CENTER);
  });

  it('does not place on walls or outside the grid', () => {
    const initial = createDungeonEditorState('sample', source);

    expect(placeLight(initial, 'torch', { x: 0, y: 0 })).toBe(initial);
    expect(placeDecorator(initial, 'bones', { x: 8, y: 8 })).toBe(initial);
  });

  it('removes one placement and leaves invalid indices untouched', () => {
    const initial = createDungeonEditorState('sample', source);
    const withTwoLights = placeLight(initial, 'torch', { x: 3, y: 1 });

    expect(removePlacement(withTwoLights, 'light', 1).lights).toHaveLength(1);
    expect(removePlacement(withTwoLights, 'light', -1)).toBe(withTwoLights);
    expect(removePlacement(withTwoLights, 'decorator', 4)).toBe(withTwoLights);
  });

  it('exports grid and resolved placements with identity and preserves empty arrays', () => {
    const state = createDungeonEditorState('sample', {
      name: 'empty.dungeon',
      layout: { grid },
    });
    const exported = createDungeonEditorExport(state);
    const roundTrip: unknown = JSON.parse(JSON.stringify(exported));

    expect(exported.layout.grid).toBe(grid);
    expect(roundTrip).toEqual({
      campaignId: 'sample',
      dungeonName: 'empty.dungeon',
      layout: { grid, lights: [], decorators: [] },
    });
  });
});
