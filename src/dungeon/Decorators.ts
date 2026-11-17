import type { DeclarativeDecoratorOptions } from './dungeonParser.ts';

export const bones: DeclarativeDecoratorOptions = {
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
};
