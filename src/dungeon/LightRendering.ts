import type { Actor, GameState, Item, LightSource, Position } from '../types';
import { CellAlignment, LightEffect } from '../types';
import { PROJECTILE_DURATION_MS } from '../combat/CombatEffects';
import {
  COLLAPSED,
  WALL,
  findCell,
  isDiscovered,
  isDoorEdge,
  isSamePosition,
} from '../core';
import {
  createLight,
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

// A swaying light (e.g. a chandelier) swings on a pendulum: its glow
// center arcs left and right over its cell, rising slightly toward the
// ends of the swing. The horizontal reach stays well under half a cell,
// so the swinging center never leaves the light's own cell.
const SWAY_ARM_CELLS = 0.6;
const SWAY_MAX_ANGLE = Math.PI / 6;

// The pendulum offset of a swaying light's center, in world pixels: zero
// for lights that do not sway.
export const lightSwayOffset = (
  light: LightSource,
  cellSize: number,
  timeMs: number,
): Position => {
  if (light.effect !== LightEffect.SWAY) {
    return { x: 0, y: 0 };
  }
  const t = (timeMs / 1000) * lightRate(light);
  const angle = SWAY_MAX_ANGLE * Math.sin(2 * Math.PI * t);
  return {
    x: cellSize * SWAY_ARM_CELLS * Math.sin(angle),
    y: cellSize * SWAY_ARM_CELLS * (Math.cos(angle) - 1),
  };
};

export const lightCenter = (
  light: LightSource,
  cellSize: number,
  timeMs = 0,
): Position => {
  const x = light.position.x * cellSize;
  const y = light.position.y * cellSize;
  const inset = cellSize * CORNER_ALIGNMENT_INSET;
  let center: Position;
  switch (light.alignment ?? CellAlignment.CENTER) {
    case CellAlignment.TOP_LEFT:
      center = { x: x + inset, y: y + inset };
      break;
    case CellAlignment.TOP_RIGHT:
      center = { x: x + cellSize - inset, y: y + inset };
      break;
    case CellAlignment.BOTTOM_LEFT:
      center = { x: x + inset, y: y + cellSize - inset };
      break;
    case CellAlignment.BOTTOM_RIGHT:
      center = { x: x + cellSize - inset, y: y + cellSize - inset };
      break;
    // A ceiling fixture lights the whole cell from above; its light pool
    // is centered on the cell, like CENTER.
    case CellAlignment.CEILING:
    case CellAlignment.CENTER:
    default:
      center = { x: x + cellSize / 2, y: y + cellSize / 2 };
      break;
  }
  const sway = lightSwayOffset(light, cellSize, timeMs);
  return { x: center.x + sway.x, y: center.y + sway.y };
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
// corner. For sweep lights only the rays within the rotating beam cone
// contribute; the rest collapse onto the light source.
export const computeLightPolygon = (
  light: LightSource,
  state: GameState,
  cellSize: number,
  debugMode = false,
  timeMs = 0,
): Position[] => {
  const center = lightCenter(light, cellSize, timeMs);
  // Gas lights ignore their radius: the cloud expands until it leaves the
  // room (grid room character) containing the light.
  const isGas = light.effect === LightEffect.GAS;
  const gasRoom = isGas
    ? findCell(state.dungeon.layout.grid, light.position.x, light.position.y)
    : undefined;
  const radiusPx = isGas
    ? Number.POSITIVE_INFINITY
    : (light.radius ?? DEFAULT_LIGHT_RADIUS) * cellSize;
  const step = Math.max(1, cellSize / LIGHT_RAY_STEPS_PER_CELL);
  const points: Position[] = [];
  // For sweep lights: the beam only covers rays within its half angle of
  // the sweep direction; the rest collapse onto the light source.
  const sweep = lightSweepAngle(light, timeMs);

  for (let i = 0; i < LIGHT_RAY_COUNT; i++) {
    const angle = (2 * Math.PI * i) / LIGHT_RAY_COUNT;
    if (sweep !== undefined) {
      let diff = Math.abs(angle - sweep) % (2 * Math.PI);
      if (diff > Math.PI) {
        diff = 2 * Math.PI - diff;
      }
      if (diff > SWEEP_BEAM_HALF_ANGLE) {
        points.push({ x: center.x, y: center.y });
        continue;
      }
    }
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
      if (
        gasRoom !== undefined &&
        findCell(state.dungeon.layout.grid, cell.x, cell.y) !== gasRoom
      ) {
        // Gas stays inside its room: stop at the room boundary, so the
        // cloud never spills through open doors or into other rooms.
        end = {
          x: ((prevCell.x + cell.x) / 2 + 0.5) * cellSize,
          y: ((prevCell.y + cell.y) / 2 + 0.5) * cellSize,
        };
        break;
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

// Whether a light is rendered at all. Outside debug mode a light must be
// on a discovered cell; every other light is culled. Debug mode shows
// every enabled light.
export const isLightRenderable = (
  state: GameState,
  light: LightSource,
  debugMode: boolean,
): boolean => {
  if (light.enabled === false) return false;
  if (debugMode) return true;
  return isDiscovered(state.dungeon, light.position.x, light.position.y);
};

// The visible part of the world, in grid cells: the rectangle starting
// at (x, y) spanning width x height cells. Optional everywhere it is
// used; without it every renderable light is drawn.
export type LightViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// How far beyond its radius a light can still be seen, in cells: the
// softness blur reaches up to half a cell past the pool edge. This also
// covers a swaying light's swing, which stays well under half a cell.
const VIEWPORT_CULL_MARGIN_CELLS = 0.5;

// Whether a light's glow can reach the viewport; lights further away are
// culled entirely — not drawn, not animated. The glow is bounded by a
// circle of the light's radius around its cell: every alignment keeps
// the glow center inside the light's own cell, and a swaying light's
// swing is covered by the margin. Gas lights have no cheap bound (they
// fill their whole room) and always pass.
export const lightInViewport = (
  light: LightSource,
  viewport?: LightViewport,
): boolean => {
  if (!viewport) return true;
  if (light.effect === LightEffect.GAS) return true;
  const centerX = light.position.x + 0.5;
  const centerY = light.position.y + 0.5;
  const extent =
    Math.max(light.radius ?? DEFAULT_LIGHT_RADIUS, 1) +
    VIEWPORT_CULL_MARGIN_CELLS;
  const nearestX = Math.min(
    Math.max(centerX, viewport.x),
    viewport.x + viewport.width,
  );
  const nearestY = Math.min(
    Math.max(centerY, viewport.y),
    viewport.y + viewport.height,
  );
  const dx = centerX - nearestX;
  const dy = centerY - nearestY;
  return dx * dx + dy * dy <= extent * extent;
};

// Cache for light visibility polygons. A polygon depends only on the
// light's geometry and the occlusion state — actor positions, door
// states, fog of war, cell size — none of which change between animation
// frames, so animated lights reuse their polygon instead of re-marching
// rays every frame. Sweep lights are excluded: their polygon rotates
// with time. Sway lights are excluded too: their swinging center moves
// the whole polygon with time.
let lightPolygonCache: {
  key: string;
  polygons: Map<LightSource, Position[]>;
} | null = null;

// Everything that can change a light polygon, hashed into a cache key.
const lightStateKey = (
  state: GameState,
  cellSize: number,
  debugMode: boolean,
): string => {
  const actors = [
    ...state.heroes.map((hero) =>
      hero.health > 0 ? `${hero.position.x},${hero.position.y}` : 'x',
    ),
    ...state.dungeon.layout.monsters.map((monster) =>
      monster.health > 0 ? `${monster.position.x},${monster.position.y}` : 'x',
    ),
  ].join('|');
  const doors = state.dungeon.layout.doors
    .map((door) => (door.open ? '1' : '0'))
    .join('');
  const rooms = state.dungeon.discoveredRooms.join(',');
  return `${state.dungeon.name}|${actors}|${doors}|${rooms}|${cellSize}|${
    debugMode ? 'd' : 'n'
  }`;
};

// The light's visibility polygon, from cache when the occlusion state has
// not changed since it was last computed.
export const lightPolygonFor = (
  light: LightSource,
  state: GameState,
  cellSize: number,
  debugMode: boolean,
  timeMs: number,
): Position[] => {
  if (light.effect === LightEffect.SWEEP || light.effect === LightEffect.SWAY) {
    return computeLightPolygon(light, state, cellSize, debugMode, timeMs);
  }
  const key = lightStateKey(state, cellSize, debugMode);
  if (!lightPolygonCache || lightPolygonCache.key !== key) {
    lightPolygonCache = { key, polygons: new Map() };
  }
  let points = lightPolygonCache.polygons.get(light);
  if (!points) {
    points = computeLightPolygon(light, state, cellSize, debugMode, timeMs);
    lightPolygonCache.polygons.set(light, points);
  }
  return points;
};

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

// How many times per second a light's effect loops, when the light does not
// specify a rate itself.
export const DEFAULT_LIGHT_RATE = 1;
// Half the opening angle of a sweep light's beam.
const SWEEP_BEAM_HALF_ANGLE = Math.PI / 4;

const lightRate = (light: LightSource): number =>
  Math.max(0.01, light.rate ?? DEFAULT_LIGHT_RATE);

// Deterministic pseudo-random value in [0, 1) from a number. Flicker uses
// this instead of Math.random so the same instant always renders the same.
const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Brightness multiplier (0..1) for a light at a given time, from its
// animation effect. 'static' and unknown effects stay at 1.
export const lightIntensityScale = (
  light: LightSource,
  timeMs: number,
): number => {
  const t = (timeMs / 1000) * lightRate(light);
  switch (light.effect) {
    case LightEffect.PULSE:
      return 0.65 + 0.35 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t));
    case LightEffect.FLICKER: {
      // 8 jitter steps per loop, mixed from two octaves for torch-like
      // irregularity.
      const n = Math.floor(t * 8);
      const jitter = hash01(n) * 0.7 + hash01(n * 3.7 + 17) * 0.3;
      return Math.min(1, 0.7 + 0.35 * jitter);
    }
    case LightEffect.BLINK:
      return t % 1 < 0.5 ? 1 : 0.05;
    case LightEffect.AURA:
      // A gentle breathing, subtler than pulse.
      return 0.8 + 0.2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t));
    case LightEffect.GAS:
      // Even, but gently fluctuating: two slow sines keep the cloud
      // undulating without strong bright/dark swings.
      return Math.min(
        1,
        0.85 +
          0.1 * Math.sin(2 * Math.PI * t) +
          0.05 * Math.sin(2 * Math.PI * t * 2.7 + 1.3),
      );
    default:
      return 1;
  }
};

// Rotation angle (radians, 0 = pointing right) of a sweep light's beam at a
// given time, or undefined for lights that do not sweep.
export const lightSweepAngle = (
  light: LightSource,
  timeMs: number,
): number | undefined => {
  if (light.effect !== LightEffect.SWEEP) return undefined;
  return 2 * Math.PI * (((timeMs / 1000) * lightRate(light)) % 1);
};

// --- Event-driven lights -------------------------------------------------

// Light definitions for event-driven effects. The dragon's breath needs no
// light of its own: while it blinds the party it snuffs every other light.
const EVENT_LIGHTS = {
  // The hexagram: remains wherever the hexagram (the portal) ended up.
  hexagram: {
    id: 'hexagram_light',
    color: '#9B59B6',
    radius: 2.5,
    intensity: 0.4,
    softness: 0.5,
    effect: LightEffect.PULSE,
    rate: 0.5,
    enabled: true,
  },
  elementalWeapon: {
    id: 'elemental_weapon_light',
    color: '#FCFF4F',
    radius: 1,
    intensity: 0.5,
    softness: 0.2,
    effect: LightEffect.SPARKLE,
    rate: 1.5,
    enabled: true,
  },
  symbolOfWeakness: {
    id: 'symbol_of_weakness_light',
    color: '#cc33ff',
    radius: 1.5,
    intensity: 0.3,
    softness: 0.6,
    effect: LightEffect.PULSE,
    rate: 0.4,
    enabled: true,
  },
  magicStorm: {
    id: 'magic_storm_light',
    color: '#9ACDFF',
    radius: 2,
    intensity: 0.45,
    softness: 0.3,
    effect: LightEffect.FLICKER,
    rate: 3,
    enabled: true,
  },
} as const;

// All lights that are active in a state: the lights placed in the dungeon
// layout, plus the light sources of items carried by living actors — those
// follow their carrier's position while in the inventory. Items lying on
// the floor do not emit light.
//
// Events add their own lights: while the dragon's breath blinds the party
// every light is snuffed; the hexagram lights the portal it left behind,
// for as long as the portal remains; elemental weapons, the symbol of
// weakness and the magic storm attach a light to the affected hero for the
// duration of their state; and round-scoped event lights (sun stone, magic
// node) live in `state.eventLights` until the round is reset.
//
// Interactables carry lights at their cell, and flying projectiles and
// dark lord flames light their surroundings for as long as their animation
// runs. `now` drives the position of the moving projectile lights.
export const activeLights = (
  state: GameState,
  now: number = Date.now(),
): LightSource[] => {
  // The dragon's breath snuffs out all lights while it is active.
  if (state.heroes.some((hero) => hero.health > 0 && hero.blinded)) {
    return [];
  }
  const lights: LightSource[] = [...(state.dungeon.layout.lights ?? [])];

  // The hexagram light remains where the hexagram ended up (the portal).
  const portal = state.dungeon.portal;
  if (portal) {
    lights.push(
      createLight(portal.x, portal.y, CellAlignment.CENTER, {
        ...EVENT_LIGHTS.hexagram,
      }),
    );
  }

  // Event lights derived from lingering event state on the heroes.
  state.heroes
    .filter((hero) => hero.health > 0)
    .forEach((hero) => {
      if (hero.weapon?.elemental) {
        lights.push(
          createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
            ...EVENT_LIGHTS.elementalWeapon,
          }),
        );
      }
      if (hero.weakened) {
        lights.push(
          createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
            ...EVENT_LIGHTS.symbolOfWeakness,
          }),
        );
      }
      if ((hero.inventory ?? []).some((item: Item) => item?.disabled)) {
        lights.push(
          createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
            ...EVENT_LIGHTS.magicStorm,
          }),
        );
      }
    });

  lights.push(...(state.eventLights ?? []));

  // Interactable light sources (e.g. braziers) render at their cell while
  // enabled; the built-in `toggleLight` effect flips them.
  (state.dungeon.layout.interactables ?? []).forEach((interactable) => {
    if (interactable.light && interactable.light.enabled !== false) {
      lights.push({ ...interactable.light, position: interactable.position });
    }
  });

  // Flying projectiles (dark lord fire bullets) carry an intense,
  // short-range light that travels with them.
  (state.projectiles ?? []).forEach((projectile) => {
    const timestamp = projectile.timestamp ?? now;
    const duration = projectile.durationMs ?? PROJECTILE_DURATION_MS;
    const elapsed = now - timestamp;
    if (elapsed < 0 || elapsed > duration) {
      return;
    }
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    const x =
      projectile.from.x + (projectile.to.x - projectile.from.x) * progress;
    const y =
      projectile.from.y + (projectile.to.y - projectile.from.y) * progress;
    lights.push(
      createLight(Math.round(x), Math.round(y), CellAlignment.CENTER, {
        id: `projectile_light_${projectile.id}`,
        color: projectile.color ?? '#ffdd44',
        radius: 1.5,
        intensity: 0.7,
        softness: 0.2,
        effect: LightEffect.FLICKER,
        rate: 8,
      }),
    );
  });

  // Dark lord flames burn with an intense, short-range light.
  (state.flameEffects ?? []).forEach((flame) => {
    lights.push(
      createLight(flame.position.x, flame.position.y, CellAlignment.CENTER, {
        id: `flame_light_${flame.id}`,
        color: '#FF9E2C',
        radius: 2,
        intensity: 0.8,
        softness: 0.4,
        effect: LightEffect.FLICKER,
        rate: 6,
      }),
    );
  });

  // Item light sources follow their living carrier while in an inventory;
  // items disabled by e.g. the magic storm go dark.
  const carriers: Actor[] = [
    ...state.heroes,
    ...state.dungeon.layout.monsters,
  ].filter((actor) => actor.health > 0);
  carriers.forEach((actor) => {
    (actor.inventory ?? []).forEach((item: Item) => {
      if (item?.light && !item.disabled) {
        lights.push({ ...item.light, position: actor.position });
      }
    });
  });
  return lights;
};

