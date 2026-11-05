// Game side of the scene view-model contracts (src/scene/contracts.ts):
// these builders resolve GameState, Actor/Item game data, animation
// timelines, discovery rules and i18n labels into the plain view models
// the world-canvas renderers consume. When the renderers leave as
// @hoard-engine/scene (docs/engine-packages.md, step 9), the contracts
// move with them; the GameState knowledge stays here.

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
import { MonsterType } from '../types';
import {
  getActorFlashIntensity,
  getActorAnimationFrameIndex,
  getActorAnimationName,
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
import { ACTOR_SPRITE_ANIMATION_ORDER } from '../core/ActorAnimation';
import { ACTOR_TILES, ITEM_TILES, type TileRef } from '../dungeon/tiles';
import { getSpriteSourceRect } from './spriteSheets';
import type {
  SceneActorView,
  SceneHeroOverlayView,
  SceneItemView,
  SceneSpriteFrame,
  SceneTileFrame,
} from './contracts';

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
  const image = getReadyImage(sprite.image);
  if (!image) return null;
  const animation = getActorAnimationName(actor, currentTime);
  const configured = sprite.animations?.[animation];
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

const toActorView = (
  actor: Actor,
  tile: SceneTileFrame | null,
  showDebugLabel: boolean,
  currentTime: number,
  bars: Pick<SceneActorView, 'colourBar' | 'healthBar'>,
): SceneActorView => ({
  position: getActorVisualPosition(actor, currentTime),
  sprite: getActorSpriteFrame(actor, currentTime),
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
