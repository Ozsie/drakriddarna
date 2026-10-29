import { describe, expect, it } from 'vitest';
import {
  CellAlignment,
  ItemType,
  MonsterType,
  SecretType,
  Side,
} from '../../../types';
import type { Position } from '../../../types';
import type { DeclarativeMonster } from '../../../dungeon/dungeonParser';
import { ember } from '../../../dungeon/LightSources';
import { weapons } from '../../../items/weapons';
import { armour } from '../../../items/armours';
import { shields } from '../../../items/shields';
import { magicItems } from '../../../items/magicItems';
import { hashSeed } from './rng';
import { BOSS_FLOORS, BOSS_XP, MONSTER_POOL, getDepthConfig } from './config';
import { generateLayout, type GeneratedLayout } from './layoutGenerator';
import { populate, type PopulationDecks } from './populationGenerator';

const decks: PopulationDecks = {
  equipment: [...weapons, ...armour, ...shields].filter(
    (item) => item.amountInDeck > 0,
  ),
  magicItems,
};

const generatePopulated = (
  seedBase: number,
  depth: number,
  maxAttempts = 50,
): { generated: GeneratedLayout; populated: ReturnType<typeof populate> } => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = hashSeed(seedBase, depth, attempt);
    try {
      const generated = generateLayout(seed, depth);
      return { generated, populated: populate(generated, seed, depth, decks) };
    } catch {
      continue;
    }
  }
  throw new Error(
    `no valid population for seedBase ${seedBase} depth ${depth}`,
  );
};

const monsterXp = (monsters: DeclarativeMonster[]): number =>
  monsters.reduce((sum, monster) => {
    const type = Array.isArray(monster) ? monster[0] : monster.type;
    const entry = MONSTER_POOL.find((candidate) => candidate.type === type);
    return sum + (entry?.xp ?? BOSS_XP);
  }, 0);

const monsterCell = (monster: DeclarativeMonster): Position => {
  if (Array.isArray(monster)) {
    return { x: monster[2], y: monster[3] };
  }
  if ('position' in monster) {
    return monster.position;
  }
  return { x: monster.x, y: monster.y };
};

const roomOf = (grid: string[], x: number, y: number): string => grid[y][x];

const doorCellKeys = (generated: GeneratedLayout): Set<string> => {
  const keys = new Set<string>();
  const offsets: Record<string, [number, number]> = {
    [Side.UP]: [0, -1],
    [Side.DOWN]: [0, 1],
    [Side.LEFT]: [-1, 0],
    [Side.RIGHT]: [1, 0],
  };
  for (const door of generated.layout.doors ?? []) {
    const [side, x, y] = door as [Side, number, number];
    keys.add(`${x},${y}`);
    const [dx, dy] = offsets[side];
    keys.add(`${x + dx},${y + dy}`);
  }
  return keys;
};

