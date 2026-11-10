// Sprite packs for the built-in monster families (static/characters/*):
// the orc, troll and dark lord packs share the knight pack's sheet
// geometry (see src/characters/CharacterSpritePacks.ts); each pack's crop
// table is measured the same way from its own frames. All instances of
// one family share the single sprite object; per-instance identity stays
// the colour bar.
import type { ActorSprite } from '../types';
import {
  characterPackSprite,
  type CharacterPackCrops,
} from '../characters/CharacterSpritePacks';

// Same figure scale as the heroes, so monsters and heroes read as one
// art set on the board.
const MONSTER_DRAW_SCALE = 1.2;
const TROLL_DRAW_SCALE = 2;

// Measured from the troll pack's frames (72px windows; figures 52-64px
// tall): horizontally centred on each facing's median silhouette,
// bottom-anchored at its 90th-percentile feet line.
const TROLL_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 31, y: 28, size: 72 },
    southEast: { x: 27, y: 29, size: 72 },
    south: { x: 23, y: 26, size: 72 },
    southWest: { x: 20, y: 23, size: 72 },
    west: { x: 25, y: 23, size: 72 },
    northWest: { x: 28, y: 19, size: 72 },
    north: { x: 32, y: 24, size: 72 },
    northEast: { x: 36, y: 25, size: 72 },
  },
  walk: {
    east: { x: 30, y: 33, size: 72 },
    southEast: { x: 28, y: 31, size: 72 },
    south: { x: 28, y: 29, size: 72 },
    southWest: { x: 26, y: 28, size: 72 },
    west: { x: 25, y: 27, size: 72 },
    northWest: { x: 27, y: 29, size: 72 },
    north: { x: 28, y: 31, size: 72 },
    northEast: { x: 29, y: 30, size: 72 },
  },
  attack: {
    east: { x: 26, y: 31, size: 72 },
    southEast: { x: 25, y: 24, size: 72 },
    south: { x: 26, y: 26, size: 72 },
    southWest: { x: 27, y: 28, size: 72 },
    west: { x: 29, y: 28, size: 72 },
    northWest: { x: 31, y: 27, size: 72 },
    north: { x: 30, y: 31, size: 72 },
    northEast: { x: 28, y: 34, size: 72 },
  },
  hurt: {
    east: { x: 28, y: 35, size: 72 },
    southEast: { x: 24, y: 25, size: 72 },
    south: { x: 19, y: 24, size: 72 },
    southWest: { x: 24, y: 25, size: 72 },
    west: { x: 28, y: 21, size: 72 },
    northWest: { x: 32, y: 21, size: 72 },
    north: { x: 36, y: 25, size: 72 },
    northEast: { x: 32, y: 35, size: 72 },
  },
  death: {
    east: { x: 39, y: 35, size: 72 },
    southEast: { x: 26, y: 46, size: 72 },
    south: { x: 17, y: 38, size: 72 },
    southWest: { x: 10, y: 25, size: 72 },
    west: { x: 17, y: 19, size: 72 },
    northWest: { x: 30, y: 22, size: 72 },
    north: { x: 39, y: 29, size: 72 },
    northEast: { x: 46, y: 29, size: 72 },
  },
};

// Measured from the orc pack's frames (52px windows; figures 41-46px
// tall — the pack's orcs are smaller than its trolls by proportion).
const ORC_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 41, y: 40, size: 52 },
    southEast: { x: 40, y: 40, size: 52 },
    south: { x: 42, y: 41, size: 52 },
    southWest: { x: 39, y: 42, size: 52 },
    west: { x: 34, y: 40, size: 52 },
    northWest: { x: 35, y: 37, size: 52 },
    north: { x: 33, y: 38, size: 52 },
    northEast: { x: 35, y: 40, size: 52 },
  },
  walk: {
    east: { x: 38, y: 41, size: 52 },
    southEast: { x: 40, y: 41, size: 52 },
    south: { x: 41, y: 43, size: 52 },
    southWest: { x: 42, y: 44, size: 52 },
    west: { x: 37, y: 46, size: 52 },
    northWest: { x: 35, y: 44, size: 52 },
    north: { x: 34, y: 43, size: 52 },
    northEast: { x: 34, y: 41, size: 52 },
  },
  attack: {
    east: { x: 39, y: 39, size: 52 },
    southEast: { x: 37, y: 44, size: 52 },
    south: { x: 33, y: 46, size: 52 },
    southWest: { x: 34, y: 41, size: 52 },
    west: { x: 37, y: 37, size: 52 },
    northWest: { x: 38, y: 40, size: 52 },
    north: { x: 42, y: 42, size: 52 },
    northEast: { x: 41, y: 42, size: 52 },
  },
  hurt: {
    east: { x: 40, y: 47, size: 52 },
    southEast: { x: 37, y: 47, size: 52 },
    south: { x: 33, y: 45, size: 52 },
    southWest: { x: 30, y: 44, size: 52 },
    west: { x: 35, y: 39, size: 52 },
    northWest: { x: 38, y: 39, size: 52 },
    north: { x: 42, y: 45, size: 52 },
    northEast: { x: 45, y: 47, size: 52 },
  },
  death: {
    east: { x: 55, y: 55, size: 52 },
    southEast: { x: 43, y: 64, size: 52 },
    south: { x: 27, y: 62, size: 52 },
    southWest: { x: 19, y: 50, size: 52 },
    west: { x: 20, y: 39, size: 52 },
    northWest: { x: 32, y: 39, size: 52 },
    north: { x: 48, y: 44, size: 52 },
    northEast: { x: 56, y: 45, size: 52 },
  },
};

