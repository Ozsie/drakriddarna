import type { Item } from '../../../types';
import { CellAlignment, Colour, SecretType, Side } from '../../../types';
import type {
  DeclarativeDoor,
  DeclarativeItem,
  DeclarativeLayout,
  DeclarativeMonster,
  DeclarativeSecret,
} from '../../../dungeon/dungeonParser';
import {
  brazier,
  chandelier,
  ember,
  torch,
} from '../../../dungeon/LightSources';
import { createRig, type Rig } from './rng';
import {
  BOSS_FLOORS,
  BOSS_XP,
  CONSUMABLE_MAGIC_ITEMS,
  MONSTER_POOL,
  WORLD_EVENT_COUNT,
  equipmentLootWeight,
  getDepthConfig,
  inventoryChance,
  magicItemLootWeight,
  monsterWeight,
} from './config';
import {
  getRoomEdges,
  roomDistancesFrom,
  type GeneratedLayout,
} from './layoutGenerator';

/**
 * Population generator (docs/random-campaign-spec/03-difficulty-curve.md):
 * budget-based monster selection and placement, depth-progressive floor
 * loot, secrets, per-room lights with hidden-door ember hints, and the
 * per-floor event deck (all shared world events).
 */

export class PopulationError extends Error {}

export type PopulationResult = {
  /** The complete declarative layout: grid, doors, monsters, items, secrets, lights. */
  layout: DeclarativeLayout;
  /** Shared world event numbers allowed in this dungeon (always non-empty). */
  events: number[];
  /** Id of the magic item placed on this floor (for campaign uniqueness). */
  placedMagicItemId: string;
};

export type PopulationDecks = {
  /** Unique equipment (weapons, armour, shields) placed as floor and monster loot. */
  equipment: Item[];
  /** The unique magic items; one is placed per floor, depth-weighted. */
  magicItems: Item[];
};

type Cell = { x: number; y: number };

const EQUIPMENT_SECRET_NAME = 'campaign.brogue.secrets.randomEquipment';
const TRAP_DOOR_SECRET_NAME = 'campaign.brogue.secrets.trapDoor';
const EQUIPMENT_SECRET_SHARE = 0.7;

const cellKey = (cell: Cell): string => `${cell.x},${cell.y}`;

const roomCellsByLetter = (grid: string[]): Map<string, Cell[]> => {
  const rooms = new Map<string, Cell[]>();
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell !== ' ' && cell !== '#') {
        const list = rooms.get(cell) ?? [];
        list.push({ x, y });
        rooms.set(cell, list);
      }
    }
  });
  return rooms;
};

const doorCountByRoom = (
  grid: string[],
  layout: DeclarativeLayout,
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const edge of getRoomEdges(grid, layout.doors)) {
    counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1);
    counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1);
  }
  return counts;
};

