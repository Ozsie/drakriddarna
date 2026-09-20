import type {
  Corner,
  Door,
  Dungeon,
  Item,
  ItemLocation,
  Layout,
  Monster,
  Note,
  Position,
  Secret,
  WinCondition,
} from '../types';
import { Colour, MonsterType, SecretType, Side } from '../types';
import {
  createDoor,
  createEquipment,
  createHiddenDoor,
  createLockedDoor,
  createMonster,
  createMonsterWithInventory,
  createSecret,
  createSecretWithItem,
  createTrappedDoor,
  createTrappedHiddenDoor,
  createTrappedLockedDoor,
} from './DungeonLogic';
import { assertValidDungeon } from './dungeonValidator';

export type PositionTuple = [x: number, y: number];

export type DeclarativePosition = Position | PositionTuple;

export type DeclarativeDoorObject = {
  side: Side;
  x: number;
  y: number;
  locked?: boolean;
  trapped?: boolean | number;
  hidden?: boolean;
  open?: boolean;
  id?: string;
};

export type DeclarativeDoorTuple = [
  side: Side,
  x: number,
  y: number,
  options?: {
    locked?: boolean;
    trapped?: boolean | number;
    hidden?: boolean;
    open?: boolean;
    id?: string;
  },
];

export type DeclarativeDoor =
  | Door
  | DeclarativeDoorObject
  | DeclarativeDoorTuple;

export type DeclarativeMonsterObject = {
  type: MonsterType;
  colour: Colour;
  x: number;
  y: number;
  inventory?: Item[];
  id?: string;
};

export type DeclarativeMonsterTuple = [
  type: MonsterType,
  colour: Colour,
  x: number,
  y: number,
  inventory?: Item[],
  id?: string,
];

export type DeclarativeMonster =
  | Monster
  | DeclarativeMonsterObject
  | DeclarativeMonsterTuple;

export type DeclarativeSecretObject = {
  type: SecretType;
  x: number;
  y: number;
  name?: string;
  item?: Item;
  id?: string;
};

export type DeclarativeSecretTuple = [
  type: SecretType,
  x: number,
  y: number,
  nameOrItem?: string | Item,
  id?: string,
];

export type DeclarativeSecret =
  | Secret
  | DeclarativeSecretObject
  | DeclarativeSecretTuple;

export type DeclarativeNoteObject = {
  x: number;
  y: number;
  message: string;
  id?: string;
};

export type DeclarativeNoteTuple = [
  x: number,
  y: number,
  message: string,
  id?: string,
];

export type DeclarativeNote =
  | Note
  | DeclarativeNoteObject
  | DeclarativeNoteTuple;

export type DeclarativeItemObject = {
  x: number;
  y: number;
  item: Item;
};

export type DeclarativeItemTuple = [x: number, y: number, item: Item];

export type DeclarativeItem =
  | ItemLocation
  | DeclarativeItemObject
  | DeclarativeItemTuple;

export type DeclarativeLayout = {
  grid: string[];
  doors?: DeclarativeDoor[];
  monsters?: DeclarativeMonster[];
  secrets?: DeclarativeSecret[];
  notes?: DeclarativeNote[];
  items?: DeclarativeItem[];
  corridors?: string[];
  pillars?: DeclarativePosition[];
  pits?: DeclarativePosition[];
  corners?: Corner[];
};

export type DeclarativeDungeon = {
  name: string;
  nameTranslationKey?: string;
  beaten?: boolean;
  winConditions: WinCondition[];
  nextDungeon?: Dungeon;
  startingPositions: DeclarativePosition[];
  discoveredRooms?: string[];
  layout: DeclarativeLayout;
  killCount?: number;
  events?: number[];
  collapsedCorridor?: string;
};

export interface DefineDungeonOptions {
  validate?: boolean;
}

export const parsePosition = (pos: DeclarativePosition): Position => {
  if (Array.isArray(pos)) {
    return { x: pos[0], y: pos[1] };
  }
  return { x: pos.x, y: pos.y };
};