// Whether a light animates and so needs per-frame rendering: any effect
// other than 'static' (or absent). Unknown effect strings count as
// animated, matching how they render (statically) but keeping the
// re-render loop running, as before.
export const isAnimatedLight = (light: LightSource): boolean =>
  light.effect !== undefined && light.effect !== LightEffect.STATIC;

// Whether any renderable light whose glow reaches the viewport animates
// with an effect, and so needs continuous re-rendering of the dynamic
// layer.
export const hasAnimatedLights = (
  state: GameState,
  debugMode: boolean,
  now: number = Date.now(),
  viewport?: LightViewport,
): boolean =>
  activeLights(state, now).some(
    (light) =>
      isAnimatedLight(light) &&
      isLightRenderable(state, light, debugMode) &&
      lightInViewport(light, viewport),
  );

// Fills a light shape (a polygon glow, an aura ring, a hole punched into
// darkness) with soft edges when the light asks for them. `ctx.filter`
// blurs the filled shape; on browsers without canvas filter support the
// assignment is ignored and edges stay hard.
const fillLightShape = (
  ctx: CanvasRenderingContext2D,
  trace: (ctx: CanvasRenderingContext2D) => void,
  fillStyle: CanvasGradient,
  light: LightSource,
  cellSize: number,
) => {
  const blurPx = lightBlurPx(light, cellSize);
  if (blurPx > 0) {
    ctx.filter = `blur(${blurPx}px)`;
  }
  ctx.save();
  trace(ctx);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
};

