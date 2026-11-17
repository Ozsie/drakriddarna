import type {
  Decorator,
  DecoratorSprites,
  ItemSprite,
  LightSource,
  LightSprite,
  LightSprites,
  Position,
} from '../types';
import { CellAlignment } from '../types';
import {
  DECORATOR_PRESETS,
  createDecoratorPreset,
  type DecoratorPresetName,
} from '../dungeon/Decorators';
import {
  brazier,
  chandelier,
  ember,
  goldenGlow,
  glow,
  iceBrazier,
  torch,
} from '../dungeon/LightSources';
import type { DeclarativeLightOptions } from '../dungeon/dungeonParser';

export const LIGHT_PRESETS = {
  brazier,
  chandelier,
  torch,
  ember,
  iceBrazier,
  glow,
  goldenGlow,
} satisfies Record<string, DeclarativeLightOptions>;

export type LightPresetName = keyof typeof LIGHT_PRESETS;

export type DungeonEditorState = {
  campaignId: string;
  dungeonName: string;
  grid: string[];
  lights: LightSource[];
  decorators: Decorator[];
};

export type DungeonEditorSource = {
  name: string;
  layout: {
    grid: string[];
    lights?: LightSource[];
    decorators?: Decorator[];
  };
};

export type DungeonEditorExport = {
  campaignId: string;
  dungeonName: string;
  layout: {
    grid: string[];
    lights: LightSource[];
    decorators: Decorator[];
  };
};

const cloneItemSprite = (sprite: ItemSprite): ItemSprite => ({
  ...sprite,
  ...(sprite.sourceRect ? { sourceRect: { ...sprite.sourceRect } } : {}),
});

const cloneDecoratorSprites = (
  sprites: DecoratorSprites,
): DecoratorSprites => ({
  ...(sprites.topDown ? { topDown: cloneItemSprite(sprites.topDown) } : {}),
  ...(sprites.isometric
    ? { isometric: cloneItemSprite(sprites.isometric) }
    : {}),
});

const cloneDecorator = (decorator: Decorator): Decorator => ({
  ...decorator,
  position: { ...decorator.position },
  sprite: cloneItemSprite(decorator.sprite),
  ...(decorator.sprites
    ? { sprites: cloneDecoratorSprites(decorator.sprites) }
    : {}),
});

const cloneLightSprite = (sprite: LightSprite): LightSprite => ({
  ...sprite,
  ...(sprite.alignmentOffsets
    ? {
        alignmentOffsets: Object.fromEntries(
          Object.entries(sprite.alignmentOffsets).map(([alignment, offset]) =>
            offset ? [alignment, { ...offset }] : [alignment, offset],
          ),
        ),
      }
    : {}),
});

const cloneLightSprites = (sprites: LightSprites): LightSprites => ({
  ...(sprites.topDown ? { topDown: cloneLightSprite(sprites.topDown) } : {}),
  ...(sprites.isometric
    ? {
        isometric:
          'tileId' in sprites.isometric
            ? { ...sprites.isometric }
            : cloneLightSprite(sprites.isometric),
      }
    : {}),
});

const cloneLight = (light: LightSource): LightSource => ({
  ...light,
  position: { ...light.position },
  ...(light.sprite ? { sprite: cloneLightSprite(light.sprite) } : {}),
  ...(light.sprites ? { sprites: cloneLightSprites(light.sprites) } : {}),
});

export const createDungeonEditorState = (
  campaignId: string,
  dungeon: DungeonEditorSource,
): DungeonEditorState => ({
  campaignId,
  dungeonName: dungeon.name,
  grid: dungeon.layout.grid,
  lights: (dungeon.layout.lights ?? []).map(cloneLight),
  decorators: (dungeon.layout.decorators ?? []).map(cloneDecorator),
});

export const isFloorCell = (
  grid: readonly string[],
  position: Position,
): boolean => {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    position.x < 0 ||
    position.y < 0
  ) {
    return false;
  }

  const cell = grid[position.y]?.[position.x];
  return cell !== undefined && cell !== '' && cell !== ' ' && cell !== '#';
};

export const placeLight = (
  state: DungeonEditorState,
  preset: LightPresetName,
  position: Position,
  alignment: (typeof CellAlignment)[keyof typeof CellAlignment] = CellAlignment.CENTER,
): DungeonEditorState => {
  if (!isFloorCell(state.grid, position)) return state;

  return {
    ...state,
    lights: [
      ...state.lights,
      cloneLight({
        ...LIGHT_PRESETS[preset],
        position,
        alignment,
      }),
    ],
  };
};

export const placeDecorator = (
  state: DungeonEditorState,
  preset: DecoratorPresetName,
  position: Position,
  alignment: (typeof CellAlignment)[keyof typeof CellAlignment] = CellAlignment.CENTER,
): DungeonEditorState => {
  if (!isFloorCell(state.grid, position)) return state;

  return {
    ...state,
    decorators: [
      ...state.decorators,
      cloneDecorator(createDecoratorPreset(preset, position, alignment)),
    ],
  };
};

export const removePlacement = (
  state: DungeonEditorState,
  kind: 'light' | 'decorator',
  index: number,
): DungeonEditorState => {
  const placements = kind === 'light' ? state.lights : state.decorators;
  if (!Number.isInteger(index) || index < 0 || index >= placements.length) {
    return state;
  }

  if (kind === 'light') {
    return {
      ...state,
      lights: state.lights.filter((_, current) => current !== index),
    };
  }
  return {
    ...state,
    decorators: state.decorators.filter((_, current) => current !== index),
  };
};

export const createDungeonEditorExport = (
  state: DungeonEditorState,
): DungeonEditorExport => ({
  campaignId: state.campaignId,
  dungeonName: state.dungeonName,
  layout: {
    grid: state.grid,
    lights: state.lights,
    decorators: state.decorators,
  },
});

export const decoratorPresetNames = Object.keys(
  DECORATOR_PRESETS,
) as DecoratorPresetName[];
