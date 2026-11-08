import type {
  Shield,
  Armour,
  Actor,
  ActorSprite,
  GameState,
  Hero,
  Monster,
  Door,
  Position,
  Item,
  Weapon,
  MoveDirection,
  InteractableCell,
  Difficulty,
} from '../types';
import { Colour, ItemType, Level } from '../types';
import {
  characterPackSprite,
  type CharacterPackCrops,
} from '../characters/CharacterSpritePacks';
import { weapons } from '../items/weapons';
import {
  addLog,
  doReRender,
  i18n,
  recordActorStep,
  clearActorAnimations,
  faceHeroesTowardClosestRoomDoor,
  faceRevealedMonsters,
} from '../core';
import {
  findCell,
  findNeighbouringHeroes,
  isDoorEdge,
  isDiscovered,
  isNeighbouring,
  isSamePosition,
  isWalkable,
  crossesWallEdge,
  sideOffset,
} from '../core';
import { roll } from '../core';
import {
  canAct,
  createIndicator,
  doorAsActor,
  getDifficulty,
  getEffectiveMaxMovement,
  getEffectiveMaxHealth,
  spendStandardAction,
  takeDamage,
} from '../core';
import {
  checkForItemRevealedSecret,
  checkForTrapDoor,
  removeFoundItemFromDeck,
  removeFoundMagicItemFromDeck,
  searchForSecret,
} from '../secrets/SecretsLogic';
import {
  checkForInteractable,
  findInteractableAtHero,
  triggerInteractable,
} from '../interactables/InteractableLogic';
import { executeRoomDiscoveredEffect } from '../dungeon/RoomEffectsLogic';
import { applyRoomFogEnterEffects } from '../dungeon/RoomFogLogic';
import {
  applyTerrainEnterEffects,
  terrainMovementCost,
} from '../dungeon/TerrainLogic';
import {
  ACTIVE,
  BREAK_LOCK,
  onDrop,
  onPickup,
  resolveChaosSwordAttack,
} from '../items/ItemLogic';
import { COLLAPSED, EMPTY, WALL } from '../core';
import { emitSoundCue, itemPickupScore } from '../core';

// 70px square of the 128px frames: the pack's 57-68px figures fill the
// cell at pack scale (drawn into the full cell instead of the empty
// frame padding that would shrink them to half the cell).
const KNIGHT_SPRITE_CROP_SIZE = 70;

// Source window per animation and facing, measured from the pack's frame
// content: horizontally centred on each facing's median silhouette,
// bottom-anchored at its 90th-percentile feet line so the stance stands
// on the cell floor. Extreme weapon sweeps and collapse poses extend
// past the window and clip at the cell edge, which reads as part of the
// motion rather than shrinking the figure.
const KNIGHT_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 33, y: 37, size: KNIGHT_SPRITE_CROP_SIZE },
    southEast: { x: 31, y: 40, size: KNIGHT_SPRITE_CROP_SIZE },
    south: { x: 25, y: 39, size: KNIGHT_SPRITE_CROP_SIZE },
    southWest: { x: 21, y: 38, size: KNIGHT_SPRITE_CROP_SIZE },
    west: { x: 26, y: 29, size: KNIGHT_SPRITE_CROP_SIZE },
    northWest: { x: 29, y: 27, size: KNIGHT_SPRITE_CROP_SIZE },
    north: { x: 35, y: 33, size: KNIGHT_SPRITE_CROP_SIZE },
    northEast: { x: 38, y: 37, size: KNIGHT_SPRITE_CROP_SIZE },
  },
  walk: {
    east: { x: 38, y: 36, size: KNIGHT_SPRITE_CROP_SIZE },
    southEast: { x: 33, y: 37, size: KNIGHT_SPRITE_CROP_SIZE },
    south: { x: 29, y: 41, size: KNIGHT_SPRITE_CROP_SIZE },
    southWest: { x: 21, y: 40, size: KNIGHT_SPRITE_CROP_SIZE },
    west: { x: 22, y: 36, size: KNIGHT_SPRITE_CROP_SIZE },
    northWest: { x: 27, y: 32, size: KNIGHT_SPRITE_CROP_SIZE },
    north: { x: 31, y: 32, size: KNIGHT_SPRITE_CROP_SIZE },
    northEast: { x: 37, y: 35, size: KNIGHT_SPRITE_CROP_SIZE },
  },
  attack: {
    east: { x: 47, y: 45, size: KNIGHT_SPRITE_CROP_SIZE },
    southEast: { x: 42, y: 52, size: KNIGHT_SPRITE_CROP_SIZE },
    south: { x: 26, y: 58, size: KNIGHT_SPRITE_CROP_SIZE },
    southWest: { x: 11, y: 56, size: KNIGHT_SPRITE_CROP_SIZE },
    west: { x: 14, y: 45, size: KNIGHT_SPRITE_CROP_SIZE },
    northWest: { x: 17, y: 33, size: KNIGHT_SPRITE_CROP_SIZE },
    north: { x: 32, y: 33, size: KNIGHT_SPRITE_CROP_SIZE },
    northEast: { x: 49, y: 41, size: KNIGHT_SPRITE_CROP_SIZE },
  },
  hurt: {
    east: { x: 30, y: 45, size: KNIGHT_SPRITE_CROP_SIZE },
    southEast: { x: 27, y: 40, size: KNIGHT_SPRITE_CROP_SIZE },
    south: { x: 22, y: 40, size: KNIGHT_SPRITE_CROP_SIZE },
    southWest: { x: 22, y: 37, size: KNIGHT_SPRITE_CROP_SIZE },
    west: { x: 29, y: 32, size: KNIGHT_SPRITE_CROP_SIZE },
    northWest: { x: 33, y: 32, size: KNIGHT_SPRITE_CROP_SIZE },
    north: { x: 37, y: 41, size: KNIGHT_SPRITE_CROP_SIZE },
    northEast: { x: 38, y: 45, size: KNIGHT_SPRITE_CROP_SIZE },
  },
  death: {
    east: { x: 43, y: 44, size: KNIGHT_SPRITE_CROP_SIZE },
    southEast: { x: 36, y: 58, size: KNIGHT_SPRITE_CROP_SIZE },
    south: { x: 29, y: 58, size: KNIGHT_SPRITE_CROP_SIZE },
    southWest: { x: 17, y: 52, size: KNIGHT_SPRITE_CROP_SIZE },
    west: { x: 14, y: 43, size: KNIGHT_SPRITE_CROP_SIZE },
    northWest: { x: 23, y: 43, size: KNIGHT_SPRITE_CROP_SIZE },
    north: { x: 28, y: 46, size: KNIGHT_SPRITE_CROP_SIZE },
    northEast: { x: 40, y: 43, size: KNIGHT_SPRITE_CROP_SIZE },
  },
};

