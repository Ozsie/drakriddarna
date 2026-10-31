import type { Actor, ActorAnimationName, ActorSprite } from '../types';
import { drawCachedTile } from '../dungeon/TileTextureCache';
import { getReadyImage } from './ImageCache';
import {
  ACTOR_SPRITE_ANIMATION_ORDER,
  getActorAnimationFrameIndex,
  getActorAnimationName,
  isActorSpriteAnimationActive,
} from './ActorAnimation';

// The actor's sprite sheet once it is loaded and ready to be drawn, or null
// while it is still loading (callers fall back to the static actor sprites).
export const getReadyActorSpriteImage = (
  actor: Actor,
): HTMLImageElement | null => {
  const sprite = actor.sprite;
  if (!sprite) return null;
  return getReadyImage(sprite.image);
};

const getFrameCount = (
  sprite: ActorSprite,
  animation: ActorAnimationName,
  image: HTMLImageElement,
): number => {
  const configured = sprite.animations?.[animation];
  if (configured !== undefined) {
    return Math.max(1, configured);
  }
  const width = image.naturalWidth || image.width;
  return Math.max(1, Math.floor(width / sprite.frameWidth));
};

/**
 * Draws the actor's current animation frame from its sprite sheet and
 * returns whether the animation may still advance (looping animations
 * always do, keeping the render loop ticking).
 */
export const renderActorSprite = (
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  image: HTMLImageElement,
  x: number,
  y: number,
  cellSize: number,
  currentTime: number = Date.now(),
): boolean => {
  const sprite = actor.sprite;
  if (!sprite) return false;
  const animation = getActorAnimationName(actor, currentTime);
  const frameCount = getFrameCount(sprite, animation, image);
  const frameIndex = getActorAnimationFrameIndex(
    actor,
    animation,
    frameCount,
    currentTime,
  );
  const row = ACTOR_SPRITE_ANIMATION_ORDER.indexOf(animation);
  drawCachedTile(
    ctx,
    image,
    frameIndex * sprite.frameWidth,
    row * sprite.frameHeight,
    sprite.frameWidth,
    sprite.frameHeight,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
  return isActorSpriteAnimationActive(actor, currentTime);
};
