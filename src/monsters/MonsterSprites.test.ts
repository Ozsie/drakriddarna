import { describe, expect, it } from 'vitest';
import { CHARACTER_PACK_FACINGS } from '../characters/CharacterSpritePacks';
import type { ActorSprite } from '../types';
import { MonsterType } from '../types';
// Imports for the side effect: the built-in templates (including their
// sprite fields) register when the dungeon module loads.
import '../dungeon/DungeonLogic';
import { getMonsterTemplate } from './MonsterRegistry';
import { darkLordSprite, orcSprite, trollSprite } from './MonsterSprites';

// The monster packs (static/characters/{troll,orc,darkLord}) share the
// knight pack's layout; these tests pin the pack geometry, the measured
// frame windows and the template registration that wires them into the
// built-in monster types.

const ANIMATIONS = ['idle', 'walk', 'attack', 'hurt', 'death'] as const;
const FACINGS = CHARACTER_PACK_FACINGS;

const expectValidPackSprite = (sprite: ActorSprite, pack: string) => {
  expect(sprite.frameWidth).toBe(128);
  expect(sprite.frameHeight).toBe(128);
  expect(sprite.facings).toEqual(FACINGS);
  expect(sprite.drawScale ?? 1).toBeGreaterThan(1);
  ANIMATIONS.forEach((animation) => {
    expect(sprite.animationImages?.[animation]).toBe(
      `characters/${pack}/${sprite.animationImages?.[animation]?.split('/').pop()}`,
    );
  });
  ANIMATIONS.forEach((animation) => {
    FACINGS.forEach((facing) => {
      const crop = sprite.frameCrops?.[animation]?.[facing];
      expect(crop, `${pack}/${animation}/${facing}`).toBeDefined();
      expect(crop?.size).toBeGreaterThan(0);
      expect(crop?.x).toBeGreaterThanOrEqual(0);
      expect(crop?.y).toBeGreaterThanOrEqual(0);
      expect((crop?.x ?? 0) + (crop?.size ?? 0)).toBeLessThanOrEqual(128);
      expect((crop?.y ?? 0) + (crop?.size ?? 0)).toBeLessThanOrEqual(128);
    });
  });
};

describe('monster sprite packs', () => {
  it('builds valid directional pack sprites', () => {
    expectValidPackSprite(trollSprite, 'troll');
    expectValidPackSprite(orcSprite, 'orc');
    expectValidPackSprite(darkLordSprite, 'darkLord');
  });

  it('declares pack-native frame counts and durations', () => {
    for (const sprite of [trollSprite, orcSprite, darkLordSprite]) {
      ANIMATIONS.forEach((animation) => {
        expect(sprite.animations?.[animation]).toBe(15);
      });
      expect(sprite.frameDurationMs).toBe(65);
    }
  });

  it('registers the pack sprites on the built-in monster templates', () => {
    expect(getMonsterTemplate(MonsterType.ORC)?.sprite).toBe(orcSprite);
    expect(getMonsterTemplate(MonsterType.TROLL)?.sprite).toBe(trollSprite);
    expect(getMonsterTemplate(MonsterType.GREEN_DARK_LORD)?.sprite).toBe(
      darkLordSprite,
    );
    expect(getMonsterTemplate(MonsterType.BLUE_DARK_LORD)?.sprite).toBe(
      darkLordSprite,
    );
    expect(getMonsterTemplate(MonsterType.RED_DARK_LORD)?.sprite).toBe(
      darkLordSprite,
    );
    expect(getMonsterTemplate(MonsterType.YELLOW_DARK_LORD)?.sprite).toBe(
      darkLordSprite,
    );
  });
});