// Every hero pack sprite (static/characters/*) draws with drawScale
// taller than one cell, so the pack's figures read as heroes rather than
// tokens on a board: the draw is centered on the cell, anchored to the
// floor, and towers (scale - 1) cells into the row above. Per-hero
// identity stays the colour bar.
const HERO_DRAW_SCALE = 1.2;

const knightSprite: ActorSprite = characterPackSprite({
  pack: 'knight',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Melee.png',
    hurt: 'TakeDamage.png',
    death: 'Die.png',
  },
  crops: KNIGHT_SPRITE_CROPS,
  drawScale: HERO_DRAW_SCALE,
});

// Measured from the paladin pack's frames the same way as the knight's
// tables: 70px windows, horizontally centred on each facing's median
// silhouette, bottom-anchored at its 90th-percentile feet line.
const PALADIN_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 30, y: 40, size: 70 },
    southEast: { x: 27, y: 42, size: 70 },
    south: { x: 25, y: 40, size: 70 },
    southWest: { x: 19, y: 38, size: 70 },
    west: { x: 29, y: 31, size: 70 },
    northWest: { x: 32, y: 27, size: 70 },
    north: { x: 36, y: 40, size: 70 },
    northEast: { x: 40, y: 43, size: 70 },
  },
  walk: {
    east: { x: 28, y: 45, size: 70 },
    southEast: { x: 28, y: 44, size: 70 },
    south: { x: 18, y: 41, size: 70 },
    southWest: { x: 24, y: 37, size: 70 },
    west: { x: 30, y: 31, size: 70 },
    northWest: { x: 31, y: 39, size: 70 },
    north: { x: 43, y: 42, size: 70 },
    northEast: { x: 35, y: 40, size: 70 },
  },
  attack: {
    east: { x: 41, y: 58, size: 70 },
    southEast: { x: 31, y: 58, size: 70 },
    south: { x: 22, y: 58, size: 70 },
    southWest: { x: 12, y: 58, size: 70 },
    west: { x: 17, y: 45, size: 70 },
    northWest: { x: 28, y: 33, size: 70 },
    north: { x: 38, y: 45, size: 70 },
    northEast: { x: 45, y: 58, size: 70 },
  },
  hurt: {
    east: { x: 27, y: 49, size: 70 },
    southEast: { x: 24, y: 43, size: 70 },
    south: { x: 22, y: 43, size: 70 },
    southWest: { x: 23, y: 40, size: 70 },
    west: { x: 31, y: 35, size: 70 },
    northWest: { x: 35, y: 44, size: 70 },
    north: { x: 39, y: 50, size: 70 },
    northEast: { x: 37, y: 48, size: 70 },
  },
  death: {
    east: { x: 38, y: 48, size: 70 },
    southEast: { x: 31, y: 58, size: 70 },
    south: { x: 30, y: 58, size: 70 },
    southWest: { x: 17, y: 53, size: 70 },
    west: { x: 20, y: 45, size: 70 },
    northWest: { x: 27, y: 43, size: 70 },
    north: { x: 29, y: 46, size: 70 },
    northEast: { x: 41, y: 51, size: 70 },
  },
};

const paladinSprite: ActorSprite = characterPackSprite({
  pack: 'paladin',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Melee.png',
    hurt: 'TakeDamage.png',
    death: 'Die.png',
  },
  crops: PALADIN_SPRITE_CROPS,
  drawScale: HERO_DRAW_SCALE,
});

