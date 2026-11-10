import type {
  Corner,
  Decorator,
  Door,
  Dungeon,
  InteractableCell,
  Item,
  ItemLight,
  ItemLocation,
  Layout,
  LightEffect,
  LightSprite,
  LightSource,
  Monster,
  Note,
  Position,
  RoomFogOptions,
  Secret,
  TerrainCell,
  TerrainOptions,
  TerrainType,
  WallEdge,
  WinCondition,
} from '../types';
import type { DecoratorPresetName } from './Decorators';
import {
  CellAlignment,
  Colour,
  Level,
  MonsterType,
  SecretType,
  Side,
} from '../types';
import {
  createDoor,
  createEquipment,
  createHiddenDoor,
  createLight,
  createLockedDoor,
  createMonster,
  createMonsterWithInventory,
  createRandomItem,
  createSecret,
  createSecretWithItem,
  createTrappedDoor,
  createTrappedHiddenDoor,
  createTrappedLockedDoor,
} from './DungeonLogic';
import { assertValidDungeon } from './dungeonValidator';
import { findRoomCells } from '../core';
import { autoDetectCorners } from './cornerDetection';
import {
  createDecoratorPreset,
  DECORATOR_PRESETS,
  suppliesObject,
} from './Decorators';

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
  level?: Level;
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
    reinforced?: boolean;
    id?: string;
    level?: Level;
  },
];

export type DeclarativeDoor =
  Door | DeclarativeDoorObject | DeclarativeDoorTuple;

export type DeclarativeWallTuple = [
  side: Side,
  x: number,
  y: number,
  options?: {
    colour?: string;
  },
];

export type DeclarativeWall = WallEdge | DeclarativeWallTuple;

export const parseWall = (wallDef: DeclarativeWall): WallEdge => {
  if (Array.isArray(wallDef)) {
    const [side, x, y, options] = wallDef;
    return {
      side,
      x,
      y,
      ...(options?.colour !== undefined ? { colour: options.colour } : {}),
    };
  }
  return { ...wallDef };
};

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
  Monster | DeclarativeMonsterObject | DeclarativeMonsterTuple;

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
  Secret | DeclarativeSecretObject | DeclarativeSecretTuple;

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
  Note | DeclarativeNoteObject | DeclarativeNoteTuple;

export type ItemLocationOptions = {
  onlyIfNotCarried?: boolean;
  decorator?: DecoratorPresetName;
};

export type DeclarativeItemObject = {
  x: number;
  y: number;
  item?: Item;
} & ItemLocationOptions;

export type DeclarativeItemTuple = [
  x: number,
  y: number,
  item?: Item,
  options?: ItemLocationOptions,
];

export type DeclarativeItem =
  ItemLocation | DeclarativeItemObject | DeclarativeItemTuple;

export type DeclarativeInteractableObject = {
  x: number;
  y: number;
  effect: string;
  id?: string;
  name?: string;
  nameTranslationKey?: string;
  description?: string;
  descriptionTranslationKey?: string;
  interacted?: boolean;
  oneTime?: boolean;
  args?: Record<string, unknown>;
  icon?: string;
  triggerOn?: 'interact' | 'step' | 'both';
  secret?: boolean;
  interactSound?: string;
  light?: ItemLight;
};

export type DeclarativeInteractableTuple =
  | [x: number, y: number, effect: string]
  | [
      x: number,
      y: number,
      effect: string,
      argsOrOptions?:
        | Record<string, unknown>
        | {
            id?: string;
            name?: string;
            nameTranslationKey?: string;
            description?: string;
            descriptionTranslationKey?: string;
            oneTime?: boolean;
            interacted?: boolean;
            args?: Record<string, unknown>;
            icon?: string;
            triggerOn?: 'interact' | 'step' | 'both';
            secret?: boolean;
            interactSound?: string;
            light?: ItemLight;
            [key: string]: unknown;
          },
      id?: string,
    ];

export type DeclarativeInteractable =
  | InteractableCell
  | DeclarativeInteractableObject
  | DeclarativeInteractableTuple;

export type DeclarativeLightOptions = {
  sprite?: LightSprite;
  color?: string;
  radius?: number;
  intensity?: number;
  softness?: number;
  effect?: LightEffect;
  rate?: number;
  enabled?: boolean;
  id?: string;
};