const fillLightPolygon = (
  ctx: CanvasRenderingContext2D,
  points: Position[],
  fillStyle: CanvasGradient,
  light: LightSource,
  cellSize: number,
) =>
  fillLightShape(
    ctx,
    (c) => traceLightPolygonPath(c, points),
    fillStyle,
    light,
    cellSize,
  );

// --- Sparkle effect ------------------------------------------------------

// Twinkles inside the light's own cell.
const SPARKLES_PER_CELL = 5;
// Sparkles keep this far from the cell edge, as a fraction of the cell.
const SPARKLE_SPREAD = 0.08;
// Low-discrepancy (golden-ratio) step sequences: spread successive twinkles
// evenly across the cell, independent of hash quality.
const SPARKLE_STEP_X = 0.7548776667;
const SPARKLE_STEP_Y = 0.5698402909;
const SPARKLE_STEP_ARM = 0.4142135624;

const fract = (n: number): number => n - Math.floor(n);

// One visible sparkle twinkle at a given time.
export interface Sparkle {
  // Center in world pixel coordinates.
  x: number;
  y: number;
  // Half length of the glint's arms, in pixels.
  arm: number;
  // 0..1 brightness of this twinkle right now.
  alpha: number;
}

// All currently visible sparkles for a light: colored twinkles inside the
// light's own cell — nowhere else. Positions are fixed per light and spread
// across the whole cell; only the twinkle brightness changes over time.
export const computeSparkles = (
  light: LightSource,
  cellSize: number,
  timeMs: number,
): Sparkle[] => {
  const t = (timeMs / 1000) * lightRate(light);
  // Per-light offset so sparkle lights in different cells never line up.
  const offset = hash01(
    light.position.x * 73856093 + light.position.y * 19349663,
  );
  const sparkles: Sparkle[] = [];
  for (let index = 0; index < SPARKLES_PER_CELL; index++) {
    const fx = fract((index + 1 + offset) * SPARKLE_STEP_X);
    const fy = fract((index + 1 + offset * 0.618) * SPARKLE_STEP_Y);
    const phase = fract((index + 1 + offset) * 0.6180339887);
    const twinkle = Math.sin(2 * Math.PI * (t + phase));
    const alpha = Math.max(0, Math.min(1, (twinkle - 0.15) / 0.6));
    if (alpha <= 0.02) {
      continue;
    }
    const span = 1 - 2 * SPARKLE_SPREAD;
    const x = (light.position.x + SPARKLE_SPREAD + span * fx) * cellSize;
    const y = (light.position.y + SPARKLE_SPREAD + span * fy) * cellSize;
    const arm =
      cellSize * (0.05 + 0.05 * fract((index + 1 + offset) * SPARKLE_STEP_ARM));
    sparkles.push({ x, y, arm, alpha });
  }
  return sparkles;
};