describe('populate', () => {
  it('is deterministic: the same (seed, depth) yields the same population', () => {
    const a = generatePopulated(123456, 6);
    const b = generatePopulated(123456, 6);
    expect(a.populated).toEqual(b.populated);
  });

  it('spends the monster budget exactly, boss deducted first', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { populated } = generatePopulated(987654321, depth);
      // The boss's XP is deducted from the budget before the regular
      // fill, so the summed XP of all placed monsters (boss included)
      // equals the floor's full budget.
      expect(monsterXp(populated.layout.monsters ?? [])).toBe(
        config.monsterBudget,
      );
    }
  });

  it('respects availability tiers', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { populated } = generatePopulated(555555, depth);
      const types = (populated.layout.monsters ?? []).map((monster) =>
        Array.isArray(monster) ? monster[0] : monster.type,
      );
      if (depth < 3) {
        expect(types).not.toContain(MonsterType.TROLL);
      }
      if (depth < 5) {
        expect(types).not.toContain(MONSTER_POOL[2].type);
      }
      if (depth < 7) {
        expect(types).not.toContain(MONSTER_POOL[3].type);
      }
    }
  });

  it('places a boss exactly on floors 5 and 10', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { populated } = generatePopulated(777777, depth);
      const types = (populated.layout.monsters ?? []).map((monster) =>
        Array.isArray(monster) ? monster[0] : monster.type,
      );
      const bosses = types.filter(
        (type) =>
          type in BOSS_FLOORS || Object.values(BOSS_FLOORS).includes(type),
      );
      if (BOSS_FLOORS[depth]) {
        expect(bosses).toEqual([BOSS_FLOORS[depth]]);
      } else {
        expect(bosses).toEqual([]);
      }
    }
  });

  it('keeps the start room monster-free on depth 1 and within caps everywhere', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { generated, populated } = generatePopulated(31337, depth);
      const counts = new Map<string, number>();
      for (const monster of populated.layout.monsters ?? []) {
        const { x, y } = monsterCell(monster);
        const letter = roomOf(generated.layout.grid, x, y);
        counts.set(letter, (counts.get(letter) ?? 0) + 1);
      }
      for (const [letter, count] of counts) {
        expect(count).toBeLessThanOrEqual(config.maxMonstersPerRoom);
        if (letter === generated.startRoom) {
          if (depth === 1) {
            expect(count).toBe(0);
          } else {
            expect(count).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('places everything on free floor cells, never on doors, walls, void or each other', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { generated, populated } = generatePopulated(424242, depth);
      const grid = generated.layout.grid;
      const doorKeys = doorCellKeys(generated);
      const startKeys = new Set(
        generated.startingPositions.map((cell) => `${cell.x},${cell.y}`),
      );
      const seen = new Set<string>();
      const checkCell = (x: number, y: number): void => {
        const key = `${x},${y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(doorKeys.has(key)).toBe(false);
        expect(startKeys.has(key)).toBe(false);
        const cell = grid[y][x];
        expect(cell).not.toBe(' ');
        expect(cell).not.toBe('#');
      };
      for (const monster of populated.layout.monsters ?? []) {
        const { x, y } = monsterCell(monster);
        checkCell(x, y);
      }
      for (const item of populated.layout.items ?? []) {
        const tuple = item as [number, number];
        checkCell(tuple[0], tuple[1]);
      }
      for (const secret of populated.layout.secrets ?? []) {
        const tuple = secret as [SecretType, number, number];
        checkCell(tuple[1], tuple[2]);
      }
    }
  });

  it('places exactly one magic item on every floor', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { populated } = generatePopulated(606060, depth);
      const magic = (populated.layout.items ?? [])
        .map((item) => (Array.isArray(item) ? item[2] : item.item))
        .filter((item) => item?.type === ItemType.MAGIC);
      expect(magic.length).toBe(1);
      expect(magicItems).toContain(magic[0]);
    }
  });

  it('biases floor loot quality upward with depth', () => {
    const averageValue = (depth: number): number => {
      const values: number[] = [];
      for (let i = 0; i < 25; i++) {
        const { populated } = generatePopulated(500000 + i * 101, depth);
        for (const item of populated.layout.items ?? []) {
          const resolved = Array.isArray(item) ? item[2] : item.item;
          if (resolved?.type !== ItemType.MAGIC) {
            values.push(resolved?.value ?? 0);
          }
        }
      }
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };
    expect(averageValue(1)).toBeLessThan(averageValue(10));
  });

  it('emits the full shared world event deck on every floor', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { populated } = generatePopulated(909090, depth);
      expect(populated.events).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
    }
  });

  it('places one central light per room on dark floors', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { generated, populated } = generatePopulated(121212, depth);
      const lights = populated.layout.lights ?? [];
      if (config.ambientLight < 1) {
        // One light per room plus one ember per hidden door.
        const roomCount = new Set(
          generated.layout.grid
            .join('')
            .split('')
            .filter((cell) => cell !== ' ' && cell !== '#'),
        ).size;
        const hiddenDoors = (generated.layout.doors ?? []).filter(
          (door) =>
            (door as [Side, number, number, { hidden?: boolean }])[3]?.hidden,
        ).length;
        expect(lights.length).toBe(roomCount + hiddenDoors);
      } else {
        expect(lights).toEqual([]);
      }
    }
  });

  it('hints at every hidden door with an ember on the adjacent floor cell', () => {
    for (let depth = 2; depth <= 10; depth++) {
      const { generated, populated } = generatePopulated(343434, depth);
      const grid = generated.layout.grid;
      const embers = (populated.layout.lights ?? []).filter(
        (light) => Array.isArray(light) && light[3] === ember,
      ) as [number, number, CellAlignment, typeof ember][];
      const hiddenDoors = (generated.layout.doors ?? []).filter(
        (door) =>
          (door as [Side, number, number, { hidden?: boolean }])[3]?.hidden,
      ) as [Side, number, number, { hidden?: boolean }][];
      expect(embers.length).toBe(hiddenDoors.length);
      for (const [side, x, y] of hiddenDoors) {
        const doorLetter = grid[y][x];
        const adjacent = embers.some(([lx, ly]) => {
          const distance = Math.abs(lx - x) + Math.abs(ly - y);
          return distance === 1 && grid[ly][lx] === doorLetter;
        });
        expect(adjacent).toBe(true);
        expect(side).toBeDefined();
      }
    }
  });
});
