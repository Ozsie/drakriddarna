import type { Actor, GameState, Item, LightSource, Position } from '../types';
import { CellAlignment, LightEffect, Side } from '../types';
import { PROJECTILE_DURATION_MS } from '../combat';
import {
  COLLAPSED,
  WALL,
  crossesWallEdge,
  findCell,
  isDiscovered,
  isDoorEdge,
  isSamePosition,
} from '../core';
import {
  DEFAULT_LIGHT_COLOR,
  DEFAULT_LIGHT_INTENSITY,
  DEFAULT_LIGHT_RADIUS,
  animatedLightSignature,
  computeLightPolygon as computeLightPolygonForEnv,
  computeSparkles,
  createLight,
  isAnimatedLight,
  isCeilingLight,
  lightBlurPx,
  lightCenter,
  lightInViewport,
  lightIntensityScale,
  lightPolygonFor as lightPolygonForEnv,
  type LightOcclusion,
  type LightingEnv,
  type LightViewport,
} from '@hoard-engine/lighting';

// The light computation (occlusion maps, ray marching, polygons, effects,
// sparkles) lives in the `@hoard-engine/lighting` engine package; this
// module re-exports its pure surface at the historical import paths and
// keeps only the game knowledge (the active-light catalogue, the
// renderability rules) and the canvas rendering — gradients, sprites, the
// darkness veil — until the scene package takes the latter over.
export {
  DEFAULT_LIGHT_RATE,
  MAX_LIGHT_POLYGON_CACHE_ENTRIES,
  computeSparkles,
  isAnimatedLight,
  isCeilingLight,
  lightBlurPx,
  lightCenter,
  lightInViewport,
  lightIntensityScale,
  lightSwayOffset,
  lightSweepAngle,
} from '@hoard-engine/lighting';
export type { LightViewport, Sparkle } from '@hoard-engine/lighting';

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

// --- Lighting environment ----------------------------------------------

// The environment the `@hoard-engine/lighting` package computes against:
// every piece of game knowledge the rays need arrives as a callback
// (walls, pillars, fog of war, blocking room fog, actors, closed doors,
// wall edges, room characters). The closures read the state live, so
// in-place mutations (a hero moving, a door opening) are answered on
// the next request; whether the caches recompute is decided by the
// occlusion key hashed below.
const buildLightingEnv = (
  state: GameState,
  debugMode: boolean,
): LightingEnv => {
  const layout = state.dungeon.layout;
  const grid = layout.grid;
  return {
    gridWidth: grid.reduce((max, row) => Math.max(max, row.length), 0),
    gridHeight: grid.length,
    // Raw per-cell facts with the same precedence as the historical
    // occlusion map: walls and pillars block even when undiscovered
    // (they must stay lit), fog wins over actors, and actors only
    // block on open, discovered cells.
    cellOcclusion: (x: number, y: number): LightOcclusion => {
      const gridCell = findCell(grid, x, y);
      if (gridCell === WALL || gridCell === COLLAPSED) {
        return 'opaque';
      }
      if (layout.pillars?.some((pillar) => isSamePosition(pillar, { x, y }))) {
        return 'opaque';
      }
      if (gridCell === '') {
        return 'fog';
      }
      if (!debugMode && !isDiscovered(state.dungeon, x, y)) {
        return 'fog';
      }
      if (layout.roomFog?.[gridCell]?.blocksLight) {
        // Fog configured to block light reads like fog of war to the
        // rays: light stops at the room's near boundary.
        return 'fog';
      }
      const blocked = [...state.heroes, ...layout.monsters].some(
        (actor) =>
          actor.health > 0 && actor.position.x === x && actor.position.y === y,
      );
      return blocked ? 'actor' : 'open';
    },
    // A closed door or a wall edge stops light at the shared cell edge;
    // diagonal transitions follow the grid package's pinch-point rule.
    isStepBlocked: (from: Position, to: Position): boolean => {
      const door = isDoorEdge(layout, from.x, from.y, to.x, to.y);
      return (!!door && !door.open) || crossesWallEdge(layout, from, to);
    },
    // The room character: a gas light's cloud fills its room and stops
    // there.
    roomOf: (x: number, y: number): string => findCell(grid, x, y),
  };
};