// Draws a sparkle light: small colored glints (a cross with a bright core)
// twinkling inside the light's cell, each with a soft disc behind it. No
// radial glow. The glints and discs go into the light mask, so they also
// shape the hole the sparkles punch into the ambient darkness.
const renderSparkles = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
  timeMs: number,
) => {
  const color = light.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = light.intensity ?? DEFAULT_LIGHT_INTENSITY;
  const sparkles = computeSparkles(light, cellSize, timeMs);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, cellSize / 32);
  ctx.fillStyle = '#FFFFFF';
  sparkles.forEach((sparkle) => {
    // The disc keeps a small hole in the darkness around the twinkle.
    ctx.globalAlpha = Math.min(1, sparkle.alpha * 0.85);
    ctx.beginPath();
    ctx.arc(
      sparkle.x,
      sparkle.y,
      Math.max(2, sparkle.arm * 1.5),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = Math.min(1, sparkle.alpha * intensity * 2.2);
    ctx.beginPath();
    ctx.moveTo(sparkle.x - sparkle.arm, sparkle.y);
    ctx.lineTo(sparkle.x + sparkle.arm, sparkle.y);
    ctx.moveTo(sparkle.x, sparkle.y - sparkle.arm);
    ctx.lineTo(sparkle.x, sparkle.y + sparkle.arm);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.arm * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

// --- Aura effect ---------------------------------------------------------

// How much of the ring's peak brightness the aura's center glows with.
const AURA_CENTER_GLOW = 0.35;

// Ring brightness of an aura at fraction `t` of its radius: a soft,
// even glow across the center of the cell, rising steeply into a defined
// bright ring peaking at ~70% of the radius and fading out at the cell
// edge.
const auraRingAlpha = (t: number, peak: number): number => {
  if (t <= 0.35) {
    // Soft center halo.
    return peak * AURA_CENTER_GLOW;
  }
  if (t <= 0.7) {
    // Steep rise from the center glow into the bright ring.
    const k = (t - 0.35) / 0.35;
    return (
      peak * (AURA_CENTER_GLOW + (1 - AURA_CENTER_GLOW) * (k * k * (3 - 2 * k)))
    );
  }
  // Falls to exactly zero at the cell edge.
  return peak * Math.pow(Math.max(0, (1 - t) / 0.3), 2);
};

// The aura's donut-shaped gradient: an inscribed circle in the light's own
// cell, with a soft center glow and a bright ring around it.
const createAuraGradient = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
  timeMs: number,
) => {
  const center = lightCenter(light, cellSize, timeMs);
  const radiusPx = cellSize / 2;
  const color = light.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = light.intensity ?? DEFAULT_LIGHT_INTENSITY;
  // Slightly brighter than a plain glow so the ring reads as a halo.
  const peak = Math.min(
    1,
    intensity * 1.8 * lightIntensityScale(light, timeMs),
  );
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
    radiusPx,
  );
  const stops = [0, 0.1, 0.2, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  stops.forEach((t) => {
    gradient.addColorStop(t, rgbaFromColor(color, auraRingAlpha(t, peak)));
  });
  return gradient;
};

// The farthest polygon point from the light, so a room-filling gas
// gradient covers the whole cloud.
const polygonExtentPx = (center: Position, points: Position[]): number =>
  points.reduce(
    (max, point) =>
      Math.max(max, Math.hypot(point.x - center.x, point.y - center.y)),
    0,
  );

// --- Gas effect ----------------------------------------------------------

// The gas effect's gradient: an even, cloud-like intensity across the lit
// area — no bright center — fading only at the rim. Combined with the
// undulating intensity from `lightIntensityScale` this reads as a slowly
// swirling cloud. The light's polygon still applies, so walls contain the
// gas; its extent defaults to the light's radius, or `gradientRadiusPx`
// when the polygon is larger (gas fills its whole room).
const createGasGradient = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
  timeMs: number,
  gradientRadiusPx?: number,
) => {
  const center = lightCenter(light, cellSize, timeMs);
  const color = light.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = light.intensity ?? DEFAULT_LIGHT_INTENSITY;
  const radiusPx =
    gradientRadiusPx ?? (light.radius ?? DEFAULT_LIGHT_RADIUS) * cellSize;
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
    radiusPx,
  );
  const alpha = Math.min(
    1,
    intensity * 1.4 * lightIntensityScale(light, timeMs),
  );
  const stops = [0, 0.15, 0.3, 0.45, 0.55, 0.7, 0.85, 1];
  stops.forEach((t) => {
    // Flat through the middle of the cloud, soft fall at the rim (falling
    // to exactly zero at the edge).
    const rim = t <= 0.55 ? 1 : Math.pow(Math.max(0, (1 - t) / 0.45), 1.5);
    gradient.addColorStop(t, rgbaFromColor(color, alpha * rim));
  });
  return gradient;
};

