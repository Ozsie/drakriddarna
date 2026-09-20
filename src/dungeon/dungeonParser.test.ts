import { describe, expect, it } from 'vitest';
import {
  defineDungeon,
  defineLayout,
  parseDoor,
  parseItem,
  parseMonster,
  parseNote,
  parsePosition,
  parseSecret,
  parseTileMap,
} from './dungeonParser';
import {
  Colour,
  ConditionType,
  Level,
  MonsterType,
  SecretType,
  Side,
} from '../types';
import { weapons } from '../items/weapons';
import { magicItems } from '../items/magicItems';

describe('dungeonParser', () => {
  describe('parsePosition', () => {
    it('parses tuple [x, y]', () => {
      expect(parsePosition([3, 4])).toEqual({ x: 3, y: 4 });
    });

    it('parses object { x, y }', () => {
      expect(parsePosition({ x: 5, y: 6 })).toEqual({ x: 5, y: 6 });
    });
  });

  describe('parseDoor', () => {
    it('parses tuple format with defaults', () => {
      const door = parseDoor([Side.UP, 2, 3]);
      expect(door).toMatchObject({
        side: Side.UP,
        x: 2,
        y: 3,
        locked: false,
        trapped: false,
        hidden: false,
        open: false,
      });
    });

    it('parses tuple format with locked, trapped, and hidden options', () => {
      const door = parseDoor([
        Side.RIGHT,
        4,
        5,
        { locked: true, trapped: 2, hidden: true },
      ]);
      expect(door).toMatchObject({
        side: Side.RIGHT,
        x: 4,
        y: 5,
        locked: true,
        trapped: true,
        trapAttacks: 2,
        hidden: true,
        open: false,
      });
    });

    it('parses object format with trapped boolean', () => {
      const door = parseDoor({
        side: Side.DOWN,
        x: 1,
        y: 2,
        trapped: true,
      });
      expect(door).toMatchObject({
        side: Side.DOWN,
        x: 1,
        y: 2,
        trapped: true,
        trapAttacks: 1,
      });
    });
  });

  describe('parseMonster', () => {
    it('parses tuple format for basic monster', () => {
      const monster = parseMonster([MonsterType.ORC, Colour.Green, 3, 4]);
      expect(monster.type).toBe(MonsterType.ORC);
      expect(monster.colour).toBe(Colour.Green);
      expect(monster.position).toEqual({ x: 3, y: 4 });
      expect(monster.level).toBe(Level.APPRENTICE);
      expect(monster.health).toBe(2);
    });

    it('parses monster with inventory', () => {
      const monster = parseMonster([
        MonsterType.TROLL,
        Colour.Yellow,
        5,
        6,
        [magicItems[0]],
      ]);
      expect(monster.type).toBe(MonsterType.TROLL);
      expect(monster.inventory).toEqual([magicItems[0]]);
    });

    it('parses object format monster', () => {
      const monster = parseMonster({
        type: MonsterType.YELLOW_DARK_LORD,
        colour: Colour.Yellow,
        x: 7,
        y: 8,
      });
      expect(monster.type).toBe(MonsterType.YELLOW_DARK_LORD);
      expect(monster.actions).toBe(3);
    });
  });

  describe('parseSecret', () => {
    it('parses equipment secret with default name', () => {
      const secret = parseSecret([SecretType.EQUIPMENT, 2, 3]);
      expect(secret.type).toBe(SecretType.EQUIPMENT);
      expect(secret.name).toBe('campaign.iceDragon.randomEquipment');
      expect(secret.position).toEqual({ x: 2, y: 3 });
      expect(secret.found).toBe(false);
    });

    it('parses trap door secret with default name', () => {
      const secret = parseSecret([SecretType.TRAP_DOOR, 4, 5]);
      expect(secret.type).toBe(SecretType.TRAP_DOOR);
      expect(secret.name).toBe('campaign.iceDragon.trapDoor');
      expect(secret.position).toEqual({ x: 4, y: 5 });
    });

    it('parses secret with custom item', () => {
      const secret = parseSecret([SecretType.MAGIC_ITEM, 6, 7, magicItems[0]]);
      expect(secret.type).toBe(SecretType.MAGIC_ITEM);
      expect(secret.item).toEqual(magicItems[0]);
    });
  });

  describe('parseNote and parseItem', () => {
    it('parses notes from tuple and object', () => {
      const n1 = parseNote([1, 2, 'Note message']);
      expect(n1).toEqual({ position: { x: 1, y: 2 }, message: 'Note message' });

      const n2 = parseNote({ x: 3, y: 4, message: 'Obj message' });
      expect(n2).toEqual({ position: { x: 3, y: 4 }, message: 'Obj message' });
    });

    it('parses items from tuple and object', () => {
      const i1 = parseItem([2, 3, weapons[0]]);
      expect(i1).toEqual({ position: { x: 2, y: 3 }, item: weapons[0] });

      const i2 = parseItem({ x: 4, y: 5, item: weapons[1] });
      expect(i2).toEqual({ position: { x: 4, y: 5 }, item: weapons[1] });
    });
  });

  describe('defineLayout and defineDungeon', () => {
    it('fills default properties when defining layout and dungeon', () => {
      const layout = defineLayout({
        grid: ['###', '#A#', '###'],
      });
      expect(layout.doors).toEqual([]);
      expect(layout.monsters).toEqual([]);
      expect(layout.secrets).toEqual([]);
      expect(layout.notes).toEqual([]);
      expect(layout.items).toEqual([]);

      const dungeon = defineDungeon({
        name: 'test.dungeon',
        winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
        startingPositions: [[1, 1]],
        layout: {
          grid: ['###', '#A#', '###'],
        },
      });

      expect(dungeon.name).toBe('test.dungeon');
      expect(dungeon.beaten).toBe(false);
      expect(dungeon.killCount).toBe(0);
      expect(dungeon.discoveredRooms).toEqual(['A']);
      expect(dungeon.layout.doors).toEqual([]);
      expect(dungeon.layout.monsters).toEqual([]);
      expect(dungeon.layout.secrets).toEqual([]);
      expect(dungeon.layout.notes).toEqual([]);
      expect(dungeon.layout.items).toEqual([]);
      expect(dungeon.layout.corridors).toEqual([]);
      expect(dungeon.layout.pits).toEqual([]);
      expect(dungeon.layout.pillars).toEqual([]);
      expect(dungeon.layout.corners).toEqual([]);
    });
  });

  describe('parseTileMap', () => {
    it('parses declarative tile legend into grid and entities', () => {
      const rawMap = ['#####', '#SPM#', '#TD #', '#####'];

      const legend = {
        S: { roomOrTile: 'A', startingPosition: true },
        P: { roomOrTile: 'A', pit: true },
        M: {
          roomOrTile: 'A',
          monster: { type: MonsterType.ORC, colour: Colour.Green },
        },
        T: {
          roomOrTile: 'A',
          secret: { type: SecretType.TRAP_DOOR },
        },
        D: {
          roomOrTile: 'A',
          door: { side: Side.RIGHT, locked: true },
        },
      };

      const parsed = parseTileMap(rawMap, legend);

      expect(parsed.grid).toEqual(['#####', '#AAA#', '#AA #', '#####']);
      expect(parsed.startingPositions).toEqual([{ x: 1, y: 1 }]);
      expect(parsed.pits).toEqual([{ x: 2, y: 1 }]);
      expect(parsed.monsters.length).toBe(1);
      expect(parsed.monsters[0].type).toBe(MonsterType.ORC);
      expect(parsed.monsters[0].position).toEqual({ x: 3, y: 1 });
      expect(parsed.secrets.length).toBe(1);
      expect(parsed.secrets[0].position).toEqual({ x: 1, y: 2 });
      expect(parsed.doors.length).toBe(1);
      expect(parsed.doors[0].locked).toBe(true);
      expect(parsed.doors[0].x).toBe(2);
      expect(parsed.doors[0].y).toBe(2);
    });
  });
});