// Measured from the nomad pack's frames (70px windows): the pack's
// attack sheet is Attack1.png rather than the knight family's Melee.png.
const NOMAD_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 33, y: 23, size: 70 },
    southEast: { x: 30, y: 32, size: 70 },
    south: { x: 32, y: 33, size: 70 },
    southWest: { x: 24, y: 27, size: 70 },
    west: { x: 27, y: 24, size: 70 },
    northWest: { x: 30, y: 25, size: 70 },
    north: { x: 30, y: 27, size: 70 },
    northEast: { x: 36, y: 27, size: 70 },
  },
  walk: {
    east: { x: 40, y: 31, size: 70 },
    southEast: { x: 35, y: 40, size: 70 },
    south: { x: 27, y: 36, size: 70 },
    southWest: { x: 18, y: 29, size: 70 },
    west: { x: 21, y: 25, size: 70 },
    northWest: { x: 26, y: 21, size: 70 },
    north: { x: 35, y: 22, size: 70 },
    northEast: { x: 44, y: 23, size: 70 },
  },
  attack: {
    east: { x: 40, y: 41, size: 70 },
    southEast: { x: 31, y: 38, size: 70 },
    south: { x: 30, y: 38, size: 70 },
    southWest: { x: 28, y: 37, size: 70 },
    west: { x: 20, y: 39, size: 70 },
    northWest: { x: 29, y: 37, size: 70 },
    north: { x: 31, y: 43, size: 70 },
    northEast: { x: 32, y: 43, size: 70 },
  },
  hurt: {
    east: { x: 36, y: 40, size: 70 },
    southEast: { x: 31, y: 39, size: 70 },
    south: { x: 25, y: 32, size: 70 },
    southWest: { x: 20, y: 31, size: 70 },
    west: { x: 25, y: 27, size: 70 },
    northWest: { x: 29, y: 23, size: 70 },
    north: { x: 35, y: 24, size: 70 },
    northEast: { x: 42, y: 28, size: 70 },
  },
  death: {
    east: { x: 50, y: 45, size: 70 },
    southEast: { x: 37, y: 58, size: 70 },
    south: { x: 15, y: 55, size: 70 },
    southWest: { x: 6, y: 36, size: 70 },
    west: { x: 11, y: 19, size: 70 },
    northWest: { x: 24, y: 16, size: 70 },
    north: { x: 46, y: 17, size: 70 },
    northEast: { x: 55, y: 21, size: 70 },
  },
};

const nomadSprite: ActorSprite = characterPackSprite({
  pack: 'nomad',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Attack1.png',
    hurt: 'TakeDamage.png',
    death: 'Die.png',
  },
  crops: NOMAD_SPRITE_CROPS,
  drawScale: HERO_DRAW_SCALE,
});

// Measured from the witch doctor pack's frames (70px windows); its
// attack sheet is Attack1.png like the nomad's.
const WITCHDOCTOR_SPRITE_CROPS: CharacterPackCrops = {
  idle: {
    east: { x: 40, y: 42, size: 70 },
    southEast: { x: 27, y: 47, size: 70 },
    south: { x: 19, y: 42, size: 70 },
    southWest: { x: 14, y: 33, size: 70 },
    west: { x: 21, y: 23, size: 70 },
    northWest: { x: 35, y: 22, size: 70 },
    north: { x: 43, y: 27, size: 70 },
    northEast: { x: 48, y: 38, size: 70 },
  },
  walk: {
    east: { x: 42, y: 37, size: 70 },
    southEast: { x: 29, y: 44, size: 70 },
    south: { x: 23, y: 42, size: 70 },
    southWest: { x: 18, y: 32, size: 70 },
    west: { x: 21, y: 24, size: 70 },
    northWest: { x: 33, y: 28, size: 70 },
    north: { x: 39, y: 30, size: 70 },
    northEast: { x: 45, y: 35, size: 70 },
  },
  attack: {
    east: { x: 44, y: 43, size: 70 },
    southEast: { x: 38, y: 53, size: 70 },
    south: { x: 21, y: 58, size: 70 },
    southWest: { x: 16, y: 58, size: 70 },
    west: { x: 16, y: 38, size: 70 },
    northWest: { x: 23, y: 39, size: 70 },
    north: { x: 39, y: 39, size: 70 },
    northEast: { x: 45, y: 41, size: 70 },
  },
  hurt: {
    east: { x: 42, y: 43, size: 70 },
    southEast: { x: 29, y: 42, size: 70 },
    south: { x: 17, y: 43, size: 70 },
    southWest: { x: 18, y: 35, size: 70 },
    west: { x: 18, y: 23, size: 70 },
    northWest: { x: 32, y: 21, size: 70 },
    north: { x: 45, y: 25, size: 70 },
    northEast: { x: 46, y: 37, size: 70 },
  },
  death: {
    east: { x: 34, y: 46, size: 70 },
    southEast: { x: 30, y: 43, size: 70 },
    south: { x: 22, y: 43, size: 70 },
    southWest: { x: 22, y: 40, size: 70 },
    west: { x: 25, y: 38, size: 70 },
    northWest: { x: 30, y: 34, size: 70 },
    north: { x: 40, y: 30, size: 70 },
    northEast: { x: 38, y: 38, size: 70 },
  },
};

const witchDoctorSprite: ActorSprite = characterPackSprite({
  pack: 'witchDoctor',
  animations: {
    idle: 'Idle.png',
    walk: 'Walk.png',
    attack: 'Attack1.png',
    hurt: 'TakeDamage.png',
    death: 'Die.png',
  },
  crops: WITCHDOCTOR_SPRITE_CROPS,
  drawScale: HERO_DRAW_SCALE,
});

