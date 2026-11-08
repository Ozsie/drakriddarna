// Game side of the scene view-model contracts (@hoard-engine/scene):
// these builders resolve GameState, Actor/Item game data, animation
// timelines, discovery rules and i18n labels into the plain view models
// the world-canvas renderers consume. The renderer cores left as the
// @hoard-engine/scene engine package (docs/engine-packages.md, step 9);
// the GameState knowledge stays here.

import type {
  Actor,
  Dungeon,
  GameState,
  Hero,
  ItemLocation,
  ItemSprite,
  Monster,
  Position,
} from '../types';
import { MonsterType, TerrainType } from '../types';
import {
  getActorFacing,
  getActorFlashIntensity,
  getActorAnimationFrameIndex,
  getActorAnimationName,
  getActorSpriteFacingRow,
  getActorVisualPosition,
  getDyingActors,
  hasLineOfSight,
  i18n,
  isActorAnimating,
  isActorDeathAnimating,
  isActorSpriteAnimationActive,
  isDiscovered,
  isRoomDiscovered,
  isSamePosition,
  isWalkable,
  stepAlongLine,
} from '../core';
import {
  isBlockedByHero,
  isBlockedByMonster,
  liveHeroes,
} from '../hero/HeroLogic';
import { getReadyImage } from '../core/ImageCache';
import { ACTOR_SPRITE_ANIMATION_ORDER } from '../core';
import { ACTOR_TILES, ITEM_TILES, type TileRef } from '../dungeon/tiles';
import {
  TERRAIN_OVERLAY,
  getSpriteSourceRect,
  renderActorView,
  type SceneActorView,
  type SceneCorner,
  type SceneDungeonView,
  type SceneHeroOverlayView,
  type SceneItemView,
  type SceneSpriteFrame,
  type SceneTerrainCell,
  type SceneTileFrame,
} from '@hoard-engine/scene';
import { autoDetectCorners, findCell } from '@hoard-engine/grid';
import { COLLAPSED, EMPTY, SEALED_DOOR, WALL } from '@hoard-engine/grid';
import { TERRAIN_DEFAULT_STYLING } from '../dungeon/TerrainLogic';
import type { TerrainCell } from '../types';

// --- Dungeon plane view ----------------------------------------------------

// A closed door is drawn as wall pieces (the renderers' closed-door
// passes plus the wall pieces the sealed cells classify as), sealing the
// passage until it is opened. The corner classifier must see the same
// sealed geometry from both sides: whichever side of the doorway is not
// discovered yet has its cell and the two cells flanking the doorway
// replaced with the SEALED_DOOR marker. Sealed cells count as wall for
// closed sides — a corridor end gets its corner caps exactly like a dead
// end, and the corner cells beside a door set in a solid wall render
// their caps too — but never as the stem of a junction, since a sealed
// doorway renders as a door rather than rock. Invisible sealed cells (no
// discovered floor bordering them) resolve to unknown during
// classification, so sealing never fabricates junction shapes on the
// wall pieces themselves.
export const sealedCornerGrid = (dungeon: SceneDungeonView): string[] => {
  const grid = [...dungeon.layout.grid];
  const sealable = (cell: string) =>
    Boolean(cell) &&
    cell !== WALL &&
    cell !== COLLAPSED &&
    !isDiscoveredRoom(dungeon, cell);
  (dungeon.layout.doors ?? []).forEach((door) => {
    if (door.open) return;
    const farX =
      door.side === 'Right'
        ? door.x + 1
        : door.side === 'Left'
          ? door.x - 1
          : door.x;
    const farY =
      door.side === 'Down'
        ? door.y + 1
        : door.side === 'Up'
          ? door.y - 1
          : door.y;
    const farCell = findCell(grid, farX, farY);
    const nearCell = findCell(grid, door.x, door.y);
    const farDiscovered = farCell !== '' && !isEmpty(farCell, dungeon);
    const nearDiscovered = nearCell !== '' && !isEmpty(nearCell, dungeon);
    const flankX = door.side === 'Up' || door.side === 'Down' ? 1 : 0;
    const flankY = door.side === 'Left' || door.side === 'Right' ? 1 : 0;
    // Seal whichever side of the doorway is still undiscovered: the far
    // side when approaching the door from the front, the near side when
    // it is approached from behind
    const sealed: [number, number][] = [];
    if (!farDiscovered) {
      sealed.push([farX, farY]);
      sealed.push([farX - flankX, farY - flankY]);
      sealed.push([farX + flankX, farY + flankY]);
    }
    if (!nearDiscovered) {
      sealed.push([door.x, door.y]);
      sealed.push([door.x - flankX, door.y - flankY]);
      sealed.push([door.x + flankX, door.y + flankY]);
    }
    sealed.forEach(([x, y]) => {
      if (!sealable(findCell(grid, x, y))) return;
      grid[y] = grid[y].slice(0, x) + SEALED_DOOR + grid[y].slice(x + 1);
    });
  });
  return grid;
};

