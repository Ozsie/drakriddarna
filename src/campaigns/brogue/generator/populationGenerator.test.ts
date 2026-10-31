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
import {
  chandelier,
  ember,
  glow,
  goldenGlow,
  torch,
} from '../../../dungeon/LightSources';
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

type LightTuple = [number, number, CellAlignment, typeof torch];

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

  it('places everything on free floor cells, never on doors, walls, void, blockers or each other', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { generated, populated } = generatePopulated(424242, depth);
      const grid = generated.layout.grid;
      const doorKeys = doorCellKeys(generated);
      const startKeys = new Set(
        generated.startingPositions.map((cell) => `${cell.x},${cell.y}`),
      );
      const blockerKeys = new Set<string>([
        ...((populated.layout.pillars ?? []) as [number, number][]).map(
          ([x, y]) => `${x},${y}`,
        ),
        ...((populated.layout.pits ?? []) as [number, number][]).map(
          ([x, y]) => `${x},${y}`,
        ),
      ]);
      const seen = new Set<string>();
      const checkCell = (x: number, y: number): void => {
        const key = `${x},${y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(doorKeys.has(key)).toBe(false);
        expect(startKeys.has(key)).toBe(false);
        expect(blockerKeys.has(key)).toBe(false);
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

  it('places one central light per room on dark floors, plus the configured glows', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { generated, populated } = generatePopulated(121212, depth);
      const lights = (populated.layout.lights ?? []) as LightTuple[];
      if (config.ambientLight < 1) {
        // One central light per room plus one ember per hidden door; glow
        // floors (the mushroom grotto) add their edge glows on top.
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
        const nonGlow = lights.filter((light) => light[3] !== glow);
        expect(nonGlow.length).toBe(roomCount + hiddenDoors);
        const glowLights = lights.filter((light) => light[3] === glow);
        if (config.glowMin !== undefined) {
          expect(glowLights.length).toBeGreaterThanOrEqual(config.glowMin);
          expect(glowLights.length).toBeLessThanOrEqual(
            config.glowMax ?? config.glowMin,
          );
        } else {
          expect(glowLights).toEqual([]);
        }
      } else {
        expect(lights).toEqual([]);
      }
    }
  });

  it('draws the central lights from the floor light rig', () => {
    // Floor 2: mine torches; floor 6: crystal chandeliers; floor 9: the
    // abyss's golden glow; floor 10: temple chandeliers.
    const expectations: Record<number, typeof torch> = {
      2: torch,
      6: chandelier,
      9: goldenGlow,
      10: chandelier,
    };
    for (const [depthKey, expected] of Object.entries(expectations)) {
      const depth = Number(depthKey);
      const { populated } = generatePopulated(232323, depth);
      const central = ((populated.layout.lights ?? []) as LightTuple[]).filter(
        (light) => light[3] !== ember && light[3] !== glow,
      );
      expect(central.length).toBeGreaterThan(0);
      for (const light of central) {
        expect(light[3]).toBe(expected);
        if (expected === chandelier) {
          expect(light[2]).toBe(CellAlignment.CEILING);
        }
      }
    }
  });

  it('places the configured pillars and pits inside rooms, never beside doors', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { generated, populated } = generatePopulated(565656, depth);
      const grid = generated.layout.grid;
      const doorKeys = doorCellKeys(generated);
      const doorAdjacentKeys = new Set<string>();
      for (const key of doorKeys) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]) {
          doorAdjacentKeys.add(`${x + dx},${y + dy}`);
        }
      }
      const startKeys = new Set(
        generated.startingPositions.map((cell) => `${cell.x},${cell.y}`),
      );
      const checkBlockers = (
        blockers: [number, number][] | undefined,
        min: number | undefined,
        max: number | undefined,
      ): void => {
        const list = blockers ?? [];
        if (min === undefined) {
          expect(list).toEqual([]);
          return;
        }
        expect(list.length).toBeGreaterThanOrEqual(min);
        expect(list.length).toBeLessThanOrEqual(max ?? min);
        for (const [x, y] of list) {
          const key = `${x},${y}`;
          const cell = grid[y][x];
          expect(cell).not.toBe(' ');
          expect(cell).not.toBe('#');
          expect(doorKeys.has(key)).toBe(false);
          expect(doorAdjacentKeys.has(key)).toBe(false);
          expect(startKeys.has(key)).toBe(false);
        }
      };
      checkBlockers(
        populated.layout.pillars as [number, number][] | undefined,
        config.pillarMin,
        config.pillarMax,
      );
      checkBlockers(
        populated.layout.pits as [number, number][] | undefined,
        config.pitMin,
        config.pitMax,
      );
      // A cell is never both a pillar and a pit.
      const pillarKeys = new Set(
        (populated.layout.pillars ?? []).map(
          (pillar) =>
            `${(pillar as [number, number])[0]},${
              (pillar as [number, number])[1]
            }`,
        ),
      );
      for (const pit of populated.layout.pits ?? []) {
        const [x, y] = pit as [number, number];
        expect(pillarKeys.has(`${x},${y}`)).toBe(false);
      }
    }
  });

  it('never walls anything in: every free cell stays reachable from the hero start', () => {
    for (const seedBase of [787878, 141414, 272727]) {
      for (let depth = 1; depth <= 10; depth++) {
        const { generated, populated } = generatePopulated(seedBase, depth);
        const grid = generated.layout.grid;
        const blocked = new Set<string>([
          ...((populated.layout.pillars ?? []) as [number, number][]).map(
            ([x, y]) => `${x},${y}`,
          ),
          ...((populated.layout.pits ?? []) as [number, number][]).map(
            ([x, y]) => `${x},${y}`,
          ),
        ]);
        const floorKeys = new Set<string>();
        grid.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell !== ' ' && cell !== '#') {
              floorKeys.add(`${x},${y}`);
            }
          }
        });
        // Locked doors do not count as a route: what must stay reachable
        // has to be reachable without any locked door.
        const offsets: Record<string, [number, number]> = {
          [Side.UP]: [0, -1],
          [Side.DOWN]: [0, 1],
          [Side.LEFT]: [-1, 0],
          [Side.RIGHT]: [1, 0],
        };
        const lockedEdges = new Set<string>();
        for (const door of generated.layout.doors ?? []) {
          const [side, x, y, options] = door as [
            Side,
            number,
            number,
            { locked?: boolean },
          ];
          if (!options?.locked) continue;
          const [dx, dy] = offsets[side];
          lockedEdges.add(`${x},${y}|${x + dx},${y + dy}`);
          lockedEdges.add(`${x + dx},${y + dy}|${x},${y}`);
        }
        const seeds = generated.startingPositions.filter(
          (cell) => !blocked.has(`${cell.x},${cell.y}`),
        );
        expect(seeds.length).toBeGreaterThan(0);
        const seen = new Set(seeds.map((cell) => `${cell.x},${cell.y}`));
        const queue = [...seeds];
        while (queue.length > 0) {
          const current = queue.pop()!;
          for (const [dx, dy] of [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ]) {
            const key = `${current.x + dx},${current.y + dy}`;
            if (
              !floorKeys.has(key) ||
              seen.has(key) ||
              blocked.has(key) ||
              lockedEdges.has(`${current.x},${current.y}|${key}`)
            ) {
              continue;
            }
            seen.add(key);
            queue.push({ x: current.x + dx, y: current.y + dy });
          }
        }
        for (const key of floorKeys) {
          if (!blocked.has(key)) {
            expect(seen.has(key)).toBe(true);
          }
        }
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