// The party's sprite rotation, picked by party index: the first hero is
// a paladin, the second a nomad, the third the knight, the fourth a witch
// doctor, and the cycle starts over for any heroes beyond the fourth.
export const HERO_SPRITE_PACKS: ActorSprite[] = [
  paladinSprite,
  nomadSprite,
  knightSprite,
  witchDoctorSprite,
];

export const heroSpriteForIndex = (index: number): ActorSprite =>
  HERO_SPRITE_PACKS[Math.abs(index) % HERO_SPRITE_PACKS.length];

/**
 * Assigns the rotation's sprite to every hero by its party position,
 * preserving each hero's other data (roster and selected heroes already
 * carry the knight fallback from `newHero`).
 */
export const assignHeroSprites = (heroes: Hero[]): void => {
  heroes.forEach((hero, index) => {
    hero.sprite = heroSpriteForIndex(index);
  });
};

export const newHero = (
  name: string,
  colour: Colour,
  difficulty?: Difficulty,
): Hero => {
  const startingEquipment = difficulty?.startingEquipment;
  const initialWeapon = startingEquipment?.weapon ?? weapons[0];

  return {
    id: name.toLowerCase().replace(/ /g, '_'),
    name: name,
    nameTranslationKey: name,
    actions: 2,
    movement: 3,
    maxMovement: 3,
    defense: 0,
    level: Level.APPRENTICE,
    health: 7 + (difficulty?.modifiers.health ?? 0),
    maxHealth: 7,
    colour: colour,
    experience: 0,
    position: { x: -1, y: -1 },
    weapon: structuredClone(initialWeapon),
    shield: startingEquipment?.shield
      ? structuredClone(startingEquipment.shield)
      : undefined,
    armour: startingEquipment?.armour
      ? structuredClone(startingEquipment.armour)
      : undefined,
    inventory: startingEquipment?.inventory
      ? structuredClone(startingEquipment.inventory)
      : [],
    incapacitated: false,
    isInventoryOpen: false,
    walkSound: 'sfx/walk_knight.wav',
    hurtSound: 'sfx/hurt_knight.wav',
    deathSound: 'sfx/die_knight.wav',
    sprite: knightSprite,
  };
};

export const act = (
  direction: MoveDirection | (string & {}),
  state: GameState,
) => {
  doReRender(state);
  const hero: Hero | undefined = state.currentActor;
  if (!hero || hero.health <= 0 || hero.actions <= 0) {
    if (hero) {
      hero.actions = 0;
      hero.movement = 0;
    }
    return;
  }
  const newPosition = { x: hero.position.x, y: hero.position.y };
  switch (direction) {
    case 'UL':
      newPosition.x = hero.position.x - 1;
      newPosition.y = hero.position.y - 1;
      break;
    case 'U':
      newPosition.y = hero.position.y - 1;
      break;
    case 'UR':
      newPosition.x = hero.position.x + 1;
      newPosition.y = hero.position.y - 1;
      break;
    case 'L':
      newPosition.x = hero.position.x - 1;
      break;
    case 'R':
      newPosition.x = hero.position.x + 1;
      break;
    case 'DL':
      newPosition.x = hero.position.x - 1;
      newPosition.y = hero.position.y + 1;
      break;
    case 'D':
      newPosition.y = hero.position.y + 1;
      break;
    case 'DR':
      newPosition.x = hero.position.x + 1;
      newPosition.y = hero.position.y + 1;
      break;
  }
  const blockedByHero = isBlockedByHero(state, newPosition.x, newPosition.y);
  const blockedByWall = !isWalkable(
    state.dungeon.layout,
    newPosition.x,
    newPosition.y,
  );
  const blockedByWallEdge = crossesWallEdge(
    state.dungeon.layout,
    hero.position,
    newPosition,
  );
  const blockedByMonster = isBlockedByMonster(
    state,
    newPosition.x,
    newPosition.y,
  );
  if (!blockedByHero && !blockedByWall && !blockedByWallEdge) {
    const discovered = isDiscovered(
      state.dungeon,
      newPosition.x,
      newPosition.y,
    );
    const door = isDoorEdge(
      state.dungeon.layout,
      hero.position.x,
      hero.position.y,
      newPosition.x,
      newPosition.y,
    );
    const hasClosedDoor = door && !door.open;

    if (!discovered || hasClosedDoor) {
      const moved = moveOverDoor(state, hero, newPosition.x, newPosition.y);
      if (moved) {
        openDoor(hero, state, newPosition.x, newPosition.y);
      }
    } else if (discovered) {
      if (blockedByMonster) {
        attack(hero, state, newPosition);
      } else {
        move(
          hero,
          state,
          newPosition.x,
          newPosition.y,
          terrainMovementCost(state.dungeon.layout, newPosition),
        );
      }
    }
  } else {
    addLog(state, 'logs.heroAction.illegalMove', { hero: i18n(hero.name) });
  }
  if (!blockedByMonster && !checkForTrapDoor(state)) {
    consumeActions(hero, getDifficulty(state).modifiers.movement);
  }
  if (hero.actions <= 0) {
    hero.actions = 0;
    hero.movement = 0;
  }
};