const isEmpty = (cell: string, dungeon: SceneDungeonView) =>
  cell === EMPTY || !isDiscoveredRoom(dungeon, cell);

// Discovery over the contract's own shapes — the core helper takes the
// game's Dungeon type, and the adapter must resolve visibility against
// plain view data (the two-field duplicate is cheaper than an import
// edge).
const isDiscoveredRoom = (dungeon: SceneDungeonView, cell: string): boolean =>
  (dungeon.discoveredRooms ?? []).includes(cell);

// Everything that can change the visible corner classification or the
// sealed grid, hashed into a shared cache key.
const visibleStateKey = (dungeon: SceneDungeonView): string => {
  const doors = (dungeon.layout.doors ?? [])
    .map((door) => (door.open ? '1' : '0'))
    .join('');
  return `${dungeon.name}|${dungeon.discoveredRooms.join(',')}|${doors}`;
};

// The sealed classification grid, from cache when the visible state has
// not changed since it was last built.
let sealedGridCache: { key: string; grid: string[] } | null = null;

const sealedGrid = (dungeon: SceneDungeonView): string[] => {
  const key = visibleStateKey(dungeon);
  if (!sealedGridCache || sealedGridCache.key !== key) {
    sealedGridCache = { key, grid: sealedCornerGrid(dungeon) };
  }
  return sealedGridCache.grid;
};

// Corners are classified against the visible dungeon: an undiscovered
// room renders as solid rock, so corners on the fog-of-war boundary look
// different from their full-layout classification, and closed doors seal
// their doorway as wall. The visible corner set depends only on the
// grid, the discovered rooms, and the door open states, so it is cached
// until one of them changes instead of being re-detected on every
// render.
let visibleCornersCache: { key: string; corners: SceneCorner[] } | null = null;

const visibleCorners = (dungeon: SceneDungeonView): SceneCorner[] => {
  const key = visibleStateKey(dungeon);
  if (!visibleCornersCache || visibleCornersCache.key !== key) {
    visibleCornersCache = {
      key,
      corners: autoDetectCorners(sealedGrid(dungeon), dungeon.discoveredRooms),
    };
  }
  return visibleCornersCache.corners;
};

// Resolves one terrain cell into its view form: the type's default
// styling folded into the plain fields, and the game's terrain type
// mapping onto the renderer's overlay styles (water shimmer, lava
// pulse).
const resolveTerrainCell = (cell: TerrainCell): SceneTerrainCell => {
  const styling = TERRAIN_DEFAULT_STYLING[cell.type];
  const overlay =
    cell.type === TerrainType.WATER
      ? TERRAIN_OVERLAY.WATER
      : cell.type === TerrainType.LAVA
        ? TERRAIN_OVERLAY.LAVA
        : undefined;
  return {
    position: cell.position,
    type: cell.type,
    overlay,
    color: cell.color ?? styling?.color,
    opacity: cell.opacity ?? styling?.opacity,
    rate: cell.rate ?? styling?.rate,
  };
};