// Environments cached per state object, like the historical
// occlusion-map cache: the state's identity (together with the occlusion
// key) scopes the caches inside the engine package, so two states that
// hash to the same key never share occluded light.
const lightingEnvCaches = new WeakMap<
  GameState,
  { debugMode: boolean; env: LightingEnv }
>();

const lightingEnvFor = (state: GameState, debugMode: boolean): LightingEnv => {
  let cached = lightingEnvCaches.get(state);
  if (!cached || cached.debugMode !== debugMode) {
    cached = { debugMode, env: buildLightingEnv(state, debugMode) };
    lightingEnvCaches.set(state, cached);
  }
  return cached.env;
};

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
  // Fog configured to block light changes the occlusion map like a
  // discovery does, so it is part of the key.
  const lightBlockingFog = Object.entries(state.dungeon.layout.roomFog ?? {})
    .filter(([, options]) => options.blocksLight)
    .map(([room]) => room)
    .join(',');
  // Collapsed corridor cells block light like walls do, so a collapse
  // (or its restoration) reshapes the light polygons.
  const collapsed = (state.dungeon.collapsedCorridors ?? [])
    .map(
      (group) =>
        `${group.letter}:${group.cells
          .map((position) => `${position.x},${position.y}`)
          .join(',')}`,
    )
    .join('|');
  return `${
    state.dungeon.name
  }|${actors}|${doors}|${rooms}|${lightBlockingFog}|${collapsed}|${cellSize}|${
    debugMode ? 'd' : 'n'
  }`;
};

// The lit-area polygon of a light (in world pixels), computed by the
// engine package over the game's environment. `occlusionKey` is the
// caller's precomputed `lightStateKey` for the pass; without it the key
// is rebuilt here.
export const computeLightPolygon = (
  light: LightSource,
  state: GameState,
  cellSize: number,
  debugMode = false,
  timeMs = 0,
  occlusionKey?: string,
): Position[] =>
  computeLightPolygonForEnv(
    light,
    lightingEnvFor(state, debugMode),
    cellSize,
    occlusionKey ?? lightStateKey(state, cellSize, debugMode),
    timeMs,
  );

// The cached polygon lookup the renderers use: served from the engine
// package's caches while the occlusion state hashed into the key is
// unchanged.
export const lightPolygonFor = (
  light: LightSource,
  state: GameState,
  cellSize: number,
  debugMode: boolean,
  timeMs: number,
  occlusionKey?: string,
): Position[] =>
  lightPolygonForEnv(
    light,
    lightingEnvFor(state, debugMode),
    cellSize,
    occlusionKey ?? lightStateKey(state, cellSize, debugMode),
    timeMs,
  );

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

// The glow a closed door casts on the floor in front of it: faint, warm
// and steady — a lit doorway, not a beacon. It only marks where the door
// stands; discovery still decides whether it renders at all.
const DOOR_GLOW = {
  color: '#e8b96a',
  radius: 1,
  intensity: 0.3,
  softness: 0.6,
};

