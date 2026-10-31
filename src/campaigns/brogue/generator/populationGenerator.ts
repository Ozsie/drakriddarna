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
  glow,
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

const ORTHOGONAL_OFFSETS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

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

  const doorCellKeys = new Set(doorCells.map(cellKey));
  const blockers = new Set<string>();
  const gridAt = (cell: Cell): string | undefined =>
    cell.y >= 0 &&
    cell.y < grid.length &&
    cell.x >= 0 &&
    cell.x < (grid[cell.y]?.length ?? 0)
      ? grid[cell.y][cell.x]
      : undefined;
  const isWallAdjacent = (cell: Cell): boolean =>
    ORTHOGONAL_OFFSETS.some(
      ({ dx, dy }) => gridAt({ x: cell.x + dx, y: cell.y + dy }) === '#',
    );

  const doorPlacement = (
    door: DeclarativeDoor,
  ):
    | {
        side: Side;
        x: number;
        y: number;
        hidden: boolean;
        locked: boolean;
      }
    | undefined => {
    if (Array.isArray(door)) {
      const [side, x, y, options] = door;
      return {
        side,
        x,
        y,
        hidden: Boolean(options?.hidden),
        locked: Boolean(options?.locked),
      };
    }
    if ('x' in door && 'y' in door) {
      return {
        side: door.side,
        x: door.x,
        y: door.y,
        hidden: Boolean(door.hidden),
        locked: Boolean(door.locked),
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

  // --- Boss room (floors 5 and 10) -----------------------------------------
  // The boss goes in the room farthest from the start room in door-graph
  // hops; that room must have at least two doors so the fight is not a
  // one-chokepoint stalemate, otherwise the attempt is rejected. The room
  // is resolved before the blockers so pillars can prefer it (the temple
  // hall around the final boss).
  const bossType = BOSS_FLOORS[depth];
  let bossRoom: string | undefined;
  if (bossType) {
    const farthest = letters
      .filter((letter) => letter !== startRoom)
      .sort(
        (a, b) =>
          (distances.get(b) ?? 0) - (distances.get(a) ?? 0) || (a < b ? -1 : 1),
      );
    bossRoom = farthest.find((letter) => (doorCounts.get(letter) ?? 0) >= 2);
    if (!bossRoom) {
      throw new PopulationError(
        'No far room with two doors available for the boss',
      );
    }
  }

  // --- Blockers: pillars and pits -------------------------------------------
  // Placed before monsters, items and secrets so every later placement
  // sees them as occupied. A blocker only goes on a room cell that keeps
  // every free floor cell of the whole dungeon reachable from a single
  // hero start cell (a global flood fill per candidate), so nothing
  // placed later can be cut off and no hero can be walled into a pocket,
  // and never beside a doorway so the mouth of a door stays open.
  // Wall-adjacent
  // cells are preferred: pillars read as columns or sarcophagi along the
  // room edge, pits as floor that has given way at the room's rim.
  const pillars: [number, number][] = [];
  const pits: [number, number][] = [];
  if (config.pillarMin !== undefined || config.pitMin !== undefined) {
    const doorAdjacentKeys = new Set<string>();
    for (const cell of doorCells) {
      for (const { dx, dy } of ORTHOGONAL_OFFSETS) {
        doorAdjacentKeys.add(cellKey({ x: cell.x + dx, y: cell.y + dy }));
      }
    }

    // A blocker is only accepted when, with it blocked, every free floor
    // cell of the whole dungeon stays reachable from a single hero start
    // without passing a locked door — a global flood fill per candidate.
    // A per-room check is not enough: a pit in a one-cell-wide passage
    // between two doors leaves both sides connected to a door of their
    // own while severing the only route through the dungeon. Seeding from
    // a single start is what protects the heroes themselves: seeding from
    // all starts together would let a pillar wall one hero into a pocket
    // the other starts simply reach around.
    const floorKeys = new Set<string>();
    for (const cells of rooms.values()) {
      for (const cell of cells) {
        floorKeys.add(cellKey(cell));
      }
    }
    const lockedEdges = new Set<string>();
    for (const door of layout.doors ?? []) {
      const placement = doorPlacement(door);
      if (!placement?.locked) continue;
      const offset = targetOffset[placement.side];
      const a = cellKey({ x: placement.x, y: placement.y });
      const b = cellKey({
        x: placement.x + offset.x,
        y: placement.y + offset.y,
      });
      lockedEdges.add(`${a}|${b}`);
      lockedEdges.add(`${b}|${a}`);
    }

    const keepsDungeonConnected = (candidate: Cell): boolean => {
      const blocked = new Set([...blockers, cellKey(candidate)]);
      const seed = startingPositions.find(
        (cell) => !blocked.has(cellKey(cell)),
      );
      if (!seed) return false;
      const seen = new Set([cellKey(seed)]);
      const queue = [seed];
      while (queue.length > 0) {
        const current = queue.pop() as Cell;
        for (const { dx, dy } of ORTHOGONAL_OFFSETS) {
          const next = { x: current.x + dx, y: current.y + dy };
          const key = cellKey(next);
          if (
            !floorKeys.has(key) ||
            seen.has(key) ||
            blocked.has(key) ||
            lockedEdges.has(`${cellKey(current)}|${key}`)
          ) {
            continue;
          }
          seen.add(key);
          queue.push(next);
        }
      }
      for (const key of floorKeys) {
        if (!blocked.has(key) && !seen.has(key)) return false;
      }
      return true;
    };

    type BlockerCandidate = {
      letter: string;
      cell: Cell;
      wallAdjacent: boolean;
      preferred: boolean;
    };

    const placeBlockers = (
      count: number,
      target: [number, number][],
      preferBossRoom: boolean,
    ): void => {
      for (let i = 0; i < count; i++) {
        const candidates: BlockerCandidate[] = [];
        for (const letter of letters) {
          for (const cell of rooms.get(letter) ?? []) {
            const key = cellKey(cell);
            if (
              occupied.has(key) ||
              blockers.has(key) ||
              doorAdjacentKeys.has(key)
            ) {
              continue;
            }
            candidates.push({
              letter,
              cell,
              wallAdjacent: isWallAdjacent(cell),
              preferred: preferBossRoom && letter === bossRoom,
            });
          }
        }
        const valid = candidates.filter((candidate) =>
          keepsDungeonConnected(candidate.cell),
        );
        // Preference tiers: boss room first (floor 10's temple hall), then
        // wall-adjacent cells, then anywhere that stays connected.
        const tier =
          [
            valid.filter((c) => c.preferred && c.wallAdjacent),
            valid.filter((c) => c.preferred),
            valid.filter((c) => c.wallAdjacent),
            valid,
          ].find((pool) => pool.length > 0) ?? [];
        if (tier.length === 0) return;
        const chosen = rig.pick(tier);
        blockers.add(cellKey(chosen.cell));
        occupied.add(cellKey(chosen.cell));
        target.push([chosen.cell.x, chosen.cell.y]);
      }
    };

    const pillarCount =
      config.pillarMin !== undefined
        ? rig.intInRange(config.pillarMin, config.pillarMax ?? config.pillarMin)
        : 0;
    placeBlockers(pillarCount, pillars, true);
    const pitCount =
      config.pitMin !== undefined
        ? rig.intInRange(config.pitMin, config.pitMax ?? config.pitMin)
        : 0;
    placeBlockers(pitCount, pits, false);
  }

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
  // The room was resolved above, before the blockers; the boss itself is
  // placed after them so it can never stand on a pillar or pit cell.
  if (bossType && bossRoom) {
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
  // room's centre so the whole room reads as lit; the type is drawn from
  // the floor's light rig (mine torches high up, chandeliers in the
  // crystal chamber and the temple, a warm golden glow in the abyss).
  // Floors with a glow count scatter extra dim lights along the room
  // edges (the mushroom grotto's bioluminescence). Every hidden door gets
  // a flickering ember on the floor cell beside it — the hint convention
  // of the hand-authored dungeons — so the darkness itself points at where
  // to search.
  const lights: DeclarativeLayout['lights'] = [];
  if (config.ambientLight < 1) {
    for (const letter of letters) {
      const cells = rooms.get(letter) ?? [];
      const nonDoorCells = cells.filter(
        (cell) =>
          !doorCellKeys.has(cellKey(cell)) && !blockers.has(cellKey(cell)),
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
      const type = rig.pick(config.lightRig ?? [torch, brazier, chandelier]);
      lights.push([
        cell.x,
        cell.y,
        type === chandelier ? CellAlignment.CEILING : CellAlignment.CENTER,
        type,
      ]);
    }

    if (config.glowMin !== undefined) {
      const glowCount = rig.intInRange(
        config.glowMin,
        config.glowMax ?? config.glowMin,
      );
      const lightKeys = new Set(
        lights.map((light) => {
          const [x, y] = light as [number, number];
          return `${x},${y}`;
        }),
      );
      for (let i = 0; i < glowCount; i++) {
        const candidates = letters.flatMap((letter) =>
          (rooms.get(letter) ?? []).filter((cell) => {
            const key = cellKey(cell);
            return (
              !doorCellKeys.has(key) &&
              !blockers.has(key) &&
              !lightKeys.has(key) &&
              isWallAdjacent(cell)
            );
          }),
        );
        if (candidates.length === 0) break;
        const cell = rig.pick(candidates);
        lightKeys.add(cellKey(cell));
        lights.push([cell.x, cell.y, CellAlignment.CENTER, glow]);
      }
    }
  }

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
      ...(pillars.length > 0 ? { pillars } : {}),
      ...(pits.length > 0 ? { pits } : {}),
    },
    events,
    placedMagicItemId: magicItem.id ?? '',
  };
};