// Builds the dungeon plane the @hoard-engine/scene renderers consume:
// the game's dungeon data is structurally compatible with the package's
// SceneDungeonView, and this pass resolves the game knowledge the
// package cannot — the fog-of-war-sealed grid, the visible corner
// classification and the terrain styling. The sealed grid and corners
// are content-cached; terrain resolves per call (a cheap map over the
// layout's cells).
export const buildDungeonView = (
  dungeon: Dungeon | SceneDungeonView,
): SceneDungeonView => {
  const view = dungeon;
  return {
    ...view,
    layout: {
      ...view.layout,
      sealedGrid: sealedGrid(view),
      corners: visibleCorners(view),
      terrain: (view.layout.terrain ?? []).map(resolveTerrainCell),
    },
  };
};

const actorTileFrame = (
  sheet: CanvasImageSource,
  ref: TileRef,
  drawSize: number = ref.size,
): SceneTileFrame => ({
  sheet,
  sx: ref.x,
  sy: ref.y,
  size: ref.size,
  drawSize,
});

// The actor's sprite sheet frame for the current point in time — the
// resolved form of ActorAnimation's timeline state (which animation is
// active, which frame of its row, which row of the sheet).
const getActorSpriteFrame = (
  actor: Actor,
  currentTime: number,
): SceneSpriteFrame | null => {
  const sprite = actor.sprite;
  if (!sprite) return null;
  const animation = getActorAnimationName(actor, currentTime);
  const configured = sprite.animations?.[animation];
  // Per-animation pack model (ActorSprite.animationImages): one sheet per
  // animation, one row per facing in ActorSprite.facings order.
  const animationImage = sprite.animationImages?.[animation];
  if (animationImage) {
    const image = getReadyImage(animationImage);
    if (!image) return null;
    const frameCount =
      configured !== undefined
        ? Math.max(1, configured)
        : Math.max(
            1,
            Math.floor((image.naturalWidth || image.width) / sprite.frameWidth),
          );
    const frameIndex = getActorAnimationFrameIndex(
      actor,
      animation,
      frameCount,
      currentTime,
    );
    const frameX = frameIndex * sprite.frameWidth;
    const frameY = getActorSpriteFacingRow(actor) * sprite.frameHeight;
    // Packs whose figures occupy only part of each frame declare a
    // per-facing source window so the figure fills the cell.
    const crop = sprite.frameCrops?.[animation]?.[getActorFacing(actor)];
    return {
      image,
      sx: frameX + (crop?.x ?? 0),
      sy: frameY + (crop?.y ?? 0),
      sw: crop?.size ?? sprite.frameWidth,
      sh: crop?.size ?? sprite.frameHeight,
    };
  }
  // Shared-sheet model: one row per animation in ACTOR_SPRITE_ANIMATION_ORDER.
  if (!sprite.image) return null;
  const image = getReadyImage(sprite.image);
  if (!image) return null;
  const frameCount =
    configured !== undefined
      ? Math.max(1, configured)
      : Math.max(
          1,
          Math.floor((image.naturalWidth || image.width) / sprite.frameWidth),
        );
  const frameIndex = getActorAnimationFrameIndex(
    actor,
    animation,
    frameCount,
    currentTime,
  );
  const row = ACTOR_SPRITE_ANIMATION_ORDER.indexOf(animation);
  return {
    image,
    sx: frameIndex * sprite.frameWidth,
    sy: row * sprite.frameHeight,
    sw: sprite.frameWidth,
    sh: sprite.frameHeight,
  };
};

// The item sheet's current frame (square frames laid out row-major), or
// null while the sheet is still loading.
const getItemSpriteFrame = (sprite: ItemSprite): SceneSpriteFrame | null => {
  const image = getReadyImage(sprite.image);
  if (!image) return null;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const { sx, sy } = getSpriteSourceRect(sprite, width, height);
  return {
    image,
    sx,
    sy,
    sw: Math.max(1, sprite.size),
    sh: Math.max(1, sprite.size),
  };
};

