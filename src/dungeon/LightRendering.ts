import type { GameState, LightSource, Position } from '../types';
import { CellAlignment } from '../types';
import {
  COLLAPSED,
  WALL,
  findCell,
  isDiscovered,
  isDoorEdge,
  isSamePosition,
} from '../core';
import {
  DEFAULT_LIGHT_COLOR,
  DEFAULT_LIGHT_INTENSITY,
  DEFAULT_LIGHT_RADIUS,
  DEFAULT_LIGHT_SOFTNESS,
} from './DungeonLogic';

// Number of rays cast around a light source to build its visibility polygon.
const LIGHT_RAY_COUNT = 120;
// Sub-cell resolution of each ray, in steps per cell.
const LIGHT_RAY_STEPS_PER_CELL = 6;
// Corner-aligned lights sit this fraction into their cell, so the glow stays
// inside the cell it was placed on instead of bleeding into the wall corner.
const CORNER_ALIGNMENT_INSET = 0.25;

// How far light reaches into a blocking ('opaque') cell, as a fraction of
// the ray's path through that cell. Enough to illuminate the near half — the
// wall face, or an actor sprite which sits near the middle of its cell —
// but not through the whole cell, which would look like the light passes
// out the other side.
const OPAQUE_CELL_PENETRATION = 0.5;

// A ceiling light shines down from above its cell: actors are fully
// illuminated and do not block it or cast shadows in it. Walls, pillars,
// closed doors and fog still block it like any other light.
export const isCeilingLight = (light: LightSource): boolean =>
  (light.alignment ?? CellAlignment.CENTER) === CellAlignment.CEILING;

export const lightCenter = (light: LightSource, cellSize: number): Position => {
  const x = light.position.x * cellSize;
  const y = light.position.y * cellSize;
  const inset = cellSize * CORNER_ALIGNMENT_INSET;
  switch (light.alignment ?? CellAlignment.CENTER) {
    case CellAlignment.TOP_LEFT:
      return { x: x + inset, y: y + inset };
    case CellAlignment.TOP_RIGHT:
      return { x: x + cellSize - inset, y: y + inset };
    case CellAlignment.BOTTOM_LEFT:
      return { x: x + inset, y: y + cellSize - inset };
    case CellAlignment.BOTTOM_RIGHT:
      return { x: x + cellSize - inset, y: y + cellSize - inset };
    // A ceiling fixture lights the whole cell from above; its light pool
    // is centered on the cell, like CENTER.
    case CellAlignment.CEILING:
    case CellAlignment.CENTER:
    default:
      return { x: x + cellSize / 2, y: y + cellSize / 2 };
  }
};

// How light interacts with a cell:
// - 'opaque': the cell blocks light but is itself illuminated — the ray
//   penetrates partway into the cell (`OPAQUE_CELL_PENETRATION`) so walls,
//   pillars and actors stay visible, with the shadow starting behind them
//   instead of light passing through the whole cell. Ceiling lights treat
//   actors as transparent, since their light comes from above.
// - 'fog': the cell blocks light at its near edge, so it stays unlit
//   (undiscovered cells and anything outside the grid).
// - 'none': light passes through.
export type LightCellBlock = 'opaque' | 'fog' | 'none';

export const lightBlockInCell = (
  state: GameState,
  cell: Position,
  light: LightSource,
  debugMode: boolean,
): LightCellBlock => {
  const layout = state.dungeon.layout;
  const gridCell = findCell(layout.grid, cell.x, cell.y);
  if (gridCell === WALL || gridCell === COLLAPSED) {
    // Walls must stay visible: they are never part of discoveredRooms, so
    // this is checked before the fog test below.
    return 'opaque';
  }
  if (layout.pillars?.some((p) => isSamePosition(p, cell))) {
    return 'opaque';
  }
  if (gridCell === '') {
    return 'fog';
  }
  if (!debugMode && !isDiscovered(state.dungeon, cell.x, cell.y)) {
    return 'fog';
  }
  if (isSamePosition(cell, light.position)) {
    // The light's own cell never blocks — otherwise an actor standing on
    // the light would black it out.
    return 'none';
  }
  if (isCeilingLight(light)) {
    return 'none';
  }
  const monster = layout.monsters.some(
    (monster) => monster.health > 0 && isSamePosition(monster.position, cell),
  );
  const hero = state.heroes.some(
    (hero) => hero.health > 0 && isSamePosition(hero.position, cell),
  );
  return monster || hero ? 'opaque' : 'none';
};

