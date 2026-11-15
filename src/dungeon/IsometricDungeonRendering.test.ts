import { describe, expect, it } from 'vitest';
import { createIsoView, type SceneDungeonView } from '@hoard-engine/scene';
import type { GameActorView, GameHeroOverlayView } from '../scene/adapters';
import {
  buildHeroPainters,
  buildIsometricWorldView,
  feetPosition,
  renderIsometricActorOverlays,
} from './IsometricDungeonRendering';

describe('feetPosition', () => {
  it('anchors an actor at the center of its logical cell', () => {
    expect(feetPosition({ position: { x: 2, y: 3 } }, 48)).toEqual({
      x: 120,
      y: 168,
    });
  });
});

describe('isometric actor indicators', () => {
  it('draws the hero floor marker before the sprite', () => {
    const calls: string[] = [];
    const actor: GameActorView = {
      position: { x: 0, y: 0 },
      sprite: { image: {} as CanvasImageSource, sx: 0, sy: 0, sw: 32, sh: 32 },
      tile: null,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
      floorMarkerColor: '#f00',
    };
    const painter = buildHeroPainters([actor], 48, 1)[0];
    const ctx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      ellipse: () => {},
      fill: () => calls.push('marker'),
      drawImage: () => calls.push('sprite'),
      imageSmoothingEnabled: false,
    } as unknown as CanvasRenderingContext2D;

    painter?.draw(ctx, { x: 24, y: 24 });

    expect(calls).toEqual(['marker', 'sprite']);
  });

  it('draws scaled hero and monster health bars above their sprites', () => {
    const fillRects: number[][] = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      fillRect: (...args: number[]) => fillRects.push(args),
      strokeRect: () => {},
      fillStyle: 'black',
      strokeStyle: 'black',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const view = createIsoView({ x: 0, y: 0 }, 200, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const overlay: GameHeroOverlayView = {
      walkableCells: [],
      marker: null,
      bars: [
        {
          position: { x: 1, y: 1 },
          colour: '#f00',
          health: { current: 2, max: 4 },
          actionPips: 0,
          movePips: 0,
          spriteDraw: { scale: 2 },
        },
      ],
    };

    renderIsometricActorOverlays(
      ctx,
      view,
      overlay,
      [
        {
          position: { x: 0, y: 0 },
          sprite: null,
          tile: null,
          flashIntensity: 0,
          active: false,
          colourBar: '',
          healthBar: { current: 1, max: 2 },
          debugLabel: null,
          debugLines: [],
          spriteDraw: { scale: 2 },
        } as GameActorView,
      ],
      48,
    );

    expect(fillRects).toContainEqual([82, 70, 36, 4]);
    expect(fillRects).toContainEqual([82, 22, 36, 4]);
  });
});

describe('buildIsometricWorldView', () => {
  it('uses the sealed grid and marks visible closed doors', () => {
    const dungeon: SceneDungeonView = {
      name: 'hidden-door-test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['###', '#A#', '###'],
        sealedGrid: ['###', '#+#', '###'],
        doors: [{ x: 1, y: 1, side: 'Up', open: false, hidden: false }],
        secrets: [],
      },
    };

    const world = buildIsometricWorldView(dungeon, 48);

    expect(world.rows).toEqual(['WWW', 'WDW', 'WWW']);
    expect(world.cellSize).toBe(48);
    expect(world.wallHeightPx).toBe(36);
  });

  it('hides undiscovered room cells, terrain, fog and pits', () => {
    const dungeon: SceneDungeonView = {
      name: 'partially-discovered-test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['AAA', 'ABB'],
        sealedGrid: ['AAA', 'ABB'],
        terrain: [
          { position: { x: 2, y: 1 }, type: 'water', color: '#224466' },
        ],
        roomFog: { B: { color: '#ffffff', opacity: 0.2 } },
        pits: [{ x: 2, y: 1 }],
        doors: [],
        secrets: [],
      },
    };

    const world = buildIsometricWorldView(dungeon, 48);

    expect(world.rows).toEqual(['FFF', 'FHH']);
    expect(world.hiddenCell).toBe('H');
    expect(world.floorColors?.[1]).toEqual([undefined, undefined, undefined]);
    expect(world.floorOverlays?.[1]).toEqual([undefined, undefined, undefined]);
    expect(world.pitCells).toEqual([]);
    const debugWorld = buildIsometricWorldView(dungeon, 48, true);
    expect(debugWorld.rows).toEqual(['FFF', 'FHH']);
    expect(debugWorld.floorColors?.[1]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(debugWorld.floorOverlays?.[1]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(debugWorld.pitCells).toEqual([]);
  });

  it('keeps hidden or open doors as their underlying floor cell', () => {
    const dungeon: SceneDungeonView = {
      name: 'hidden-or-open-door-test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['AAA'],
        doors: [
          { x: 0, y: 0, side: 'Up', open: false, hidden: true },
          { x: 1, y: 0, side: 'Up', open: true, hidden: false },
        ],
        secrets: [],
      },
    };

    expect(buildIsometricWorldView(dungeon, 48).rows).toEqual(['FFF']);
  });

  it('adapts terrain colours, room fog and pits from the dungeon view', () => {
    const dungeon: SceneDungeonView = {
      name: 'styled-dungeon-test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['AAA'],
        terrain: [
          { position: { x: 1, y: 0 }, type: 'water', color: '#224466' },
        ],
        roomFog: { A: { color: '#ffffff', opacity: 0.2 } },
        pits: [{ x: 2, y: 0 }],
        doors: [],
        secrets: [],
      },
    };

    const world = buildIsometricWorldView(dungeon, 48);

    expect(world.floorColors?.[0]).toEqual([undefined, '#224466', undefined]);
    expect(world.floorOverlays?.[0]).toEqual([
      { color: '#ffffff', opacity: 0.2 },
      { color: '#ffffff', opacity: 0.2 },
      { color: '#ffffff', opacity: 0.2 },
    ]);
    expect(world.pitCells).toEqual([{ x: 2, y: 0 }]);
  });
});
