import { describe, it, expect } from 'vitest';
import {
  findCell,
  getDist,
  isNeighbouring,
  isSamePosition,
  isWalkable,
  normaliseVector,
  toArray,
  COLLAPSED,
  EMPTY,
  WALL,
} from './grid';
import type { Layout } from '../types';

describe('grid module', () => {
  it('toArray splits string into array of chars', () => {
    expect(toArray('abc')).toEqual(['a', 'b', 'c']);
  });

  it('findCell locates correct cell in grid', () => {
    const grid = ['ABC', 'DEF', 'GHI'];
    expect(findCell(grid, 0, 0)).toBe('A');
    expect(findCell(grid, 2, 1)).toBe('F');
    expect(findCell(grid, 1, 2)).toBe('H');
    expect(findCell(grid, -1, 0)).toBe('');
    expect(findCell(grid, 0, -1)).toBe('');
    expect(findCell(grid, 3, 0)).toBe('');
    expect(findCell(grid, 0, 3)).toBe('');
  });

  it('isSamePosition correctly compares positions', () => {
    expect(isSamePosition({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(true);
    expect(isSamePosition({ x: 2, y: 3 }, { x: 3, y: 2 })).toBe(false);
  });

  it('isNeighbouring checks 8 adjacent tiles and self', () => {
    const origin = { x: 5, y: 5 };
    expect(isNeighbouring(origin, 5, 5)).toBe(true);
    expect(isNeighbouring(origin, 4, 4)).toBe(true);
    expect(isNeighbouring(origin, 6, 6)).toBe(true);
    expect(isNeighbouring(origin, 5, 4)).toBe(true);
    expect(isNeighbouring(origin, 5, 6)).toBe(true);
    expect(isNeighbouring(origin, 7, 5)).toBe(false);
  });

  it('getDist computes euclidean distance', () => {
    expect(getDist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('normaliseVector steps 1 unit along vector', () => {
    const next = normaliseVector({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(next).toEqual({ x: 1, y: 0 });
  });

  it('isWalkable validates boundaries, empty cells, walls, pits, pillars', () => {
    expect(EMPTY).toBe(' ');
    expect(COLLAPSED).toBe('?');
    expect(WALL).toBe('#');

    const layout: Layout = {
      grid: ['###', '#A#', '###'],
      corridors: [],
      doors: [],
      items: [],
      monsters: [],
      notes: [],
      pillars: [{ x: 1, y: 1 }],
      pits: [],
      secrets: [],
      corners: [],
    };

    // Out of bounds
    expect(isWalkable(layout, -1, 0)).toBe(false);
    expect(isWalkable(layout, 3, 0)).toBe(false);
    expect(isWalkable(layout, 0, 3)).toBe(false);

    // Wall
    expect(isWalkable(layout, 0, 0)).toBe(false);

    // Pillar at 1, 1
    expect(isWalkable(layout, 1, 1)).toBe(false);

    // Free cell
    layout.pillars = [];
    expect(isWalkable(layout, 1, 1)).toBe(true);
  });
});