const traceAuraCircle =
  (light: LightSource, cellSize: number, timeMs: number) =>
  (ctx: CanvasRenderingContext2D) => {
    const center = lightCenter(light, cellSize, timeMs);
    ctx.beginPath();
    ctx.arc(center.x, center.y, cellSize / 2, 0, Math.PI * 2);
  };

// Draws an aura light: a breathing donut ring filling its own cell, with
// the center of the cell left unaffected. No polygon glow, no spill into
// neighbouring cells.
const renderAura = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
  timeMs: number,
) => {
  fillLightShape(
    ctx,
    traceAuraCircle(light, cellSize, timeMs),
    createAuraGradient(ctx, light, cellSize, timeMs),
    light,
    cellSize,
  );
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
  timeMs: number,
) => {
  const center = lightCenter(light, cellSize, timeMs);
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
  const peakIntensity = Math.min(
    1,
    intensity * 1.5 * lightIntensityScale(light, timeMs),
  );
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
  timeMs: number,
) => {
  if (!isLightRenderable(state, light, debugMode)) return;

  const center = lightCenter(light, cellSize, timeMs);
  switch (light.effect) {
    case LightEffect.SPARKLE:
      renderSparkles(ctx, light, cellSize, timeMs);
      break;
    case LightEffect.AURA:
      renderAura(ctx, light, cellSize, timeMs);
      break;
    case LightEffect.GAS: {
      const points = lightPolygonFor(light, state, cellSize, debugMode, timeMs);
      fillLightPolygon(
        ctx,
        points,
        createGasGradient(
          ctx,
          light,
          cellSize,
          timeMs,
          polygonExtentPx(lightCenter(light, cellSize, timeMs), points),
        ),
        light,
        cellSize,
      );
      break;
    }
    default:
      fillLightPolygon(
        ctx,
        lightPolygonFor(light, state, cellSize, debugMode, timeMs),
        createLightGradient(ctx, light, cellSize, timeMs),
        light,
        cellSize,
      );
      break;
  }

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

// Whether a light never changes between frames ('static' or no effect):
// it can be drawn into a caller-cached layer instead of every frame.
const isStaticLight = (light: LightSource): boolean => !isAnimatedLight(light);

// Cache key for the static light layer, covering everything that can
// change the pixels static lights draw: the occlusion state (actors,
// doors, fog of war, cell size) plus the static lights themselves (a
// toggled brazier, a picked-up light item, round-scoped event lights,
// blindness) and the viewport (culling). While the key is unchanged the
// layer can be reused as-is.
export const staticLightCacheKey = (
  state: GameState,
  cellSize: number,
  debugMode: boolean,
  viewport?: LightViewport,
): string => {
  const lights = activeLights(state)
    .filter(isStaticLight)
    .map((light) =>
      isLightRenderable(state, light, debugMode) &&
      lightInViewport(light, viewport)
        ? [
            light.position.x,
            light.position.y,
            light.alignment ?? '',
            light.color ?? '',
            light.radius ?? '',
            light.intensity ?? '',
            light.softness ?? '',
          ].join(',')
        : 'x',
    )
    .join('|');
  const view = viewport
    ? `${viewport.x},${viewport.y},${viewport.width},${viewport.height}`
    : 'all';
  return `${lightStateKey(state, cellSize, debugMode)}|${lights}|${view}`;
};

// Draws the given lights, culling per renderability and viewport.
const renderLightList = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  lights: LightSource[],
  debugMode: boolean,
  timeMs: number,
  viewport?: LightViewport,
) => {
  lights.forEach((light) => {
    if (!isLightRenderable(state, light, debugMode)) return;
    if (!lightInViewport(light, viewport)) return;
    renderLight(ctx, cellSize, state, light, debugMode, timeMs);
  });
};