export const parseDoor = (doorDef: DeclarativeDoor): Door => {
  if (
    'locked' in doorDef &&
    'open' in doorDef &&
    'hidden' in doorDef &&
    'trapped' in doorDef
  ) {
    return doorDef as Door;
  }

  let side: Side;
  let x: number;
  let y: number;
  let locked = false;
  let trapped = false;
  let trapAttacks = 0;
  let hidden = false;
  let open = false;
  let id: string | undefined;

  if (Array.isArray(doorDef)) {
    side = doorDef[0];
    x = doorDef[1];
    y = doorDef[2];
    const opts = doorDef[3];
    if (opts) {
      locked = !!opts.locked;
      hidden = !!opts.hidden;
      open = !!opts.open;
      id = opts.id;
      if (typeof opts.trapped === 'number') {
        trapped = opts.trapped > 0;
        trapAttacks = opts.trapped;
      } else if (opts.trapped) {
        trapped = true;
        trapAttacks = 1;
      }
    }
  } else {
    side = doorDef.side;
    x = doorDef.x;
    y = doorDef.y;
    locked = !!doorDef.locked;
    hidden = !!doorDef.hidden;
    open = !!doorDef.open;
    id = doorDef.id;
    if (typeof doorDef.trapped === 'number') {
      trapped = doorDef.trapped > 0;
      trapAttacks = doorDef.trapped;
    } else if (doorDef.trapped) {
      trapped = true;
      trapAttacks = 1;
    }
  }

  if (trapped && locked) {
    return {
      ...createTrappedLockedDoor(side, x, y, trapAttacks),
      open,
      hidden,
      ...(id ? { id } : {}),
    };
  }
  if (trapped && hidden) {
    return {
      ...createTrappedHiddenDoor(side, x, y, trapAttacks),
      open,
      locked,
      ...(id ? { id } : {}),
    };
  }
  if (trapped) {
    return {
      ...createTrappedDoor(side, x, y, trapAttacks),
      open,
      locked,
      hidden,
      ...(id ? { id } : {}),
    };
  }
  if (locked) {
    return {
      ...createLockedDoor(side, x, y),
      open,
      hidden,
      ...(id ? { id } : {}),
    };
  }
  if (hidden) {
    return {
      ...createHiddenDoor(side, x, y),
      open,
      locked,
      ...(id ? { id } : {}),
    };
  }

  return {
    ...createDoor(side, x, y),
    open,
    ...(id ? { id } : {}),
  };
};

export const parseMonster = (monsterDef: DeclarativeMonster): Monster => {
  if (
    'health' in monsterDef &&
    'maxHealth' in monsterDef &&
    'actions' in monsterDef
  ) {
    return monsterDef;
  }

  if (Array.isArray(monsterDef)) {
    const [type, colour, x, y, inventory, id] = monsterDef;
    if (inventory && inventory.length > 0) {
      return createMonsterWithInventory(type, colour, x, y, inventory, id);
    }
    return createMonster(type, colour, x, y, id);
  }

  const { type, colour, x, y, inventory, id } = monsterDef;
  if (inventory && inventory.length > 0) {
    return createMonsterWithInventory(type, colour, x, y, inventory, id);
  }
  return createMonster(type, colour, x, y, id);
};

export const parseSecret = (secretDef: DeclarativeSecret): Secret => {
  if ('found' in secretDef && 'position' in secretDef && 'name' in secretDef) {
    return secretDef;
  }

  let type: SecretType;
  let x: number;
  let y: number;
  let name: string | undefined;
  let item: Item | undefined;
  let id: string | undefined;

  if (Array.isArray(secretDef)) {
    type = secretDef[0];
    x = secretDef[1];
    y = secretDef[2];
    const nameOrItem = secretDef[3];
    id = secretDef[4];
    if (typeof nameOrItem === 'string') {
      name = nameOrItem;
    } else if (nameOrItem && typeof nameOrItem === 'object') {
      item = nameOrItem;
    }
  } else {
    type = secretDef.type;
    x = secretDef.x;
    y = secretDef.y;
    name = secretDef.name;
    item = secretDef.item;
    id = secretDef.id;
  }

  if (item) {
    return createSecretWithItem(type, x, y, item, id);
  }

  const defaultName =
    name ??
    (type === SecretType.EQUIPMENT
      ? 'campaign.iceDragon.randomEquipment'
      : type === SecretType.TRAP_DOOR
      ? 'campaign.iceDragon.trapDoor'
      : type);

  return createSecret(type, defaultName, x, y, id);
};

export const parseNote = (noteDef: DeclarativeNote): Note => {
  if ('position' in noteDef && 'message' in noteDef) {
    return noteDef;
  }

  if (Array.isArray(noteDef)) {
    return {
      position: { x: noteDef[0], y: noteDef[1] },
      message: noteDef[2],
      ...(noteDef[3] ? { id: noteDef[3] } : {}),
    };
  }

  return {
    position: { x: noteDef.x, y: noteDef.y },
    message: noteDef.message,
    ...(noteDef.id ? { id: noteDef.id } : {}),
  };
};

