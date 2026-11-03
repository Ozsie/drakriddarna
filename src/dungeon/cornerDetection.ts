// Game-side facade: the corner-classification algorithm lives in the
// @hoard-engine/grid engine package (published on npm, consumed as a
// dependency); this module keeps the historical import path for the
// dungeon parser and renderer. `CornerType` and `Corner` are owned by the
// package and re-exported from src/types.ts.
export { autoDetectCorners, detectCornerType } from '@hoard-engine/grid';
