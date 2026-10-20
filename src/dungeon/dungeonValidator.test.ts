import { describe, expect, it } from 'vitest';
import {
  assertValidDungeon,
  validateDungeon,
  validateLayout,
} from './dungeonValidator';
import { Colour, ConditionType, MonsterType, SecretType, Side } from '../types';
import { CellAlignment } from '../types';
import { defineDungeon } from './dungeonParser';
import {
  createDoor,
  createLight,
  createMonster,
  createSecret,
} from './DungeonLogic';

describe('dungeonValidator', () => {
  it('passes validation for valid layouts', () => {
    const dungeon = defineDungeon({
      name: 'valid.dungeon',
      intro: 'test-dungeon',
      winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
      startingPositions: [[1, 1]],
      discoveredRooms: ['A'],
      layout: {
        grid: ['###', '#A#', '###'],
        monsters: [[MonsterType.ORC, Colour.Green, 1, 1]],
        secrets: [[SecretType.EQUIPMENT, 1, 1]],
        doors: [[Side.RIGHT, 1, 1]],
      },
    });

    const result = validateDungeon(dungeon);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(() => assertValidDungeon(dungeon)).not.toThrow();
  });

  it('detects empty grid and non-rectangular grid rows', () => {
    const result1 = validateLayout({
      grid: [],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    });
    expect(result1.valid).toBe(false);
    expect(result1.errors.some((e) => e.type === 'grid')).toBe(true);

    const result2 = validateLayout({
      grid: ['####', '##', '####'],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    });
    expect(result2.valid).toBe(false);
    expect(result2.errors.some((e) => e.type === 'grid')).toBe(true);
  });

  it('detects out-of-bounds positions for entities', () => {
    const monster = createMonster(MonsterType.ORC, Colour.Green, 10, 1);
    const result = validateLayout(
      {
        grid: ['###', '#A#', '###'],
        doors: [],
        monsters: [monster],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      {
        startingPositions: [{ x: -1, y: 1 }],
      },
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.filter((e) => e.type === 'boundary').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('detects entities overlapping walls and empty cells', () => {
    const wallMonster = createMonster(MonsterType.ORC, Colour.Green, 0, 0);
    const voidMonster = createMonster(MonsterType.ORC, Colour.Red, 3, 0);
    const wallSecret = createSecret(SecretType.EQUIPMENT, 'Secret', 1, 0);

    const result = validateLayout(
      {
        grid: ['### ', '#A# ', '####'],
        doors: [],
        monsters: [wallMonster, voidMonster],
        secrets: [wallSecret],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      {
        startingPositions: [{ x: 2, y: 0 }],
      },
    );

    expect(result.valid).toBe(false);
    const overlapErrors = result.errors.filter((e) => e.type === 'overlap');
    expect(overlapErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('detects duplicate IDs', () => {
    const door1 = createDoor(Side.UP, 1, 1);
    door1.id = 'door_duplicate';
    const door2 = createDoor(Side.DOWN, 1, 1);
    door2.id = 'door_duplicate';

    const result = validateLayout({
      grid: ['###', '#A#', '###'],
      doors: [door1, door2],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'duplicate_id')).toBe(true);
  });

  it('detects missing discovered rooms or corridors', () => {
    const result = validateLayout(
      {
        grid: ['###', '#A#', '###'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: ['Z'],
        corners: [],
      },
      {
        discoveredRooms: ['X'],
      },
    );

    expect(result.valid).toBe(false);
    const roomErrors = result.errors.filter((e) => e.type === 'room');
    expect(roomErrors.length).toBe(2);
  });

  it('assertValidDungeon throws formatted descriptive error on invalid dungeon', () => {
    const invalidDungeon = {
      name: 'broken.dungeon',
      intro: 'test-dungeon',
      winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
      startingPositions: [{ x: 99, y: 99 }],
      discoveredRooms: ['A'],
      beaten: false,
      killCount: 0,
      layout: {
        grid: ['###', '#A#', '###'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
    };

    expect(() => assertValidDungeon(invalidDungeon)).toThrow(
      /Dungeon 'broken.dungeon' layout validation failed/,
    );
  });

  it('accepts valid lights and detects misplaced or duplicate ones', () => {
    const valid = validateLayout({
      grid: ['####', '#AA#', '####'],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      lights: [createLight(1, 1)],
    });
    expect(valid.valid).toBe(true);

    const invalid = validateLayout({
      grid: ['####', '#AA#', '####'],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      lights: [
        createLight(9, 9),
        createLight(0, 1),
        createLight(1, 1, CellAlignment.CENTER, { id: 'light_dup' }),
        createLight(2, 1, CellAlignment.CENTER, { id: 'light_dup' }),
      ],
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.filter((e) => e.type === 'boundary').length).toBe(1);
    expect(invalid.errors.filter((e) => e.type === 'overlap').length).toBe(1);
    expect(invalid.errors.filter((e) => e.type === 'duplicate_id').length).toBe(
      1,
    );
  });
});
