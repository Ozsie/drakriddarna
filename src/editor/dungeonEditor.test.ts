import { describe, expect, it } from 'vitest';
import { CellAlignment } from '../types';
import * as declarativeDecorators from '../dungeon/Decorators';
import { parseDecorator, parseLight } from '../dungeon/dungeonParser';
import {
  createDungeonEditorExportSource,
  createDungeonEditorPlacementsSource,
  createDungeonEditorState,
  copyDungeonEditorPlacements,
  DECORATOR_OPTIONS,
  decoratorOptionNames,
  isFloorCell,
  LIGHT_PRESETS,
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
    expect([...decoratorOptionNames].sort()).toEqual(
      Object.keys(declarativeDecorators).sort(),
    );
  });

  it('places and exports every decorator option with its projection sprites', () => {
    for (const option of decoratorOptionNames) {
      const initial = createDungeonEditorState('sample', {
        name: 'options.dungeon',
        layout: { grid: ['A'] },
      });
      const placed = placeDecorator(initial, option, { x: 0, y: 0 });
      expect(placed.decorators).toHaveLength(1);
      expect(placed.decorators[0].sprites).toEqual(
        DECORATOR_OPTIONS[option].sprites,
      );
      expect(createDungeonEditorPlacementsSource(placed)).toContain(
        `[0, 0, CellAlignment.CENTER, ${option}]`,
      );
      expect(
        parseDecorator([0, 0, CellAlignment.CENTER, DECORATOR_OPTIONS[option]]),
      ).toEqual(placed.decorators[0]);
      expect(createDungeonEditorExportSource(placed)).toContain(
        `[0, 0, CellAlignment.CENTER, ${option}]`,
      );
    }
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

  it('recognizes parser-resolved option references from an existing dungeon', () => {
    const parsedLight = parseLight([
      3,
      1,
      CellAlignment.BOTTOM_RIGHT,
      LIGHT_PRESETS.torch,
    ]);
    const parsedDecorator = parseDecorator([
      1,
      1,
      CellAlignment.TOP_RIGHT,
      DECORATOR_OPTIONS.bones,
    ]);
    const state = createDungeonEditorState('sample', {
      name: 'parsed.dungeon',
      layout: {
        grid,
        lights: [parsedLight],
        decorators: [parsedDecorator],
      },
    });
    const sourceText = createDungeonEditorPlacementsSource(state);

    expect(sourceText).toContain('[3, 1, CellAlignment.BOTTOM_RIGHT, torch]');
    expect(sourceText).toContain('[1, 1, CellAlignment.TOP_RIGHT, bones]');
    expect(
      parseLight([3, 1, CellAlignment.BOTTOM_RIGHT, LIGHT_PRESETS.torch]),
    ).toEqual(state.lights[0]);
    expect(
      parseDecorator([1, 1, CellAlignment.TOP_RIGHT, DECORATOR_OPTIONS.bones]),
    ).toEqual(state.decorators[0]);
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

  it('exports grid and placement references with identity and empty arrays', () => {
    const state = createDungeonEditorState('sample', {
      name: 'empty.dungeon',
      layout: { grid },
    });
    const exported = createDungeonEditorExportSource(state);

    expect(exported).toContain("campaignId: 'sample'");
    expect(exported).toContain("dungeonName: 'empty.dungeon'");
    expect(exported).toContain("grid: [\n      '#####'");
    expect(exported).toContain('lights: []');
    expect(exported).toContain('decorators: []');
  });

  it('copies references and custom placements as TypeScript', async () => {
    const initial = createDungeonEditorState('sample', source);
    const withLight = placeLight(
      initial,
      'torch',
      { x: 3, y: 1 },
      CellAlignment.BOTTOM_RIGHT,
    );
    const state = placeDecorator(
      withLight,
      'bones',
      { x: 1, y: 1 },
      CellAlignment.TOP_RIGHT,
    );
    let copiedText = '';

    const fallback = await copyDungeonEditorPlacements(state, (text) => {
      copiedText = text;
      return Promise.resolve();
    });

    expect(fallback).toBeNull();
    expect(copiedText).toBe(createDungeonEditorPlacementsSource(state));
    expect(copiedText).toContain('[3, 1, CellAlignment.BOTTOM_RIGHT, torch]');
    expect(copiedText).toContain('[1, 1, CellAlignment.TOP_RIGHT, bones]');
    expect(copiedText).toContain("image: 'decorators/Objects.png'");
    expect(copiedText).toContain('sourceRect:');
    expect(
      parseLight([3, 1, CellAlignment.BOTTOM_RIGHT, LIGHT_PRESETS.torch]),
    ).toMatchObject({
      position: { x: 3, y: 1 },
      alignment: CellAlignment.BOTTOM_RIGHT,
      color: state.lights[1].color,
      sprites: state.lights[1].sprites,
    });
  });

  it('exports identity, grid, and the same concise placement references', () => {
    const initial = createDungeonEditorState('sample', {
      name: 'empty.dungeon',
      layout: { grid },
    });
    const state = placeDecorator(initial, 'bones', { x: 1, y: 1 });
    const sourceText = createDungeonEditorExportSource(state);

    expect(sourceText).toContain("campaignId: 'sample'");
    expect(sourceText).toContain("dungeonName: 'empty.dungeon'");
    expect(sourceText).toContain("grid: [\n      '#####'");
    expect(sourceText).toContain('[1, 1, CellAlignment.CENTER, bones]');
    expect(sourceText).toContain('lights: []');
    expect(sourceText).toContain('decorators: [');
  });

  it('preserves empty arrays and returns source when clipboard writing is unavailable', async () => {
    const state = createDungeonEditorState('sample', {
      name: 'empty.dungeon',
      layout: { grid },
    });

    const failedWriteFallback = await copyDungeonEditorPlacements(state, () =>
      Promise.reject(new Error('Clipboard unavailable')),
    );
    const unavailableFallback = await copyDungeonEditorPlacements(state);

    expect(failedWriteFallback).toBe(
      createDungeonEditorPlacementsSource(state),
    );
    expect(unavailableFallback).toBe(
      createDungeonEditorPlacementsSource(state),
    );
    expect(unavailableFallback).toContain('lights: []');
    expect(unavailableFallback).toContain('decorators: []');
  });
});
