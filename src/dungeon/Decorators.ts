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

const isometricDecorator = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DeclarativeDecoratorOptions => ({
  sprites: {
    isometric: {
      image: `isometric/decorators/${name}.png`,
      size: 256,
      index: 0,
      sourceRect: { x, y, width, height },
    },
  },
});

export const barrel_E = isometricDecorator('barrel_E', 79, 378, 80, 83);
export const barrel_N = isometricDecorator('barrel_N', 79, 378, 80, 84);
export const barrel_S = isometricDecorator('barrel_S', 79, 378, 80, 84);
export const barrel_W = isometricDecorator('barrel_W', 79, 378, 80, 84);
export const barrelsStacked_E = isometricDecorator(
  'barrelsStacked_E',
  32,
  336,
  179,
  146,
);
export const barrelsStacked_N = isometricDecorator(
  'barrelsStacked_N',
  33,
  336,
  177,
  146,
);
export const barrelsStacked_S = isometricDecorator(
  'barrelsStacked_S',
  33,
  336,
  177,
  146,
);
export const barrelsStacked_W = isometricDecorator(
  'barrelsStacked_W',
  33,
  336,
  177,
  146,
);
export const barrels_E = isometricDecorator('barrels_E', 37, 363, 151, 109);
export const barrels_N = isometricDecorator('barrels_N', 48, 368, 142, 115);
export const barrels_S = isometricDecorator('barrels_S', 53, 357, 137, 117);
export const barrels_W = isometricDecorator('barrels_W', 50, 374, 151, 102);
export const bookStandEmpty_E = isometricDecorator(
  'bookStandEmpty_E',
  81,
  373,
  67,
  83,
);
export const bookStandEmpty_N = isometricDecorator(
  'bookStandEmpty_N',
  82,
  379,
  67,
  77,
);
export const bookStandEmpty_S = isometricDecorator(
  'bookStandEmpty_S',
  84,
  373,
  64,
  83,
);
export const bookStandEmpty_W = isometricDecorator(
  'bookStandEmpty_W',
  85,
  379,
  64,
  77,
);
export const bookStand_E = isometricDecorator('bookStand_E', 81, 373, 67, 83);
export const bookStand_N = isometricDecorator('bookStand_N', 82, 379, 67, 77);
export const bookStand_S = isometricDecorator('bookStand_S', 84, 373, 64, 83);
export const bookStand_W = isometricDecorator('bookStand_W', 85, 379, 64, 77);
export const bookcaseBooksLadder_E = isometricDecorator(
  'bookcaseBooksLadder_E',
  5,
  277,
  168,
  198,
);
export const bookcaseBooksLadder_N = isometricDecorator(
  'bookcaseBooksLadder_N',
  5,
  288,
  179,
  194,
);
export const bookcaseBooksLadder_S = isometricDecorator(
  'bookcaseBooksLadder_S',
  27,
  277,
  168,
  194,
);
export const bookcaseBooksLadder_W = isometricDecorator(
  'bookcaseBooksLadder_W',
  27,
  288,
  168,
  194,
);
export const bookcaseBooks_E = isometricDecorator(
  'bookcaseBooks_E',
  5,
  277,
  168,
  194,
);
export const bookcaseBooks_N = isometricDecorator(
  'bookcaseBooks_N',
  5,
  288,
  168,
  194,
);
export const bookcaseBooks_S = isometricDecorator(
  'bookcaseBooks_S',
  27,
  277,
  168,
  194,
);
export const bookcaseBooks_W = isometricDecorator(
  'bookcaseBooks_W',
  27,
  288,
  168,
  194,
);
export const bookcaseDestroyed_E = isometricDecorator(
  'bookcaseDestroyed_E',
  5,
  277,
  168,
  194,
);
export const bookcaseDestroyed_N = isometricDecorator(
  'bookcaseDestroyed_N',
  5,
  288,
  168,
  194,
);
export const bookcaseDestroyed_S = isometricDecorator(
  'bookcaseDestroyed_S',
  27,
  277,
  168,
  194,
);
export const bookcaseDestroyed_W = isometricDecorator(
  'bookcaseDestroyed_W',
  27,
  288,
  168,
  194,
);
export const bookcaseEmptyLadder_E = isometricDecorator(
  'bookcaseEmptyLadder_E',
  5,
  277,
  168,
  198,
);
export const bookcaseEmptyLadder_N = isometricDecorator(
  'bookcaseEmptyLadder_N',
  5,
  288,
  179,
  194,
);
export const bookcaseEmptyLadder_S = isometricDecorator(
  'bookcaseEmptyLadder_S',
  27,
  277,
  168,
  194,
);
export const bookcaseEmptyLadder_W = isometricDecorator(
  'bookcaseEmptyLadder_W',
  27,
  288,
  168,
  194,
);
export const bookcaseEmpty_E = isometricDecorator(
  'bookcaseEmpty_E',
  5,
  277,
  168,
  194,
);
export const bookcaseEmpty_N = isometricDecorator(
  'bookcaseEmpty_N',
  5,
  288,
  168,
  194,
);
export const bookcaseEmpty_S = isometricDecorator(
  'bookcaseEmpty_S',
  27,
  277,
  168,
  194,
);
export const bookcaseEmpty_W = isometricDecorator(
  'bookcaseEmpty_W',
  27,
  288,
  168,
  194,
);
export const bookcaseFallen_E = isometricDecorator(
  'bookcaseFallen_E',
  36,
  365,
  186,
  116,
);
export const bookcaseFallen_N = isometricDecorator(
  'bookcaseFallen_N',
  34,
  357,
  161,
  128,
);
export const bookcaseFallen_S = isometricDecorator(
  'bookcaseFallen_S',
  44,
  366,
  161,
  129,
);
export const bookcaseFallen_W = isometricDecorator(
  'bookcaseFallen_W',
  17,
  370,
  186,
  116,
);
export const bookcaseGlass_E = isometricDecorator(
  'bookcaseGlass_E',
  5,
  277,
  168,
  194,
);
export const bookcaseGlass_N = isometricDecorator(
  'bookcaseGlass_N',
  5,
  288,
  168,
  194,
);
export const bookcaseGlass_S = isometricDecorator(
  'bookcaseGlass_S',
  27,
  277,
  168,
  194,
);
export const bookcaseGlass_W = isometricDecorator(
  'bookcaseGlass_W',
  27,
  288,
  168,
  194,
);
export const bookcaseHalfBooks_E = isometricDecorator(
  'bookcaseHalfBooks_E',
  30,
  337,
  143,
  134,
);
export const bookcaseHalfBooks_N = isometricDecorator(
  'bookcaseHalfBooks_N',
  30,
  348,
  143,
  134,
);
export const bookcaseHalfBooks_S = isometricDecorator(
  'bookcaseHalfBooks_S',
  51,
  337,
  144,
  134,
);
export const bookcaseHalfBooks_W = isometricDecorator(
  'bookcaseHalfBooks_W',
  51,
  348,
  144,
  134,
);
export const bookcaseHalfEmpty_E = isometricDecorator(
  'bookcaseHalfEmpty_E',
  30,
  337,
  143,
  134,
);
export const bookcaseHalfEmpty_N = isometricDecorator(
  'bookcaseHalfEmpty_N',
  30,
  348,
  143,
  134,
);
export const bookcaseHalfEmpty_S = isometricDecorator(
  'bookcaseHalfEmpty_S',
  51,
  337,
  144,
  134,
);
export const bookcaseHalfEmpty_W = isometricDecorator(
  'bookcaseHalfEmpty_W',
  51,
  348,
  144,
  134,
);
export const bookcaseHalfWideBooks_E = isometricDecorator(
  'bookcaseHalfWideBooks_E',
  1,
  323,
  201,
  162,
);
export const bookcaseHalfWideBooks_N = isometricDecorator(
  'bookcaseHalfWideBooks_N',
  1,
  334,
  201,
  162,
);
export const bookcaseHalfWideBooks_S = isometricDecorator(
  'bookcaseHalfWideBooks_S',
  23,
  323,
  200,
  162,
);
export const bookcaseHalfWideBooks_W = isometricDecorator(
  'bookcaseHalfWideBooks_W',
  23,
  334,
  200,
  162,
);
export const bookcaseHalfWideEmpty_E = isometricDecorator(
  'bookcaseHalfWideEmpty_E',
  1,
  323,
  201,
  162,
);
export const bookcaseHalfWideEmpty_N = isometricDecorator(
  'bookcaseHalfWideEmpty_N',
  1,
  334,
  201,
  162,
);
export const bookcaseHalfWideEmpty_S = isometricDecorator(
  'bookcaseHalfWideEmpty_S',
  23,
  323,
  200,
  162,
);
export const bookcaseHalfWideEmpty_W = isometricDecorator(
  'bookcaseHalfWideEmpty_W',
  23,
  334,
  200,
  162,
);
export const bookcaseWideBooksDesk_E = isometricDecorator(
  'bookcaseWideBooksDesk_E',
  0,
  263,
  218,
  229,
);
export const bookcaseWideBooksDesk_N = isometricDecorator(
  'bookcaseWideBooksDesk_N',
  0,
  274,
  218,
  222,
);
export const bookcaseWideBooksDesk_S = isometricDecorator(
  'bookcaseWideBooksDesk_S',
  0,
  263,
  223,
  229,
);
export const bookcaseWideBooksDesk_W = isometricDecorator(
  'bookcaseWideBooksDesk_W',
  0,
  274,
  223,
  222,
);
export const bookcaseWideBooksLadder_E = isometricDecorator(
  'bookcaseWideBooksLadder_E',
  0,
  263,
  202,
  222,
);
export const bookcaseWideBooksLadder_N = isometricDecorator(
  'bookcaseWideBooksLadder_N',
  0,
  274,
  202,
  222,
);
export const bookcaseWideBooksLadder_S = isometricDecorator(
  'bookcaseWideBooksLadder_S',
  0,
  263,
  223,
  222,
);
export const bookcaseWideBooksLadder_W = isometricDecorator(
  'bookcaseWideBooksLadder_W',
  0,
  274,
  223,
  222,
);
export const bookcaseWideBooks_E = isometricDecorator(
  'bookcaseWideBooks_E',
  0,
  263,
  202,
  222,
);
export const bookcaseWideBooks_N = isometricDecorator(
  'bookcaseWideBooks_N',
  0,
  274,
  202,
  222,
);
export const bookcaseWideBooks_S = isometricDecorator(
  'bookcaseWideBooks_S',
  0,
  263,
  223,
  222,
);
export const bookcaseWideBooks_W = isometricDecorator(
  'bookcaseWideBooks_W',
  0,
  274,
  223,
  222,
);
export const bookcaseWideEmptyLadder_E = isometricDecorator(
  'bookcaseWideEmptyLadder_E',
  0,
  263,
  202,
  222,
);
export const bookcaseWideEmptyLadder_N = isometricDecorator(
  'bookcaseWideEmptyLadder_N',
  0,
  274,
  202,
  222,
);
export const bookcaseWideEmptyLadder_S = isometricDecorator(
  'bookcaseWideEmptyLadder_S',
  0,
  263,
  223,
  222,
);
export const bookcaseWideEmptyLadder_W = isometricDecorator(
  'bookcaseWideEmptyLadder_W',
  0,
  274,
  223,
  222,
);
export const bookcaseWideEmpty_E = isometricDecorator(
  'bookcaseWideEmpty_E',
  0,
  263,
  202,
  222,
);
export const bookcaseWideEmpty_N = isometricDecorator(
  'bookcaseWideEmpty_N',
  0,
  274,
  202,
  222,
);
export const bookcaseWideEmpty_S = isometricDecorator(
  'bookcaseWideEmpty_S',
  0,
  263,
  223,
  222,
);
export const bookcaseWideEmpty_W = isometricDecorator(
  'bookcaseWideEmpty_W',
  0,
  274,
  223,
  222,
);
export const displayCaseBooks_E = isometricDecorator(
  'displayCaseBooks_E',
  19,
  331,
  170,
  147,
);
export const displayCaseBooks_N = isometricDecorator(
  'displayCaseBooks_N',
  19,
  350,
  170,
  139,
);
export const displayCaseBooks_S = isometricDecorator(
  'displayCaseBooks_S',
  41,
  331,
  170,
  147,
);
export const displayCaseBooks_W = isometricDecorator(
  'displayCaseBooks_W',
  41,
  350,
  170,
  139,
);
export const displayCaseOpen_E = isometricDecorator(
  'displayCaseOpen_E',
  19,
  342,
  170,
  136,
);
export const displayCaseOpen_N = isometricDecorator(
  'displayCaseOpen_N',
  19,
  353,
  170,
  136,
);
export const displayCaseOpen_S = isometricDecorator(
  'displayCaseOpen_S',
  41,
  342,
  170,
  136,
);
export const displayCaseOpen_W = isometricDecorator(
  'displayCaseOpen_W',
  41,
  353,
  170,
  136,
);
export const displayCaseSword_E = isometricDecorator(
  'displayCaseSword_E',
  19,
  331,
  170,
  147,
);
export const displayCaseSword_N = isometricDecorator(
  'displayCaseSword_N',
  19,
  350,
  170,
  139,
);
export const displayCaseSword_S = isometricDecorator(
  'displayCaseSword_S',
  41,
  331,
  170,
  147,
);
export const displayCaseSword_W = isometricDecorator(
  'displayCaseSword_W',
  41,
  350,
  170,
  139,
);
export const displayCase_E = isometricDecorator(
  'displayCase_E',
  19,
  331,
  170,
  147,
);
export const displayCase_N = isometricDecorator(
  'displayCase_N',
  19,
  350,
  170,
  139,
);
export const displayCase_S = isometricDecorator(
  'displayCase_S',
  41,
  331,
  170,
  147,
);
export const displayCase_W = isometricDecorator(
  'displayCase_W',
  41,
  350,
  170,
  139,
);
export const floorCarpetEnd_E = isometricDecorator(
  'floorCarpetEnd_E',
  31,
  430,
  129,
  65,
);
export const floorCarpetEnd_N = isometricDecorator(
  'floorCarpetEnd_N',
  96,
  430,
  129,
  65,
);
export const floorCarpetEnd_S = isometricDecorator(
  'floorCarpetEnd_S',
  31,
  397,
  129,
  66,
);
export const floorCarpetEnd_W = isometricDecorator(
  'floorCarpetEnd_W',
  96,
  397,
  129,
  66,
);
export const floorCarpetSmall_E = isometricDecorator(
  'floorCarpetSmall_E',
  30,
  397,
  196,
  98,
);
export const floorCarpetSmall_N = isometricDecorator(
  'floorCarpetSmall_N',
  30,
  397,
  196,
  98,
);
export const floorCarpetSmall_S = isometricDecorator(
  'floorCarpetSmall_S',
  30,
  397,
  196,
  98,
);
export const floorCarpetSmall_W = isometricDecorator(
  'floorCarpetSmall_W',
  30,
  397,
  196,
  98,
);
export const floorCarpet_E = isometricDecorator(
  'floorCarpet_E',
  31,
  397,
  194,
  98,
);
export const floorCarpet_N = isometricDecorator(
  'floorCarpet_N',
  31,
  397,
  194,
  98,
);
export const floorCarpet_S = isometricDecorator(
  'floorCarpet_S',
  31,
  397,
  194,
  98,
);
export const floorCarpet_W = isometricDecorator(
  'floorCarpet_W',
  31,
  397,
  194,
  98,
);
export const hayBalesStacked_E = isometricDecorator(
  'hayBalesStacked_E',
  22,
  346,
  189,
  143,
);
export const hayBalesStacked_N = isometricDecorator(
  'hayBalesStacked_N',
  15,
  350,
  196,
  139,
);
export const hayBalesStacked_S = isometricDecorator(
  'hayBalesStacked_S',
  22,
  349,
  196,
  141,
);
export const hayBalesStacked_W = isometricDecorator(
  'hayBalesStacked_W',
  25,
  349,
  187,
  142,
);
export const hayBales_E = isometricDecorator('hayBales_E', 59, 372, 125, 102);
export const hayBales_N = isometricDecorator('hayBales_N', 59, 376, 123, 100);
export const hayBales_S = isometricDecorator('hayBales_S', 63, 376, 123, 99);
export const hayBales_W = isometricDecorator('hayBales_W', 61, 374, 125, 102);
export const hay_E = isometricDecorator('hay_E', 79, 401, 88, 66);
export const hay_N = isometricDecorator('hay_N', 79, 401, 88, 66);
export const hay_S = isometricDecorator('hay_S', 79, 401, 88, 66);
export const hay_W = isometricDecorator('hay_W', 79, 401, 88, 66);
export const libraryChair_E = isometricDecorator(
  'libraryChair_E',
  89,
  388,
  59,
  70,
);
export const libraryChair_N = isometricDecorator(
  'libraryChair_N',
  89,
  395,
  58,
  63,
);
export const libraryChair_S = isometricDecorator(
  'libraryChair_S',
  98,
  388,
  49,
  70,
);
export const libraryChair_W = isometricDecorator(
  'libraryChair_W',
  97,
  395,
  50,
  63,
);
export const longTableChairs_E = isometricDecorator(
  'longTableChairs_E',
  38,
  365,
  159,
  118,
);
export const longTableChairs_N = isometricDecorator(
  'longTableChairs_N',
  43,
  365,
  158,
  118,
);
export const longTableChairs_S = isometricDecorator(
  'longTableChairs_S',
  39,
  362,
  158,
  118,
);
export const longTableChairs_W = isometricDecorator(
  'longTableChairs_W',
  43,
  363,
  158,
  118,
);
export const longTableDecoratedChairsBooks_E = isometricDecorator(
  'longTableDecoratedChairsBooks_E',
  38,
  362,
  159,
  121,
);
export const longTableDecoratedChairsBooks_N = isometricDecorator(
  'longTableDecoratedChairsBooks_N',
  39,
  365,
  162,
  118,
);
export const longTableDecoratedChairsBooks_S = isometricDecorator(
  'longTableDecoratedChairsBooks_S',
  39,
  362,
  158,
  118,
);
export const longTableDecoratedChairsBooks_W = isometricDecorator(
  'longTableDecoratedChairsBooks_W',
  43,
  363,
  158,
  120,
);
export const longTableDecoratedChairs_E = isometricDecorator(
  'longTableDecoratedChairs_E',
  38,
  365,
  160,
  118,
);
export const longTableDecoratedChairs_N = isometricDecorator(
  'longTableDecoratedChairs_N',
  43,
  365,
  158,
  118,
);
export const longTableDecoratedChairs_S = isometricDecorator(
  'longTableDecoratedChairs_S',
  39,
  362,
  158,
  118,
);
export const longTableDecoratedChairs_W = isometricDecorator(
  'longTableDecoratedChairs_W',
  43,
  363,
  158,
  118,
);
export const longTableDecorated_E = isometricDecorator(
  'longTableDecorated_E',
  39,
  374,
  158,
  105,
);
export const longTableDecorated_N = isometricDecorator(
  'longTableDecorated_N',
  43,
  374,
  158,
  105,
);
export const longTableDecorated_S = isometricDecorator(
  'longTableDecorated_S',
  39,
  372,
  158,
  105,
);
export const longTableDecorated_W = isometricDecorator(
  'longTableDecorated_W',
  43,
  372,
  158,
  105,
);
export const longTableLarge_E = isometricDecorator(
  'longTableLarge_E',
  28,
  360,
  179,
  128,
);
export const longTableLarge_N = isometricDecorator(
  'longTableLarge_N',
  33,
  360,
  178,
  128,
);
export const longTableLarge_S = isometricDecorator(
  'longTableLarge_S',
  29,
  357,
  179,
  128,
);
export const longTableLarge_W = isometricDecorator(
  'longTableLarge_W',
  33,
  358,
  178,
  128,
);
export const longTable_E = isometricDecorator('longTable_E', 39, 374, 158, 105);
export const longTable_N = isometricDecorator('longTable_N', 43, 374, 158, 105);
export const longTable_S = isometricDecorator('longTable_S', 39, 372, 158, 105);
export const longTable_W = isometricDecorator('longTable_W', 43, 372, 158, 105);
export const sack_E = isometricDecorator('sack_E', 88, 402, 49, 54);
export const sack_N = isometricDecorator('sack_N', 100, 407, 47, 51);
export const sack_S = isometricDecorator('sack_S', 98, 395, 43, 55);
export const sack_W = isometricDecorator('sack_W', 109, 400, 42, 52);
export const sacksCrate_E = isometricDecorator('sacksCrate_E', 71, 401, 92, 68);
export const sacksCrate_N = isometricDecorator(
  'sacksCrate_N',
  65,
  395,
  107,
  74,
);
export const sacksCrate_S = isometricDecorator(
  'sacksCrate_S',
  70,
  389,
  116,
  74,
);
export const sacksCrate_W = isometricDecorator('sacksCrate_W', 86, 387, 84, 87);
export const tableChairsBroken_E = isometricDecorator(
  'tableChairsBroken_E',
  61,
  379,
  130,
  100,
);
export const tableChairsBroken_N = isometricDecorator(
  'tableChairsBroken_N',
  62,
  367,
  129,
  106,
);
export const tableChairsBroken_S = isometricDecorator(
  'tableChairsBroken_S',
  49,
  391,
  133,
  88,
);
export const tableChairsBroken_W = isometricDecorator(
  'tableChairsBroken_W',
  50,
  378,
  136,
  96,
);
export const tableRoundChairs_E = isometricDecorator(
  'tableRoundChairs_E',
  57,
  368,
  127,
  107,
);
export const tableRoundChairs_N = isometricDecorator(
  'tableRoundChairs_N',
  55,
  366,
  125,
  106,
);
export const tableRoundChairs_S = isometricDecorator(
  'tableRoundChairs_S',
  54,
  370,
  125,
  106,
);
export const tableRoundChairs_W = isometricDecorator(
  'tableRoundChairs_W',
  50,
  368,
  126,
  106,
);
export const tableRoundItemsChairs_E = isometricDecorator(
  'tableRoundItemsChairs_E',
  48,
  368,
  136,
  106,
);
export const tableRoundItemsChairs_N = isometricDecorator(
  'tableRoundItemsChairs_N',
  54,
  366,
  125,
  111,
);
export const tableRoundItemsChairs_S = isometricDecorator(
  'tableRoundItemsChairs_S',
  55,
  365,
  125,
  111,
);
export const tableRoundItemsChairs_W = isometricDecorator(
  'tableRoundItemsChairs_W',
  51,
  368,
  135,
  107,
);
export const tableRound_E = isometricDecorator('tableRound_E', 74, 388, 94, 76);
export const tableRound_N = isometricDecorator('tableRound_N', 75, 387, 93, 77);
export const tableRound_S = isometricDecorator('tableRound_S', 71, 388, 94, 77);
export const tableRound_W = isometricDecorator('tableRound_W', 72, 386, 94, 78);
export const tableShortChairs_E = isometricDecorator(
  'tableShortChairs_E',
  56,
  369,
  123,
  104,
);
export const tableShortChairs_N = isometricDecorator(
  'tableShortChairs_N',
  56,
  369,
  121,
  104,
);
export const tableShortChairs_S = isometricDecorator(
  'tableShortChairs_S',
  57,
  369,
  123,
  105,
);
export const tableShortChairs_W = isometricDecorator(
  'tableShortChairs_W',
  57,
  369,
  121,
  104,
);
export const tableShort_E = isometricDecorator(
  'tableShort_E',
  63,
  380,
  117,
  88,
);
export const tableShort_N = isometricDecorator(
  'tableShort_N',
  60,
  379,
  118,
  87,
);
export const tableShort_S = isometricDecorator(
  'tableShort_S',
  61,
  381,
  118,
  89,
);
export const tableShort_W = isometricDecorator(
  'tableShort_W',
  59,
  380,
  117,
  89,
);
export const woodenCrate_E = isometricDecorator(
  'woodenCrate_E',
  76,
  388,
  87,
  78,
);
export const woodenCrate_N = isometricDecorator(
  'woodenCrate_N',
  76,
  388,
  87,
  78,
);
export const woodenCrate_S = isometricDecorator(
  'woodenCrate_S',
  76,
  388,
  87,
  78,
);
export const woodenCrate_W = isometricDecorator(
  'woodenCrate_W',
  76,
  388,
  87,
  78,
);
export const woodenCrates_E = isometricDecorator(
  'woodenCrates_E',
  61,
  372,
  113,
  94,
);
export const woodenCrates_N = isometricDecorator(
  'woodenCrates_N',
  75,
  375,
  90,
  100,
);
export const woodenCrates_S = isometricDecorator(
  'woodenCrates_S',
  78,
  374,
  90,
  97,
);
export const woodenCrates_W = isometricDecorator(
  'woodenCrates_W',
  70,
  377,
  112,
  91,
);
export const woodenPile_E = isometricDecorator(
  'woodenPile_E',
  64,
  370,
  128,
  104,
);
export const woodenPile_N = isometricDecorator(
  'woodenPile_N',
  34,
  372,
  152,
  106,
);
export const woodenPile_S = isometricDecorator(
  'woodenPile_S',
  52,
  378,
  155,
  103,
);
export const woodenPile_W = isometricDecorator(
  'woodenPile_W',
  54,
  365,
  138,
  122,
);
export const woodenSupportBeams_E = isometricDecorator(
  'woodenSupportBeams_E',
  0,
  230,
  141,
  225,
);
export const woodenSupportBeams_N = isometricDecorator(
  'woodenSupportBeams_N',
  0,
  288,
  141,
  224,
);
export const woodenSupportBeams_S = isometricDecorator(
  'woodenSupportBeams_S',
  115,
  230,
  141,
  225,
);
export const woodenSupportBeams_W = isometricDecorator(
  'woodenSupportBeams_W',
  115,
  288,
  141,
  224,
);
export const woodenSupportsBeam_E = isometricDecorator(
  'woodenSupportsBeam_E',
  0,
  230,
  141,
  225,
);
export const woodenSupportsBeam_N = isometricDecorator(
  'woodenSupportsBeam_N',
  0,
  288,
  141,
  224,
);
export const woodenSupportsBeam_S = isometricDecorator(
  'woodenSupportsBeam_S',
  115,
  230,
  141,
  225,
);
export const woodenSupportsBeam_W = isometricDecorator(
  'woodenSupportsBeam_W',
  115,
  288,
  141,
  224,
);
export const woodenSupportsBlock_E = isometricDecorator(
  'woodenSupportsBlock_E',
  0,
  230,
  256,
  282,
);
export const woodenSupportsBlock_N = isometricDecorator(
  'woodenSupportsBlock_N',
  0,
  230,
  256,
  282,
);
export const woodenSupportsBlock_S = isometricDecorator(
  'woodenSupportsBlock_S',
  0,
  230,
  256,
  282,
);
export const woodenSupportsBlock_W = isometricDecorator(
  'woodenSupportsBlock_W',
  0,
  230,
  256,
  282,
);
export const woodenSupports_E = isometricDecorator(
  'woodenSupports_E',
  0,
  230,
  141,
  225,
);
export const woodenSupports_N = isometricDecorator(
  'woodenSupports_N',
  0,
  288,
  141,
  224,
);
export const woodenSupports_S = isometricDecorator(
  'woodenSupports_S',
  115,
  230,
  141,
  225,
);
export const woodenSupports_W = isometricDecorator(
  'woodenSupports_W',
  115,
  288,
  141,
  224,
);
