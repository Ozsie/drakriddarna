import { describe, expect, it } from 'vitest';
import { autoDetectCorners, detectCornerType } from './cornerDetection';
import { CornerType } from '../types';
import { testingGrounds } from './testingGrounds';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';

describe('Corner Detection Algorithm', () => {
  it('detects inner corners of a simple rectangular room', () => {
    const grid = ['#####', '#AAA#', '#AAA#', '#####'];

    expect(detectCornerType(grid, 0, 0)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 4, 0)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 3)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 4, 3)).toBe(CornerType.INNER_BOTTOM_RIGHT);

    // Straight walls should not be classified as corners
    expect(detectCornerType(grid, 1, 0)).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 2, 0)).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 3, 0)).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 0, 1)).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 4, 1)).toBe(CornerType.NOT_CORNER);

    // Floor cells should not be classified as corners
    expect(detectCornerType(grid, 1, 1)).toBe(CornerType.NOT_CORNER);
  });

  it('detects outer corners and L-shapes', () => {
    // Room with corridor opening / convex corner
    const grid = [
      '#######',
      '#AAAA##',
      '#AAAA##',
      '#AAAA##',
      '###E###',
      '  #E#  ',
    ];

    expect(detectCornerType(grid, 2, 4)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 4, 4)).toBe(CornerType.OUTER_TOP_LEFT);
  });

  it('detects wall ends and T-intersections', () => {
    const grid = [
      ' ########## ',
      ' #AAAAAAAA# ',
      ' #FFF##AAA# ',
      ' #AAAAAAAA# ',
      ' ########## ',
    ];

    // Left end of wall at (5,2)
    expect(detectCornerType(grid, 5, 2)).toBe(CornerType.LEFT_END);
    // Right end of wall at (6,2)
    expect(detectCornerType(grid, 6, 2)).toBe(CornerType.RIGHT_END);
  });

  it('correctly detects corners on testingGrounds grid', () => {
    const grid = testingGrounds.layout.grid;
    const detected = autoDetectCorners(grid);

    // Verify key corners on testingGrounds
    expect(detectCornerType(grid, 0, 0)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 10, 0)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 4)).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 6, 4)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 8, 4)).toBe(CornerType.LEFT_END);
    expect(detectCornerType(grid, 10, 4)).toBe(CornerType.INNER_BOTTOM_RIGHT);
    // The cell (2,5) sits inside a thick wall mass beside corridor J; it
    // renders as the corner cap of room F's floor at (3,6), not as a junction
    // whose stem is embedded in the mass
    expect(detectCornerType(grid, 2, 5)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 6, 5)).toBe(CornerType.OUTER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 8, 6)).toBe(CornerType.LEFT_END);
    expect(detectCornerType(grid, 9, 6)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 7)).toBe(
      CornerType.THREE_WAY_INTERSECTION_RIGHT,
    );
    expect(detectCornerType(grid, 2, 7)).toBe(CornerType.OUTER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 4, 7)).toBe(CornerType.LEFT_END);
    expect(detectCornerType(grid, 6, 7)).toBe(CornerType.RIGHT_END);
    expect(detectCornerType(grid, 0, 11)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 1, 11)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 3, 11)).toBe(CornerType.OUTER_TOP_LEFT);
    expect(detectCornerType(grid, 9, 11)).toBe(
      CornerType.THREE_WAY_INTERSECTION_UP,
    );
    expect(detectCornerType(grid, 10, 11)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 3, 12)).toBe(CornerType.BOTTOM_END);
    expect(detectCornerType(grid, 8, 13)).toBe(CornerType.TOP_END);
    expect(detectCornerType(grid, 1, 14)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 8, 14)).toBe(
      CornerType.THREE_WAY_INTERSECTION_UP,
    );
    expect(detectCornerType(grid, 10, 14)).toBe(CornerType.INNER_BOTTOM_RIGHT);

    expect(detected.length).toBeGreaterThanOrEqual(20);
  });

  it('correctly detects corners on e1m0 grid', () => {
    const grid = e1m0.layout.grid;

    expect(detectCornerType(grid, 5, 0)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 10, 0)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 5, 4)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 6, 4)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 8, 4)).toBe(CornerType.OUTER_TOP_LEFT);
    expect(detectCornerType(grid, 10, 4)).toBe(CornerType.INNER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 8, 6)).toBe(CornerType.OUTER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 9, 6)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 7)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 4, 7)).toBe(CornerType.INNER_TOP_RIGHT);
    expect(detectCornerType(grid, 4, 8)).toBe(CornerType.OUTER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 6, 8)).toBe(CornerType.OUTER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 4, 10)).toBe(CornerType.OUTER_TOP_LEFT);
    expect(detectCornerType(grid, 6, 10)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 11)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 4, 11)).toBe(CornerType.INNER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 6, 11)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 9, 11)).toBe(CornerType.INNER_BOTTOM_RIGHT);
  });

  it('classifies corners against the visible layout when discovered rooms are given', () => {
    // Room A discovered; room B still hidden to the south-east
    const grid = [
      '#####',
      '#A###',
      '#A###',
      '# ###',
      '###B#',
      '###B#',
      '#####',
    ];

    // Full layout: concave corner where B's floor touches the wall from (2,3)
    expect(detectCornerType(grid, 2, 3)).toBe(CornerType.INNER_TOP_LEFT);

    // Only A discovered: B's floor is fog; the player instead sees the
    // concave bottom-right corner of room A on the very same wall cell
    expect(detectCornerType(grid, 2, 3, ['A'])).toBe(
      CornerType.INNER_BOTTOM_RIGHT,
    );

    // B discovered too: the wall is the corner between both rooms
    expect(detectCornerType(grid, 2, 3, ['A', 'B'])).toBe(
      CornerType.INNER_TOP_LEFT,
    );
  });

  it('does not draw outer corners from floor the player cannot see', () => {
    // Room A discovered; room B starts east of the wall below it
    const grid = ['#####', '#AAA#', '####B', '####B', '#####'];

    // Full layout: convex corner where the floors of A and B meet
    expect(detectCornerType(grid, 3, 2)).toBe(CornerType.OUTER_TOP_RIGHT);

    // Only A discovered: B is fog, so the wall is an ordinary wall piece
    expect(detectCornerType(grid, 3, 2, ['A'])).toBe(CornerType.NOT_CORNER);

    // B discovered: the corner appears
    expect(detectCornerType(grid, 3, 2, ['A', 'B'])).toBe(
      CornerType.OUTER_TOP_RIGHT,
    );
  });

  it('treats collapsed rubble as visible floor regardless of discovery', () => {
    const grid = ['#####', '#???#', '#???#', '#####'];

    // COLLAPSED cells are never part of discoveredRooms but always render as
    // rubble once visible, so they count as floor for corner classification
    expect(detectCornerType(grid, 0, 0, [])).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 4, 3, [])).toBe(
      CornerType.INNER_BOTTOM_RIGHT,
    );
  });

  it('does not draw door-jamb corners while the corridor beyond is undiscovered', () => {
    // Room A with a side door into corridor D (the e1m0 room A doorway shape)
    const grid = ['######', '#AAA##', '#AAA##', '#AAAD#', '#AAA##', '######'];

    // Corridor discovered: the doorway flanks are the jamb corners of the
    // opening between room A and corridor D
    expect(detectCornerType(grid, 4, 2, ['A', 'D'])).toBe(
      CornerType.OUTER_BOTTOM_LEFT,
    );
    expect(detectCornerType(grid, 4, 4, ['A', 'D'])).toBe(
      CornerType.OUTER_TOP_LEFT,
    );

    // Corridor undiscovered: the wall reads as a plain wall with a door,
    // no corner shapes over the fog
    expect(detectCornerType(grid, 4, 2, ['A'])).toBe(CornerType.NOT_CORNER);
    expect(detectCornerType(grid, 4, 4, ['A'])).toBe(CornerType.NOT_CORNER);
  });

  it('passes discovered rooms through to autoDetectCorners', () => {
    const grid = ['#####', '#AAA#', '####B', '####B', '#####'];

    const visible = autoDetectCorners(grid, ['A']);
    expect(
      visible.find(
        (corner) => corner.position.x === 3 && corner.position.y === 2,
      ),
    ).toBeUndefined();

    const discovered = autoDetectCorners(grid, ['A', 'B']);
    expect(discovered).toContainEqual({
      position: { x: 3, y: 2 },
      type: CornerType.OUTER_TOP_RIGHT,
    });
  });
});