export const pickLock = (state: GameState, door?: Door) => {
  doReRender(state);
  const hero = state.currentActor;
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, 'logs.heroAction.blinded', { hero: i18n(hero.name) });
    return;
  }
  const movementModifier = getDifficulty(state).modifiers.movement;
  if (!canAct(hero, movementModifier)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  // Picking a lock is performed like a LETA action and may never be done
  // while a visible monster stands next to the hero (official rules).
  if (isAdjacentToVisibleMonster(state, hero)) {
    addLog(state, 'logs.heroAction.blockedNearMonster', {
      hero: i18n(hero.name),
    });
    return;
  }
  door =
    door ??
    state.dungeon.layout.doors.find(
      (d) =>
        (d.x === hero.position.x && d.y === hero.position.y) ||
        isDoorEdge(
          state.dungeon.layout,
          hero.position.x,
          hero.position.y,
          d.x,
          d.y,
        ),
    );
  if (door && door.locked) {
    const result = roll(hero.level, 1);
    if (result >= 1) {
      door.locked = false;
      addLog(state, 'logs.heroAction.pickedLock', { hero: i18n(hero.name) });
      emitSoundCue(state, { cue: 'unlock' });
    } else {
      addLog(state, 'logs.heroAction.failedToPickLock', {
        hero: i18n(hero.name),
      });
      emitSoundCue(state, { cue: 'locked' });
    }
    spendStandardAction(hero, movementModifier, true);
  }
};

export const applyStartingEquipment = (
  heroes: Hero[],
  difficulty: Difficulty,
): void => {
  const config = difficulty.startingEquipment;
  if (!config) return;

  heroes.forEach((hero) => {
    if (config.weapon) {
      hero.weapon = structuredClone(config.weapon);
    }

    if (config.shield) {
      hero.shield = structuredClone(config.shield);
    }

    if (config.armour) {
      hero.armour = structuredClone(config.armour);
    }

    if (config.inventory && config.inventory.length > 0) {
      const clonedInventory = structuredClone(config.inventory);
      clonedInventory.forEach((item: Item) => {
        if (item && item.pickup && !item.disabled) {
          const pickup = onPickup[item.pickup];
          if (pickup) pickup({} as GameState, item, hero);
        }
      });
      hero.inventory = [...hero.inventory, ...clonedInventory];
    }
  });
};

export const resetLiveHeroes = (state: GameState) => {
  doReRender(state);
  clearActorAnimations();
  const movementModifier = getDifficulty(state).modifiers.movement;
  const healthModifier = getDifficulty(state).modifiers.health;
  state.heroes.forEach((hero, index) => {
    const startPos =
      state.dungeon.startingPositions[index] ??
      state.dungeon.startingPositions[
        state.dungeon.startingPositions.length - 1
      ] ??
      state.dungeon.startingPositions[0];
    if (startPos) {
      hero.position = { x: startPos.x, y: startPos.y };
      checkForNote(state, hero as Hero);
    }
    hero.movement = getEffectiveMaxMovement(hero, movementModifier);
    hero.actions = 2;
    hero.health = getEffectiveMaxHealth(hero, healthModifier);
    hero.blinded = false;
    hero.weakened = false;
    hero.incapacitated = false;
    if (hero.weapon) {
      hero.weapon.elemental = false;
    }
    hero.inventory.forEach((item) => {
      if (item && item.disabled) {
        if (!item.properties?.[ACTIVE] && item.pickup) {
          const pickup = onPickup[item.pickup];
          if (pickup) pickup(state, item, hero);
        }
        item.disabled = false;
      }
    });
  });
  // The dungeon start is also a facing reset: heroes take their starting
  // positions looking out of the room (its closest door), and monsters
  // already standing in discovered rooms turn to face the party.
  faceHeroesTowardClosestRoomDoor(state);
  faceRevealedMonsters(state, state.dungeon.discoveredRooms);
};

export const liveHeroes = (state: GameState): Hero[] =>
  state.heroes.filter((hero) => hero.health > 0).map((hero) => hero as Hero);

export const getPartyAverageLevel = (state: GameState): Level => {
  const heroes = state.heroes;
  if (!heroes || heroes.length === 0) return Level.APPRENTICE;
  const levelOrder = [
    Level.APPRENTICE,
    Level.KNIGHT,
    Level.HERO,
    Level.LORD,
    Level.MASTER,
  ];
  const total = heroes.reduce((sum, hero) => {
    const idx = levelOrder.indexOf(hero.level);
    return sum + (idx !== -1 ? idx : 0);
  }, 0);
  const avgIndex = Math.round(total / heroes.length);
  const clampedIndex = Math.max(0, Math.min(levelOrder.length - 1, avgIndex));
  return levelOrder[clampedIndex];
};

export { canAct, getEffectiveMaxMovement, getEffectiveMaxHealth };