// The monster's fallback tile: named-slot lookup is game content, so the
// type switch stays here and the view model carries the plain rectangle.
const getMonsterTile = (
  monster: Pick<Monster, 'type'>,
  actorsSheet: CanvasImageSource,
): SceneTileFrame => {
  switch (monster.type) {
    case MonsterType.ORC:
    case MonsterType.ORCH:
      return actorTileFrame(actorsSheet, ACTOR_TILES.ORCH);
    case MonsterType.TROLL:
      return actorTileFrame(actorsSheet, ACTOR_TILES.TROLL);
    default:
      return actorTileFrame(actorsSheet, ACTOR_TILES.MONSTER_DEFAULT);
  }
};

// Whether the monster is drawn this frame: live monsters always, and
// sprite-carrying monsters linger while their death animation plays.
// Discovery is checked against the monster's cell.
const isMonsterVisible = (
  dungeon: Dungeon,
  monster: Pick<Monster, 'position' | 'sprite' | 'health'>,
  currentTime: number,
): boolean => {
  const cell =
    dungeon.layout.grid[monster.position.y]?.[monster.position.x] ?? '';
  const isDying =
    Boolean(monster.sprite) &&
    isActorDeathAnimating(monster as Actor, currentTime);
  return (
    Boolean(monster) &&
    (monster.health > 0 || isDying) &&
    isRoomDiscovered(dungeon, cell)
  );
};

// Sight lines drawn in debug mode from a monster to each hero it can see.
// The step-along-line visibility computation is game knowledge (it reads
// the state's terrain and blockers) and resolves to plain segments.
const getMonsterDebugLines = (
  state: GameState,
  monster: Monster,
  x: number,
  y: number,
): SceneActorView['debugLines'] => {
  const lines: SceneActorView['debugLines'] = [];
  state.heroes.forEach((target) => {
    const seenCells: Position[] = [];
    const startPixelPos = { x: x * 48 - 24, y: y * 48 - 24 };
    const targetPixelPos = {
      x: target.position.x * 48 - 24,
      y: target.position.y * 48 - 24,
    };
    const seen = stepAlongLine(
      startPixelPos,
      { x: Math.round(x), y: Math.round(y) },
      targetPixelPos,
      target.position,
      48,
      state,
      false,
      seenCells,
    );
    if (seen) {
      lines.push({
        from: { x, y },
        to: { x: target.position.x, y: target.position.y },
        colour: monster.colour,
      });
    }
  });
  return lines;
};

const debugLabelFor = (
  x: number,
  y: number,
  debugMode: boolean,
): string | null => (debugMode ? `(${x},${y})` : null);

// An actor view plus the game-side sprite drawing demand: when an actor's
// sprite declares a drawScale (ActorSprite.drawScale), the game facades
// draw the frame themselves and hand the package a sprite-less view for
// the flash/bars; the scene package's own sprite path always draws into
// exactly one cell.
export type GameActorView = SceneActorView & {
  spriteDraw?: { scale: number };
};

const toActorView = (
  actor: Actor,
  tile: SceneTileFrame | null,
  showDebugLabel: boolean,
  currentTime: number,
  bars: Pick<SceneActorView, 'colourBar' | 'healthBar'>,
): GameActorView => ({
  position: getActorVisualPosition(actor, currentTime),
  sprite: getActorSpriteFrame(actor, currentTime),
  ...(actor.sprite?.drawScale && actor.sprite.drawScale > 1
    ? { spriteDraw: { scale: actor.sprite.drawScale } }
    : {}),
  tile,
  flashIntensity: getActorFlashIntensity(actor, currentTime),
  active:
    isActorAnimating(actor, currentTime) ||
    isActorSpriteAnimationActive(actor, currentTime),
  colourBar: bars.colourBar,
  healthBar: bars.healthBar,
  debugLabel: showDebugLabel
    ? debugLabelFor(actor.position.x, actor.position.y, true)
    : null,
  debugLines: [],
});