// The torch every hero carries at the belt: a faint, steady pool of warm
// light around the hero's cell, so the party's surroundings stay lit even
// in a pitch-dark dungeon. Static on purpose — a flickering torch would
// keep the dynamic layer repainting for as long as any hero lives.
const HERO_TORCH = {
  color: '#e8a44a',
  radius: 1.5,
  intensity: 0.3,
  softness: 0.55,
};

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
//
// Two more lights are derived from the layout and the party itself: a
// closed, non-hidden door glows faintly on the floor in front of it on
// every discovered side of its doorway, and every living hero carries a
// torch light at the belt.
export const activeLights = (
  state: GameState,
  now: number = Date.now(),
): LightSource[] => {
  // The dragon's breath snuffs out all lights while it is active.
  if (state.heroes.some((hero) => hero.health > 0 && hero.blinded)) {
    return [];
  }
  const lights: LightSource[] = [...(state.dungeon.layout.lights ?? [])];

  // A closed, visible door casts a faint glow onto the floor in front of
  // it, on each discovered side of the doorway: the leaf alone disappears
  // into the surrounding wall, a lit doorway reads at a glance. Each glow
  // hugs the doorway — aligned with the door's side of its cell — and
  // rides the ordinary light pipeline, so walls and the door leaf itself
  // shadow it and it never spills through the doorway.
  // Hidden doors stay dark, and opening the door removes the glow.
  state.dungeon.layout.doors.forEach((door) => {
    if (door.open || door.hidden) return;
    const farX =
      door.side === Side.RIGHT ? 1 : door.side === Side.LEFT ? -1 : 0;
    const farY = door.side === Side.DOWN ? 1 : door.side === Side.UP ? -1 : 0;
    const nearAlignment =
      door.side === Side.RIGHT
        ? CellAlignment.CENTER_RIGHT
        : door.side === Side.LEFT
          ? CellAlignment.CENTER_LEFT
          : door.side === Side.UP
            ? CellAlignment.CENTER_TOP
            : CellAlignment.CENTER_BOTTOM;
    const farAlignment =
      door.side === Side.RIGHT
        ? CellAlignment.CENTER_LEFT
        : door.side === Side.LEFT
          ? CellAlignment.CENTER_RIGHT
          : door.side === Side.UP
            ? CellAlignment.CENTER_BOTTOM
            : CellAlignment.CENTER_TOP;
    [
      [door.x, door.y, nearAlignment] as const,
      [door.x + farX, door.y + farY, farAlignment] as const,
    ].forEach(([x, y, alignment]) => {
      if (isDiscovered(state.dungeon, x, y)) {
        lights.push(
          createLight(x, y, alignment, {
            id: `door_glow_${door.x}_${door.y}_${door.side}`,
            ...DOOR_GLOW,
          }),
        );
      }
    });
  });

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

  // Terrain cells can carry a light (e.g. the glow of lava).
  (state.dungeon.layout.terrain ?? []).forEach((cell) => {
    if (cell.light && cell.light.enabled !== false) {
      lights.push({ ...cell.light, position: cell.position });
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

  // Every living hero carries a torch at the belt. Like the other derived
  // lights it is recreated fresh each pass, so it follows the hero around
  // without any stored state, and is snuffed by the dragon's breath
  // together with every other light.
  state.heroes.forEach((hero, index) => {
    if (hero.health <= 0) return;
    lights.push(
      createLight(hero.position.x, hero.position.y, CellAlignment.CENTER, {
        id: `hero_torch_${hero.id ?? index}`,
        ...HERO_TORCH,
      }),
    );
  });
  return lights;
};

// Whether any renderable light whose glow reaches the viewport animates
// with an effect, and so needs continuous re-rendering of the dynamic
// layer.
export const hasAnimatedLights = (
  state: GameState,
  debugMode: boolean,
  now: number = Date.now(),
  viewport?: LightViewport,
  frameLights?: LightSource[],
): boolean =>
  (frameLights ?? activeLights(state, now)).some(
    (light) =>
      isAnimatedLight(light) &&
      isLightRenderable(state, light, debugMode) &&
      lightInViewport(light, viewport),
  );

// --- Ambient repaint signature ---------------------------------------------

// The quantized animation state of every animated light visible in the
// viewport, as one comparable string; empty when none animate. Two
// renders with the same signature paint identical light output, so the
// dynamic layer can skip the repaint entirely — a flickering brazier
// (rate 1, 8 jitter steps per loop) repaints about 8 times per second
// instead of every frame, a torch at rate 2 about 16 times. The
// per-light quantization lives in the engine package
// (`animatedLightSignature`).
export const animatedLightsSignature = (
  state: GameState,
  debugMode: boolean,
  now: number = Date.now(),
  viewport?: LightViewport,
  frameLights?: LightSource[],
): string =>
  (frameLights ?? activeLights(state, now))
    .filter(
      (light) =>
        isAnimatedLight(light) &&
        isLightRenderable(state, light, debugMode) &&
        lightInViewport(light, viewport),
    )
    .map((light) => animatedLightSignature(light, now))
    .join('|');

// Fills a light shape (a polygon glow, an aura ring, a hole punched into
// darkness) with soft edges when the light asks for them. `ctx.filter`
// blurs the filled shape; on browsers without canvas filter support the
// assignment is ignored and edges stay hard.
//
// While a pan drag is active the controller disables the blur (see
// `setLightBlurDisabled`): the direct per-frame draws drop their filter
// as a fill-cost cut, trading soft light rims for drag smoothness. Sprite
// bakes always blur — the sprite cache key does not encode this flag, so
// a bake must always produce full-quality pixels.
let lightBlurDisabled = false;

export const setLightBlurDisabled = (disabled: boolean): void => {
  lightBlurDisabled = disabled;
};

const fillLightShape = (
  ctx: CanvasRenderingContext2D,
  trace: (ctx: CanvasRenderingContext2D) => void,
  fillStyle: CanvasGradient,
  light: LightSource,
  cellSize: number,
) => {
  const blurPx = lightBlurDisabled ? 0 : lightBlurPx(light, cellSize);
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

// Draws a sparkle light: small colored glints (a cross with a bright core)
// twinkling inside the light's cell, each with a soft disc behind it. No
// radial glow. The glints and discs go into the light mask, so they also
// shape the hole the sparkles punch into the ambient darkness.
// The twinkle positions (computeSparkles) live in the engine package.
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
  scaleOverride?: number,
) => {
  const center = lightCenter(light, cellSize, timeMs);
  const radiusPx = cellSize / 2;
  const color = light.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = light.intensity ?? DEFAULT_LIGHT_INTENSITY;
  // Slightly brighter than a plain glow so the ring reads as a halo.
  const peak = Math.min(
    1,
    intensity * 1.8 * (scaleOverride ?? lightIntensityScale(light, timeMs)),
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
  scaleOverride?: number,
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
    intensity * 1.4 * (scaleOverride ?? lightIntensityScale(light, timeMs)),
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
  scaleOverride?: number,
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
    intensity * 1.5 * (scaleOverride ?? lightIntensityScale(light, timeMs)),
  );
  const falloffStops = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  falloffStops.forEach((t) => {
    const alpha = peakIntensity * Math.pow(1 - t, 2);
    gradient.addColorStop(t, rgbaFromColor(color, alpha));
  });
  return gradient;
};

// Renders the light's full-brightness output directly onto `ctx` — the
// pre-sprite path, still used for effects whose geometry or per-part
// brightness changes every frame, and where offscreen canvases are
// unavailable (the node test environment).
const renderLightDirect = (
  ctx: CanvasRenderingContext2D,
  light: LightSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  timeMs: number,
  occlusionKey?: string,
): void => {
  switch (light.effect) {
    case LightEffect.SPARKLE:
      renderSparkles(ctx, light, cellSize, timeMs);
      break;
    case LightEffect.AURA:
      renderAura(ctx, light, cellSize, timeMs);
      break;
    case LightEffect.GAS: {
      const points = lightPolygonFor(
        light,
        state,
        cellSize,
        debugMode,
        timeMs,
        occlusionKey,
      );
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
        lightPolygonFor(
          light,
          state,
          cellSize,
          debugMode,
          timeMs,
          occlusionKey,
        ),
        createLightGradient(ctx, light, cellSize, timeMs),
        light,
        cellSize,
      );
      break;
  }
};

// --- Light sprites ----------------------------------------------------------

// Lights whose glow geometry never changes between frames — everything
// except sweep (rotating polygon), sway (swinging center) and sparkle
// (per-twinkle brightness) — can have their full-brightness output baked
// once into a sprite and then only blitted, alpha-scaled by the current
// animation brightness. For animated lights the scaling is pixel-exact
// only while intensity * peakFactor <= 1: beyond that the direct path
// clamps the gradient's peak at full alpha while the sprite would dim
// linearly, so bright animated lights keep rendering directly. Static
// lights never alpha-scale (their intensity scale is a constant 1), so
// their sprite is pixel-exact at any intensity — baking them keeps the
// softness blur out of every static-layer rebuild, pan moves included.
const lightPeakFactor = (light: LightSource): number =>
  light.effect === LightEffect.AURA
    ? 1.8
    : light.effect === LightEffect.GAS
      ? 1.4
      : 1.5;

const isBakeableLight = (light: LightSource): boolean => {
  switch (light.effect) {
    case LightEffect.SWEEP:
    case LightEffect.SWAY:
    case LightEffect.SPARKLE:
      return false;
    default:
      return (
        !isAnimatedLight(light) ||
        (light.intensity ?? DEFAULT_LIGHT_INTENSITY) * lightPeakFactor(light) <=
          1
      );
  }
};

type LightSprite = {
  key: string;
  canvas: HTMLCanvasElement;
  // World-pixel offset of the sprite's top-left corner.
  x: number;
  y: number;
  // World-pixel size of the sprite (the canvas is deviceRatio times this).
  size: number;
};

// One entry per distinct light (identity without the occlusion state);
// the entry's key carries the full invalidation state and is replaced
// whenever it changes.
// Upper bound on baked light sprites, mirroring
// MAX_LIGHT_POLYGON_CACHE_ENTRIES. Each light identity (position,
// alignment, colour, radius, intensity, softness, effect) holds one
// offscreen canvas; without a bound a long session of moving carried
// lights, projectiles and event lights — every one a fresh identity —
// would grow the cache without limit. Eviction only happens when a new
// identity is added: existing entries stay reusable while their
// occlusion key is unchanged, and clearLightSpriteCache still empties
// the whole map.
export const MAX_LIGHT_SPRITE_CACHE_ENTRIES = 64;

const lightSpriteCaches = new Map<string, LightSprite>();

export const clearLightSpriteCache = (): void => {
  lightSpriteCaches.clear();
};

const canBuildLightSprite = (): boolean =>
  typeof document !== 'undefined' &&
  typeof document.createElement === 'function';

const lightSpriteIdentity = (light: LightSource): string =>
  [
    light.position.x,
    light.position.y,
    light.alignment ?? '',
    light.color ?? '',
    light.radius ?? '',
    light.intensity ?? '',
    light.softness ?? '',
    light.effect ?? '',
  ].join(',');

// Bakes the light's full-brightness glow into an offscreen canvas: the
// visibility polygon (or aura ring or gas cloud) filled with its radial
// gradient under the softness blur, exactly as the direct path renders,
// but at animation scale 1 and only once per occlusion state.
const buildLightSprite = (
  state: GameState,
  light: LightSource,
  cellSize: number,
  debugMode: boolean,
  stateKey: string,
  key: string,
): LightSprite | null => {
  if (!canBuildLightSprite()) return null;
  const timeMs = 0;
  const center = lightCenter(light, cellSize, timeMs);
  const blurPx = lightBlurPx(light, cellSize);
  let draw: (c: CanvasRenderingContext2D) => void;
  let extent: number;
  if (light.effect === LightEffect.AURA) {
    extent = cellSize / 2 + blurPx + 2;
    draw = (c) =>
      fillLightShape(
        c,
        traceAuraCircle(light, cellSize, timeMs),
        createAuraGradient(c, light, cellSize, timeMs, 1),
        light,
        cellSize,
      );
  } else {
    const points = lightPolygonFor(
      light,
      state,
      cellSize,
      debugMode,
      timeMs,
      stateKey,
    );
    extent = polygonExtentPx(center, points) + blurPx + 2;
    draw =
      light.effect === LightEffect.GAS
        ? (c) =>
            fillLightPolygon(
              c,
              points,
              createGasGradient(
                c,
                light,
                cellSize,
                timeMs,
                polygonExtentPx(center, points),
                1,
              ),
              light,
              cellSize,
            )
        : (c) =>
            fillLightPolygon(
              c,
              points,
              createLightGradient(c, light, cellSize, timeMs, 1),
              light,
              cellSize,
            );
  }

  const size = Math.ceil(extent * 2);
  if (size <= 0) return null;
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size * ratio);
  canvas.height = Math.ceil(size * ratio);
  const spriteCtx = canvas.getContext('2d');
  if (!spriteCtx) return null;
  spriteCtx.scale(ratio, ratio);
  spriteCtx.translate(extent - center.x, extent - center.y);
  // Bakes always run at full quality, even mid-drag: the sprite cache
  // key does not encode the blur flag, so an unblurred bake would poison
  // the cache for the post-drag full-quality frames.
  const blurWasDisabled = lightBlurDisabled;
  lightBlurDisabled = false;
  try {
    draw(spriteCtx);
  } finally {
    lightBlurDisabled = blurWasDisabled;
  }
  return { key, canvas, x: center.x - extent, y: center.y - extent, size };
};

const lightSpriteFor = (
  state: GameState,
  light: LightSource,
  cellSize: number,
  debugMode: boolean,
  occlusionKey?: string,
): LightSprite | null => {
  if (!canBuildLightSprite()) return null;
  const stateKey = occlusionKey ?? lightStateKey(state, cellSize, debugMode);
  const identity = lightSpriteIdentity(light);
  const key = `${stateKey}|${identity}`;
  const cached = lightSpriteCaches.get(identity);
  if (cached && cached.key === key) return cached;
  const sprite = buildLightSprite(
    state,
    light,
    cellSize,
    debugMode,
    stateKey,
    key,
  );
  if (sprite) {
    if (
      !lightSpriteCaches.has(identity) &&
      lightSpriteCaches.size >= MAX_LIGHT_SPRITE_CACHE_ENTRIES
    ) {
      // Evict the oldest entry: Map keys iterate in insertion order.
      for (const oldest of lightSpriteCaches.keys()) {
        lightSpriteCaches.delete(oldest);
        break;
      }
    }
    lightSpriteCaches.set(identity, sprite);
  }
  return sprite;
};

const renderLight = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  light: LightSource,
  debugMode: boolean,
  timeMs: number,
  occlusionKey?: string,
) => {
  if (!isLightRenderable(state, light, debugMode)) return;

  if (isBakeableLight(light)) {
    const sprite = lightSpriteFor(
      state,
      light,
      cellSize,
      debugMode,
      occlusionKey,
    );
    if (sprite) {
      ctx.save();
      ctx.globalAlpha = lightIntensityScale(light, timeMs);
      ctx.drawImage(
        sprite.canvas,
        sprite.x,
        sprite.y,
        sprite.size,
        sprite.size,
      );
      ctx.restore();
      if (debugMode) {
        const center = lightCenter(light, cellSize, timeMs);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
  }

  renderLightDirect(
    ctx,
    light,
    cellSize,
    state,
    debugMode,
    timeMs,
    occlusionKey,
  );

  if (debugMode) {
    const center = lightCenter(light, cellSize, timeMs);
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
  frameLights?: LightSource[],
): string => {
  const lights = (frameLights ?? activeLights(state))
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

// Draws the given lights, culling per renderability and viewport. The
// occlusion key is built once for the whole pass and shared by every light's
// polygon lookup, instead of being rebuilt per light.
const renderLightList = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  lights: LightSource[],
  debugMode: boolean,
  timeMs: number,
  viewport?: LightViewport,
) => {
  let occlusionKey: string | undefined;
  lights.forEach((light) => {
    if (!isLightRenderable(state, light, debugMode)) return;
    if (!lightInViewport(light, viewport)) return;
    occlusionKey ??= lightStateKey(state, cellSize, debugMode);
    renderLight(ctx, cellSize, state, light, debugMode, timeMs, occlusionKey);
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
  frameLights?: LightSource[],
) => {
  renderLightList(
    ctx,
    cellSize,
    state,
    (frameLights ?? activeLights(state)).filter(isStaticLight),
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
  frameLights?: LightSource[],
) => {
  renderLightList(
    ctx,
    cellSize,
    state,
    (frameLights ?? activeLights(state)).filter(
      (light) => !isStaticLight(light),
    ),
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
  frameLights?: LightSource[],
) => {
  const lights = frameLights ?? activeLights(state);
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