// Measured from the dark lord pack's frames (70px windows; figures
// 58-68px tall). All four dark lord colours share the one sprite.
const DARK_LORD_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 35, y: 38, size: 70 },
    southEast: { x: 27, y: 32, size: 70 },
    south: { x: 20, y: 36, size: 70 },
    southWest: { x: 24, y: 31, size: 70 },
    west: { x: 26, y: 23, size: 70 },
    northWest: { x: 34, y: 21, size: 70 },
    north: { x: 41, y: 26, size: 70 },
    northEast: { x: 37, y: 35, size: 70 },
  },
  walk: {
    east: { x: 39, y: 35, size: 70 },
    southEast: { x: 31, y: 34, size: 70 },
    south: { x: 24, y: 38, size: 70 },
    southWest: { x: 23, y: 32, size: 70 },
    west: { x: 22, y: 25, size: 70 },
    northWest: { x: 32, y: 26, size: 70 },
    north: { x: 37, y: 29, size: 70 },
    northEast: { x: 37, y: 33, size: 70 },
  },
  attack: {
    east: { x: 40, y: 38, size: 70 },
    southEast: { x: 34, y: 41, size: 70 },
    south: { x: 21, y: 52, size: 70 },
    southWest: { x: 19, y: 42, size: 70 },
    west: { x: 19, y: 33, size: 70 },
    northWest: { x: 28, y: 34, size: 70 },
    north: { x: 40, y: 31, size: 70 },
    northEast: { x: 42, y: 35, size: 70 },
  },
  hurt: {
    east: { x: 38, y: 41, size: 70 },
    southEast: { x: 29, y: 34, size: 70 },
    south: { x: 18, y: 37, size: 70 },
    southWest: { x: 22, y: 32, size: 70 },
    west: { x: 22, y: 23, size: 70 },
    northWest: { x: 33, y: 22, size: 70 },
    north: { x: 43, y: 25, size: 70 },
    northEast: { x: 38, y: 35, size: 70 },
  },
  death: {
    east: { x: 33, y: 43, size: 70 },
    southEast: { x: 29, y: 39, size: 70 },
    south: { x: 19, y: 33, size: 70 },
    southWest: { x: 21, y: 37, size: 70 },
    west: { x: 26, y: 37, size: 70 },
    northWest: { x: 32, y: 33, size: 70 },
    north: { x: 41, y: 28, size: 70 },
    northEast: { x: 38, y: 35, size: 70 },
  },
};

export const trollSprite: ActorSprite = characterPackSprite({
  pack: 'troll',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Attack 1.png',
    hurt: 'TakeDamage 1.png',
    death: 'Die 1.png',
  },
  crops: TROLL_SPRITE_CROPS,
  drawScale: TROLL_DRAW_SCALE,
});

export const orcSprite: ActorSprite = characterPackSprite({
  pack: 'orc',
  animations: {
    idle: 'Idle 1 16bit.png',
    walk: 'Walk.png',
    attack: 'Attack 1.png',
    hurt: 'TakeDamage 1.png',
    death: 'Die 1.png',
  },
  crops: ORC_SPRITE_CROPS,
  drawScale: MONSTER_DRAW_SCALE,
});

export const darkLordSprite: ActorSprite = characterPackSprite({
  pack: 'darkLord',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Attack1.png',
    hurt: 'TakeDamage.png',
    death: 'Die.png',
  },
  crops: DARK_LORD_SPRITE_CROPS,
  drawScale: MONSTER_DRAW_SCALE,
});