export const parseItem = (itemDef: DeclarativeItem): ItemLocation => {
  if ('position' in itemDef && 'item' in itemDef) {
    return itemDef;
  }

  if (Array.isArray(itemDef)) {
    return createEquipment(itemDef[0], itemDef[1], itemDef[2]);
  }

  return createEquipment(itemDef.x, itemDef.y, itemDef.item);
};

export const defineLayout = (layoutDef: DeclarativeLayout): Layout => ({
  grid: layoutDef.grid,
  doors: (layoutDef.doors ?? []).map(parseDoor),
  monsters: (layoutDef.monsters ?? []).map(parseMonster),
  secrets: (layoutDef.secrets ?? []).map(parseSecret),
  notes: (layoutDef.notes ?? []).map(parseNote),
  items: (layoutDef.items ?? []).map(parseItem),
  corridors: layoutDef.corridors ?? [],
  pillars: (layoutDef.pillars ?? []).map(parsePosition),
  pits: (layoutDef.pits ?? []).map(parsePosition),
  corners: layoutDef.corners ?? [],
});

export const defineDungeon = (
  dungeonDef: DeclarativeDungeon,
  options: DefineDungeonOptions = { validate: true },
): Dungeon => {
  const dungeon: Dungeon = {
    name: dungeonDef.name,
    nameTranslationKey: dungeonDef.nameTranslationKey ?? dungeonDef.name,
    beaten: dungeonDef.beaten ?? false,
    winConditions: dungeonDef.winConditions,
    nextDungeon: dungeonDef.nextDungeon,
    startingPositions: dungeonDef.startingPositions.map(parsePosition),
    discoveredRooms: dungeonDef.discoveredRooms ?? ['A'],
    layout: defineLayout(dungeonDef.layout),
    killCount: dungeonDef.killCount ?? 0,
    ...(dungeonDef.events ? { events: dungeonDef.events } : {}),
    ...(dungeonDef.collapsedCorridor
      ? { collapsedCorridor: dungeonDef.collapsedCorridor }
      : {}),
  };

  if (options.validate) {
    assertValidDungeon(dungeon);
  }

  return dungeon;
};

export interface TileMapLegend {
  [symbol: string]: {
    roomOrTile?: string;
    monster?: { type: MonsterType; colour: Colour; inventory?: Item[] };
    secret?: { type: SecretType; name?: string; item?: Item };
    item?: Item;
    note?: string;
    pit?: boolean;
    pillar?: boolean;
    startingPosition?: boolean;
    door?: {
      side: Side;
      locked?: boolean;
      trapped?: boolean | number;
      hidden?: boolean;
    };
  };
}

export const parseTileMap = (
  mapGrid: string[],
  legend: TileMapLegend,
): {
  grid: string[];
  doors: Door[];
  monsters: Monster[];
  secrets: Secret[];
  notes: Note[];
  items: ItemLocation[];
  pits: Position[];
  pillars: Position[];
  startingPositions: Position[];
} => {
  const doors: Door[] = [];
  const monsters: Monster[] = [];
  const secrets: Secret[] = [];
  const notes: Note[] = [];
  const items: ItemLocation[] = [];
  const pits: Position[] = [];
  const pillars: Position[] = [];
  const startingPositions: Position[] = [];

  const cleanGrid = mapGrid.map((row, y) => {
    let newRow = '';
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const mapping = legend[char];
      if (mapping) {
        newRow += mapping.roomOrTile ?? ' ';
        if (mapping.startingPosition) {
          startingPositions.push({ x, y });
        }
        if (mapping.pit) {
          pits.push({ x, y });
        }
        if (mapping.pillar) {
          pillars.push({ x, y });
        }
        if (mapping.monster) {
          monsters.push(
            parseMonster({
              type: mapping.monster.type,
              colour: mapping.monster.colour,
              x,
              y,
              inventory: mapping.monster.inventory,
            }),
          );
        }
        if (mapping.secret) {
          secrets.push(
            parseSecret({
              type: mapping.secret.type,
              x,
              y,
              name: mapping.secret.name,
              item: mapping.secret.item,
            }),
          );
        }
        if (mapping.item) {
          items.push(parseItem({ x, y, item: mapping.item }));
        }
        if (mapping.note) {
          notes.push(parseNote({ x, y, message: mapping.note }));
        }
        if (mapping.door) {
          doors.push(
            parseDoor({
              side: mapping.door.side,
              x,
              y,
              locked: mapping.door.locked,
              trapped: mapping.door.trapped,
              hidden: mapping.door.hidden,
            }),
          );
        }
      } else {
        newRow += char;
      }
    }
    return newRow;
  });

  return {
    grid: cleanGrid,
    doors,
    monsters,
    secrets,
    notes,
    items,
    pits,
    pillars,
    startingPositions,
  };
};
