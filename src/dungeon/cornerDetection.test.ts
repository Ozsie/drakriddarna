import { describe, expect, it } from 'vitest';
import { autoDetectCorners, detectCornerType } from './cornerDetection';
import { CornerType } from '../types';
import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
import { e1m0 } from '../campaigns/dungeons/e1m0';

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
    expect(detectCornerType(grid, 0, 4)).toBe(CornerType.INNER_BOTTOM_LEFT);
    expect(detectCornerType(grid, 6, 4)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 8, 4)).toBe(CornerType.LEFT_END);
    expect(detectCornerType(grid, 10, 4)).toBe(CornerType.INNER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 2, 5)).toBe(CornerType.INNER_TOP_LEFT);
    expect(detectCornerType(grid, 6, 5)).toBe(CornerType.OUTER_BOTTOM_RIGHT);
    expect(detectCornerType(grid, 8, 6)).toBe(CornerType.LEFT_END);
    expect(detectCornerType(grid, 9, 6)).toBe(CornerType.OUTER_TOP_RIGHT);
    expect(detectCornerType(grid, 0, 7)).toBe(CornerType.INNER_TOP_LEFT);
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
});
