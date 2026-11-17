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
import * as decoratorOptions from '../dungeon/Decorators';
import {
  parseLight,
  parseDecorator,
  type DeclarativeDecoratorOptions,
  type DeclarativeLightOptions,
} from '../dungeon/dungeonParser';
import {
  brazier,
  chandelier,
  ember,
  goldenGlow,
  glow,
  iceBrazier,
  torch,
} from '../dungeon/LightSources';

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

export const DECORATOR_OPTIONS = decoratorOptions satisfies Record<
  string,
  DeclarativeDecoratorOptions
>;

export type DecoratorOptionName = keyof typeof DECORATOR_OPTIONS;

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
  option: DecoratorOptionName,
  position: Position,
  alignment: (typeof CellAlignment)[keyof typeof CellAlignment] = CellAlignment.CENTER,
): DungeonEditorState => {
  if (!isFloorCell(state.grid, position)) return state;

  return {
    ...state,
    decorators: [
      ...state.decorators,
      cloneDecorator(
        parseDecorator([
          position.x,
          position.y,
          alignment,
          DECORATOR_OPTIONS[option],
        ]),
      ),
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

const normalizeForComparison = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeForComparison);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeForComparison(entry)]),
    );
  }
  return value;
};

const placementsEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(normalizeForComparison(left)) ===
  JSON.stringify(normalizeForComparison(right));

const findLightPreset = (light: LightSource): LightPresetName | undefined => {
  const { x, y } = light.position;
  const alignment = light.alignment;

  for (const [name, options] of Object.entries(LIGHT_PRESETS) as [
    LightPresetName,
    DeclarativeLightOptions,
  ][]) {
    const parsedCandidates = [
      parseLight([x, y, options]),
      parseLight([x, y, alignment ?? CellAlignment.CENTER, options]),
      parseLight({
        x,
        y,
        ...(alignment !== undefined ? { alignment } : {}),
        ...options,
      }),
    ];
    const editorPlacement: LightSource = {
      ...options,
      position: light.position,
      ...(alignment !== undefined ? { alignment } : {}),
    };

    if (
      [editorPlacement, ...parsedCandidates].some((candidate) =>
        placementsEqual(light, candidate),
      )
    ) {
      return name;
    }
  }

  return undefined;
};

const findDecoratorOption = (
  decorator: Decorator,
): DecoratorOptionName | undefined => {
  const { x, y } = decorator.position;
  const alignment = decorator.alignment;

  for (const [name, options] of Object.entries(DECORATOR_OPTIONS) as [
    DecoratorOptionName,
    DeclarativeDecoratorOptions,
  ][]) {
    const parsedCandidates = [
      parseDecorator([x, y, alignment ?? CellAlignment.CENTER, options]),
      parseDecorator([x, y, options]),
      parseDecorator({
        position: decorator.position,
        ...(alignment !== undefined ? { alignment } : {}),
        ...options,
      }),
    ];

    if (
      parsedCandidates.some((candidate) =>
        placementsEqual(decorator, candidate),
      )
    ) {
      return name;
    }
  }

  return undefined;
};

const alignmentReference = (alignment: string): string | undefined => {
  const entry = Object.entries(CellAlignment).find(
    ([, value]) => value === alignment,
  );
  return entry ? `CellAlignment.${entry[0]}` : undefined;
};

const quoteSourceString = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}'`;

const formatSourceValue = (
  value: unknown,
  indent: number,
  propertyName?: string,
): string => {
  if (typeof value === 'string') {
    return propertyName === 'alignment'
      ? (alignmentReference(value) ?? quoteSourceString(value))
      : quoteSourceString(value);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const childIndent = indent + 2;
    return `[\n${value
      .map(
        (entry) =>
          `${' '.repeat(childIndent)}${formatSourceValue(entry, childIndent)},`,
      )
      .join('\n')}\n${' '.repeat(indent)}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, entry]) => entry !== undefined,
    );
    if (entries.length === 0) return '{}';
    const childIndent = indent + 2;
    return `{\n${entries
      .map(([key, entry]) => {
        const sourceKey = /^[A-Za-z_$][\w$]*$/.test(key)
          ? key
          : quoteSourceString(key);
        return `${' '.repeat(childIndent)}${sourceKey}: ${formatSourceValue(entry, childIndent, key)},`;
      })
      .join('\n')}\n${' '.repeat(indent)}}`;
  }
  return 'undefined';
};

const formatPlacement = (
  kind: 'light' | 'decorator',
  placement: LightSource | Decorator,
  indent: number,
): string => {
  if (kind === 'light') {
    const light = placement as LightSource;
    const preset = findLightPreset(light);
    if (preset) {
      const { x, y } = light.position;
      const alignment = light.alignment
        ? `${alignmentReference(light.alignment) ?? quoteSourceString(light.alignment)}, `
        : '';
      return `[${x}, ${y}, ${alignment}${preset}]`;
    }
  } else {
    const decorator = placement as Decorator;
    const option = findDecoratorOption(decorator);
    if (option) {
      const { x, y } = decorator.position;
      const alignment = decorator.alignment
        ? `${alignmentReference(decorator.alignment) ?? quoteSourceString(decorator.alignment)}, `
        : '';
      return `[${x}, ${y}, ${alignment}${option}]`;
    }
  }

  return formatSourceValue(placement, indent, undefined);
};

const formatPlacementArray = (
  kind: 'light' | 'decorator',
  placements: (LightSource | Decorator)[],
  indent: number,
): string => {
  if (placements.length === 0) return '[]';
  const childIndent = indent + 2;
  return `[\n${placements
    .map(
      (placement) =>
        `${' '.repeat(childIndent)}${formatPlacement(kind, placement, childIndent)},`,
    )
    .join('\n')}\n${' '.repeat(indent)}]`;
};

const formatPlacementProperties = (
  state: DungeonEditorState,
  indent: number,
): string => {
  const prefix = ' '.repeat(indent);
  return `${prefix}lights: ${formatPlacementArray('light', state.lights, indent)},\n${prefix}decorators: ${formatPlacementArray('decorator', state.decorators, indent)},`;
};

export const createDungeonEditorPlacementsSource = (
  state: DungeonEditorState,
): string => formatPlacementProperties(state, 0);

export const createDungeonEditorExportSource = (
  state: DungeonEditorState,
): string =>
  `export const dungeonEditorExport = {\n  campaignId: ${quoteSourceString(state.campaignId)},\n  dungeonName: ${quoteSourceString(state.dungeonName)},\n  layout: {\n    grid: ${formatSourceValue(state.grid, 4)},\n${formatPlacementProperties(state, 4)}\n  },\n};`;

export const copyDungeonEditorPlacements = async (
  state: DungeonEditorState,
  writeText?: (text: string) => Promise<void>,
): Promise<string | null> => {
  const source = createDungeonEditorPlacementsSource(state);
  if (!writeText) return source;

  try {
    await writeText(source);
    return null;
  } catch {
    return source;
  }
};

export const decoratorOptionNames = Object.keys(
  DECORATOR_OPTIONS,
) as DecoratorOptionName[];