export const openDoor = (
  hero: Hero,
  state: GameState,
  newX: number,
  newY: number,
) => {
  doReRender(state);
  const target = findCell(state.dungeon.layout.grid, newX, newY);
  if (target && ![WALL, EMPTY, COLLAPSED].includes(target)) {
    if (!state.dungeon.discoveredRooms.includes(target)) {
      state.dungeon.discoveredRooms.push(target);
      executeRoomDiscoveredEffect(state, target);
      // Opening a door lifts the fog off the room beyond: any monster
      // standing there turns to face the intruding party.
      faceRevealedMonsters(state, [target]);
    }
  }
  move(hero, state, hero.position.x, hero.position.y, 1);
  addLog(state, 'logs.heroAction.openedDoor', { hero: i18n(hero.name) });
  emitSoundCue(state, { cue: 'doorOpen' });
};

/**
 * Opens a door the hero is standing on without requiring the hero to step
 * through it — used for doors at the map edge (e.g. dungeon exit doors)
 * where the cell beyond is not walkable.
 */
export const openDoorAtHero = (
  state: GameState,
  hero: Hero,
  target: Position,
  door: Door,
) => {
  if (door.open) return;
  if (!openDoorAndResolveTrap(state, hero, door)) return;
  // The door can be opened from either side of its edge; discover the room
  // on the far side of the door relative to the hero.
  const [offsetX, offsetY] = sideOffset(door.side);
  const onDoorCell = hero.position.x === door.x && hero.position.y === door.y;
  openDoor(
    hero,
    state,
    onDoorCell ? door.x + offsetX : door.x,
    onDoorCell ? door.y + offsetY : door.y,
  );
  consumeActions(hero);
  if (hero.actions <= 0) {
    hero.actions = 0;
    hero.movement = 0;
  }
};

