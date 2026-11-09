import type { Decorator, ItemSprite, Position } from '../types';
import { CellAlignment } from '../types';

const decoratorSprites = {
  bonesVariant1: {
    image: 'decorators/Bones_shadow3_1.png',
    size: 32,
    index: 0,
  },
  bonesVariant2: {
    image: 'decorators/Bones_shadow3_2.png',
    size: 16,
    index: 0,
  },
  bonesVariant3: {
    image: 'decorators/Bones_shadow3_3.png',
    size: 32,
    index: 0,
  },
  bonesVariant15: {
    image: 'decorators/Bones_shadow3_15.png',
    size: 32,
    index: 0,
  },
  bonesVariant16: {
    image: 'decorators/Bones_shadow3_16.png',
    size: 32,
    index: 0,
  },
  bonesVariant18: {
    image: 'decorators/Bones_shadow3_18.png',
    size: 32,
    index: 0,
  },
  plantVariant4: {
    image: 'decorators/Plant__shadow2_4.png',
    size: 32,
    index: 0,
  },
  rockVariant4: {
    image: 'decorators/Rock_shadow2_4.png',
    size: 32,
    index: 0,
  },
  ruinVariant5: {
    image: 'decorators/Ruin_shadow2_5.png',
    size: 32,
    index: 0,
  },
} satisfies Record<string, ItemSprite>;

