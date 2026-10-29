import { describe, expect, it } from 'vitest';
import {
  MAX_DEPTH,
  MIN_DEPTH,
  allDepthConfigs,
  equipmentLootWeight,
  getDepthConfig,
  lootTargetValue,
  magicItemLootWeight,
} from './config';
import { weapons } from '../../../items/weapons';
import { armour } from '../../../items/armours';
import { shields } from '../../../items/shields';
import { magicItems } from '../../../items/magicItems';

describe('depth config table', () => {
  it('is total over depths 1-10', () => {
    for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
      expect(() => getDepthConfig(depth)).not.toThrow();
    }
    expect(() => getDepthConfig(0)).toThrow();
    expect(() => getDepthConfig(11)).toThrow();
  });

  it('gets strictly darker with depth', () => {
    const lights = allDepthConfigs().map((config) => config.ambientLight);
    for (let i = 1; i < lights.length; i++) {
      expect(lights[i]).toBeLessThan(lights[i - 1]);
    }
  });

  it('tunes the budgets into the intended party level progression', () => {
    // The budget table is the M5 tuning artifact: budgets are deliberately
    // NOT monotonic (boss floors trade budget for the boss, deep floors are
    // shaped to hit the hero level thresholds at the right depth). The
    // invariant is the resulting party level, modelled as the summed budget
    // of all earlier floors split over the four heroes (the benchmark's
    // heroExperience model): knight entering floor 5, hero entering
    // floor 7, lord entering floor 10.
    const budgets = allDepthConfigs().map((config) => config.monsterBudget);
    const xpBefore = (depth: number): number =>
      Math.floor(
        budgets.slice(0, depth - 1).reduce((sum, budget) => sum + budget, 0) /
          4,
      );
    expect(xpBefore(5)).toBeGreaterThanOrEqual(4);
    expect(xpBefore(7)).toBeGreaterThanOrEqual(10);
    expect(xpBefore(10)).toBeGreaterThanOrEqual(18);
  });

  it('has monotonically non-decreasing room counts and grid sizes', () => {
    const configs = allDepthConfigs();
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].rooms).toBeGreaterThanOrEqual(configs[i - 1].rooms);
      expect(configs[i].gridSize).toBeGreaterThan(configs[i - 1].gridSize);
    }
  });

  it('keeps every range well-formed and every probability in [0, 1]', () => {
    for (const config of allDepthConfigs()) {
      expect(config.blobAreaMin).toBeLessThanOrEqual(config.blobAreaMax);
      expect(config.secretsMin).toBeLessThanOrEqual(config.secretsMax);
      for (const chance of [
        config.hiddenDoorChance,
        config.trappedDoorChance,
        config.lockedDoorChance,
        config.extraDoorChance,
      ]) {
        expect(chance).toBeGreaterThanOrEqual(0);
        expect(chance).toBeLessThanOrEqual(1);
      }
      expect(config.ambientLight).toBeGreaterThan(0);
      expect(config.ambientLight).toBeLessThanOrEqual(1);
    }
  });

  it('sweeps the loot quality target from the lowest to the highest value', () => {
    expect(lootTargetValue(MIN_DEPTH)).toBe(1);
    expect(lootTargetValue(MAX_DEPTH)).toBe(4);
    for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
      expect(lootTargetValue(depth)).toBeGreaterThanOrEqual(1);
      expect(lootTargetValue(depth)).toBeLessThanOrEqual(4);
    }
  });

  it('weights cheap equipment early and the best equipment last', () => {
    const smallShield = shields.find((item) => item.id === 'small_shield')!;
    const flail = weapons.find((item) => item.id === 'flail')!;
    const dragonSkin = armour.find((item) => item.id === 'dragon_skin_mail')!;
    expect(equipmentLootWeight(smallShield, 1)).toBeGreaterThan(
      equipmentLootWeight(flail, 1),
    );
    expect(equipmentLootWeight(flail, 10)).toBeGreaterThan(
      equipmentLootWeight(smallShield, 10),
    );
    expect(equipmentLootWeight(dragonSkin, 10)).toBeGreaterThan(
      equipmentLootWeight(dragonSkin, 1),
    );
  });

  it('weights healing magic items early and the sword of chaos last', () => {
    const healingHerbs = magicItems.find(
      (item) => item.id === 'healing_herbs',
    )!;
    const swordOfChaos = magicItems.find(
      (item) => item.id === 'sword_of_chaos',
    )!;
    expect(magicItemLootWeight(healingHerbs, 1)).toBeGreaterThan(
      magicItemLootWeight(swordOfChaos, 1),
    );
    expect(magicItemLootWeight(swordOfChaos, 10)).toBeGreaterThan(
      magicItemLootWeight(healingHerbs, 10),
    );
  });

  it('fits all room blobs on the grid at their maximum area', () => {
    for (const config of allDepthConfigs()) {
      // Blobs keep a one-cell rock gap between rooms and a one-cell
      // void margin, so the total floor area must fit inside the inner
      // (gridSize - 2) x (gridSize - 2) square with room to spare.
      const usable = (config.gridSize - 2) * (config.gridSize - 2);
      const maxFloor = config.rooms * config.blobAreaMax;
      expect(maxFloor).toBeLessThan(usable);
    }
  });
});