export const populate = (
  generated: GeneratedLayout,
  seed: number,
  depth: number,
  decks: PopulationDecks,
  placedMagicItems: string[] = [],
): PopulationResult => {
  const config = getDepthConfig(depth);
  const rig = createRig(seed);
  const { layout, startRoom, startingPositions, doorCells } = generated;
  const grid = layout.grid;

  const rooms = roomCellsByLetter(grid);
  const letters = [...rooms.keys()];
  const doorCounts = doorCountByRoom(grid, layout);
  const distances = roomDistancesFrom(
    letters,
    getRoomEdges(grid, layout.doors),
    startRoom,
  );

  // Cells that must stay free of entities: hero starting cells and the
  // cells doors sit on.
  const occupied = new Set<string>([
    ...startingPositions.map(cellKey),
    ...doorCells.map(cellKey),
  ]);

  const freeCellsIn = (letter: string): Cell[] =>
    (rooms.get(letter) ?? []).filter((cell) => !occupied.has(cellKey(cell)));

  const takeCell = (rig: Rig, letter: string): Cell | undefined => {
    const free = freeCellsIn(letter);
    if (free.length === 0) return undefined;
    const cell = rig.pick(free);
    occupied.add(cellKey(cell));
    return cell;
  };

  /** Depth-weighted equipment pick: higher `value` items deeper in the run. */
  const pickEquipment = (rig: Rig): Item =>
    rig.weightedPick(
      decks.equipment,
      decks.equipment.map((item) => equipmentLootWeight(item, depth)),
    );

  const monsters: DeclarativeMonster[] = [];
  const monsterCountByRoom = new Map<string, number>(
    letters.map((letter) => [letter, 0]),
  );
  // The start room never holds monsters on depth 1 and at most one after.
  const startRoomCapacity = depth === 1 ? 0 : 1;

  const roomCapacity = (letter: string): number =>
    letter === startRoom
      ? Math.min(startRoomCapacity, config.maxMonstersPerRoom)
      : config.maxMonstersPerRoom;

  const placeMonster = (
    type: string,
    letter: string,
    inventory?: Item[],
  ): boolean => {
    const cell = takeCell(rig, letter);
    if (!cell) return false;
    const colour = rig.pick(Object.values(Colour));
    monsters.push(
      inventory && inventory.length > 0
        ? [type, colour, cell.x, cell.y, inventory]
        : [type, colour, cell.x, cell.y],
    );
    monsterCountByRoom.set(letter, (monsterCountByRoom.get(letter) ?? 0) + 1);
    return true;
  };

  // --- Boss (floors 5 and 10) ---------------------------------------------
  // The boss goes in the room farthest from the start room in door-graph
  // hops; that room must have at least two doors so the fight is not a
  // one-chokepoint stalemate, otherwise the attempt is rejected.
  const bossType = BOSS_FLOORS[depth];
  if (bossType) {
    const farthest = letters
      .filter((letter) => letter !== startRoom)
      .sort(
        (a, b) =>
          (distances.get(b) ?? 0) - (distances.get(a) ?? 0) || (a < b ? -1 : 1),
      );
    const bossRoom = farthest.find(
      (letter) => (doorCounts.get(letter) ?? 0) >= 2,
    );
    if (!bossRoom) {
      throw new PopulationError(
        'No far room with two doors available for the boss',
      );
    }
    if (!placeMonster(bossType, bossRoom)) {
      throw new PopulationError('No free cell for the boss');
    }
  }

  // --- Regular monsters (budget fill) --------------------------------------
  let remaining = config.monsterBudget - (bossType ? BOSS_XP : 0);
  while (remaining > 0) {
    const available = MONSTER_POOL.filter(
      (entry) => entry.minDepth <= depth && entry.xp <= remaining,
    );
    if (available.length === 0) break;
    const entry = rig.weightedPick(
      available,
      available.map((candidate) => monsterWeight(candidate, depth)),
    );
    const candidateRooms = letters
      .filter(
        (letter) =>
          (monsterCountByRoom.get(letter) ?? 0) < roomCapacity(letter),
      )
      .filter((letter) => freeCellsIn(letter).length > 0);
    if (candidateRooms.length === 0) {
      throw new PopulationError('No room with monster capacity left');
    }
    const letter = rig.pick(candidateRooms);
    const inventory = rig.chance(inventoryChance(depth))
      ? [pickEquipment(rig)]
      : undefined;
    if (!placeMonster(entry.type, letter, inventory)) {
      throw new PopulationError('Monster placement ran out of free cells');
    }
    remaining -= entry.xp;
  }
  if (remaining > 0) {
    throw new PopulationError(
      `Monster budget could not be spent exactly (${remaining} left)`,
    );
  }

  // --- Floor items ----------------------------------------------------------
  // Every floor item is an explicit depth-weighted pick (a bare spot would
  // draw uniformly from the campaign deck at pickup time, which cannot be
  // depth-aware). One magic item per floor follows the campaign's magic
  // power curve; uniques are never repeated, and once all are placed the
  // deepest floors repeat the consumables.
  const nonStartRooms = letters.filter((letter) => letter !== startRoom);
  const items: DeclarativeItem[] = [];
  const placeItem = (item: Item): void => {
    for (let attempt = 0; attempt < nonStartRooms.length * 2; attempt++) {
      const letter = rig.pick(nonStartRooms);
      const cell = takeCell(rig, letter);
      if (cell) {
        items.push([cell.x, cell.y, item]);
        return;
      }
    }
    throw new PopulationError('No free cell for a floor item');
  };
  for (let i = 0; i < config.items; i++) {
    placeItem(pickEquipment(rig));
  }
  const unplacedMagicItems = decks.magicItems.filter(
    (item) => !placedMagicItems.includes(item.id ?? ''),
  );
  const magicPool =
    unplacedMagicItems.length > 0
      ? unplacedMagicItems
      : decks.magicItems.filter((item) =>
          CONSUMABLE_MAGIC_ITEMS.includes(item.id ?? ''),
        );
  const magicItem = rig.weightedPick(
    magicPool.length > 0 ? magicPool : decks.magicItems,
    (magicPool.length > 0 ? magicPool : decks.magicItems).map((item) =>
      magicItemLootWeight(item, depth),
    ),
  );
  placeItem(magicItem);

  // --- Secrets ---------------------------------------------------------------
  const secretCount = rig.intInRange(config.secretsMin, config.secretsMax);
  const secrets: DeclarativeSecret[] = [];
  for (let i = 0; i < secretCount; i++) {
    const isEquipment = rig.chance(EQUIPMENT_SECRET_SHARE);
    const type = isEquipment ? SecretType.EQUIPMENT : SecretType.TRAP_DOOR;
    const name = isEquipment ? EQUIPMENT_SECRET_NAME : TRAP_DOOR_SECRET_NAME;
    for (let attempt = 0; attempt < nonStartRooms.length * 2; attempt++) {
      const letter = rig.pick(nonStartRooms);
      const cell = takeCell(rig, letter);
      if (cell) {
        secrets.push([type, cell.x, cell.y, name]);
        break;
      }
    }
  }

  // --- Lights ----------------------------------------------------------------
  // Dark floors get one light per room, placed on the cell closest to the
  // room's centre so the whole room reads as lit. Every hidden door gets a
  // flickering ember on the floor cell beside it — the hint convention of
  // the hand-authored dungeons — so the darkness itself points at where to
  // search.
  const lights: DeclarativeLayout['lights'] = [];
  if (config.ambientLight < 1) {
    const doorCellKeys = new Set(doorCells.map(cellKey));
    for (const letter of letters) {
      const cells = rooms.get(letter) ?? [];
      const nonDoorCells = cells.filter(
        (cell) => !doorCellKeys.has(cellKey(cell)),
      );
      const candidates = nonDoorCells.length > 0 ? nonDoorCells : cells;
      const centreX =
        candidates.reduce((sum, cell) => sum + cell.x, 0) / candidates.length;
      const centreY =
        candidates.reduce((sum, cell) => sum + cell.y, 0) / candidates.length;
      const cell = candidates
        .slice()
        .sort(
          (a, b) =>
            Math.hypot(a.x - centreX, a.y - centreY) -
              Math.hypot(b.x - centreX, b.y - centreY) ||
            a.y - b.y ||
            a.x - b.x,
        )[0];
      if (!cell) continue;
      const type = rig.pick([torch, brazier, chandelier]);
      lights.push([
        cell.x,
        cell.y,
        type === chandelier ? CellAlignment.CEILING : CellAlignment.CENTER,
        type,
      ]);
    }
  }

  const doorPlacement = (
    door: DeclarativeDoor,
  ): { side: Side; x: number; y: number; hidden: boolean } | undefined => {
    if (Array.isArray(door)) {
      const [side, x, y, options] = door;
      return { side, x, y, hidden: Boolean(options?.hidden) };
    }
    if ('x' in door && 'y' in door) {
      return {
        side: door.side,
        x: door.x,
        y: door.y,
        hidden: Boolean(door.hidden),
      };
    }
    return undefined;
  };

  const targetOffset: Record<Side, Cell> = {
    [Side.LEFT]: { x: -1, y: 0 },
    [Side.RIGHT]: { x: 1, y: 0 },
    [Side.UP]: { x: 0, y: -1 },
    [Side.DOWN]: { x: 0, y: 1 },
  };

  const inBounds = (cell: Cell): boolean =>
    cell.y >= 0 &&
    cell.y < grid.length &&
    cell.x >= 0 &&
    cell.x < (grid[cell.y]?.length ?? 0);

  const cellAt = (cell: Cell): string | undefined =>
    inBounds(cell) ? grid[cell.y][cell.x] : undefined;

  for (const door of layout.doors ?? []) {
    const placement = doorPlacement(door);
    if (!placement || !placement.hidden) continue;
    const { side, x, y } = placement;
    const doorLetter = cellAt({ x, y });
    if (!doorLetter) continue;
    const target = targetOffset[side];
    const candidates = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ].filter(
      (cell) =>
        cellAt(cell) === doorLetter &&
        !(cell.x === x + target.x && cell.y === y + target.y),
    );
    const hint = candidates[0];
    if (!hint) continue;
    const alignment =
      hint.x < x
        ? CellAlignment.CENTER_RIGHT
        : hint.x > x
        ? CellAlignment.CENTER_LEFT
        : hint.y < y
        ? CellAlignment.CENTER_BOTTOM
        : CellAlignment.CENTER_TOP;
    lights.push([hint.x, hint.y, alignment, ember]);
  }

  // --- Events -----------------------------------------------------------------
  // The deck always contains every shared world event: the runtime
  // shuffles it and reshuffles when exhausted, so a full deck gives the
  // maximum variety instead of repeating a small subset every few rounds.
  const events = Array.from({ length: WORLD_EVENT_COUNT }, (_, i) => i + 1);

  return {
    layout: {
      ...layout,
      monsters,
      items,
      secrets,
      ...(lights.length > 0 ? { lights } : {}),
    },
    events,
    placedMagicItemId: magicItem.id ?? '',
  };
};