export type DeclarativeLightObject = DeclarativeLightOptions & {
  x: number;
  y: number;
  alignment?: CellAlignment;
};

export type DeclarativeLightTuple =
  | [x: number, y: number]
  | [x: number, y: number, alignment: CellAlignment]
  | [x: number, y: number, options: DeclarativeLightOptions]
  | [
      x: number,
      y: number,
      alignment: CellAlignment,
      options: DeclarativeLightOptions,
    ];

export type DeclarativeLight =
  LightSource | DeclarativeLightObject | DeclarativeLightTuple;

export type DeclarativeTerrainObject = TerrainOptions & {
  x: number;
  y: number;
};

export type DeclarativeTerrainTuple =
  | [x: number, y: number, type: TerrainType]
  | [
      x: number,
      y: number,
      type: TerrainType,
      options: Omit<TerrainOptions, 'type'>,
    ];

export type DeclarativeTerrain =
  TerrainCell | DeclarativeTerrainObject | DeclarativeTerrainTuple;

// Fog can be declared as a plain list of room/corridor letters using the
// default styling, or keyed by letter with per-room options.
export type DeclarativeRoomFog = string[] | Record<string, RoomFogOptions>;

export type DeclarativeDecoratorPreset =
  | {
      preset: DecoratorPresetName;
      position: DeclarativePosition;
      alignment?: CellAlignment;
    }
  | {
      preset: 'suppliesObject';
      position: DeclarativePosition;
      index: number;
      alignment?: CellAlignment;
    };

export type DeclarativeDecoratorTuple =
  | [x: number, y: number, preset: DecoratorPresetName]
  | [
      x: number,
      y: number,
      alignment: CellAlignment,
      preset: DecoratorPresetName,
    ];

export type DeclarativeDecorator =
  Decorator | DeclarativeDecoratorPreset | DeclarativeDecoratorTuple;

export type DeclarativeLayout = {
  grid: string[];
  doors?: DeclarativeDoor[];
  monsters?: DeclarativeMonster[];
  decorators?: DeclarativeDecorator[];
  secrets?: DeclarativeSecret[];
  notes?: DeclarativeNote[];
  items?: DeclarativeItem[];
  interactables?: DeclarativeInteractable[];
  lights?: DeclarativeLight[];
  terrain?: DeclarativeTerrain[];
  roomFog?: DeclarativeRoomFog;
  corridors?: string[];
  corridorCells?: DeclarativePosition[];
  pillars?: DeclarativePosition[];
  pits?: DeclarativePosition[];
  walls?: DeclarativeWall[];
  wallColour?: string;
  corners?: Corner[];
};

