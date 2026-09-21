import type {
  Corner,
  Door,
  Dungeon,
  ItemLocation,
  Layout,
  Monster,
  Note,
  Position,
  Secret,
  WinCondition,
} from '../types';
import { ConditionType, Side } from '../types';
import { EMPTY, findCell, WALL } from '../core';

export interface ValidationError {
  type:
    | 'grid'
    | 'boundary'
    | 'overlap'
    | 'door'
    | 'room'
    | 'duplicate_id'
    | 'condition';
  message: string;
  position?: Position;
  entity?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export const validateLayout = (
  layout: Layout,
  context?: {
    dungeonName?: string;
    startingPositions?: Position[];
    winConditions?: WinCondition[];
    discoveredRooms?: string[];
  },
): ValidationResult => {
  const errors: ValidationError[] = [];

  // 1. Grid structure checks
  if (!layout.grid || layout.grid.length === 0) {
    errors.push({
      type: 'grid',
      message: 'Grid cannot be empty.',
    });
    return { valid: false, errors };
  }

  const height = layout.grid.length;
  const width = layout.grid[0].length;

  if (width === 0) {
    errors.push({
      type: 'grid',
      message: 'Grid width cannot be 0.',
    });
    return { valid: false, errors };
  }

  for (let y = 0; y < height; y++) {
    const row = layout.grid[y];
    if (row.length !== width) {
      errors.push({
        type: 'grid',
        message: `Row ${y} length (${row.length}) does not match grid width (${width}).`,
        position: { x: 0, y },
      });
    }
  }

  const isOutOfBounds = (pos: Position): boolean =>
    pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height;

  const checkPositionInBounds = (
    pos: Position,
    entityName: string,
    checkVoidOrWall = true,
  ) => {
    if (isOutOfBounds(pos)) {
      errors.push({
        type: 'boundary',
        message: `${entityName} at (${pos.x}, ${pos.y}) is outside grid bounds (${width}x${height}).`,
        position: pos,
        entity: entityName,
      });
      return false;
    }

    if (checkVoidOrWall) {
      const cell = findCell(layout.grid, pos.x, pos.y);
      if (cell === WALL) {
        errors.push({
          type: 'overlap',
          message: `${entityName} at (${pos.x}, ${pos.y}) overlaps with a wall ('#').`,
          position: pos,
          entity: entityName,
        });
      } else if (cell === EMPTY) {
        errors.push({
          type: 'overlap',
          message: `${entityName} at (${pos.x}, ${pos.y}) is placed on an empty cell (' ').`,
          position: pos,
          entity: entityName,
        });
      }
    }
    return true;
  };

  // 2. Starting positions
  if (context?.startingPositions) {
    context.startingPositions.forEach((pos, idx) => {
      checkPositionInBounds(pos, `Starting position #${idx + 1}`);
    });
  }

  // 3. Monsters
  const seenMonsterIds = new Set<string>();
  (layout.monsters || []).forEach((monster: Monster) => {
    checkPositionInBounds(
      monster.position,
      `Monster '${monster.name || monster.type}'`,
    );
    if (monster.id) {
      if (seenMonsterIds.has(monster.id)) {
        errors.push({
          type: 'duplicate_id',
          message: `Duplicate monster id '${monster.id}'.`,
          position: monster.position,
          entity: monster.name,
        });
      }
      seenMonsterIds.add(monster.id);
    }
  });

  // 4. Doors
  const seenDoorIds = new Set<string>();
  (layout.doors || []).forEach((door: Door) => {
    const doorPos: Position = { x: door.x, y: door.y };
    if (isOutOfBounds(doorPos)) {
      errors.push({
        type: 'boundary',
        message: `Door at (${door.x}, ${door.y}) is outside grid bounds (${width}x${height}).`,
        position: doorPos,
        entity: 'Door',
      });
    } else {
      const cell = findCell(layout.grid, door.x, door.y);
      if (cell === EMPTY) {
        errors.push({
          type: 'overlap',
          message: `Door at (${door.x}, ${door.y}) is placed on an empty cell (' ').`,
          position: doorPos,
          entity: 'Door',
        });
      }
    }

    const validSides = [Side.UP, Side.DOWN, Side.LEFT, Side.RIGHT];
    if (!validSides.includes(door.side)) {
      errors.push({
        type: 'door',
        message: `Door at (${door.x}, ${door.y}) has invalid side '${door.side}'.`,
        position: doorPos,
        entity: 'Door',
      });
    }

    if (door.id) {
      if (seenDoorIds.has(door.id)) {
        errors.push({
          type: 'duplicate_id',
          message: `Duplicate door id '${door.id}'.`,
          position: doorPos,
          entity: 'Door',
        });
      }
      seenDoorIds.add(door.id);
    }
  });

  // 5. Secrets
  const seenSecretIds = new Set<string>();
  (layout.secrets || []).forEach((secret: Secret) => {
    checkPositionInBounds(
      secret.position,
      `Secret '${secret.name || secret.type}'`,
    );
    if (secret.id) {
      if (seenSecretIds.has(secret.id)) {
        errors.push({
          type: 'duplicate_id',
          message: `Duplicate secret id '${secret.id}'.`,
          position: secret.position,
          entity: secret.name,
        });
      }
      seenSecretIds.add(secret.id);
    }
  });

  // 6. Notes
  (layout.notes || []).forEach((note: Note) => {
    checkPositionInBounds(note.position, `Note '${note.message.slice(0, 20)}'`);
  });

  // 7. Items
  (layout.items || []).forEach((itemLoc: ItemLocation) => {
    checkPositionInBounds(
      itemLoc.position,
      `Item '${itemLoc.item?.name || 'unknown'}'`,
    );
  });

  // 8. Pits & Pillars
  (layout.pits || []).forEach((pit: Position) => {
    checkPositionInBounds(pit, 'Pit');
  });

  (layout.pillars || []).forEach((pillar: Position) => {
    checkPositionInBounds(pillar, 'Pillar');
  });

  // 9. Corners
  (layout.corners || []).forEach((corner: Corner) => {
    if (isOutOfBounds(corner.position)) {
      errors.push({
        type: 'boundary',
        message: `Corner '${corner.type}' at (${corner.position.x}, ${corner.position.y}) is outside grid bounds (${width}x${height}).`,
        position: corner.position,
        entity: 'Corner',
      });
    }
  });

  // 10. Corridors & Discovered Rooms
  const gridCells = new Set<string>();
  layout.grid.forEach((row) => {
    for (let i = 0; i < row.length; i++) {
      gridCells.add(row[i]);
    }
  });

  (layout.corridors || []).forEach((corridor) => {
    if (!gridCells.has(corridor)) {
      errors.push({
        type: 'room',
        message: `Corridor '${corridor}' does not exist in the grid.`,
      });
    }
  });

  if (context?.discoveredRooms) {
    context.discoveredRooms.forEach((room) => {
      if (!gridCells.has(room)) {
        errors.push({
          type: 'room',
          message: `Discovered room '${room}' does not exist in the grid.`,
        });
      }
    });
  }

  // 11. Win conditions targetCell
  if (context?.winConditions) {
    context.winConditions.forEach((cond) => {
      if (cond.targetCell) {
        if (cond.type === ConditionType.REACH_CELL) {
          checkPositionInBounds(
            cond.targetCell,
            'Win condition REACH_CELL targetCell',
          );
        } else if (isOutOfBounds(cond.targetCell)) {
          errors.push({
            type: 'boundary',
            message: `Win condition targetCell at (${cond.targetCell.x}, ${cond.targetCell.y}) is outside grid bounds.`,
            position: cond.targetCell,
          });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateDungeon = (dungeon: Dungeon): ValidationResult =>
  validateLayout(dungeon.layout, {
    dungeonName: dungeon.name,
    startingPositions: dungeon.startingPositions,
    winConditions: dungeon.winConditions,
    discoveredRooms: dungeon.discoveredRooms,
  });

export const assertValidDungeon = (dungeon: Dungeon): void => {
  const result = validateDungeon(dungeon);
  if (!result.valid) {
    const errorDetails = result.errors
      .map(
        (e) =>
          `  - [${e.type}] ${e.message}${
            e.position ? ` at (${e.position.x}, ${e.position.y})` : ''
          }`,
      )
      .join('\n');
    throw new Error(
      `Dungeon '${dungeon.name}' layout validation failed with ${result.errors.length} error(s):\n${errorDetails}`,
    );
  }
};