// Draws the view's sprite frame at its declared scale: horizontally
// centered on the actor's cell and anchored to the cell floor, so scales
// above 1 tower into the cells above without sinking into the ground or
// sliding sideways. Crop windows are bottom-aligned to the feet, which
// makes the floor anchor correct.
export const drawActorViewSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneActorView,
  cellSize: number,
): void => {
  const frame = view.sprite;
  if (!frame) return;
  const scale = (view as GameActorView).spriteDraw?.scale ?? 1;
  const size = cellSize * scale;
  const dx = view.position.x * cellSize + (cellSize - size) / 2;
  const dy = (view.position.y + 1) * cellSize - size;
  ctx.drawImage(
    frame.image,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    dx,
    dy,
    size,
    size,
  );
};

// One actor view drawn through both paths: the game-side scaled sprite
// when the view carries a draw scale (the scene package's sprite path
// always draws into exactly one cell), then the package's own flash,
// bars and debug extras.
export const renderActorViewWithSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneActorView,
  cellSize: number,
): boolean => {
  if ((view as GameActorView).spriteDraw) {
    drawActorViewSprite(ctx, view, cellSize);
    return renderActorView(ctx, { ...view, sprite: null }, cellSize);
  }
  return renderActorView(ctx, view, cellSize);
};

// Hero views for the actor layer: the live heroes, plus dead heroes that
// still carry a sprite while their death animation plays (sprite-less
// heroes vanish immediately, as before). Hero bars and pips are drawn by
// the overlay layer, not here.
export const buildHeroViewModels = (
  state: GameState,
  actorsSheet: CanvasImageSource,
  debugMode: boolean,
  currentTime: number = Date.now(),
): SceneActorView[] => {
  const heroes: Hero[] = [
    ...liveHeroes(state),
    ...state.heroes.filter(
      (hero): hero is Hero =>
        hero.health <= 0 &&
        Boolean(hero.sprite) &&
        isActorDeathAnimating(hero, currentTime),
    ),
  ];
  return heroes.map((hero) =>
    toActorView(
      hero,
      actorTileFrame(actorsSheet, ACTOR_TILES.HERO),
      debugMode,
      currentTime,
      { colourBar: '', healthBar: null },
    ),
  );
};

// Monster views for the actor layer: discovered live monsters from the
// layout, plus lingering dying monsters (killed monsters leave the layout
// immediately; the dying list keeps them until the animation finishes).
export const buildMonsterViewModels = (
  state: GameState,
  actorsSheet: CanvasImageSource,
  debugMode: boolean,
  currentTime: number = Date.now(),
): SceneActorView[] => {
  const visible = state.dungeon.layout.monsters
    .filter((monster) => isMonsterVisible(state.dungeon, monster, currentTime))
    .map((monster) => {
      const view = toActorView(
        monster,
        getMonsterTile(monster, actorsSheet),
        false,
        currentTime,
        {
          colourBar: monster.colour,
          healthBar: { current: monster.health, max: monster.maxHealth },
        },
      );
      if (debugMode) {
        const visualPos = getActorVisualPosition(monster, currentTime);
        view.debugLines = getMonsterDebugLines(
          state,
          monster,
          visualPos.x,
          visualPos.y,
        );
      }
      return view;
    });
  const dying = getDyingActors(currentTime)
    .filter((actor) => !state.heroes.includes(actor))
    // Killed monsters leave the layout immediately; the dying list keeps
    // drawing exactly those — a monster that somehow stays in the layout
    // is drawn (once) by the layout path above.
    .filter(
      (actor) => !state.dungeon.layout.monsters.includes(actor as Monster),
    )
    .filter((actor) =>
      isMonsterVisible(state.dungeon, actor as Monster, currentTime),
    )
    .map((actor) => {
      const monster = actor as Monster;
      const view = toActorView(
        monster,
        getMonsterTile(monster, actorsSheet),
        false,
        currentTime,
        {
          colourBar: monster.colour,
          healthBar: { current: monster.health, max: monster.maxHealth },
        },
      );
      if (debugMode) {
        const visualPos = getActorVisualPosition(monster, currentTime);
        view.debugLines = getMonsterDebugLines(
          state,
          monster,
          visualPos.x,
          visualPos.y,
        );
      }
      return view;
    });
  return [...visible, ...dying];
};