// Draws the static (never-animating) lights into `ctx`. The caller draws
// this into a cached layer and only redraws when `staticLightCacheKey`
// changes.
export const renderStaticLights = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  viewport?: LightViewport,
) => {
  renderLightList(
    ctx,
    cellSize,
    state,
    activeLights(state).filter(isStaticLight),
    debugMode,
    0,
    viewport,
  );
};

// Draws the animating lights into `ctx` at `timeMs`, on top of the
// caller's cached static layer.
export const renderAnimatedLights = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  timeMs: number,
  viewport?: LightViewport,
) => {
  renderLightList(
    ctx,
    cellSize,
    state,
    activeLights(state).filter((light) => !isStaticLight(light)),
    debugMode,
    timeMs,
    viewport,
  );
};

// Renders every renderable light into `ctx`. The caller draws the result
// as the light mask: composited onto the scene as the visible glow, and
// reused by `renderAmbientDarkness` to punch the matching hole into the
// darkness veil — one set of pixels for both, so glow and hole can never
// drift apart. Equivalent to `renderStaticLights` followed by
// `renderAnimatedLights`.
export const renderLights = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  timeMs = 0,
  viewport?: LightViewport,
) => {
  const lights = activeLights(state);
  if (lights.length === 0) return;
  renderLightList(ctx, cellSize, state, lights, debugMode, timeMs, viewport);
};

