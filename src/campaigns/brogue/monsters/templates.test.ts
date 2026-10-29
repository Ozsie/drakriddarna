import { describe, expect, it } from 'vitest';
import { Colour, Level } from '../../../types';
import { getMonsterTemplate } from '../../../monsters/MonsterRegistry';
import { createMonster } from '../../../dungeon/DungeonLogic';
import {
  MID_TIER_MONSTER_A,
  MID_TIER_MONSTER_B,
  MID_TIER_STATS,
} from './templates';

describe('mid-tier monster templates', () => {
  it('registers template A with Knight-tier stats and 3 XP', () => {
    const template = getMonsterTemplate(MID_TIER_MONSTER_A);
    expect(template).toBeDefined();
    expect(template?.level).toBe(Level.KNIGHT);
    expect(template?.experience).toBe(3);
    expect(template?.health).toBe(4);
    expect(template?.maxHealth).toBe(4);
    expect(template?.defense).toBe(0);
  });

  it('registers template B with Lord-tier stats, 4 XP and a ranged weapon', () => {
    const template = getMonsterTemplate(MID_TIER_MONSTER_B);
    expect(template).toBeDefined();
    expect(template?.level).toBe(Level.LORD);
    expect(template?.experience).toBe(4);
    expect(template?.health).toBe(4);
    expect(template?.maxHealth).toBe(4);
    expect(template?.defense).toBe(1);
    expect(template?.rangedWeapon?.id).toBe('magic_missile');
    expect(template?.armour?.defense).toBe(1);
    expect(template?.armour?.magicProtection).toBe(true);
    expect(template?.shield?.dice).toBe(2);
  });

  it('builds monsters from the templates through createMonster', () => {
    const monsterA = createMonster(MID_TIER_MONSTER_A, Colour.Blue, 1, 2);
    expect(monsterA.experience).toBe(3);
    expect(monsterA.level).toBe(Level.KNIGHT);
    expect(monsterA.position).toEqual({ x: 1, y: 2 });

    const monsterB = createMonster(MID_TIER_MONSTER_B, Colour.Red, 3, 4);
    expect(monsterB.experience).toBe(4);
    expect(monsterB.level).toBe(Level.LORD);
    expect(monsterB.rangedWeapon?.id).toBe('magic_missile');
    expect(monsterB.weapon).toBeDefined();
  });

  it('exposes both stat blocks for the config table', () => {
    expect(Object.keys(MID_TIER_STATS).sort()).toEqual(
      [MID_TIER_MONSTER_A, MID_TIER_MONSTER_B].sort(),
    );
  });
});