// Where a ray from `center` crosses the far edge of the given cell along
// the ray direction (capped at the light's radius). For the ray's previous
// cell this is also its entry point into the next cell.
const rayExitThroughCell = (
  center: Position,
  dirX: number,
  dirY: number,
  cell: Position,
  cellSize: number,
  radiusPx: number,
): Position => {
  const tX =
    dirX === 0
      ? Infinity
      : ((dirX > 0 ? cell.x + 1 : cell.x) * cellSize - center.x) / dirX;
  const tY =
    dirY === 0
      ? Infinity
      : ((dirY > 0 ? cell.y + 1 : cell.y) * cellSize - center.y) / dirY;
  const t = Math.min(tX, tY, radiusPx);
  return { x: center.x + dirX * t, y: center.y + dirY * t };
};

// Casts `LIGHT_RAY_COUNT` rays from the light source and returns the polygon
// (in world pixel coordinates) of the lit area. Each ray marches outward and
// stops at the first blocker: a closed door (stopped at the door edge), a fog
// cell (stopped at its near edge) or an opaque cell — which is lit partway
// in, so the shadow starts behind it — or the light's radius. Rays pass
// freely between diagonally adjacent opaque cells, through their shared
// corner.
export const computeLightPolygon = (
  light: LightSource,
  state: GameState,
  cellSize: number,
  debugMode = false,
): Position[] => {
  const center = lightCenter(light, cellSize);
  const radiusPx = (light.radius ?? DEFAULT_LIGHT_RADIUS) * cellSize;
  const step = Math.max(1, cellSize / LIGHT_RAY_STEPS_PER_CELL);
  const points: Position[] = [];

  for (let i = 0; i < LIGHT_RAY_COUNT; i++) {
    const angle = (2 * Math.PI * i) / LIGHT_RAY_COUNT;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let end: Position = {
      x: center.x + dirX * radiusPx,
      y: center.y + dirY * radiusPx,
    };
    let prevCell = light.position;
    for (let distance = step; distance <= radiusPx; distance += step) {
      const px = center.x + dirX * distance;
      const py = center.y + dirY * distance;
      const cell = {
        x: Math.floor(px / cellSize),
        y: Math.floor(py / cellSize),
      };
      if (cell.x === prevCell.x && cell.y === prevCell.y) {
        continue;
      }
      const door = isDoorEdge(
        state.dungeon.layout,
        prevCell.x,
        prevCell.y,
        cell.x,
        cell.y,
      );
      if (door && !door.open) {
        // Stop at the shared edge the door occupies.
        end = {
          x: ((prevCell.x + cell.x) / 2 + 0.5) * cellSize,
          y: ((prevCell.y + cell.y) / 2 + 0.5) * cellSize,
        };
        break;
      }
      const block = lightBlockInCell(state, cell, light, debugMode);
      if (block === 'opaque') {
        // Illuminate the blocking cell partway from its entry edge: enough
        // to light the wall face or actor sprite, so light never appears to
        // pass through the whole cell. The shadow starts right behind it.
        const entry = rayExitThroughCell(
          center,
          dirX,
          dirY,
          prevCell,
          cellSize,
          radiusPx,
        );
        const exit = rayExitThroughCell(
          center,
          dirX,
          dirY,
          cell,
          cellSize,
          radiusPx,
        );
        end = {
          x: entry.x + (exit.x - entry.x) * OPAQUE_CELL_PENETRATION,
          y: entry.y + (exit.y - entry.y) * OPAQUE_CELL_PENETRATION,
        };
        break;
      }
      if (block === 'fog') {
        // Undiscovered or outside the grid: light stops at the near edge.
        end = {
          x: ((prevCell.x + cell.x) / 2 + 0.5) * cellSize,
          y: ((prevCell.y + cell.y) / 2 + 0.5) * cellSize,
        };
        break;
      }
      prevCell = cell;
    }
    points.push(end);
  }
  return points;
};