export type DeclarativeDungeon = {
  name: string;
  intro: string;
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
  onRoomDiscovered?: Record<string, string>;
  music?: string;
  tileset?: string;
  ambientLight?: number;
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

export const parseDecorator = (
  decoratorDef: DeclarativeDecorator,
): Decorator => {
  if (Array.isArray(decoratorDef)) {
    if (decoratorDef.length === 4) {
      const [x, y, alignment, preset] = decoratorDef;
      return createDecoratorPreset(preset, { x, y }, alignment);
    }
    const [x, y, preset] = decoratorDef;
    return createDecoratorPreset(preset, { x, y });
  }

  if (!('preset' in decoratorDef)) return decoratorDef;

  const position = parsePosition(decoratorDef.position);
  return decoratorDef.preset === 'suppliesObject'
    ? suppliesObject(position, decoratorDef.index, decoratorDef.alignment)
    : createDecoratorPreset(
        decoratorDef.preset,
        position,
        decoratorDef.alignment,
      );
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
  let reinforced = false;
  let id: string | undefined;
  let level: Level | undefined;

  if (Array.isArray(doorDef)) {
    side = doorDef[0];
    x = doorDef[1];
    y = doorDef[2];
    const opts = doorDef[3];
    if (opts) {
      locked = !!opts.locked;
      hidden = !!opts.hidden;
      open = !!opts.open;
      reinforced = !!opts.reinforced;
      id = opts.id;
      level = opts.level;
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
    level = doorDef.level;
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
      reinforced,
      ...(id ? { id } : {}),
      ...(level ? { level } : {}),
    };
  }
  if (trapped && hidden) {
    return {
      ...createTrappedHiddenDoor(side, x, y, trapAttacks),
      open,
      locked,
      reinforced,
      ...(id ? { id } : {}),
      ...(level ? { level } : {}),
    };
  }
  if (trapped) {
    return {
      ...createTrappedDoor(side, x, y, trapAttacks),
      open,
      locked,
      hidden,
      reinforced,
      ...(id ? { id } : {}),
      ...(level ? { level } : {}),
    };
  }
  if (locked) {
    return {
      ...createLockedDoor(side, x, y),
      open,
      hidden,
      reinforced,
      ...(id ? { id } : {}),
      ...(level ? { level } : {}),
    };
  }
  if (hidden) {
    return {
      ...createHiddenDoor(side, x, y),
      open,
      locked,
      reinforced,
      ...(id ? { id } : {}),
      ...(level ? { level } : {}),
    };
  }

  return {
    ...createDoor(side, x, y),
    open,
    reinforced,
    ...(id ? { id } : {}),
    ...(level ? { level } : {}),
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
  if ('position' in itemDef) {
    return itemDef;
  }

  if (Array.isArray(itemDef)) {
    const [x, y, item, options] = itemDef;
    const parsedOptions = {
      ...(options?.onlyIfNotCarried ? { onlyIfNotCarried: true } : {}),
      ...(options?.decorator
        ? { decorator: DECORATOR_PRESETS[options.decorator] }
        : {}),
    };
    return item
      ? createEquipment(x, y, item, parsedOptions)
      : createRandomItem(x, y, parsedOptions);
  }

  const parsedOptions = {
    ...(itemDef.onlyIfNotCarried ? { onlyIfNotCarried: true } : {}),
    ...(itemDef.decorator
      ? { decorator: DECORATOR_PRESETS[itemDef.decorator] }
      : {}),
  };
  return itemDef.item
    ? createEquipment(itemDef.x, itemDef.y, itemDef.item, parsedOptions)
    : createRandomItem(itemDef.x, itemDef.y, parsedOptions);
};

export const parseInteractable = (
  interactableDef: DeclarativeInteractable,
): InteractableCell => {
  if ('position' in interactableDef && 'effect' in interactableDef) {
    return interactableDef;
  }

  if (Array.isArray(interactableDef)) {
    const [x, y, effect, argsOrOptions, id] = interactableDef;
    let name: string | undefined;
    let nameTranslationKey: string | undefined;
    let description: string | undefined;
    let descriptionTranslationKey: string | undefined;
    let oneTime = true;
    let interacted = false;
    let args: Record<string, unknown> | undefined;
    let icon: string | undefined;
    let triggerOn: 'interact' | 'step' | 'both' = 'interact';
    let secret: boolean | undefined;
    let interactableId = id;
    let interactSound: string | undefined;
    let light: ItemLight | undefined;

    if (argsOrOptions && typeof argsOrOptions === 'object') {
      const opts = argsOrOptions as Record<string, unknown>;
      if (
        'oneTime' in opts ||
        'interacted' in opts ||
        'triggerOn' in opts ||
        'icon' in opts ||
        'name' in opts ||
        'description' in opts ||
        'id' in opts ||
        'args' in opts ||
        'secret' in opts ||
        'light' in opts ||
        'interactSound' in opts
      ) {
        if (opts.id && typeof opts.id === 'string') interactableId = opts.id;
        if (opts.name && typeof opts.name === 'string') name = opts.name;
        if (
          opts.nameTranslationKey &&
          typeof opts.nameTranslationKey === 'string'
        )
          nameTranslationKey = opts.nameTranslationKey;
        if (opts.description && typeof opts.description === 'string')
          description = opts.description;
        if (
          opts.descriptionTranslationKey &&
          typeof opts.descriptionTranslationKey === 'string'
        )
          descriptionTranslationKey = opts.descriptionTranslationKey;
        if (typeof opts.oneTime === 'boolean') oneTime = opts.oneTime;
        if (typeof opts.interacted === 'boolean') interacted = opts.interacted;
        if (opts.icon && typeof opts.icon === 'string') icon = opts.icon;
        if (typeof opts.secret === 'boolean') secret = opts.secret;
        if (
          opts.triggerOn === 'interact' ||
          opts.triggerOn === 'step' ||
          opts.triggerOn === 'both'
        ) {
          triggerOn = opts.triggerOn;
        }
        if (opts.args && typeof opts.args === 'object') {
          args = opts.args as Record<string, unknown>;
        }
        if (typeof opts.interactSound === 'string')
          interactSound = opts.interactSound;
        if (opts.light && typeof opts.light === 'object') {
          light = opts.light;
        }
      } else {
        args = opts;
      }
    }

    return {
      position: { x, y },
      effect,
      ...(interactableId ? { id: interactableId } : {}),
      ...(name ? { name, nameTranslationKey: nameTranslationKey ?? name } : {}),
      ...(description
        ? {
            description,
            descriptionTranslationKey: descriptionTranslationKey ?? description,
          }
        : {}),
      oneTime,
      interacted,
      ...(secret !== undefined ? { secret } : {}),
      ...(args ? { args } : {}),
      ...(icon ? { icon } : {}),
      triggerOn,
      interactSound,
      ...(light ? { light } : {}),
    };
  }

  const {
    x,
    y,
    effect,
    id,
    name,
    nameTranslationKey,
    description,
    descriptionTranslationKey,
    oneTime = true,
    interacted = false,
    args,
    icon,
    triggerOn = 'interact',
    secret,
    interactSound,
    light,
  } = interactableDef;

  return {
    position: { x, y },
    effect,
    ...(id ? { id } : {}),
    ...(name ? { name, nameTranslationKey: nameTranslationKey ?? name } : {}),
    ...(description
      ? {
          description,
          descriptionTranslationKey: descriptionTranslationKey ?? description,
        }
      : {}),
    oneTime,
    interacted,
    ...(secret !== undefined ? { secret } : {}),
    ...(args ? { args } : {}),
    ...(icon ? { icon } : {}),
    triggerOn,
    interactSound,
    ...(light ? { light } : {}),
  };
};

export const parseLight = (lightDef: DeclarativeLight): LightSource => {
  if ('position' in lightDef) {
    return lightDef;
  }

  if (Array.isArray(lightDef)) {
    const [x, y, alignmentOrOptions, options] = lightDef;
    const light =
      typeof alignmentOrOptions === 'string'
        ? createLight(x, y, alignmentOrOptions, options)
        : createLight(x, y, undefined, alignmentOrOptions);
    const sprite =
      typeof alignmentOrOptions === 'string'
        ? options?.sprite
        : alignmentOrOptions?.sprite;
    return sprite ? { ...light, sprite } : light;
  }

  const {
    x,
    y,
    alignment,
    color,
    radius,
    intensity,
    softness,
    effect,
    rate,
    enabled,
    id,
    sprite,
  } = lightDef;
  const light = createLight(x, y, alignment, {
    ...(color !== undefined ? { color } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(intensity !== undefined ? { intensity } : {}),
    ...(softness !== undefined ? { softness } : {}),
    ...(effect !== undefined ? { effect } : {}),
    ...(rate !== undefined ? { rate } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(id !== undefined ? { id } : {}),
  });
  return sprite ? { ...light, sprite } : light;
};

export const parseTerrain = (terrainDef: DeclarativeTerrain): TerrainCell => {
  if ('position' in terrainDef) {
    return terrainDef;
  }

  const definedOptions = (options: Partial<TerrainOptions>) => ({
    ...(options.color !== undefined ? { color: options.color } : {}),
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options.damageOnEnter !== undefined
      ? { damageOnEnter: options.damageOnEnter }
      : {}),
    ...(options.damageOnTurnEnd !== undefined
      ? { damageOnTurnEnd: options.damageOnTurnEnd }
      : {}),
    ...(options.movementCost !== undefined
      ? { movementCost: options.movementCost }
      : {}),
    ...(options.rate !== undefined ? { rate: options.rate } : {}),
    ...(options.light ? { light: options.light } : {}),
  });

  if (Array.isArray(terrainDef)) {
    const [x, y, type, options] = terrainDef;
    return {
      position: parsePosition({ x, y }),
      type,
      ...definedOptions(options ?? {}),
    };
  }

  const { x, y, type, ...options } = terrainDef;
  return {
    position: parsePosition({ x, y }),
    type,
    ...definedOptions(options),
  };
};

export const parseRoomFog = (
  fogDef: DeclarativeRoomFog,
): Record<string, RoomFogOptions> => {
  if (Array.isArray(fogDef)) {
    return Object.fromEntries(fogDef.map((room) => [room, {}]));
  }
  return { ...fogDef };
};

const DEFAULT_DECORATOR_PRESETS: readonly DecoratorPresetName[] = [
  'ruinVariant5',
  'rockVariant4',
  'plantVariant4',
  'bonesVariant3',
  'objectsObject037',
  'objectsObject016',
];

const createGridRandom = (grid: string[]): (() => number) => {
  let state = 2166136261;
  for (const character of grid.join('\n')) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  }
  state >>>= 0;
  if (state === 0) state = 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
};

const generateDefaultDecorators = (
  grid: string[],
  occupiedPositions: readonly Position[],
): Decorator[] => {
  const random = createGridRandom(grid);
  const occupiedKeys = new Set(
    occupiedPositions.map(({ x, y }) => `${x},${y}`),
  );
  const isBlocked = (x: number, y: number): boolean => {
    const tile = grid[y]?.[x];
    return tile === undefined || tile === '#' || tile === ' ';
  };
  const candidates = grid.flatMap((row, y) =>
    Array.from(row, (tile, x) => {
      if (tile === '#' || tile === ' ' || occupiedKeys.has(`${x},${y}`)) {
        return undefined;
      }

      const blocked = {
        top: isBlocked(x, y - 1),
        right: isBlocked(x + 1, y),
        bottom: isBlocked(x, y + 1),
        left: isBlocked(x - 1, y),
      };
      const corner: CellAlignment | undefined =
        blocked.top && blocked.left
          ? CellAlignment.TOP_LEFT
          : blocked.top && blocked.right
            ? CellAlignment.TOP_RIGHT
            : blocked.bottom && blocked.left
              ? CellAlignment.BOTTOM_LEFT
              : blocked.bottom && blocked.right
                ? CellAlignment.BOTTOM_RIGHT
                : undefined;
      const wallAdjacent = Object.values(blocked).some(Boolean);
      return { x, y, corner, wallAdjacent };
    }).filter((candidate) => candidate !== undefined),
  );
  const available = [...candidates];
  const presets = [...DEFAULT_DECORATOR_PRESETS];
  for (let index = presets.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [presets[index], presets[swapIndex]] = [presets[swapIndex], presets[index]];
  }

  return presets.flatMap((preset) => {
    if (available.length === 0) return [];
    const cornerCells = available.filter((cell) => cell.corner);
    const wallCells = available.filter((cell) => cell.wallAdjacent);
    const placementPool =
      cornerCells.length > 0
        ? cornerCells
        : wallCells.length > 0
          ? wallCells
          : available;
    const selected = placementPool[Math.floor(random() * placementPool.length)];
    available.splice(available.indexOf(selected), 1);
    return [
      createDecoratorPreset(
        preset,
        { x: selected.x, y: selected.y },
        selected.corner ?? CellAlignment.CENTER,
      ),
    ];
  });
};

export const defineLayout = (
  layoutDef: DeclarativeLayout,
  reservedPositions: readonly Position[] = [],
): Layout => {
  const monsters = (layoutDef.monsters ?? []).map(parseMonster);
  const secrets = (layoutDef.secrets ?? []).map(parseSecret);
  const notes = (layoutDef.notes ?? []).map(parseNote);
  const items = (layoutDef.items ?? []).map(parseItem);
  const interactables = (layoutDef.interactables ?? []).map(parseInteractable);
  const lights = (layoutDef.lights ?? []).map(parseLight);
  const terrain = (layoutDef.terrain ?? []).map(parseTerrain);
  const corridorCells = (layoutDef.corridorCells ?? []).map(parsePosition);
  const pillars = (layoutDef.pillars ?? []).map(parsePosition);
  const pits = (layoutDef.pits ?? []).map(parsePosition);
  const decorators =
    layoutDef.decorators && layoutDef.decorators.length > 0
      ? layoutDef.decorators.map(parseDecorator)
      : generateDefaultDecorators(layoutDef.grid, [
          ...reservedPositions,
          ...monsters.map(({ position }) => position),
          ...secrets.map(({ position }) => position),
          ...notes.map(({ position }) => position),
          ...items.map(({ position }) => position),
          ...interactables.map(({ position }) => position),
          ...lights.map(({ position }) => position),
          ...terrain.map(({ position }) => position),
          ...corridorCells,
          ...pillars,
          ...pits,
        ]);

  return {
    grid: layoutDef.grid,
    doors: (layoutDef.doors ?? []).map(parseDoor),
    monsters,
    decorators,
    secrets,
    notes,
    items,
    interactables,
    lights,
    terrain,
    roomFog: parseRoomFog(layoutDef.roomFog ?? {}),
    corridors: layoutDef.corridors ?? [],
    corridorCells,
    pillars,
    pits,
    walls: (layoutDef.walls ?? []).map(parseWall),
    ...(layoutDef.wallColour ? { wallColour: layoutDef.wallColour } : {}),
    corners: autoDetectCorners(layoutDef.grid),
  };
};

export const defineDungeon = (
  dungeonDef: DeclarativeDungeon,
  options: DefineDungeonOptions = { validate: true },
): Dungeon => {
  const layout = defineLayout(
    dungeonDef.layout,
    dungeonDef.startingPositions.map(parsePosition),
  );
  const dungeon: Dungeon = {
    name: dungeonDef.name,
    intro: dungeonDef.intro,
    nameTranslationKey: dungeonDef.nameTranslationKey ?? dungeonDef.name,
    beaten: dungeonDef.beaten ?? false,
    winConditions: dungeonDef.winConditions,
    nextDungeon: dungeonDef.nextDungeon,
    startingPositions: dungeonDef.startingPositions.map(parsePosition),
    discoveredRooms: dungeonDef.discoveredRooms ?? ['A'],
    layout,
    killCount: dungeonDef.killCount ?? 0,
    ...(dungeonDef.events ? { events: dungeonDef.events } : {}),
    ...(dungeonDef.collapsedCorridor
      ? {
          collapsedCorridors: [
            {
              letter: dungeonDef.collapsedCorridor,
              cells: findRoomCells(layout.grid, dungeonDef.collapsedCorridor),
            },
          ],
        }
      : {}),
    ...(dungeonDef.onRoomDiscovered
      ? { onRoomDiscovered: dungeonDef.onRoomDiscovered }
      : {}),
    music: dungeonDef.music,
    tileset: dungeonDef.tileset,
    ambientLight: dungeonDef.ambientLight ?? 1,
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
    interactable?: {
      effect: string;
      name?: string;
      nameTranslationKey?: string;
      description?: string;
      descriptionTranslationKey?: string;
      id?: string;
      args?: Record<string, unknown>;
      oneTime?: boolean;
      icon?: string;
      triggerOn?: 'interact' | 'step' | 'both';
      secret?: boolean;
    };
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
  interactables: InteractableCell[];
  pits: Position[];
  pillars: Position[];
  startingPositions: Position[];
} => {
  const doors: Door[] = [];
  const monsters: Monster[] = [];
  const secrets: Secret[] = [];
  const notes: Note[] = [];
  const items: ItemLocation[] = [];
  const interactables: InteractableCell[] = [];
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
        if (mapping.interactable) {
          interactables.push(
            parseInteractable({
              x,
              y,
              effect: mapping.interactable.effect,
              name: mapping.interactable.name,
              nameTranslationKey: mapping.interactable.nameTranslationKey,
              description: mapping.interactable.description,
              descriptionTranslationKey:
                mapping.interactable.descriptionTranslationKey,
              id: mapping.interactable.id,
              args: mapping.interactable.args,
              oneTime: mapping.interactable.oneTime,
              icon: mapping.interactable.icon,
              triggerOn: mapping.interactable.triggerOn,
              secret: mapping.interactable.secret,
            }),
          );
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
    interactables,
    pits,
    pillars,
    startingPositions,
  };
};
