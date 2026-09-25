import { describe, expect, it } from 'vitest';
import { e1m0 } from './e1m0';
import { e1m1 } from './e1m1';
import { e1m2 } from './e1m2';
import { e1m3 } from './e1m3';
import { e1m4 } from './e1m4';
import { e1m5 } from './e1m5';
import { testingGrounds } from './testingGrounds';
import { validateDungeon } from '../../dungeon/DungeonLogic';

describe('Campaign Dungeons Validation', () => {
  const allDungeons = [
    { name: 'e1m0', dungeon: e1m0 },
    { name: 'e1m1', dungeon: e1m1 },
    { name: 'e1m2', dungeon: e1m2 },
    { name: 'e1m3', dungeon: e1m3 },
    { name: 'e1m4', dungeon: e1m4 },
    { name: 'e1m5', dungeon: e1m5 },
    { name: 'testingGrounds', dungeon: testingGrounds },
  ];

  allDungeons.forEach(({ name, dungeon }) => {
    describe(`Dungeon ${name}`, () => {
      it('passes all layout schema validations with zero errors', () => {
        const result = validateDungeon(dungeon);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('has valid rectangular grid', () => {
        const grid = dungeon.layout.grid;
        expect(grid.length).toBeGreaterThan(0);
        const width = grid[0].length;
        grid.forEach((row) => {
          expect(row.length).toBe(width);
        });
      });

      it('has starting positions inside discovered rooms', () => {
        expect(dungeon.startingPositions.length).toBeGreaterThan(0);
        dungeon.startingPositions.forEach((pos) => {
          const cell = dungeon.layout.grid[pos.y][pos.x];
          expect(dungeon.discoveredRooms).toContain(cell);
        });
      });

      it('all doors, monsters, and secrets are within bounds and not in void', () => {
        const height = dungeon.layout.grid.length;
        const width = dungeon.layout.grid[0].length;

        dungeon.layout.doors.forEach((door) => {
          expect(door.x).toBeGreaterThanOrEqual(0);
          expect(door.x).toBeLessThan(width);
          expect(door.y).toBeGreaterThanOrEqual(0);
          expect(door.y).toBeLessThan(height);
          const cell = dungeon.layout.grid[door.y][door.x];
          expect(cell).not.toBe(' ');
        });

        dungeon.layout.monsters.forEach((monster) => {
          expect(monster.position.x).toBeGreaterThanOrEqual(0);
          expect(monster.position.x).toBeLessThan(width);
          expect(monster.position.y).toBeGreaterThanOrEqual(0);
          expect(monster.position.y).toBeLessThan(height);
          const cell =
            dungeon.layout.grid[monster.position.y][monster.position.x];
          expect(cell).not.toBe('#');
          expect(cell).not.toBe(' ');
        });

        dungeon.layout.secrets.forEach((secret) => {
          expect(secret.position.x).toBeGreaterThanOrEqual(0);
          expect(secret.position.x).toBeLessThan(width);
          expect(secret.position.y).toBeGreaterThanOrEqual(0);
          expect(secret.position.y).toBeLessThan(height);
          const cell =
            dungeon.layout.grid[secret.position.y][secret.position.x];
          expect(cell).not.toBe('#');
          expect(cell).not.toBe(' ');
        });
      });
    });
  });

  it('forms a continuous campaign progression chain', () => {
    expect(e1m0.nextDungeon).toBe(e1m1);
    expect(e1m1.nextDungeon).toBe(e1m2);
    expect(e1m2.nextDungeon).toBe(e1m3);
    expect(e1m3.nextDungeon).toBe(e1m4);
    expect(e1m4.nextDungeon).toBe(e1m5);
    expect(e1m5.nextDungeon).toBeUndefined();
  });
});