// Each entry is an alpha-bounds crop in supplies_objects.png. Presets follow
// the sheet's broad visual reading order; each rectangle gives exact pixels.
const suppliesObjectFrames = {
  suppliesObject001: { x: 146, y: 10, width: 29, height: 45 },
  suppliesObject002: { x: 178, y: 11, width: 29, height: 44 },
  suppliesObject003: { x: 2, y: 12, width: 45, height: 43 },
  suppliesObject004: { x: 50, y: 12, width: 45, height: 43 },
  suppliesObject005: { x: 98, y: 12, width: 45, height: 43 },
  suppliesObject006: { x: 2, y: 76, width: 45, height: 43 },
  suppliesObject007: { x: 50, y: 75, width: 45, height: 44 },
  suppliesObject008: { x: 98, y: 74, width: 45, height: 45 },
  suppliesObject009: { x: 146, y: 76, width: 29, height: 43 },
  suppliesObject010: { x: 178, y: 76, width: 29, height: 43 },
  suppliesObject011: { x: 0, y: 133, width: 16, height: 15 },
  suppliesObject012: { x: 18, y: 134, width: 13, height: 14 },
  suppliesObject013: { x: 34, y: 136, width: 10, height: 12 },
  suppliesObject014: { x: 48, y: 133, width: 16, height: 15 },
  suppliesObject015: { x: 66, y: 134, width: 13, height: 14 },
  suppliesObject016: { x: 82, y: 136, width: 11, height: 12 },
  suppliesObject017: { x: 96, y: 133, width: 16, height: 15 },
  suppliesObject018: { x: 114, y: 135, width: 13, height: 13 },
  suppliesObject019: { x: 130, y: 136, width: 10, height: 12 },
  suppliesObject020: { x: 148, y: 138, width: 28, height: 36 },
  suppliesObject021: { x: 182, y: 139, width: 26, height: 34 },
  suppliesObject022: { x: 0, y: 165, width: 16, height: 18 },
  suppliesObject023: { x: 18, y: 166, width: 13, height: 17 },
  suppliesObject024: { x: 33, y: 168, width: 13, height: 16 },
  suppliesObject025: { x: 48, y: 165, width: 16, height: 17 },
  suppliesObject026: { x: 66, y: 166, width: 13, height: 16 },
  suppliesObject027: { x: 82, y: 168, width: 11, height: 14 },
  suppliesObject028: { x: 96, y: 165, width: 16, height: 20 },
  suppliesObject029: { x: 113, y: 167, width: 15, height: 16 },
  suppliesObject030: { x: 129, y: 168, width: 11, height: 15 },
  suppliesObject031: { x: 148, y: 183, width: 28, height: 36 },
  suppliesObject032: { x: 179, y: 188, width: 28, height: 34 },
  suppliesObject033: { x: 0, y: 197, width: 16, height: 15 },
  suppliesObject034: { x: 18, y: 198, width: 13, height: 14 },
  suppliesObject035: { x: 34, y: 200, width: 10, height: 12 },
  suppliesObject036: { x: 48, y: 197, width: 16, height: 15 },
  suppliesObject037: { x: 66, y: 198, width: 13, height: 14 },
  suppliesObject038: { x: 82, y: 200, width: 11, height: 12 },
  suppliesObject039: { x: 96, y: 197, width: 16, height: 15 },
  suppliesObject040: { x: 114, y: 199, width: 13, height: 13 },
  suppliesObject041: { x: 130, y: 200, width: 10, height: 12 },
  suppliesObject042: { x: 0, y: 229, width: 16, height: 18 },
  suppliesObject043: { x: 18, y: 230, width: 13, height: 17 },
  suppliesObject044: { x: 33, y: 232, width: 13, height: 16 },
  suppliesObject045: { x: 48, y: 229, width: 16, height: 17 },
  suppliesObject046: { x: 66, y: 230, width: 13, height: 16 },
  suppliesObject047: { x: 82, y: 232, width: 11, height: 14 },
  suppliesObject048: { x: 96, y: 229, width: 16, height: 20 },
  suppliesObject049: { x: 113, y: 231, width: 15, height: 16 },
  suppliesObject050: { x: 129, y: 232, width: 11, height: 15 },
  suppliesObject051: { x: 177, y: 226, width: 27, height: 37 },
  suppliesObject052: { x: 151, y: 238, width: 25, height: 33 },
  suppliesObject053: { x: 0, y: 258, width: 16, height: 18 },
  suppliesObject054: { x: 17, y: 261, width: 13, height: 15 },
  suppliesObject055: { x: 34, y: 264, width: 12, height: 12 },
  suppliesObject056: { x: 52, y: 266, width: 9, height: 9 },
  suppliesObject057: { x: 64, y: 263, width: 16, height: 13 },
  suppliesObject058: { x: 82, y: 264, width: 13, height: 12 },
  suppliesObject059: { x: 98, y: 266, width: 10, height: 10 },
  suppliesObject060: { x: 112, y: 258, width: 16, height: 18 },
  suppliesObject061: { x: 129, y: 261, width: 13, height: 15 },
  suppliesObject062: { x: 146, y: 275, width: 57, height: 43 },
  suppliesObject063: { x: 0, y: 290, width: 32, height: 22 },
  suppliesObject064: { x: 33, y: 296, width: 13, height: 15 },
  suppliesObject065: { x: 51, y: 298, width: 10, height: 12 },
  suppliesObject066: { x: 64, y: 295, width: 16, height: 13 },
  suppliesObject067: { x: 82, y: 296, width: 13, height: 12 },
  suppliesObject068: { x: 98, y: 298, width: 10, height: 10 },
  suppliesObject069: { x: 114, y: 295, width: 12, height: 13 },
  suppliesObject070: { x: 132, y: 298, width: 9, height: 9 },
  suppliesObject071: { x: 7, y: 324, width: 33, height: 40 },
  suppliesObject072: { x: 54, y: 329, width: 24, height: 31 },
  suppliesObject073: { x: 82, y: 334, width: 29, height: 30 },
  suppliesObject074: { x: 117, y: 337, width: 22, height: 21 },
  suppliesObject075: { x: 148, y: 337, width: 23, height: 24 },
  suppliesObject076: { x: 180, y: 338, width: 23, height: 22 },
  suppliesObject077: { x: 1, y: 384, width: 47, height: 25 },
  suppliesObject078: { x: 49, y: 368, width: 47, height: 45 },
  suppliesObject079: { x: 97, y: 372, width: 47, height: 39 },
  suppliesObject080: { x: 145, y: 378, width: 63, height: 36 },
  suppliesObject081: { x: 1, y: 432, width: 47, height: 25 },
  suppliesObject082: { x: 49, y: 416, width: 47, height: 46 },
  suppliesObject083: { x: 96, y: 416, width: 48, height: 45 },
  suppliesObject084: { x: 145, y: 420, width: 31, height: 39 },
  suppliesObject085: { x: 177, y: 426, width: 31, height: 31 },
  suppliesObject086: { x: 4, y: 472, width: 24, height: 33 },
  suppliesObject087: { x: 36, y: 472, width: 24, height: 33 },
  suppliesObject088: { x: 64, y: 472, width: 32, height: 33 },
  suppliesObject089: { x: 98, y: 472, width: 30, height: 35 },
  suppliesObject090: { x: 130, y: 472, width: 25, height: 33 },
  suppliesObject091: { x: 160, y: 472, width: 32, height: 37 },
  suppliesObject092: { x: 197, y: 491, width: 7, height: 20 },
  suppliesObject093: { x: 35, y: 517, width: 10, height: 10 },
  suppliesObject094: { x: 50, y: 514, width: 13, height: 13 },
  suppliesObject095: { x: 64, y: 512, width: 15, height: 15 },
  suppliesObject096: { x: 85, y: 514, width: 7, height: 13 },
  suppliesObject097: { x: 102, y: 514, width: 5, height: 13 },
  suppliesObject098: { x: 115, y: 517, width: 10, height: 10 },
  suppliesObject099: { x: 131, y: 514, width: 11, height: 13 },
  suppliesObject100: { x: 145, y: 513, width: 14, height: 14 },
  suppliesObject101: { x: 165, y: 513, width: 7, height: 30 },
  suppliesObject102: { x: 179, y: 513, width: 9, height: 30 },
  suppliesObject103: { x: 5, y: 525, width: 7, height: 34 },
  suppliesObject104: { x: 19, y: 525, width: 11, height: 34 },
  suppliesObject105: { x: 36, y: 539, width: 9, height: 20 },
  suppliesObject106: { x: 50, y: 541, width: 11, height: 18 },
  suppliesObject107: { x: 66, y: 541, width: 11, height: 18 },
  suppliesObject108: { x: 81, y: 541, width: 13, height: 18 },
  suppliesObject109: { x: 97, y: 536, width: 10, height: 23 },
  suppliesObject110: { x: 114, y: 535, width: 9, height: 24 },
  suppliesObject111: { x: 130, y: 536, width: 11, height: 23 },
  suppliesObject112: { x: 146, y: 529, width: 8, height: 30 },
  suppliesObject113: { x: 195, y: 525, width: 9, height: 34 },
  suppliesObject114: { x: 0, y: 560, width: 32, height: 25 },
  suppliesObject115: { x: 33, y: 561, width: 13, height: 19 },
  suppliesObject116: { x: 50, y: 566, width: 13, height: 19 },
  suppliesObject117: { x: 65, y: 566, width: 15, height: 14 },
  suppliesObject118: { x: 81, y: 561, width: 15, height: 14 },
  suppliesObject119: { x: 96, y: 561, width: 32, height: 20 },
  suppliesObject120: { x: 130, y: 565, width: 12, height: 11 },
  suppliesObject121: { x: 146, y: 560, width: 12, height: 11 },
  suppliesObject122: { x: 161, y: 555, width: 14, height: 20 },
  suppliesObject123: { x: 179, y: 557, width: 11, height: 18 },
} as const;

