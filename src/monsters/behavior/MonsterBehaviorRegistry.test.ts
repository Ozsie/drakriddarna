import { beforeEach, describe, expect, it } from 'vitest';
import { MonsterType } from '../../types';
import type { MonsterBehavior } from './types';
import {
  clearMonsterBehaviors,
  getMonsterBehaviors,
  hasMonsterBehaviors,
  registerMonsterBehaviors,
} from './registry';
import {
  DEFAULT_FALLBACK_BEHAVIORS,
  ORC_BEHAVIORS,
  TROLL_BEHAVIORS,
  DARK_LORD_BEHAVIORS,
  getBehaviorsForMonsterType,
} from './definitions';
import {
  registerMonsterBehaviors as regBehaviorsFromMonsterRegistry,
  getMonsterBehaviors as getBehaviorsFromMonsterRegistry,
  hasMonsterBehaviors as hasBehaviorsFromMonsterRegistry,
  clearMonsterBehaviors as clearBehaviorsFromMonsterRegistry,
} from '../MonsterRegistry';

describe('MonsterBehaviorRegistry', () => {
  beforeEach(() => {
    clearMonsterBehaviors();
  });

  it('returns default fallback behaviors for unknown monster types', () => {
    const behaviors = getBehaviorsForMonsterType('CustomGoblin');
    expect(behaviors).toEqual(DEFAULT_FALLBACK_BEHAVIORS);
    expect(hasMonsterBehaviors('CustomGoblin')).toBe(false);
    expect(getMonsterBehaviors('CustomGoblin')).toBeUndefined();
  });

  it('returns built-in behaviors for built-in monster types', () => {
    expect(getBehaviorsForMonsterType(MonsterType.ORC)).toBe(ORC_BEHAVIORS);
    expect(getBehaviorsForMonsterType(MonsterType.ORCH)).toBe(ORC_BEHAVIORS);
    expect(getBehaviorsForMonsterType(MonsterType.TROLL)).toBe(TROLL_BEHAVIORS);
    expect(getBehaviorsForMonsterType(MonsterType.YELLOW_DARK_LORD)).toBe(
      DARK_LORD_BEHAVIORS,
    );
  });

  it('allows registering custom behaviors for a custom monster type', () => {
    const customBehaviors: MonsterBehavior[] = [
      {
        name: 'Sneak Attack',
        slots: ['move', 'melee'],
        tags: ['aggressive'],
        isEligible: () => true,
        getBaseWeight: () => 15,
      },
    ];

    registerMonsterBehaviors('ShadowStalker', customBehaviors);

    expect(hasMonsterBehaviors('ShadowStalker')).toBe(true);
    expect(getMonsterBehaviors('ShadowStalker')).toBe(customBehaviors);
    expect(getBehaviorsForMonsterType('ShadowStalker')).toBe(customBehaviors);
  });

  it('allows overriding built-in behaviors for standard monster types', () => {
    const customOrcBehaviors: MonsterBehavior[] = [
      {
        name: 'Berserk Fury',
        slots: ['melee', 'melee'],
        tags: ['aggressive'],
        isEligible: () => true,
        getBaseWeight: () => 20,
      },
    ];

    registerMonsterBehaviors(MonsterType.ORC, customOrcBehaviors);

    expect(getBehaviorsForMonsterType(MonsterType.ORC)).toBe(
      customOrcBehaviors,
    );
    // Unregistered TROLL still falls back to default TROLL_BEHAVIORS
    expect(getBehaviorsForMonsterType(MonsterType.TROLL)).toBe(TROLL_BEHAVIORS);
  });

  it('clears registered behaviors when clearMonsterBehaviors is called', () => {
    const customBehaviors: MonsterBehavior[] = [
      {
        name: 'Custom',
        slots: ['melee'],
        tags: ['aggressive'],
        isEligible: () => true,
        getBaseWeight: () => 1,
      },
    ];

    registerMonsterBehaviors('CustomMonster', customBehaviors);
    expect(hasMonsterBehaviors('CustomMonster')).toBe(true);

    clearMonsterBehaviors();
    expect(hasMonsterBehaviors('CustomMonster')).toBe(false);
    expect(getMonsterBehaviors('CustomMonster')).toBeUndefined();
    expect(getBehaviorsForMonsterType('CustomMonster')).toEqual(
      DEFAULT_FALLBACK_BEHAVIORS,
    );
  });

  it('re-exports functions identically from MonsterRegistry', () => {
    const customBehaviors: MonsterBehavior[] = [
      {
        name: 'Frost Blast',
        slots: ['shoot', 'shoot'],
        tags: ['ranged'],
        isEligible: () => true,
        getBaseWeight: () => 12,
      },
    ];

    regBehaviorsFromMonsterRegistry('FrostLord', customBehaviors);

    expect(hasBehaviorsFromMonsterRegistry('FrostLord')).toBe(true);
    expect(getBehaviorsFromMonsterRegistry('FrostLord')).toBe(customBehaviors);
    expect(getBehaviorsForMonsterType('FrostLord')).toBe(customBehaviors);

    clearBehaviorsFromMonsterRegistry();
    expect(hasBehaviorsFromMonsterRegistry('FrostLord')).toBe(false);
  });
});