// Draws the dungeon's ambient darkness over the scene: the whole view is
// veiled in black with alpha (1 - ambientLight), with the light mask
// punched out so lit areas stay visible. `lightMaskCanvas` holds the exact
// pixels `renderLights` just drew (same pixel size and world transform as
// the veil canvas): re-using those pixels instead of re-drawing every
// light shape keeps the visible glow and the darkness hole in perfect
// lockstep. Re-drawing them here could drift — canvas blur filter support
// and behavior vary by browser — which showed up as a black rim around
// light pools. `destination-out` removes darkness where the mask is
// opaque, so the mask's alpha controls how much of the veil is lifted.
// Composited on top of actors, so actors standing in the dark are dimmed
// as well.
export const renderAmbientDarkness = (
  ctx: CanvasRenderingContext2D,
  darknessCanvas: HTMLCanvasElement,
  lightMaskCanvas: HTMLCanvasElement,
  state: GameState,
): void => {
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

  // Punch the light mask out of the darkness, in device space: the mask
  // is the same pixel size as the veil, so its alpha maps 1:1.
  darknessCtx.save();
  darknessCtx.setTransform(1, 0, 0, 1, 0, 0);
  darknessCtx.globalCompositeOperation = 'destination-out';
  darknessCtx.drawImage(lightMaskCanvas, 0, 0);
  darknessCtx.globalCompositeOperation = 'source-over';
  darknessCtx.restore();

  // Composite the darkness over the scene, in device space.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(darknessCanvas, 0, 0);
  ctx.restore();
};