const suppliesObjectSprites = Object.fromEntries(
  Object.entries(suppliesObjectFrames).map(([name, sourceRect]) => [
    name,
    {
      image: 'decorators/supplies_objects.png',
      size: Math.max(sourceRect.width, sourceRect.height),
      index: 0,
      sourceRect,
    },
  ]),
) as Record<keyof typeof suppliesObjectFrames, ItemSprite>;

export const DECORATOR_PRESETS = {
  ...decoratorSprites,
  ...suppliesObjectSprites,
} satisfies Record<string, ItemSprite>;

export type DecoratorPresetName = keyof typeof DECORATOR_PRESETS;

const makeDecorator =
  (sprite: ItemSprite) =>
  (
    position: Position,
    alignment: CellAlignment = CellAlignment.CENTER,
  ): Decorator => ({ position, alignment, sprite });

export const createDecoratorPreset = (
  preset: DecoratorPresetName,
  position: Position,
  alignment: CellAlignment = CellAlignment.CENTER,
): Decorator => makeDecorator(DECORATOR_PRESETS[preset])(position, alignment);

export const bonesVariant1 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant1', position);

export const bonesVariant2 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant2', position);

export const bonesVariant3 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant3', position);

export const bonesVariant15 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant15', position);

export const bonesVariant16 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant16', position);

export const bonesVariant18 = (position: Position): Decorator =>
  createDecoratorPreset('bonesVariant18', position);

export const plantVariant4 = (position: Position): Decorator =>
  createDecoratorPreset('plantVariant4', position);

export const rockVariant4 = (position: Position): Decorator =>
  createDecoratorPreset('rockVariant4', position);

export const ruinVariant5 = (position: Position): Decorator =>
  createDecoratorPreset('ruinVariant5', position);

export const suppliesObject = (
  position: Position,
  index: number,
  alignment: CellAlignment = CellAlignment.CENTER,
): Decorator =>
  makeDecorator({
    image: 'decorators/supplies_objects.png',
    size: 16,
    index,
  })(position, alignment);