const rgbaFromColor = (color: string, alpha: number): string => {
  const hex = color.replace('#', '');
  const expand = (part: string): number =>
    parseInt(part.length === 1 ? part + part : part, 16);
  if (hex.length === 3) {
    const r = expand(hex[0]);
    const g = expand(hex[1]);
    const b = expand(hex[2]);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // Named colors and other formats: let them render as-is with the alpha
  // handled through the gradient stop opacity.
  return color;
};

// Ambient (dungeon-wide) light level used when a dungeon does not specify
// one: 1 = fully lit, 0 = pitch black.
export const DEFAULT_AMBIENT_LIGHT = 1;

export const ambientLightLevel = (state: GameState): number => {
  const ambient = state.dungeon.ambientLight ?? DEFAULT_AMBIENT_LIGHT;
  return Math.min(1, Math.max(0, ambient));
};

const isLightRenderable = (
  state: GameState,
  light: LightSource,
  debugMode: boolean,
): boolean =>
  light.enabled !== false &&
  (debugMode ||
    isDiscovered(state.dungeon, light.position.x, light.position.y));

const traceLightPolygonPath = (
  ctx: CanvasRenderingContext2D,
  points: Position[],
) => {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
};

// Blur radius (in pixels) for a light's shadow edges, from its `softness`
// (0..1): 0 = hard edges, 1 = half a cell of blur. Exported for tests.
export const lightBlurPx = (light: LightSource, cellSize: number): number => {
  const softness = Math.min(
    1,
    Math.max(0, light.softness ?? DEFAULT_LIGHT_SOFTNESS),
  );
  return (softness * cellSize) / 2;
};

// Draws a light polygon (a glow, or a hole punched into darkness) with soft
// edges when the light asks for them. `ctx.filter` blurs the filled polygon,
// feathering the hard shadow boundary; on browsers without canvas filter
// support the assignment is ignored and edges stay hard.
const fillLightPolygon = (
  ctx: CanvasRenderingContext2D,
  points: Position[],
  fillStyle: CanvasGradient,
  light: LightSource,
  cellSize: number,
) => {
  const blurPx = lightBlurPx(light, cellSize);
  if (blurPx > 0) {
    ctx.filter = `blur(${blurPx}px)`;
  }
  ctx.save();
  traceLightPolygonPath(ctx, points);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
};

// Builds the light's radial gradient. One continuous falloff, bright at the
// source and fading out at the radius. Canvas interpolates linearly between
// stops, so the curve is sampled densely — a coarse stop set (or a separate
// small "core" gradient) leaves slope changes that show up as distinct rings
// around the center.
const createLightGradient = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
) => {
  const center = lightCenter(light, cellSize);
  const color = light.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = light.intensity ?? DEFAULT_LIGHT_INTENSITY;
  const radiusPx = (light.radius ?? DEFAULT_LIGHT_RADIUS) * cellSize;
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
    radiusPx,
  );
  const peakIntensity = Math.min(1, intensity * 1.5);
  const falloffStops = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  falloffStops.forEach((t) => {
    const alpha = peakIntensity * Math.pow(1 - t, 2);
    gradient.addColorStop(t, rgbaFromColor(color, alpha));
  });
  return gradient;
};

const renderLight = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  light: LightSource,
  debugMode: boolean,
) => {
  if (!isLightRenderable(state, light, debugMode)) return;

  const center = lightCenter(light, cellSize);
  const points = computeLightPolygon(light, state, cellSize, debugMode);

  fillLightPolygon(
    ctx,
    points,
    createLightGradient(ctx, light, cellSize),
    light,
    cellSize,
  );

  if (debugMode) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, cellSize * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

export const renderLights = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const lights = state.dungeon.layout.lights ?? [];
  if (lights.length === 0) return;
  lights.forEach((light) => {
    renderLight(ctx, cellSize, state, light, debugMode);
  });
};

// Draws the dungeon's ambient darkness over the scene: the whole view is
// veiled in black with alpha (1 - ambientLight), with the light polygons
// punched out so lit areas stay visible. The darkness is prepared on an
// offscreen canvas (owned by the caller, same size and world transform as
// the target canvas) because `destination-out` would otherwise erase the
// actors already drawn below. Composited on top of actors, so actors
// standing in the dark are dimmed as well.
export const renderAmbientDarkness = (
  ctx: CanvasRenderingContext2D,
  darknessCanvas: HTMLCanvasElement,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const ambient = ambientLightLevel(state);
  if (ambient >= 1) return;
  const darknessCtx = darknessCanvas.getContext('2d');
  if (!darknessCtx) return;

  // Fill the whole canvas with darkness, in device space.
  darknessCtx.save();
  darknessCtx.setTransform(1, 0, 0, 1, 0, 0);
  darknessCtx.clearRect(0, 0, darknessCanvas.width, darknessCanvas.height);
  darknessCtx.fillStyle = `rgba(0, 0, 0, ${1 - ambient})`;
  darknessCtx.fillRect(0, 0, darknessCanvas.width, darknessCanvas.height);
  darknessCtx.restore();

  // Punch the lit areas out of the darkness. `destination-out` removes
  // darkness where the gradient is opaque, so the light's falloff controls
  // how much of the darkness is lifted around each source.
  darknessCtx.save();
  darknessCtx.globalCompositeOperation = 'destination-out';
  (state.dungeon.layout.lights ?? []).forEach((light) => {
    if (!isLightRenderable(state, light, debugMode)) return;
    const points = computeLightPolygon(light, state, cellSize, debugMode);
    fillLightPolygon(
      darknessCtx,
      points,
      createLightGradient(darknessCtx, light, cellSize),
      light,
      cellSize,
    );
  });
  darknessCtx.globalCompositeOperation = 'source-over';
  darknessCtx.restore();

  // Composite the darkness over the scene, in device space.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(darknessCanvas, 0, 0);
  ctx.restore();
};
