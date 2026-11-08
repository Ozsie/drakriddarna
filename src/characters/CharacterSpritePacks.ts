// Shared sprite plumbing for the character packs under static/characters/*.
// Both pack families (the knight/darkLord pack and the orc/troll pack)
// ship the same sheet geometry: one 1920x1024 PNG per animation — 128px
// frames, 15 columns per row, one row per facing in the order below
// (east first, sweeping clockwise to north-east) — and their figures
// occupy only part of each frame, so each pack also needs a measured
// source window per animation and facing (frameCrops) to draw its
// figures at pack scale.
import type {
  ActorAnimationName,
  ActorSprite,
  ActorSpriteFacing,
  ActorSpriteFrameCrop,
} from '../types';

export const CHARACTER_PACK_FACINGS: ActorSpriteFacing[] = [
  'east',
  'southEast',
  'south',
  'southWest',
  'west',
  'northWest',
  'north',
  'northEast',
];

const CHARACTER_PACK_FRAME_SIZE = 128;
const CHARACTER_PACK_FRAMES_PER_ROW = 15;

// 15 frames x 50ms = 750ms per pass: one walk cycle per grid step at the
// default step duration, and full one-shot swings inside the animation
// windows derived from the same numbers. Raise or lower this to speed up
// or slow down every character-pack actor (heroes and monsters alike).
export const CHARACTER_PACK_FRAME_DURATION_MS = 50;

export type CharacterPackAnimationFiles = Record<ActorAnimationName, string>;

export type CharacterPackCrops = Partial<
  Record<
    ActorAnimationName,
    Partial<Record<ActorSpriteFacing, ActorSpriteFrameCrop>>
  >
>;

export interface CharacterPackSpriteOptions {
  // Folder name under static/characters.
  pack: string;
  // One image file name per animation, inside the pack folder.
  animations: CharacterPackAnimationFiles;
  // Measured per-animation/facing source windows (see the packs' tables).
  crops: CharacterPackCrops;
  // Draw size in cells; heroes and monsters use the same figure scale.
  drawScale: number;
}

// Builds the ActorSprite for one character pack. Shared and frozen: the
// sprite is content data, never mutated per actor.
export const characterPackSprite = (
  options: CharacterPackSpriteOptions,
): ActorSprite =>
  Object.freeze({
    frameWidth: CHARACTER_PACK_FRAME_SIZE,
    frameHeight: CHARACTER_PACK_FRAME_SIZE,
    frameDurationMs: CHARACTER_PACK_FRAME_DURATION_MS,
    animations: {
      idle: CHARACTER_PACK_FRAMES_PER_ROW,
      walk: CHARACTER_PACK_FRAMES_PER_ROW,
      attack: CHARACTER_PACK_FRAMES_PER_ROW,
      hurt: CHARACTER_PACK_FRAMES_PER_ROW,
      death: CHARACTER_PACK_FRAMES_PER_ROW,
    },
    animationImages: Object.fromEntries(
      Object.entries(options.animations).map(([animation, file]) => [
        animation,
        `characters/${options.pack}/${file}`,
      ]),
    ),
    facings: CHARACTER_PACK_FACINGS,
    frameCrops: options.crops,
    drawScale: options.drawScale,
  });
