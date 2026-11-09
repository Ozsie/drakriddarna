// Game side of the scene view-model contracts (@hoard-engine/scene):
// these builders resolve GameState, Actor/Item game data, animation
// timelines, discovery rules and i18n labels into the plain view models
// the world-canvas renderers consume. The renderer cores left as the
// @hoard-engine/scene engine package (docs/engine-packages.md, step 9);
// the GameState knowledge stays here.

import type {
  Actor,
  Corpse,
  Dungeon,
  GameState,
  Hero,
  ItemLocation,
  ItemSprite,
  LightSource,
  LightSprite,
  Monster,
  Position,
} from '../types';
import { CellAlignment, MonsterType, SecretType, TerrainType } from '../types';
import {
  DEFAULT_ACTOR_SPRITE_FACING,
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
import { createDecoratorPreset } from '../dungeon/Decorators';
import { ACTOR_TILES, ITEM_TILES, type TileRef } from '../dungeon/tiles';
import {
  TERRAIN_OVERLAY,
  drawColourBar,
  drawHealthBar,
  drawLabelBox,
  getSpriteSourceRect,
  renderActorView,
  renderItemView,
  spriteDirectionRow,
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
  // Shared-sheet model: one row per animation in ACTOR_SPRITE_ANIMATION_ORDER;
  // the row lookup is the scene package's sheet order convention.
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
  const row = spriteDirectionRow(ACTOR_SPRITE_ANIMATION_ORDER, animation);
  return {
    image,
    sx: frameIndex * sprite.frameWidth,
    sy: row * sprite.frameHeight,
    sw: sprite.frameWidth,
    sh: sprite.frameHeight,
  };
};

// The corpse's frozen frame: the last frame of its death animation, on
// the death row of the shared sheet or the facing row it fell at (the
// per-animation-pack model), with the same crop window a living actor
// of that sprite would draw.
const getCorpseSpriteFrame = (corpse: Corpse): SceneSpriteFrame | null => {
  const sprite = corpse.sprite;
  const configured = sprite.animations?.death;
  const lastFrameIndex = (image: HTMLImageElement): number => {
    const frameCount =
      configured !== undefined
        ? Math.max(1, configured)
        : Math.max(
            1,
            Math.floor((image.naturalWidth || image.width) / sprite.frameWidth),
          );
    return frameCount - 1;
  };
  const animationImage = sprite.animationImages?.death;
  if (animationImage) {
    const image = getReadyImage(animationImage);
    if (!image) return null;
    const facing = corpse.facing ?? DEFAULT_ACTOR_SPRITE_FACING;
    const crop = sprite.frameCrops?.death?.[facing];
    return {
      image,
      sx: lastFrameIndex(image) * sprite.frameWidth + (crop?.x ?? 0),
      sy:
        (sprite.facings?.length
          ? spriteDirectionRow(sprite.facings, facing)
          : 0) *
          sprite.frameHeight +
        (crop?.y ?? 0),
      sw: crop?.size ?? sprite.frameWidth,
      sh: crop?.size ?? sprite.frameHeight,
    };
  }
  if (!sprite.image) return null;
  const image = getReadyImage(sprite.image);
  if (!image) return null;
  const row = spriteDirectionRow(ACTOR_SPRITE_ANIMATION_ORDER, 'death');
  return {
    image,
    sx: lastFrameIndex(image) * sprite.frameWidth,
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
  if (sprite.sourceRect) {
    const { x, y, width: sw, height: sh } = sprite.sourceRect;
    return { image, sx: x, sy: y, sw, sh };
  }
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
// makes the floor anchor correct. Returns whether a frame was drawn.
export const drawActorViewSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneActorView,
  cellSize: number,
): boolean => {
  const frame = view.sprite;
  if (!frame) return false;
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
  return true;
};

// One actor view drawn through both paths: the game-side scaled sprite
// when the view carries a draw scale (the scene package's sprite path
// always draws into exactly one cell), then the package's own flash,
// colour bar and debug extras. Health bars are never drawn here: they
// draw in a later pass above the lighting and the darkness veil (see
// renderMonsterHealthBars in src/scene/ActorRendering.ts), so they stay
// legible in unlit rooms. The fallback tile only draws while the scaled
// sheets are still loading; once the sprite has drawn at its larger
// size, drawing the cell-sized tile underneath would show a duplicate
// silhouette behind the figure.
export const renderActorViewWithSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneActorView,
  cellSize: number,
): boolean => {
  const draw = view as GameActorView;
  if (!draw.spriteDraw) {
    return renderActorView(ctx, { ...view, healthBar: null }, cellSize);
  }
  const drew = drawActorViewSprite(ctx, view, cellSize);
  return renderActorView(
    ctx,
    {
      ...view,
      sprite: null,
      healthBar: null,
      ...(drew ? { tile: null } : {}),
    },
    cellSize,
  );
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
          colourBar: '',
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
          colourBar: '',
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

// Corpse views for the actor layer: the fallen stay in the cell they
// died, frozen on the last frame of their death animation, until another
// actor dies on top of them. While the dying actor's own death animation
// is still playing in that cell, the dying path draws there instead —
// the corpse stays hidden so the cell is never drawn twice. Corpses
// respect the room discovery the same way live monsters do, and they
// never animate: no bars, no flash, nothing to keep the render loop
// ticking.
export const buildCorpseViewModels = (
  state: GameState,
  currentTime: number = Date.now(),
): GameActorView[] => {
  const dying = getDyingActors(currentTime);
  return (state.dungeon.layout.corpses ?? [])
    .filter(
      (corpse) =>
        !dying.some((actor) => isSamePosition(actor.position, corpse.position)),
    )
    .filter((corpse) => {
      const cell =
        state.dungeon.layout.grid[corpse.position.y]?.[corpse.position.x] ?? '';
      return isRoomDiscovered(state.dungeon, cell);
    })
    .map((corpse) => ({
      position: { x: corpse.position.x, y: corpse.position.y },
      sprite: getCorpseSpriteFrame(corpse),
      ...(corpse.sprite.drawScale && corpse.sprite.drawScale > 1
        ? { spriteDraw: { scale: corpse.sprite.drawScale } }
        : {}),
      tile: null,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
    }));
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
// A hero overlay bar with the game-side sprite scale attached: bars of
// scaled-sprite heroes draw game-side (see drawScaledHeroBar), because
// their health bar must sit above the sprite instead of above its cell.
export type GameHeroOverlayBar = SceneHeroOverlayView['bars'][number] & {
  spriteDraw?: { scale: number };
};

export type GameHeroOverlayView = Omit<
  SceneHeroOverlayView,
  'bars' | 'walkableCellColor'
> & {
  walkableCellColor?: string;
  bars: GameHeroOverlayBar[];
};

// One scaled-sprite hero's bar stack: the action/move pips and the
// colour bar stay at the hero's cell, while the health bar lifts to the
// sprite's top edge — a drawScale N sprite tops out (N - 1) cells above
// its cell.
export const drawScaledHeroBar = (
  ctx: CanvasRenderingContext2D,
  bar: GameHeroOverlayBar,
  cellSize: number,
): void => {
  const scale = bar.spriteDraw?.scale ?? 1;
  drawHeroBarPips(ctx, bar, cellSize);
  drawColourBar(ctx, bar.position, bar.colour, cellSize);
  drawHealthBar(
    ctx,
    { x: bar.position.x, y: bar.position.y - (scale - 1) },
    bar.health,
    cellSize,
  );
};

// The package's pip rendering is module-private (actorCanvas.js
// renderActionPips); this mirrors its geometry for the scaled-sprite
// bars, which draw game-side. Keep in sync with the package until the
// pip primitive is exported.
const drawHeroBarPips = (
  ctx: CanvasRenderingContext2D,
  bar: GameHeroOverlayBar,
  cellSize: number,
): void => {
  const { position, actionPips, movePips } = bar;
  const x = position.x;
  const y = position.y;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  ctx.strokeStyle = '#080808';
  ctx.fillStyle = 'darkred';
  for (let index = 0; index < (actionPips ?? 0); index++) {
    ctx.fillRect(
      x * cellSize + 4 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.rect(x * cellSize + 4 + 6 * index, y * cellSize + cellSize - 12, 5, 5);
    ctx.stroke();
  }
  ctx.fillStyle = 'blue';
  for (let index = 0; index < (movePips ?? 0); index++) {
    ctx.fillRect(
      x * cellSize + cellSize - 22 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.rect(
      x * cellSize + cellSize - 22 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.stroke();
  }
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
};

export const buildHeroOverlayViewModel = (
  state: GameState,
  currentTime: number = Date.now(),
): GameHeroOverlayView => {
  const currentActor = state.currentActor;
  return {
    walkableCells: buildWalkableCells(state),
    ...(currentActor &&
    state.dungeon.portal &&
    isSamePosition(currentActor.position, state.dungeon.portal)
      ? { walkableCellColor: 'lightblue' }
      : {}),
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
      ...(hero.sprite?.drawScale && hero.sprite.drawScale > 1
        ? { spriteDraw: { scale: hero.sprite.drawScale } }
        : {}),
    })),
  };
};

// An item view plus the game-side sprite drawing demand: item sprites are
// author art at the full cell footprint, so the cell draw shrink stays on
// the game side (the scene package's item path always fills the cell).
export type GameItemView = SceneItemView & {
  spriteDraw?: {
    scale: number;
    alignment?: CellAlignment;
    offset?: { x: number; y: number };
  };
};

// Item sprites draw at 75% of the cell so the items don't fill their
// cells completely.
export const ITEM_SPRITE_SCALE = 0.75;
export const FOUND_SECRET_SPRITE_SCALE = 0.6;

// Decorative sprites share the floor-item footprint and discovery behavior.
export const buildDecoratorViewModels = (
  state: GameState,
  groundSheet: CanvasImageSource,
  cellSize: number,
): GameItemView[] =>
  (state.dungeon.layout.decorators ?? [])
    .filter((decorator) => {
      const { x, y } = decorator.position;
      const cell = state.dungeon.layout.grid[y]?.[x] ?? '';
      return Boolean(cell) && isRoomDiscovered(state.dungeon, cell);
    })
    .flatMap((decorator) => {
      const sprite = getItemSpriteFrame(decorator.sprite);
      if (!sprite) return [];
      return [
        {
          position: decorator.position,
          sprite,
          spriteDraw: {
            scale: ITEM_SPRITE_SCALE,
            alignment: decorator.alignment ?? CellAlignment.CENTER,
          },
          fallbackTile: actorTileFrame(
            groundSheet,
            ITEM_TILES.ITEM_GENERIC,
            cellSize,
          ),
          label: null,
        },
      ];
    });

export const buildFoundSecretViewModels = (
  dungeon: SceneDungeonView,
  groundSheet: CanvasImageSource,
  cellSize: number,
): GameItemView[] => {
  const sprite = getItemSpriteFrame(
    createDecoratorPreset('objectsObject021', { x: 0, y: 0 }).sprite,
  );
  return dungeon.layout.secrets
    .filter((secret) => secret.found && secret.type !== SecretType.TRAP_DOOR)
    .map((secret) => ({
      position: secret.position,
      sprite,
      spriteDraw: {
        scale: FOUND_SECRET_SPRITE_SCALE,
        alignment: CellAlignment.CENTER_TOP,
      },
      fallbackTile: actorTileFrame(
        groundSheet,
        ITEM_TILES.ITEM_GENERIC,
        cellSize,
      ),
      label: null,
    }));
};

export const buildLightSpriteViewModels = (
  state: GameState,
  groundSheet: CanvasImageSource,
  cellSize: number,
  debugMode = false,
  timeMs = Date.now(),
): GameItemView[] =>
  (state.dungeon.layout.lights ?? [])
    .filter(
      (light): light is LightSource & { sprite: LightSprite } =>
        Boolean(light.sprite) &&
        (debugMode ||
          isDiscovered(state.dungeon, light.position.x, light.position.y)),
    )
    .map((light) => {
      const { sprite } = light;
      const image = sprite.image ? getReadyImage(sprite.image) : null;
      const sourceImage = image ?? groundSheet;
      const frameWidth = sprite.frameWidth ?? sprite.size;
      const frameHeight = sprite.frameHeight ?? sprite.size;
      const columns = image
        ? Math.max(1, Math.floor((image.naturalWidth - sprite.x) / frameWidth))
        : 1;
      const availableFrames = image
        ? columns *
          Math.max(
            1,
            Math.floor((image.naturalHeight - sprite.y) / frameHeight),
          )
        : 1;
      const frameCount = Math.min(
        availableFrames,
        Math.max(1, Math.floor(sprite.frameCount ?? 1)),
      );
      const frameRate = Math.max(0, sprite.frameRate ?? 8);
      const frameIndex =
        image && frameRate > 0
          ? Math.floor((Math.max(0, timeMs) * frameRate) / 1000) % frameCount
          : 0;
      const alignment = light.alignment ?? CellAlignment.CENTER;
      return {
        position: light.position,
        sprite:
          image || !sprite.image
            ? {
                image: sourceImage,
                sx: sprite.x + (frameIndex % columns) * frameWidth,
                sy: sprite.y + Math.floor(frameIndex / columns) * frameHeight,
                sw: frameWidth,
                sh: frameHeight,
              }
            : null,
        spriteDraw: {
          scale: sprite.scale ?? 1,
          alignment,
          offset: sprite.alignmentOffsets?.[alignment] ?? { x: 0, y: 0 },
        },
        fallbackTile: actorTileFrame(
          groundSheet,
          ITEM_TILES.ITEM_GENERIC,
          cellSize,
        ),
        label: null,
      };
    });

// Item views for the item layer: discovered items only (all of them in
// debug mode), each with its sheet frame (or the generic tile while the
// sheet loads) and the inventory label resolved through i18n.
export const buildItemViewModels = (
  state: GameState,
  groundSheet: CanvasImageSource,
  cellSize: number,
  debugMode: boolean,
): GameItemView[] => {
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
    .map((itemLocation: ItemLocation) => {
      const sprite = itemLocation.item?.sprite
        ? getItemSpriteFrame(itemLocation.item.sprite)
        : null;
      return {
        position: itemLocation.position,
        sprite,
        ...(sprite ? { spriteDraw: { scale: ITEM_SPRITE_SCALE } } : {}),
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
      };
    });
};

// Draws one item view's sprite at its draw scale. Sprites align their bounds
// within the cell according to CellAlignment.
// Unlike actors, items lie flat on the floor tile, so their default center
// alignment does not anchor them to the cell's bottom edge.
// Returns whether a frame was drawn.
export const drawItemViewSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneItemView,
  cellSize: number,
): boolean => {
  const frame = view.sprite;
  if (!frame) return false;
  const scale = (view as GameItemView).spriteDraw?.scale ?? 1;
  const maxSize = cellSize * scale;
  const frameScale = Math.min(maxSize / frame.sw, maxSize / frame.sh);
  const width = frame.sw * frameScale;
  const height = frame.sh * frameScale;
  const alignment = (view as GameItemView).spriteDraw?.alignment;
  const leftAligned =
    alignment === CellAlignment.TOP_LEFT ||
    alignment === CellAlignment.BOTTOM_LEFT ||
    alignment === CellAlignment.CENTER_LEFT;
  const rightAligned =
    alignment === CellAlignment.TOP_RIGHT ||
    alignment === CellAlignment.BOTTOM_RIGHT ||
    alignment === CellAlignment.CENTER_RIGHT;
  const topAligned =
    alignment === CellAlignment.TOP_LEFT ||
    alignment === CellAlignment.TOP_RIGHT ||
    alignment === CellAlignment.CENTER_TOP;
  const bottomAligned =
    alignment === CellAlignment.BOTTOM_LEFT ||
    alignment === CellAlignment.BOTTOM_RIGHT ||
    alignment === CellAlignment.CENTER_BOTTOM;
  const offset = (view as GameItemView).spriteDraw?.offset;
  const dx =
    view.position.x * cellSize +
    (leftAligned
      ? 0
      : rightAligned
        ? cellSize - width
        : (cellSize - width) / 2) +
    (offset?.x ?? 0);
  const dy =
    view.position.y * cellSize +
    (topAligned
      ? 0
      : bottomAligned
        ? cellSize - height
        : (cellSize - height) / 2) +
    (offset?.y ?? 0);
  const imageSmoothingEnabled = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  try {
    ctx.drawImage(
      frame.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      dx,
      dy,
      width,
      height,
    );
  } finally {
    ctx.imageSmoothingEnabled = imageSmoothingEnabled;
  }
  return true;
};

// One item view drawn through both paths: the game-side scaled sprite
// when the view carries a draw scale (the scene package's sprite path
// always fills the cell), then the package's label box. The package item
// path has no sprite-less variant without the fallback tile, so the
// label draws game-side alongside the scaled sprite; the fallback tile
// only shows through the plain path while the sheet is still loading.
export const renderItemViewWithSprite = (
  ctx: CanvasRenderingContext2D,
  view: SceneItemView,
  cellSize: number,
): void => {
  if (!(view as GameItemView).spriteDraw || !view.sprite) {
    renderItemView(ctx, view, cellSize);
    return;
  }
  drawItemViewSprite(ctx, view, cellSize);
  if (view.label) {
    drawLabelBox(ctx, view.label, view.position, cellSize);
  }
};