export const attack = (hero: Hero, state: GameState, target: Position) => {
  doReRender(state);
  const movementModifier = getDifficulty(state).modifiers.movement;
  if (!canAct(hero, movementModifier)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  if (!hero.weapon.useHearHeroes && hasNeighbouringHeroes(state, hero)) {
    addLog(state, 'logs.heroAction.notNearFriend', {
      hero: i18n(hero.name),
      weapon: i18n(hero.weapon.name),
    });
    return;
  }

  const monster = findMonsterAt(state, target);
  if (monster) {
    if (hero.weapon.id === 'sword_of_chaos') {
      resolveChaosSwordAttack(state, hero, monster);
    } else {
      const isRanged = Boolean(
        hero.weapon.range &&
        hero.weapon.range > 1 &&
        (Math.abs(hero.position.x - monster.position.x) > 1 ||
          Math.abs(hero.position.y - monster.position.y) > 1),
      );
      takeDamage(state, hero, monster, isRanged);
    }
    if (monster.health <= 0) {
      killMonster(state, monster, hero);
    }
    if (hero.actions <= 0) {
      hero.actions = 0;
      hero.movement = 0;
      return;
    }
    spendStandardAction(hero, movementModifier);
  }
};

export const search = (state: GameState) => {
  doReRender(state);
  const hero: Hero | undefined = state.currentActor;
  if (!hero) return;
  if (hero.blinded) {
    addLog(state, 'logs.heroAction.blinded', { hero: i18n(hero.name) });
    return;
  }
  const movementModifier = getDifficulty(state).modifiers.movement;
  if (!canAct(hero, movementModifier)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return;
  }
  // Searching is a LETA action and may never be performed while a visible
  // monster stands next to the hero (official rules).
  if (isAdjacentToVisibleMonster(state, hero)) {
    addLog(state, 'logs.heroAction.blockedNearMonster', {
      hero: i18n(hero.name),
    });
    return;
  }
  searchForSecret(state);
  spendStandardAction(hero, movementModifier);
};

export const interact = (state: GameState, interactable?: InteractableCell) => {
  doReRender(state);
  const hero: Actor | undefined = state.currentActor;
  if (!hero) return false;
  const movementModifier = getDifficulty(state).modifiers.movement;
  if (!canAct(hero, movementModifier)) {
    addLog(state, 'logs.heroAction.noActions', { hero: i18n(hero.name) });
    return false;
  }
  const target = interactable ?? findInteractableAtHero(state, hero as Hero);
  if (!target) return false;
  const success = triggerInteractable(state, target, hero);
  if (success) {
    spendStandardAction(hero, movementModifier);
    return true;
  }
  return false;
};

export const isBlockedByMonster = (
  state: GameState,
  newX: number,
  newY: number,
) =>
  state.dungeon.layout.monsters.some(
    (monster) =>
      monster.position.x === newX &&
      monster.position.y === newY &&
      monster.health > 0,
  );

export const isBlockedByHero = (state: GameState, newX: number, newY: number) =>
  liveHeroes(state).some(
    (hero) => hero.position.x === newX && hero.position.y === newY,
  );

export const consumeActions = (hero: Actor, movementModifier = 0) => {
  if (hero.actions <= 0) {
    hero.actions = 0;
    hero.movement = 0;
    return;
  }
  if (hero.movement <= 0) {
    hero.actions = Math.max(0, hero.actions - 1);
    if (hero.actions > 0) {
      hero.movement = getEffectiveMaxMovement(hero, movementModifier);
    } else {
      hero.movement = 0;
    }
  }
  if (hero.actions <= 0) {
    hero.movement = 0;
  }
};

export const levelUp = (state: GameState) => {
  doReRender(state);
  liveHeroes(state).forEach((hero) => {
    const currentLevel = hero.level;
    if (hero.experience >= 28) {
      hero.level = Level.MASTER;
    } else if (hero.experience >= 18) {
      hero.level = Level.LORD;
    } else if (hero.experience >= 10) {
      hero.level = Level.HERO;
    } else if (hero.experience >= 4) {
      hero.level = Level.KNIGHT;
    }
    if (currentLevel !== hero.level) {
      emitSoundCue(state, { cue: 'levelUp' });
      addLog(state, 'logs.heroAction.leveledUp', {
        hero: i18n(hero.name),
        level: i18n(`content.level.${hero.level}`),
      });
      if (!state.damageIndicators) {
        state.damageIndicators = [];
      }
      state.damageIndicators.push(
        createIndicator(i18n('content.indicators.levelUp'), hero.position, {
          color: '#FCFF4F',
          effect: 'crit',
        }),
      );
    }
  });
};

export const rewardLiveHeroes = (state: GameState) => {
  liveHeroes(state).forEach((hero) => (hero.experience += 1));
};

export const replaceDeadHeroes = (state: GameState) => {
  const movementModifier = getDifficulty(state).modifiers.movement;
  const healthModifier = getDifficulty(state).modifiers.health;
  deadHeroes(state).forEach((hero) => {
    hero.experience = 0;
    // Dead heroes start over as Apprentices with their points lost
    // (official rules), so the dice threshold must follow the reset XP.
    hero.level = Level.APPRENTICE;
    hero.health = getEffectiveMaxHealth(hero, healthModifier);
    hero.movement = getEffectiveMaxMovement(hero, movementModifier);
    hero.actions = 2;
  });
};

export const canOpenDoor = (hero: Hero, canBreakDoor: boolean, door: Door) =>
  !door.open &&
  !door.hidden &&
  (!door.locked || (door.locked && canBreakDoor)) &&
  (!door.reinforced || hasGiantsGlove(hero)) &&
  hero.movement > 0;

export const hasGiantsGlove = (hero: Hero) =>
  hero.inventory.some((item) => item && item.id === 'giants_glove');

export const checkForNote = (state: GameState, hero: Hero) => {
  const note = state.dungeon.layout.notes.find((note) =>
    isSamePosition(note.position, hero.position),
  );
  if (note) {
    const onHiddenDoor = state.dungeon.layout.doors.some(
      (door) =>
        door.hidden &&
        isSamePosition(note.position, {
          x: door.x,
          y: door.y,
        }),
    );
    if (!onHiddenDoor) {
      if (!note.found) {
        addLog(state, 'logs.heroAction.reads', {
          hero: i18n(hero.name),
          note: i18n(note.message),
        });
        emitSoundCue(state, { cue: 'diaryAdd' });
        const text = i18n(note.message);
        if (!state.damageIndicators) {
          state.damageIndicators = [];
        }
        state.damageIndicators.push(
          createIndicator(text, note.position, {
            color: '#7373ec',
            effect: 'static',
            durationMs: 5000,
          }),
        );
        note.found = true;
        note.foundOn = state.turnCount;
      }
    }
  }
};

/**
 * Whether a live monster in a discovered area stands adjacent to the hero
 * without a wall between. LETA actions (search, pick lock) and the zone of
 * control that halts movement are blocked by such monsters only: a monster
 * in an undiscovered room — typically on the far side of a closed door —
 * is not engaging the hero and must neither block these actions nor end
 * the hero's move.
 */
export const isAdjacentToVisibleMonster = (
  state: GameState,
  hero: Hero,
): boolean =>
  state.dungeon.layout.monsters.some(
    (monster) =>
      monster.health > 0 &&
      isDiscovered(state.dungeon, monster.position.x, monster.position.y) &&
      isNeighbouring(hero.position, monster.position.x, monster.position.y) &&
      !crossesWallEdge(state.dungeon.layout, hero.position, monster.position),
  );

export const checkForNextToMonster = (
  state: GameState,
  hero: Hero,
): boolean => {
  if (isAdjacentToVisibleMonster(state, hero)) {
    addLog(state, 'logs.heroAction.walkedByMonster', { hero: i18n(hero.name) });
    return true;
  }
  return false;
};

export const dropItem = (state: GameState, item: Item, actor: Actor) => {
  addLog(state, 'logs.heroAction.drop', {
    hero: i18n(actor.name),
    item: i18n(item.name),
  });
  state.dungeon.layout.items.push({
    item,
    position: { x: actor.position.x, y: actor.position.y },
  });
  if (item && item.drop) {
    const drop = onDrop[item.drop];
    if (drop) {
      drop(state, item, actor);
    }
  }
  emitSoundCue(state, { cue: 'dropItem' });
};

export const pickupItem = (state: GameState, item: Item, hero: Hero) => {
  state.dungeon.pickedUpItemPoints =
    (state.dungeon.pickedUpItemPoints ?? 0) + itemPickupScore(item);
  if (item.id === 'sword_of_chaos') {
    if (hero.weapon) dropItem(state, hero.weapon, hero);
    hero.weapon = item as Weapon;
    if (item && item.pickup) {
      const pickup = onPickup[item.pickup];
      if (pickup) pickup(state, item, hero);
    }
    return;
  }
  switch (item.type) {
    case ItemType.ARMOUR:
      if (hero.armour) dropItem(state, hero.armour, hero);
      hero.armour = item as Armour;
      break;
    case ItemType.SHIELD:
      if (hero.shield) dropItem(state, hero.shield, hero);
      hero.shield = item as Shield;
      break;
    case ItemType.WEAPON:
      if (hero.weapon) dropItem(state, hero.weapon, hero);
      hero.weapon = item as Weapon;
      break;
    default:
      hero.inventory.push(item);
      break;
  }
  if (item && item.pickup) {
    const pickup = onPickup[item.pickup];
    if (pickup) pickup(state, item, hero);
  }
  emitSoundCue(state, { cue: 'pickUpItem' });
};

/**
 * Everything that happens when a hero arrives on a cell: the step
 * animation, reading notes, revealing item-triggered secrets, stepping onto
 * interactables and the zone-of-control check. Returns true when a live
 * monster is adjacent, in which case the hero's movement is zeroed and
 * callers should stop multi-step movement there.
 */
export const arriveOnCell = (
  state: GameState,
  hero: Hero,
  pos: Position,
): boolean => {
  const previousPosition = { x: hero.position.x, y: hero.position.y };
  if (recordActorStep(hero, pos)) {
    emitSoundCue(state, { cue: 'actorWalk', actor: hero });
  }
  hero.position.x = pos.x;
  hero.position.y = pos.y;
  // Opening a door without stepping through it routes through here as
  // a same-cell "move": terrain and room-fog enter effects only apply
  // to an actual change of cell, so a hero standing in lava that opens
  // a door is not hurt a second time.
  const movedToNewCell =
    previousPosition.x !== pos.x || previousPosition.y !== pos.y;
  if (movedToNewCell) {
    applyTerrainEnterEffects(state, hero);
    applyRoomFogEnterEffects(state, hero, previousPosition);
  }
  // The enter effects can down the hero: no further arrival effects
  // run — the corpse reads no notes and triggers no interactables.
  if (hero.health <= 0) {
    return true;
  }
  checkForNote(state, hero);
  checkForItemRevealedSecret(state, hero);
  checkForInteractable(state, hero, 'step');
  const halted = checkForNextToMonster(state, hero);
  if (halted) {
    hero.movement = 0;
  }
  return halted;
};

const move = (
  hero: Hero,
  state: GameState,
  newX: number,
  newY: number,
  cost: number,
) => {
  if (!arriveOnCell(state, hero, { x: newX, y: newY })) {
    hero.movement -= cost;
  }
};

/**
 * Opens a door and resolves its lock and trap: a BREAK_LOCK item smashes
 * the lock, and a trapped door attacks the opener. Returns true when the
 * door actually opened.
 */
const openDoorAndResolveTrap = (state: GameState, hero: Hero, door: Door) => {
  const canBreakLock = hero.inventory.some(
    (item) => item && item.properties?.[BREAK_LOCK],
  );
  if (!canOpenDoor(hero, canBreakLock, door)) return false;
  if (door.locked && canBreakLock)
    addLog(state, 'logs.heroAction.brokeLock', { hero: i18n(hero.name) });
  door.open = true;
  if (door.trapped) {
    takeDamage(state, doorAsActor(door), hero, false);
  }
  return true;
};

const moveOverDoor = (
  state: GameState,
  hero: Hero,
  newX: number,
  newY: number,
) => {
  const door = isDoorEdge(
    state.dungeon.layout,
    hero.position.x,
    hero.position.y,
    newX,
    newY,
  );

  if (door && openDoorAndResolveTrap(state, hero, door)) {
    return true;
  }
  if (door && door.locked) {
    addLog(state, 'logs.heroAction.locked');
  }
  return false;
};

/**
 * Removes a slain monster from the board, awards its experience to the
 * killer and transfers its carried items to them (removing them from the
 * item decks). All monster deaths by hero hands go through here so
 * kill-count, XP and inventory handling stay identical.
 */
export const killMonster = (state: GameState, monster: Monster, hero: Hero) => {
  state.dungeon.layout.monsters = state.dungeon.layout.monsters.filter(
    (m) => m != monster,
  );
  state.dungeon.killCount++;
  hero.experience += monster.experience;
  hero.kills = (hero.kills ?? 0) + 1;
  state.dungeon.killedMonsterXp =
    (state.dungeon.killedMonsterXp ?? 0) + monster.experience;
  monster.inventory.forEach((item) => {
    if (!item) return;
    addLog(state, 'logs.heroAction.found', {
      hero: i18n(hero.name),
      item: i18n(item.name),
    });
    if (item.type === ItemType.MAGIC) {
      removeFoundMagicItemFromDeck(state, item);
    } else {
      removeFoundItemFromDeck(state, item);
    }
    pickupItem(state, item, hero);
  });
};

const findMonsterAt = (state: GameState, target: Position) =>
  state.dungeon.layout.monsters.find((monster) =>
    isSamePosition(monster.position, target),
  );

const hasNeighbouringHeroes = (state: GameState, hero: Actor) =>
  findNeighbouringHeroes(state, hero).filter((other) => other !== hero).length >
  0;

const deadHeroes = (state: GameState): Hero[] =>
  state.heroes.filter((hero) => hero.health <= 0).map((hero) => hero as Hero);
