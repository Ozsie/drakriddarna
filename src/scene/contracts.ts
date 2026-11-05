// Scene view-model contracts — the seam the future `@hoard-engine/scene`
// renderer consumes (docs/engine-packages.md, step 9). The renderer gets
// plain view models only — never GameState, Actor, Monster, Item or any
// game type. The game side builds them in `src/scene/adapters.ts` (the
// src/ui/viewmodels role for the world canvas); named tile references and
// resolved texts are game content and arrive as data.

// A cell position on the world grid; y grows downward. Fractional values
// occur while an actor moves between cells (the visual, animated position).
// Structurally compatible with the game's Position — the scene declares
// the two fields it needs instead of a shared type hub.
export type ScenePoint = { x: number; y: number };

// One ready-to-draw frame cut from a sprite sheet image. Resolved by the
// adapter: the sheet is loaded, and the current animation frame's source
// rectangle is computed for this point in time.
export type SceneSpriteFrame = {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

// A square tile slot drawn from a tile sheet when no sprite exists. The
// named lookup (which game concept uses which slot) is game content; the
// adapter resolves it to this plain rectangle plus the sheet image, with
// the destination square in pixels (actor fallback tiles draw at their
// native size, larger tiles at the cell size).
export type SceneTileFrame = {
  sheet: CanvasImageSource;
  sx: number;
  sy: number;
  size: number;
  drawSize: number;
};

// One actor on the world canvas, fully resolved for the current frame.
export type SceneActorView = {
  // Visual (animated) position in cells.
  position: ScenePoint;
  // The actor's current sprite-sheet frame, when it has a loaded sprite
  // sheet; null means the fallback tile is drawn instead.
  sprite: SceneSpriteFrame | null;
  // Fallback tile for actors without a sprite sheet (or while it loads).
  tile: SceneTileFrame | null;
  // White flash overlay intensity, 0..1; 0 draws nothing.
  flashIntensity: number;
  // Whether the actor's motion or sprite animation may still advance —
  // callers keep the render loop ticking while any view is active.
  active: boolean;
  // The actor's colour bar (css colour string); empty string hides it.
  colourBar: string;
  // Health bar values (pre-scaled by game modifiers); null hides the bar.
  healthBar: { current: number; max: number } | null;
  // Debug cell coordinates drawn next to the actor (debug mode only).
  debugLabel: string | null;
  // Monster sight lines (debug mode only), from the actor to a target.
  debugLines: { from: ScenePoint; to: ScenePoint; colour: string }[];
};

// The hero turn UI drawn on the world canvas after the light mask: the
// walkable-area outline, per-hero bars and pips, and the current-actor
// reticule.
export type SceneHeroOverlayView = {
  // Cells the current hero can walk to this turn (the game applies its
  // own discovery, blocking and line-of-sight rules before emitting).
  walkableCells: ScenePoint[];
  // Current-actor reticule position in cells, or null when there is none.
  marker: ScenePoint | null;
  // Per-hero bars and pips, at their visual (animated) positions.
  bars: {
    position: ScenePoint;
    colour: string;
    health: { current: number; max: number };
    actionPips: number | null;
    movePips: number | null;
  }[];
};

// One item lying on the dungeon floor.
export type SceneItemView = {
  position: ScenePoint;
  // The item's sprite-sheet frame when its sheet is loaded; null means
  // the fallback tile is drawn (sprite-less items, sheets still loading).
  sprite: SceneSpriteFrame | null;
  // Generic item tile.
  fallbackTile: SceneTileFrame;
  // Resolved inventory label drawn while the current hero stands on the
  // item; null draws no label.
  label: string | null;
};

// Floating damage / info text with an animation effect. Optional fields
// mirror the defaults the effect renderer applies; structurally compatible
// with the game's DamageIndicator, which the adapter passes by data.
export type SceneFloatingText = {
  position: ScenePoint;
  text?: string;
  damage?: number;
  color?: string;
  // Effect name: 'float' | 'bounce' | 'crit' | 'fade' | 'static';
  // unknown names fall back to 'float' at render time.
  effect?: string;
  // Pixel offset applied after the effect transform (each component
  // defaults to 0).
  offset?: { x?: number; y?: number };
  fontSizeScale?: number;
  timestamp?: number;
  durationMs?: number;
};