// The current hero's walkable-area outline for the hero overlay layer:
// the game's discovery, occupation and line-of-sight rules resolve to a
// plain cell list.
export const buildWalkableCells = (
  state: GameState,
): SceneHeroOverlayView['walkableCells'] => {
  const hero = state.currentActor;
  if (!hero) return [];
  const cells: SceneHeroOverlayView['walkableCells'] = [];
  for (
    let pX: number = hero.position.x - hero.movement;
    pX <= hero.position.x + hero.movement;
    pX++
  ) {
    for (
      let pY: number = hero.position.y - hero.movement;
      pY <= hero.position.y + hero.movement;
      pY++
    ) {
      const discovered = isDiscovered(state.dungeon, pX, pY);
      if (discovered && !(pX === hero.position.x && pY === hero.position.y)) {
        const blockedByMonster = isBlockedByMonster(state, pX, pY);
        const blockedByHeroes = isBlockedByHero(state, pX, pY);
        const walkable = isWalkable(state.dungeon.layout, pX, pY);
        const los = hasLineOfSight(
          hero.position,
          { x: pX, y: pY },
          2,
          state,
          true,
        );
        if (!blockedByHeroes && !blockedByMonster && walkable && los) {
          cells.push({ x: pX, y: pY });
        }
      }
    }
  }
  return cells;
};

// Hero bars, pips and the current-actor reticule for the hero overlay
// layer, at the heroes' visual (animated) positions.
export const buildHeroOverlayViewModel = (
  state: GameState,
  currentTime: number = Date.now(),
): SceneHeroOverlayView => {
  const currentActor = state.currentActor;
  return {
    walkableCells: buildWalkableCells(state),
    marker: currentActor
      ? getActorVisualPosition(currentActor, currentTime)
      : null,
    bars: liveHeroes(state).map((hero) => ({
      position: getActorVisualPosition(hero, currentTime),
      colour: hero.colour,
      health: {
        current: hero.health,
        max: Math.max(
          1,
          hero.maxHealth + (state.gameMaster?.modifiers.health ?? 0),
        ),
      },
      actionPips: hero.actions,
      movePips: hero.movement,
    })),
  };
};

// Item views for the item layer: discovered items only (all of them in
// debug mode), each with its sheet frame (or the generic tile while the
// sheet loads) and the inventory label resolved through i18n.
export const buildItemViewModels = (
  state: GameState,
  groundSheet: CanvasImageSource,
  cellSize: number,
  debugMode: boolean,
): SceneItemView[] => {
  const actor = state.currentActor;
  return state.dungeon.layout.items
    .filter(
      (itemLocation: ItemLocation) =>
        debugMode ||
        isDiscovered(
          state.dungeon,
          itemLocation.position.x,
          itemLocation.position.y,
        ),
    )
    .map((itemLocation: ItemLocation) => ({
      position: itemLocation.position,
      sprite: itemLocation.item?.sprite
        ? getItemSpriteFrame(itemLocation.item.sprite)
        : null,
      fallbackTile: actorTileFrame(
        groundSheet,
        ITEM_TILES.ITEM_GENERIC,
        cellSize,
      ),
      label:
        actor && isSamePosition(actor.position, itemLocation.position)
          ? itemLocation.item
            ? i18n(itemLocation.item.name)
            : i18n('campaign.iceDragon.randomItem')
          : null,
    }));
};
