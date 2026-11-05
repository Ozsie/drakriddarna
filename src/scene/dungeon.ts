// Dungeon-plane view contracts — the second seam the future
// @hoard-engine/scene consumes (docs/engine-packages.md, step 9): the
// static world layers (grid, walls, doors, secrets, terrain, fog,
// pillars, pits, interactables, portal, corners) read only these plain
// shapes. The game's `Dungeon` satisfies `SceneDungeonView` structurally
// (its enums carry these literal strings), so the game passes its own
// data and no shared type hub exists — the same consumer-defined
// contract rule the grid package's `PassableGrid` follows.

import type { ScenePoint } from './contracts';

// The four shared cell-edge directions of doors and edge walls. The
// game's `Side` enum members carry exactly these strings, so game data
// passes by structural compatibility without a shared import.
export type SceneSide = 'Left' | 'Right' | 'Up' | 'Down';

// A door on the edge between two cells — closed, open, hidden or
// trapped; the paint rules live with the renderer.
export type SceneDoor = {
  x: number;
  y: number;
  side: SceneSide;
  open: boolean;
  hidden?: boolean;
  locked?: boolean;
  trapped?: boolean;
  trapAttacks?: number;
};

// A wall on the shared edge of two floor cells, not a full grid cell.
export type SceneEdgeWall = {
  x: number;
  y: number;
  side: SceneSide;
  colour?: string;
};

// A secret on the floor: `type` is an open string (the game's secret
// vocabulary); unknown types render as the generic marker.
export type SceneSecret = {
  position: ScenePoint;
  found: boolean;
  type: string;
};

// A floor cell with a terrain material (water, lava, ...).
export type SceneTerrainCell = {
  position: ScenePoint;
  type: string;
  color?: string;
  opacity?: number;
  rate?: number;
};

// Atmospheric fog filling every cell of a room or corridor.
export type SceneFogOptions = {
  color?: string;
  opacity?: number;
  rate?: number;
  softness?: number;
  density?: number;
  blocksLight?: boolean;
};

// An interactable cell on the floor.
export type SceneInteractable = {
  position: ScenePoint;
  effect: string;
  secret?: boolean;
};

// A classified corner: `type` is an open string from the corner-type
// vocabulary (the grid engine re-exports it as `CornerType`).
export type SceneCorner = {
  position: ScenePoint;
  type: string;
};

// The whole dungeon plane the renderer consumes: grid letters, doors,
// walls, terrain, fog, pillars, pits, secrets, interactables, the
// portal and the discovered-room set that resolves visibility. Nothing
// beyond these fields is read.
export type SceneDungeonView = {
  name: string;
  discoveredRooms: string[];
  portal?: ScenePoint;
  layout: {
    grid: string[];
    doors: SceneDoor[];
    walls?: SceneEdgeWall[];
    secrets: SceneSecret[];
    terrain?: SceneTerrainCell[];
    roomFog?: Record<string, SceneFogOptions>;
    pillars?: ScenePoint[];
    pits?: ScenePoint[];
    interactables?: SceneInteractable[];
    wallColour?: string;
  };
};
