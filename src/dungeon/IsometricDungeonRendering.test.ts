import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  createIsoView,
  drawIsoWorldFrame,
  worldToScreen,
  type SceneIsoActorView,
  type SceneDungeonView,
  type SceneIsoWorldView,
} from '@hoard-engine/scene';
import { WALL } from '@hoard-engine/grid';
import {
  buildDungeonView,
  type GameActorView,
  type GameHeroOverlayView,
} from '../scene/adapters';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import { e1m2 } from '../campaigns/iceDragonTreasure/dungeons/e1m2';
import { e1m3 } from '../campaigns/iceDragonTreasure/dungeons/e1m3';
import { CornerType } from '../types';
import { autoDetectCorners } from './cornerDetection';
import {
  parseIsometricGraphicsManifest,
  resolveIsometricGraphics,
} from './IsometricGraphics';
import {
  buildIsometricPillarPainters,
  buildHeroPainters,
  buildIsometricFloorLightPainter,
  buildIsometricWallLightPainters,
  buildIsometricWorldView,
  feetPosition,
  getIsometricWallShape,
  getIsometricTileDimensions,
  prepareDepthBiasedIsometricPainters,
  prepareDepthSortedIsometricDoorPainters,
  prepareDepthSortedIsometricFloorPainters,
  renderIsometricLightMask,
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
  it('uses the rendered wall sprite height for wall-face light projection', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 64;
        naturalHeight = 128;
        src = '';

        addEventListener() {}
      },
    );
    try {
      const graphics = {
        cells: { wall: 'tallWall' },
        wallShapes: {},
        tiles: {
          tallWall: {
            imageUrl: 'isometric/test-tall-wall-light.png',
            scale: 1,
            anchor: { x: 0.5, y: 1 },
          },
        },
      };
      const dungeon: SceneDungeonView = {
        name: 'tall-wall-light-test',
        discoveredRooms: ['A'],
        layout: { grid: [`A${WALL}`], doors: [], secrets: [] },
      };
      const view = createIsoView({ x: 48, y: 24 }, 200, 160, 48, {
        ax: 1,
        by: 0.5,
      });

      const world = buildIsometricWorldView(dungeon, 48, false, graphics, view);

      expect(world.wallFaceHeightsPx?.[0]?.[1]).toBe(192);
      expect(world.wallFaceHeightsPx?.[0]?.[1]).toBeGreaterThan(
        world.wallHeightPx * view.projection.by,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to geometric wall height when no wall sprite is ready', () => {
    const dungeon: SceneDungeonView = {
      name: 'wall-light-fallback-test',
      discoveredRooms: ['A'],
      layout: { grid: [`A${WALL}`], doors: [], secrets: [] },
    };
    const view = createIsoView({ x: 48, y: 24 }, 200, 160, 48, {
      ax: 1,
      by: 0.5,
    });

    const world = buildIsometricWorldView(dungeon, 48, false, undefined, view);

    expect(world.wallFaceHeightsPx?.[0]?.[1]).toBeUndefined();
    expect(world.wallHeightPx * view.projection.by).toBe(18);
  });

  it('draws floor graphics in isometric depth order', () => {
    const dungeon: SceneDungeonView = {
      name: 'floor-depth-order-test',
      discoveredRooms: ['A'],
      layout: { grid: ['AAA', 'AAA'], doors: [], secrets: [] },
    };
    const world = buildIsometricWorldView(dungeon, 48);
    const view = createIsoView({ x: 0, y: 0 }, 300, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const drawnFloorCenters: number[][] = [];
    let firstPathPoint: { x: number; y: number } | undefined;
    const context = {
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {
        firstPathPoint = undefined;
      },
      moveTo: (x: number, y: number) => {
        firstPathPoint ??= { x, y };
      },
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      fill: () => {},
      stroke: () => {
        if (firstPathPoint) {
          drawnFloorCenters.push([firstPathPoint.x, firstPathPoint.y + 24]);
        }
      },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;
    const depthOrder: [number, number][] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [2, 0],
      [1, 1],
      [2, 1],
    ];
    const expectedFloorCenters = depthOrder.map(([x, y]) => {
      const center = worldToScreen(view, (x + 0.5) * 48, (y + 0.5) * 48);
      return [center.x, center.y];
    });

    drawIsoWorldFrame(context, world, view, []);
    expect(drawnFloorCenters).not.toEqual(expectedFloorCenters);
    drawnFloorCenters.length = 0;

    const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
      world,
      view,
    );

    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [],
      depthSortedFloors.painters,
    );

    expect(drawnFloorCenters).toEqual(expectedFloorCenters);
  });

  it('batches door floor graphics with neighboring floor graphics', () => {
    const calls: string[] = [];
    const floorPainters = ['FD', 'FF'].map((row, y) =>
      [...row].map((cell, x) =>
        cell === 'F' || cell === 'D'
          ? {
              position: { x: (x + 0.5) * 48, y: (y + 0.5) * 48 },
              draw: () => calls.push(`floor-${String(x)}-${String(y)}`),
            }
          : undefined,
      ),
    );
    const world: SceneIsoWorldView = {
      rows: ['FD', 'FF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      floorPainters,
      doorPainters: [
        [
          undefined,
          {
            position: { x: 72, y: 24 },
            draw: () => calls.push('door'),
          },
        ],
      ],
    };
    const view = createIsoView({ x: 48, y: 48 }, 300, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const context = {
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
    } as unknown as CanvasRenderingContext2D;
    const prepared = prepareDepthSortedIsometricFloorPainters(world, view);

    drawIsoWorldFrame(context, prepared.world, view, [], prepared.painters);

    expect(calls).toEqual([
      'floor-0-0',
      'floor-1-0',
      'floor-0-1',
      'floor-1-1',
      'door',
    ]);
  });

  it('orders open door frames around actors at every orientation and placement', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;
      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const view = createIsoView({ x: 168, y: 168 }, 600, 400, 48, {
        ax: 1,
        by: 0.5,
      });
      const directions = [
        { side: 'Left', x: -1, y: 0 },
        { side: 'Right', x: 1, y: 0 },
        { side: 'Up', x: 0, y: -1 },
        { side: 'Down', x: 0, y: 1 },
      ] as const;
      for (const { side, x: dx, y: dy } of directions) {
        for (const attached of [false, true]) {
          for (const open of [false, true]) {
            const grid = Array.from(
              { length: 7 },
              () => Array(7).fill('A') as string[],
            );
            const frame = attached ? { x: 3 + dx, y: 3 + dy } : { x: 3, y: 3 };
            if (attached) {
              grid[frame.y + dx][frame.x + dy] = WALL;
              grid[frame.y - dx][frame.x - dy] = WALL;
            }
            const dungeon: SceneDungeonView = {
              name: 'door-depth-test',
              discoveredRooms: ['A'],
              layout: {
                grid: grid.map((row) => row.join('')),
                doors: [{ x: 3, y: 3, side, open, hidden: false }],
                secrets: [],
              },
            };
            const world = buildIsometricWorldView(
              dungeon,
              48,
              false,
              graphics,
              view,
            );
            expect(world.rows[frame.y]?.[frame.x]).toBe('D');
            const original = world.doorPainters?.[frame.y]?.[frame.x];
            expect(original).toBeDefined();
            if (!original) continue;
            const originalImage: number[][] = [];
            original.draw(
              {
                drawImage: (_image: CanvasImageSource, ...args: number[]) =>
                  originalImage.push(args),
              } as unknown as CanvasRenderingContext2D,
              worldToScreen(view, original.position.x, original.position.y),
            );
            const prepared = prepareDepthSortedIsometricDoorPainters(
              world,
              view,
            );

            for (const offset of [-0.3, 0, 0.3, 0.6]) {
              const calls: string[] = [];
              const doorImages: number[][] = [];
              const actorImage = {} as CanvasImageSource;
              const context = {
                fillRect: () => {},
                save: () => {},
                restore: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                drawImage: (image: CanvasImageSource, ...args: number[]) => {
                  if (image === actorImage) {
                    calls.push('actor');
                  } else if (
                    (image as HTMLImageElement).src?.includes('/doors/')
                  ) {
                    calls.push('door');
                    doorImages.push(args);
                  }
                },
              } as unknown as CanvasRenderingContext2D;
              const actor: GameActorView = {
                position: { x: frame.x + offset, y: frame.y + offset },
                sprite: { image: actorImage, sx: 0, sy: 0, sw: 32, sh: 32 },
                tile: null,
                flashIntensity: 0,
                active: false,
                colourBar: '',
                healthBar: null,
                debugLabel: null,
                debugLines: [],
              };
              drawIsoWorldFrame(
                context,
                prepared.world,
                view,
                [],
                [
                  ...prepared.painters,
                  ...buildHeroPainters([actor], 48, view.projection.ax),
                ],
              );
              const actorFirst = open ? offset <= 0.3 : offset < 0;
              expect(
                calls,
                `${side} attached=${String(attached)} open=${String(open)} offset=${String(offset)}`,
              ).toEqual(actorFirst ? ['actor', 'door'] : ['door', 'actor']);
              expect(doorImages).toEqual(originalImage);
            }
          }
        }
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws open door frames behind foreground walls and in front of rear walls', () => {
    const calls: string[] = [];
    const cellSize = 48;
    const cells = Array.from({ length: 7 }, () => Array<string>(7).fill('.'));
    const wallCells = [
      { x: 2, y: 3, name: 'rear-wall' },
      { x: 4, y: 3, name: 'front-east-wall' },
      { x: 3, y: 4, name: 'front-south-wall' },
    ];
    const setCell = (x: number, y: number, cell: string): void => {
      const row = cells[y];
      if (row) row[x] = cell;
    };
    setCell(3, 3, 'D');
    wallCells.forEach(({ x, y }) => setCell(x, y, 'W'));
    const rows = cells.map((row) => row.join(''));
    const wallPainters = cells.map((row, y) =>
      row.map((_, x) => {
        const wall = wallCells.find(
          (candidate) => candidate.x === x && candidate.y === y,
        );
        return wall
          ? {
              position: { x: (x + 0.5) * cellSize, y: (y + 0.5) * cellSize },
              draw: () => calls.push(wall.name),
            }
          : undefined;
      }),
    );
    const doorPainters = cells.map((row, y) =>
      row.map((_, x) =>
        x === 3 && y === 3
          ? {
              position: { x: 3.5 * cellSize, y: 3.5 * cellSize },
              draw: () => calls.push('door'),
            }
          : undefined,
      ),
    );
    const world: SceneIsoWorldView & {
      openDoorCells: { x: number; y: number }[];
    } = {
      rows,
      cellSize,
      wallCell: 'W',
      doorCell: 'D',
      wallHeightPx: cellSize,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      wallPainters,
      doorPainters,
      openDoorCells: [{ x: 3, y: 3 }],
    };
    const view = createIsoView({ x: 168, y: 168 }, 600, 400, cellSize, {
      ax: 1,
      by: 0.5,
    });
    const prepared = prepareDepthSortedIsometricDoorPainters(world, view);
    const actorPainter = {
      position: { x: 3.8 * cellSize, y: 3.8 * cellSize },
      draw: () => calls.push('actor'),
    };
    const context = {
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
    } as unknown as CanvasRenderingContext2D;

    drawIsoWorldFrame(
      context,
      prepared.world,
      view,
      [],
      [...prepared.painters, actorPainter],
    );

    expect(calls).toEqual([
      'rear-wall',
      'actor',
      'door',
      'front-east-wall',
      'front-south-wall',
    ]);
  });

  it('preserves missing-door graphics and pit exclusions', () => {
    const view = createIsoView({ x: 24, y: 24 }, 200, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const dungeon: SceneDungeonView = {
      name: 'open-door-fallback-test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['A'],
        doors: [{ x: 0, y: 0, side: 'Up', open: true, hidden: false }],
        secrets: [],
      },
    };
    const world = buildIsometricWorldView(dungeon, 48);
    const missing = prepareDepthSortedIsometricDoorPainters(world, view);
    expect(missing.painters).toEqual([]);
    expect(missing.world.doorPainters).toBeUndefined();
    expect(missing.world.rows).toEqual(['D']);

    const painter = { position: { x: 24, y: 24 }, draw: () => {} };
    const pit = prepareDepthSortedIsometricDoorPainters(
      { ...world, doorPainters: [[painter]], pitCells: [{ x: 0, y: 0 }] },
      view,
    );
    expect(pit.painters).toEqual([]);
    expect(pit.world.doorPainters?.[0]?.[0]).toBe(painter);
  });

  it('draws corpses and decorators behind live actors without shifting them', () => {
    const calls: string[] = [];
    const drawPositions: { x: number; y: number }[] = [];
    const actor: GameActorView = {
      position: { x: 0.25, y: 0.25 },
      sprite: { image: {} as CanvasImageSource, sx: 0, sy: 0, sw: 32, sh: 32 },
      tile: null,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
    };
    const view = createIsoView({ x: 48, y: 48 }, 300, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const position = feetPosition(actor, 48);
    const backedPainters = prepareDepthBiasedIsometricPainters(
      ['corpse', 'decorator'].map((name) => ({
        position,
        draw: (
          _ctx: CanvasRenderingContext2D,
          screenPosition: { x: number; y: number },
        ) => {
          calls.push(name);
          drawPositions.push(screenPosition);
        },
      })),
      view,
    );
    const [liveActorPainter] = buildHeroPainters(
      [actor],
      48,
      view.projection.ax,
    );
    const world: SceneIsoWorldView = {
      rows: ['FW'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      wallPainters: [
        [
          undefined,
          {
            position: { x: 72, y: 24 },
            draw: () => calls.push('wall'),
          },
        ],
      ],
    };
    const context = {
      fillRect: () => {},
      fill: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      drawImage: () => calls.push('live actor'),
      imageSmoothingEnabled: false,
    } as unknown as CanvasRenderingContext2D;

    expect(liveActorPainter).toBeDefined();
    if (!liveActorPainter) return;

    drawIsoWorldFrame(
      context,
      world,
      view,
      [],
      [liveActorPainter, ...backedPainters],
    );

    expect(calls).toEqual(['corpse', 'decorator', 'live actor', 'wall']);
    expect(drawPositions).toEqual([
      worldToScreen(view, position.x, position.y),
      worldToScreen(view, position.x, position.y),
    ]);
  });

  it('draws the complete floor tile before its rounded outline', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 128;
        naturalHeight = 64;
        src = '';

        addEventListener() {}
      },
    );
    const graphics = {
      cells: { floor: 'floorTile' },
      wallShapes: {},
      tiles: {
        floorTile: {
          imageUrl: 'isometric/test-floor-outline.png',
          scale: 1,
          anchor: { x: 0.5, y: 1 },
        },
      },
    };
    const dungeon: SceneDungeonView = {
      name: 'floor-outline-test',
      discoveredRooms: ['A'],
      layout: { grid: ['A'], doors: [], secrets: [] },
    };
    const view = createIsoView({ x: 24, y: 24 }, 200, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const world = buildIsometricWorldView(dungeon, 48, false, graphics, view);
    const calls: string[] = [];
    const context = {
      fillRect: () => {},
      drawImage: () => calls.push('tile'),
      save: () => {},
      restore: () => {},
      beginPath: () => calls.push('beginPath'),
      moveTo: () => calls.push('moveTo'),
      lineTo: () => calls.push('lineTo'),
      closePath: () => calls.push('closePath'),
      clip: () => calls.push('clip'),
      fill: () => {},
      stroke: () => calls.push('stroke'),
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;
    const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
      world,
      view,
    );

    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [],
      depthSortedFloors.painters,
    );

    expect(calls).not.toContain('clip');
    expect(calls.indexOf('tile')).toBeLessThan(calls.lastIndexOf('beginPath'));
    expect(calls.indexOf('beginPath')).toBeLessThan(calls.indexOf('closePath'));
    expect(calls.indexOf('closePath')).toBeLessThan(calls.indexOf('stroke'));
    expect(calls.indexOf('tile')).toBeLessThan(calls.indexOf('stroke'));
    expect(calls.at(-1)).toBe('stroke');
    expect(context.strokeStyle).toBe('rgba(25, 22, 18, 0.15)');
    expect(context.lineWidth).toBe(1.25);
    expect(context.lineJoin).toBe('round');
  });

  it('draws all adjacent floor images before the outlines without clipping', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 128;
        naturalHeight = 64;
        src = '';

        addEventListener() {}
      },
    );
    const graphics = {
      cells: { floor: 'adjacentFloorTile' },
      wallShapes: {},
      tiles: {
        adjacentFloorTile: {
          imageUrl: 'isometric/adjacent-floor-outline.png',
          scale: 1,
          anchor: { x: 0.5, y: 1 },
        },
      },
    };
    const dungeon: SceneDungeonView = {
      name: 'adjacent-floor-outline-test',
      discoveredRooms: ['A'],
      layout: { grid: ['AA'], doors: [], secrets: [] },
    };
    const cellSize = 48;
    const view = createIsoView({ x: 48, y: 24 }, 300, 200, cellSize, {
      ax: 1.25,
      by: 0.4,
    });
    const world = buildIsometricWorldView(
      dungeon,
      cellSize,
      false,
      graphics,
      view,
    );
    const calls: string[] = [];
    const context = {
      fillRect: () => {},
      drawImage: () => calls.push('tile'),
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => calls.push('clip'),
      fill: () => {},
      stroke: () => calls.push('outline'),
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;
    const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
      world,
      view,
    );

    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [],
      depthSortedFloors.painters,
    );
    expect(calls).toEqual(['tile', 'tile', 'outline', 'outline']);
    calls.length = 0;
    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [],
      depthSortedFloors.painters,
    );
    expect(calls).toEqual(['tile', 'tile', 'outline', 'outline']);
  });

  it('depth sorts textured floor images before walls, outlines and actors', () => {
    const calls: string[] = [];
    const floor = (x: number, y: number) => ({
      position: { x: (x + 0.5) * 48, y: (y + 0.5) * 48 },
      draw: () => calls.push(`floor-${String(x)}-${String(y)}`),
    });
    const world: SceneIsoWorldView = {
      rows: ['FFW', 'FFF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      floorPainters: [
        [floor(0, 0), floor(1, 0)],
        [floor(0, 1), floor(1, 1), floor(2, 1)],
      ],
      wallPainters: [
        [
          undefined,
          undefined,
          { position: { x: 120, y: 24 }, draw: () => calls.push('wall') },
        ],
      ],
    };
    const view = createIsoView({ x: 72, y: 48 }, 300, 200, 48);
    const context = {
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => calls.push('light'),
      fill: () => {},
      stroke: () => calls.push('outline'),
    } as unknown as CanvasRenderingContext2D;
    const prepared = prepareDepthSortedIsometricFloorPainters(world, view);
    const lightPainter = buildIsometricFloorLightPainter(
      world,
      view,
      { width: 400, height: 300 } as HTMLCanvasElement,
      2,
    );
    const actor = {
      position: { x: 24, y: 24 },
      draw: () => calls.push('actor'),
    };

    expect(lightPainter).toBeDefined();
    if (!lightPainter) return;

    drawIsoWorldFrame(
      context,
      prepared.world,
      view,
      [],
      [...prepared.painters, lightPainter, actor],
    );

    expect(calls.slice(0, 5)).toEqual([
      'floor-0-0',
      'floor-1-0',
      'floor-0-1',
      'floor-1-1',
      'floor-2-1',
    ]);
    expect(calls.indexOf('light')).toBeGreaterThan(calls.indexOf('floor-2-1'));
    expect(calls.indexOf('light')).toBeLessThan(calls.indexOf('actor'));
    expect(calls.indexOf('outline')).toBeLessThan(calls.indexOf('actor'));
    expect(calls.indexOf('actor')).toBeLessThan(calls.indexOf('wall'));
  });

  it('clips light to discovered floor and door diamonds but not hidden cells or pits', () => {
    const world: SceneIsoWorldView = {
      rows: ['FHF', 'FDW'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      pitCells: [{ x: 0, y: 0 }],
    };
    const view = createIsoView({ x: 72, y: 48 }, 300, 200, 48);
    const lightCanvas = { width: 400, height: 300 } as HTMLCanvasElement;
    const painter = buildIsometricFloorLightPainter(
      world,
      view,
      lightCanvas,
      2,
    );
    const moveToCalls: number[][] = [];
    const drawImageCalls: unknown[][] = [];
    const savedStates: {
      filter: string;
      composite: GlobalCompositeOperation;
    }[] = [];
    let filter = 'brightness(0%)';
    let globalCompositeOperation: GlobalCompositeOperation = 'source-over';
    const context = {
      get filter() {
        return filter;
      },
      set filter(value: string) {
        filter = value;
      },
      get globalCompositeOperation() {
        return globalCompositeOperation;
      },
      set globalCompositeOperation(value: GlobalCompositeOperation) {
        globalCompositeOperation = value;
      },
      save: () =>
        savedStates.push({ filter, composite: globalCompositeOperation }),
      restore: () => {
        const state = savedStates.pop();
        if (state) {
          filter = state.filter;
          globalCompositeOperation = state.composite;
        }
      },
      beginPath: () => {},
      moveTo: (...args: number[]) => moveToCalls.push(args),
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: (...args: unknown[]) =>
        drawImageCalls.push([...args, filter, globalCompositeOperation]),
    } as unknown as CanvasRenderingContext2D;

    expect(painter).toBeDefined();
    if (!painter) return;
    painter.draw(context, { x: 0, y: 0 });

    expect(moveToCalls).toHaveLength(3);
    expect(drawImageCalls).toEqual([
      [lightCanvas, 0, 0, 200, 150, 'none', 'lighter'],
    ]);
    expect(filter).toBe('brightness(0%)');
    expect(globalCompositeOperation).toBe('source-over');
  });

  it('limits the floor-light clip path to cells in the viewport', () => {
    const world: SceneIsoWorldView = {
      rows: ['F'.repeat(40)],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
    };
    const view = createIsoView({ x: 24, y: 24 }, 300, 200, 48);
    const painter = buildIsometricFloorLightPainter(
      world,
      view,
      { width: 600, height: 400 } as HTMLCanvasElement,
      2,
    );
    const moveToCalls: number[][] = [];
    const context = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: (...args: number[]) => moveToCalls.push(args),
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(painter).toBeDefined();
    painter?.draw(context, { x: 0, y: 0 });

    expect(moveToCalls.length).toBeGreaterThan(0);
    expect(moveToCalls.length).toBeLessThan(10);
  });

  it('projects light onto exposed wall faces and keeps nearer walls in front', () => {
    const calls: string[] = [];
    const world: SceneIsoWorldView = {
      rows: ['WF', 'WF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      wallPainters: [
        [
          {
            position: { x: 24, y: 24 },
            draw: () => calls.push('rear-wall'),
          },
        ],
        [
          {
            position: { x: 24, y: 72 },
            draw: () => calls.push('front-wall'),
          },
        ],
      ],
    };
    const view = createIsoView({ x: 48, y: 48 }, 300, 200, 48);
    const lightCanvas = { width: 600, height: 400 } as HTMLCanvasElement;
    const wallLightPainters = buildIsometricWallLightPainters(
      world,
      view,
      lightCanvas,
      2,
    );
    const context = {
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      transform: () => {},
      drawImage: () => calls.push('wall-light'),
      fill: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(wallLightPainters).toHaveLength(2);
    drawIsoWorldFrame(context, world, view, [], wallLightPainters);

    expect(calls).toEqual([
      'rear-wall',
      'wall-light',
      'front-wall',
      'wall-light',
    ]);
  });

  it('maps adjacent floor light onto the projected wall face', () => {
    const transforms: number[][] = [];
    const sourceDraws: unknown[][] = [];
    const world: SceneIsoWorldView = {
      rows: ['WF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
    };
    const view = createIsoView({ x: 48, y: 24 }, 200, 160, 48);
    const painter = buildIsometricWallLightPainters(
      world,
      view,
      { width: 400, height: 320 } as HTMLCanvasElement,
      2,
    )[0];
    const context = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      transform: (...args: number[]) => transforms.push(args),
      drawImage: (...args: unknown[]) => sourceDraws.push(args),
    } as unknown as CanvasRenderingContext2D;

    painter?.draw(context, { x: 0, y: 0 });

    expect(transforms).toHaveLength(1);
    expect(transforms[0]).not.toEqual([1, 0, 0, 1, 0, 0]);
    const floorCorners = [
      worldToScreen(view, 48, 0),
      worldToScreen(view, 96, 0),
      worldToScreen(view, 96, 48),
      worldToScreen(view, 48, 48),
    ];
    const left = Math.max(
      0,
      Math.floor(Math.min(...floorCorners.map(({ x }) => x * 2))) - 1,
    );
    const top = Math.max(
      0,
      Math.floor(Math.min(...floorCorners.map(({ y }) => y * 2))) - 1,
    );
    const right = Math.min(
      400,
      Math.ceil(Math.max(...floorCorners.map(({ x }) => x * 2))) + 1,
    );
    const bottom = Math.min(
      320,
      Math.ceil(Math.max(...floorCorners.map(({ y }) => y * 2))) + 1,
    );
    expect(sourceDraws[0]?.slice(1, 5)).toEqual([
      left,
      top,
      right - left,
      bottom - top,
    ]);
  });

  it('overlaps only shared exposed wall-light edges by one device pixel', () => {
    const cases = [
      {
        rows: ['WW', 'FF'],
        sharedPoint: { x: 48, y: 48 },
        firstSharedVertex: 1,
        secondSharedVertex: 0,
        direction: 'x' as const,
      },
      {
        rows: ['WF', 'WF'],
        sharedPoint: { x: 48, y: 48 },
        firstSharedVertex: 0,
        secondSharedVertex: 1,
        direction: 'y' as const,
      },
    ];
    for (const {
      rows,
      sharedPoint,
      firstSharedVertex,
      secondSharedVertex,
      direction,
    } of cases) {
      for (const pixelRatio of [1, 2]) {
        const world: SceneIsoWorldView = {
          rows,
          cellSize: 48,
          wallCell: 'W',
          doorCell: 'D',
          hiddenCell: 'H',
          wallHeightPx: 36,
          palette: {
            background: '#000',
            floor: '#333',
            door: '#654',
            wallTop: '#555',
            wallSouth: '#444',
            wallEast: '#222',
          },
        };
        const view = createIsoView({ x: 96, y: 72 }, 400, 300, 48, {
          ax: 1,
          by: 0.5,
        });
        const paths: { x: number; y: number }[][] = [];
        let currentPath: { x: number; y: number }[] = [];
        const context = {
          save: () => {},
          restore: () => {},
          beginPath: () => {
            currentPath = [];
          },
          moveTo: (x: number, y: number) => currentPath.push({ x, y }),
          lineTo: (x: number, y: number) => currentPath.push({ x, y }),
          closePath: () => paths.push(currentPath),
          clip: () => {},
          transform: () => {},
          drawImage: () => {},
        } as unknown as CanvasRenderingContext2D;
        const painters = buildIsometricWallLightPainters(
          world,
          view,
          { width: 800, height: 600 } as HTMLCanvasElement,
          pixelRatio,
        );
        painters.forEach((painter) => painter.draw(context, { x: 0, y: 0 }));

        expect(paths).toHaveLength(2);
        const sharedScreenPoint = worldToScreen(
          view,
          sharedPoint.x,
          sharedPoint.y,
        );
        const faceDirection =
          direction === 'x'
            ? {
                x: view.projection.ax * world.cellSize,
                y: view.projection.by * world.cellSize,
              }
            : {
                x: view.projection.ax * world.cellSize,
                y: -view.projection.by * world.cellSize,
              };
        const directionLength = Math.hypot(faceDirection.x, faceDirection.y);
        const overlap = 1 / pixelRatio;
        const offset = {
          x: (faceDirection.x / directionLength) * overlap,
          y: (faceDirection.y / directionLength) * overlap,
        };
        const firstPoint = paths[0][firstSharedVertex];
        const secondPoint = paths[1][secondSharedVertex];
        expect(firstPoint?.x).toBeCloseTo(
          sharedScreenPoint.x + (direction === 'x' ? offset.x : -offset.x),
        );
        expect(firstPoint?.y).toBeCloseTo(
          sharedScreenPoint.y + (direction === 'x' ? offset.y : -offset.y),
        );
        expect(secondPoint?.x).toBeCloseTo(
          sharedScreenPoint.x + (direction === 'x' ? -offset.x : offset.x),
        );
        expect(secondPoint?.y).toBeCloseTo(
          sharedScreenPoint.y + (direction === 'x' ? -offset.y : offset.y),
        );
      }
    }
  });

  it('does not overlap wall-light edges toward isolated, hidden, or pit cells', () => {
    const cases: { rows: string[]; pitCells?: { x: number; y: number }[] }[] = [
      { rows: ['W', 'F'] },
      { rows: ['WW', 'FH'] },
      { rows: ['WW', 'FF'], pitCells: [{ x: 1, y: 1 }] },
    ];
    for (const { rows, pitCells } of cases) {
      const world: SceneIsoWorldView = {
        rows,
        cellSize: 48,
        wallCell: 'W',
        doorCell: 'D',
        hiddenCell: 'H',
        wallHeightPx: 36,
        ...(pitCells ? { pitCells } : {}),
        palette: {
          background: '#000',
          floor: '#333',
          door: '#654',
          wallTop: '#555',
          wallSouth: '#444',
          wallEast: '#222',
        },
      };
      const view = createIsoView({ x: 96, y: 72 }, 400, 300, 48, {
        ax: 1,
        by: 0.5,
      });
      const paths: { x: number; y: number }[][] = [];
      let currentPath: { x: number; y: number }[] = [];
      const context = {
        save: () => {},
        restore: () => {},
        beginPath: () => {
          currentPath = [];
        },
        moveTo: (x: number, y: number) => currentPath.push({ x, y }),
        lineTo: (x: number, y: number) => currentPath.push({ x, y }),
        closePath: () => paths.push(currentPath),
        clip: () => {},
        transform: () => {},
        drawImage: () => {},
      } as unknown as CanvasRenderingContext2D;
      const painters = buildIsometricWallLightPainters(
        world,
        view,
        { width: 800, height: 600 } as HTMLCanvasElement,
        2,
      );
      painters.forEach((painter) => painter.draw(context, { x: 0, y: 0 }));

      expect(paths).toHaveLength(1);
      const base = worldToScreen(view, 48, 48);
      expect(paths[0][1]?.x).toBeCloseTo(base.x);
      expect(paths[0][1]?.y).toBeCloseTo(base.y);
    }
  });

  it('clips wall light to the sprite alpha before adding it to the mask', () => {
    const calls: string[] = [];
    const maskDraws: unknown[][] = [];
    const makeContext = (name: string) => {
      let operation: GlobalCompositeOperation = 'source-over';
      const saved: GlobalCompositeOperation[] = [];
      return {
        get globalCompositeOperation() {
          return operation;
        },
        set globalCompositeOperation(value: GlobalCompositeOperation) {
          operation = value;
        },
        save: () => saved.push(operation),
        restore: () => {
          operation = saved.pop() ?? 'source-over';
        },
        setTransform: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        clip: () => {},
        transform: () => {},
        drawImage: (...args: unknown[]) => {
          calls.push(`${name}:${operation}`);
          if (name === 'mask') maskDraws.push(args);
        },
      } as unknown as CanvasRenderingContext2D;
    };
    const maskContext = makeContext('mask');
    const scratchContexts = [makeContext('light'), makeContext('silhouette')];
    const scratchCanvases = scratchContexts.map((context) => ({
      width: 0,
      height: 0,
      getContext: () => context,
    }));
    let created = 0;
    const lightMaskCanvas = {
      width: 400,
      height: 320,
      getContext: () => maskContext,
      ownerDocument: { createElement: () => scratchCanvases[created++] },
    } as unknown as HTMLCanvasElement;
    const world: SceneIsoWorldView = {
      rows: ['WF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      wallPainters: [
        [
          {
            position: { x: 24, y: 24 },
            draw: (ctx) => calls.push(`wall:${ctx.globalCompositeOperation}`),
          },
        ],
      ],
    };
    const view = createIsoView({ x: 48, y: 24 }, 200, 160, 48);

    renderIsometricLightMask(
      world,
      view,
      { width: 400, height: 320 } as HTMLCanvasElement,
      lightMaskCanvas,
      2,
    );

    expect(calls).toEqual([
      'mask:lighter',
      'wall:destination-out',
      'light:lighter',
      'wall:source-over',
      'light:destination-in',
      'mask:source-over',
    ]);
    expect(scratchCanvases[0].width).toBeLessThan(lightMaskCanvas.width);
    expect(scratchCanvases[0].height).toBeLessThan(lightMaskCanvas.height);
    const center = worldToScreen(view, 24, 24);
    const left = Math.max(0, Math.floor((center.x - 48) * 2) - 1);
    const top = Math.max(0, Math.floor((center.y - 24 - 18) * 2) - 1);
    const right = Math.min(400, Math.ceil((center.x + 48) * 2) + 1);
    const bottom = Math.min(320, Math.ceil((center.y + 24) * 2) + 1);
    expect(maskDraws[maskDraws.length - 1]?.slice(1, 9)).toEqual([
      0,
      0,
      right - left,
      bottom - top,
      left / 2,
      top / 2,
      (right - left) / 2,
      (bottom - top) / 2,
    ]);
    renderIsometricLightMask(
      world,
      view,
      { width: 400, height: 320 } as HTMLCanvasElement,
      lightMaskCanvas,
      2,
    );
    expect(created).toBe(2);
  });

  it('clips floor light and rebuilds wall light after wall occlusion', () => {
    const calls: string[] = [];
    let compositeOperation: GlobalCompositeOperation = 'source-over';
    const savedOperations: GlobalCompositeOperation[] = [];
    const maskContext = {
      get globalCompositeOperation() {
        return compositeOperation;
      },
      set globalCompositeOperation(value: GlobalCompositeOperation) {
        compositeOperation = value;
      },
      save: () => savedOperations.push(compositeOperation),
      restore: () => {
        compositeOperation = savedOperations.pop() ?? 'source-over';
      },
      setTransform: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      transform: () => {},
      drawImage: (...args: unknown[]) =>
        calls.push(args.length === 5 ? 'floor-light' : 'wall-light'),
    } as unknown as CanvasRenderingContext2D;
    const world: SceneIsoWorldView = {
      rows: ['WF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      wallPainters: [
        [
          {
            position: { x: 24, y: 24 },
            draw: (ctx) => calls.push(`wall:${ctx.globalCompositeOperation}`),
          },
        ],
      ],
    };
    const view = createIsoView({ x: 48, y: 24 }, 200, 160, 48);
    const lightCanvas = { width: 400, height: 320 } as HTMLCanvasElement;
    const lightMaskCanvas = {
      width: 400,
      height: 320,
      getContext: () => maskContext,
    } as unknown as HTMLCanvasElement;

    expect(
      renderIsometricLightMask(world, view, lightCanvas, lightMaskCanvas, 2),
    ).toBe(true);
    expect(calls).toEqual([
      'floor-light',
      'wall:destination-out',
      'wall-light',
    ]);
  });

  it('excludes hidden, nonadjacent, and pit cells from wall-face light', () => {
    const world: SceneIsoWorldView = {
      rows: ['HWF', 'FHF'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
    };
    const view = createIsoView({ x: 48, y: 48 }, 300, 200, 48);
    const lightCanvas = { width: 600, height: 400 } as HTMLCanvasElement;
    const visibleFacePainters = buildIsometricWallLightPainters(
      world,
      view,
      lightCanvas,
      2,
    );
    const pitFacePainters = buildIsometricWallLightPainters(
      {
        ...world,
        rows: ['HWF', 'HFH'],
        pitCells: [
          { x: 2, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      view,
      lightCanvas,
      2,
    );

    expect(visibleFacePainters).toHaveLength(1);
    expect(pitFacePainters).toHaveLength(0);
  });

  it('draws the outline when floor images are unavailable', () => {
    const dungeon: SceneDungeonView = {
      name: 'floor-outline-fallback-test',
      discoveredRooms: ['A'],
      layout: { grid: ['A'], doors: [], secrets: [] },
    };
    const world = buildIsometricWorldView(dungeon, 48);
    const view = createIsoView({ x: 24, y: 24 }, 200, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
      world,
      view,
    );
    const calls: string[] = [];
    const context = {
      fillRect: () => calls.push('background'),
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      fill: () => calls.push('floor'),
      stroke: () => calls.push('outline'),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;

    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [],
      depthSortedFloors.painters,
    );

    expect(calls).toEqual(['background', 'floor', 'outline']);
  });

  it('keeps floor outlines, doors, walls and actors depth sorted', () => {
    const world: SceneIsoWorldView = {
      rows: ['DW'],
      cellSize: 48,
      wallCell: 'W',
      doorCell: 'D',
      hiddenCell: 'H',
      wallHeightPx: 36,
      palette: {
        background: '#000',
        floor: '#333',
        door: '#654',
        wallTop: '#555',
        wallSouth: '#444',
        wallEast: '#222',
      },
      floorPainters: [
        [{ position: { x: 24, y: 24 }, draw: () => calls.push('floor') }],
      ],
      doorPainters: [
        [{ position: { x: 24, y: 24 }, draw: () => calls.push('door') }],
      ],
      wallPainters: [
        [
          undefined,
          { position: { x: 72, y: 24 }, draw: () => calls.push('wall') },
        ],
      ],
    };
    const view = createIsoView({ x: 24, y: 24 }, 200, 200, 48, {
      ax: 1,
      by: 0.5,
    });
    const actor: SceneIsoActorView = {
      feet: { x: 24, y: 24 },
      halfWidth: 4,
      halfHeight: 8,
      color: '#f00',
      shadowColor: '#000',
    };
    const calls: string[] = [];
    const context = {
      fillRect: (_x: number, _y: number, width: number, height: number) => {
        if (width !== view.width || height !== view.height) calls.push('actor');
      },
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      ellipse: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => calls.push('outline'),
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;
    const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
      world,
      view,
    );

    drawIsoWorldFrame(
      context,
      depthSortedFloors.world,
      view,
      [actor],
      depthSortedFloors.painters,
    );

    expect(calls).toEqual(['floor', 'outline', 'door', 'actor', 'wall']);
  });

  it('uses existing masonry sprites for discovered e1m3 pits', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const dungeon = buildDungeonView({
        ...e1m3,
        discoveredRooms: ['I'],
      });
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);
      const drawnImages: CanvasImageSource[] = [];
      const drawImageCalls: [
        CanvasImageSource,
        number,
        number,
        number,
        number,
      ][] = [];
      const context = {
        save: () => undefined,
        restore: () => undefined,
        translate: vi.fn(),
        scale: vi.fn(),
        drawImage: (
          image: CanvasImageSource,
          x: number,
          y: number,
          width: number,
          height: number,
        ) => {
          drawnImages.push(image);
          drawImageCalls.push([image, x, y, width, height]);
        },
      } as unknown as CanvasRenderingContext2D;
      const pit = world.pitPainters?.[6]?.[16];

      expect(world.pitCells).toEqual([
        { x: 16, y: 6 },
        { x: 17, y: 6 },
        { x: 18, y: 6 },
        { x: 15, y: 8 },
        { x: 16, y: 8 },
        { x: 17, y: 8 },
      ]);
      expect(pit).toBeDefined();
      pit?.drawFace(context, {
        edge: 'north',
        points: [
          { x: 100, y: 120 },
          { x: 148, y: 144 },
          { x: 148, y: 158 },
          { x: 100, y: 134 },
        ],
      });
      pit?.drawFace(context, {
        edge: 'west',
        points: [
          { x: 100, y: 168 },
          { x: 148, y: 144 },
          { x: 148, y: 130 },
          { x: 100, y: 154 },
        ],
      });

      expect(drawnImages).toEqual([
        expect.objectContaining({ src: 'isometric/walls/stoneWall_N.png' }),
        expect.objectContaining({ src: 'isometric/walls/stoneWall_W.png' }),
      ]);
      const sourceRims = [
        [
          { x: 28, y: 275 },
          { x: 157, y: 339 },
        ],
        [
          { x: 98, y: 339 },
          { x: 226, y: 275 },
        ],
      ];
      const targetRims = [
        [
          { x: 100, y: 120 },
          { x: 148, y: 144 },
        ],
        [
          { x: 100, y: 168 },
          { x: 148, y: 144 },
        ],
      ];
      const expectRimsAligned = (
        expectedRims: Array<Array<{ x: number; y: number }>>,
      ): void => {
        drawImageCalls.forEach((call, index) => {
          const [, x, y, width, height] = call;
          sourceRims[index]?.forEach((sourcePoint, pointIndex) => {
            const targetPoint = expectedRims[index]?.[pointIndex];
            if (!targetPoint) return;
            expect(x + (sourcePoint.x * width) / 256).toBeCloseTo(
              targetPoint.x,
            );
            expect(y + (sourcePoint.y * height) / 512).toBeCloseTo(
              targetPoint.y,
            );
          });
        });
      };
      expectRimsAligned(targetRims);

      drawImageCalls.length = 0;
      pit?.drawFace(context, {
        edge: 'north',
        points: [
          { x: 210, y: 74 },
          { x: 270, y: 89 },
          { x: 270, y: 103 },
          { x: 210, y: 88 },
        ],
      });
      pit?.drawFace(context, {
        edge: 'west',
        points: [
          { x: 210, y: 149 },
          { x: 270, y: 134 },
          { x: 270, y: 120 },
          { x: 210, y: 135 },
        ],
      });
      expect(drawImageCalls).toHaveLength(2);
      expectRimsAligned([
        [
          { x: 210, y: 74 },
          { x: 270, y: 89 },
        ],
        [
          { x: 210, y: 149 },
          { x: 270, y: 134 },
        ],
      ]);
      expect(context.translate).not.toHaveBeenCalled();
      expect(context.scale).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not expose undiscovered pit painters, including in debug mode', () => {
    const dungeon = buildDungeonView({
      ...e1m3,
      discoveredRooms: ['A'],
    });
    const world = buildIsometricWorldView(dungeon, 48, true);

    expect(world.pitCells).toEqual([]);
    expect(world.pitPainters?.flat().filter(Boolean) ?? []).toEqual([]);
  });

  it('passes classified visible corners into wall tile selection', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const dungeon: SceneDungeonView = {
        name: 'classified-corner-test',
        discoveredRooms: ['A'],
        layout: {
          grid: ['###', '#A#', '###'],
          sealedGrid: ['###', '#A#', '###'],
          corners: [
            {
              position: { x: 0, y: 0 },
              type: CornerType.INNER_TOP_LEFT,
            },
          ],
          doors: [],
          secrets: [],
        },
      };
      const graphics = {
        cells: { wall: 'stoneWall' },
        wallShapes: {
          es: ['maskWall'],
          [CornerType.INNER_TOP_LEFT]: ['classifiedCorner'],
        },
        tiles: {
          stoneWall: {
            imageUrl: 'stoneWall.png',
            scale: 1,
            anchor: { x: 0.5, y: 1 },
          },
          maskWall: {
            imageUrl: 'maskWall.png',
            scale: 1,
            anchor: { x: 0.5, y: 1 },
          },
          classifiedCorner: {
            imageUrl: 'classifiedCorner.png',
            scale: 1,
            anchor: { x: 0.5, y: 1 },
          },
        },
      };
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);
      const drawnImages: CanvasImageSource[] = [];
      const context = {
        drawImage: (image: CanvasImageSource) => drawnImages.push(image),
      } as unknown as CanvasRenderingContext2D;

      world.wallPainters?.[0]?.[0]?.draw(context, { x: 24, y: 24 });

      expect(drawnImages[0]).toMatchObject({ src: 'classifiedCorner.png' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('joins corner doors to the adjoining wall face in every orientation', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        {
          door: { x: 3, y: 2, side: 'Right' },
          sourceDoor: { x: 4, y: 2, side: 'Left' },
          doorFlank: { x: 3, y: 1 },
          diagonal: { x: 3, y: 3 },
          flank: { x: 2, y: 3 },
          corner: CornerType.INNER_TOP_LEFT,
          wallImages: ['stoneWallColumn_N.png', 'stoneWall_W.png'],
        },
        {
          door: { x: 1, y: 2, side: 'Left' },
          sourceDoor: { x: 0, y: 2, side: 'Right' },
          doorFlank: { x: 1, y: 1 },
          diagonal: { x: 1, y: 3 },
          flank: { x: 2, y: 3 },
          corner: CornerType.INNER_TOP_RIGHT,
          wallImages: ['stoneWall_E.png', 'stoneWallColumn_E.png'],
        },
        {
          door: { x: 2, y: 1, side: 'Up' },
          sourceDoor: { x: 2, y: 0, side: 'Down' },
          doorFlank: { x: 3, y: 1 },
          diagonal: { x: 1, y: 1 },
          flank: { x: 1, y: 2 },
          corner: CornerType.INNER_BOTTOM_RIGHT,
          wallImages: ['stoneWall_S.png', 'stoneWallColumn_S.png'],
        },
        {
          door: { x: 2, y: 3, side: 'Down' },
          sourceDoor: { x: 2, y: 4, side: 'Up' },
          doorFlank: { x: 1, y: 3 },
          diagonal: { x: 3, y: 3 },
          flank: { x: 3, y: 2 },
          corner: CornerType.INNER_TOP_LEFT,
          wallImages: ['stoneWallColumn_N.png', 'stoneWall_N.png'],
        },
      ] as const;

      for (const {
        door,
        sourceDoor,
        doorFlank,
        diagonal,
        flank,
        corner,
        wallImages,
      } of cases) {
        for (const open of [false, true]) {
          const grid = Array.from({ length: 5 }, () =>
            Array.from({ length: 5 }, () => ' '),
          );
          grid[2][2] = '#';
          grid[flank.y][flank.x] = '#';
          grid[doorFlank.y][doorFlank.x] = '#';
          grid[sourceDoor.y][sourceDoor.x] = 'A';
          grid[door.y][door.x] = 'A';
          grid[diagonal.y][diagonal.x] = 'A';
          const rows = grid.map((row) => row.join(''));
          const dungeon: SceneDungeonView = {
            name: 'corner-door-test',
            discoveredRooms: ['A'],
            layout: {
              grid: rows,
              sealedGrid: rows,
              corners: [{ position: { x: 2, y: 2 }, type: corner }],
              doors: [{ ...sourceDoor, open, hidden: false }],
              secrets: [],
            },
          };
          const world = buildIsometricWorldView(dungeon, 48, false, graphics);
          const drawnWallImages: CanvasImageSource[] = [];
          const wallContext = {
            drawImage: (image: CanvasImageSource) =>
              drawnWallImages.push(image),
          } as unknown as CanvasRenderingContext2D;

          world.wallPainters?.[2]?.[2]?.draw(wallContext, { x: 24, y: 24 });

          expect(
            drawnWallImages.map((image) => (image as HTMLImageElement).src),
          ).toEqual(wallImages.map((image) => `isometric/walls/${image}`));

          const drawnDoorImages: CanvasImageSource[] = [];
          const doorContext = {
            drawImage: (image: CanvasImageSource) =>
              drawnDoorImages.push(image),
          } as unknown as CanvasRenderingContext2D;
          world.doorPainters?.[door.y]?.[door.x]?.draw(doorContext, {
            x: 24,
            y: 24,
          });
          expect(drawnDoorImages[0]).toHaveProperty(
            'src',
            `isometric/doors/stoneWallGate${open ? '' : 'Closed'}_${
              door.side === 'Right'
                ? 'W'
                : door.side === 'Left'
                  ? 'E'
                  : door.side === 'Up'
                    ? 'S'
                    : 'N'
            }.png`,
          );
        }
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('joins the e1m2 corridor F doorway to both compound wall corners', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const dungeon = buildDungeonView({
        ...e1m2,
        discoveredRooms: ['E', 'F'],
      });
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);
      expect(world.rows[8]?.[17]).toBe('D');

      const walls = [
        {
          x: 16,
          images: [
            'stoneWall_S.png',
            'stoneWallColumn_N.png',
            'stoneWall_W.png',
          ],
        },
        {
          x: 18,
          images: [
            'stoneWall_E.png',
            'stoneWall_S.png',
            'stoneWallColumn_E.png',
          ],
        },
      ];
      for (const { x, images } of walls) {
        const drawnImages: CanvasImageSource[] = [];
        const drawCalls: [string, number, number, number, number][] = [];
        const context = {
          drawImage: (
            image: HTMLImageElement,
            left: number,
            top: number,
            width: number,
            height: number,
          ) => {
            drawnImages.push(image);
            drawCalls.push([image.src, left, top, width, height]);
          },
        } as unknown as CanvasRenderingContext2D;

        const wallPainter = world.wallPainters?.[8]?.[x];
        wallPainter?.draw(context, { x: 24, y: 24 });

        expect(
          drawnImages.map((image) => (image as HTMLImageElement).src),
        ).toEqual(images.map((image) => `isometric/walls/${image}`));
        expect(drawCalls).toEqual(
          images.map((image) => [
            `isometric/walls/${image}`,
            -24,
            -144,
            96,
            192,
          ]),
        );
        expect(wallPainter?.position).toEqual({
          x: (x + 0.5) * 48,
          y: (8 + 0.5) * 48,
        });
      }

      const doorPainter = world.doorPainters?.[8]?.[17];
      const doorDrawCalls: number[][] = [];
      const doorContext = {
        drawImage: (
          _image: CanvasImageSource,
          left: number,
          top: number,
          width: number,
          height: number,
        ) => doorDrawCalls.push([left, top, width, height]),
      } as unknown as CanvasRenderingContext2D;
      doorPainter?.draw(doorContext, { x: 24, y: 24 });
      expect(doorPainter?.position).toEqual({ x: 840, y: 408 });
      expect(doorDrawCalls).toEqual([[-24, -144, 96, 192]]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws post and L-shaped assets at detected room and outer corners', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        {
          grid: ['#####', '#AAA#', '#AAA#', '#####'],
          x: 0,
          y: 0,
          expectedImage: 'stoneWallColumn_N.png',
        },
        {
          grid: [
            '#######',
            '#AAAA##',
            '#AAAA##',
            '#AAAA##',
            '###E###',
            '  #E#  ',
          ],
          x: 2,
          y: 4,
          expectedImage: 'stoneWallCorner_W.png',
        },
      ];

      for (const { grid, x, y, expectedImage } of cases) {
        const dungeon: SceneDungeonView = {
          name: 'detected-corner-test',
          discoveredRooms: ['A'],
          layout: {
            grid,
            sealedGrid: grid,
            corners: autoDetectCorners(grid),
            doors: [],
            secrets: [],
          },
        };
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (image: CanvasImageSource) => drawnImages.push(image),
        } as unknown as CanvasRenderingContext2D;

        world.wallPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages[0]).toHaveProperty(
          'src',
          `isometric/walls/${expectedImage}`,
        );
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws all four exposed convex turns after opening the dungeon doors', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const closed = buildDungeonView(e1m0);
      expect(
        closed.layout.corners?.find(
          ({ position }) => position.x === 6 && position.y === 4,
        ),
      ).toBeUndefined();

      const opened = buildDungeonView({
        ...e1m0,
        discoveredRooms: ['A', 'B', 'C', 'D', 'E'],
        layout: {
          ...e1m0.layout,
          doors: e1m0.layout.doors.map((door) => ({ ...door, open: true })),
        },
      });
      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const world = buildIsometricWorldView(opened, 48, false, graphics);
      const turns = [
        [6, 4, CornerType.OUTER_TOP_RIGHT, ['stoneWallCorner_W.png']],
        [8, 4, CornerType.OUTER_TOP_LEFT, ['stoneWallCorner_S.png']],
        [8, 6, CornerType.OUTER_BOTTOM_LEFT, ['stoneWallCorner_E.png']],
        [6, 8, CornerType.OUTER_BOTTOM_RIGHT, ['stoneWallCorner_N.png']],
      ] as const;

      for (const [x, y, type, images] of turns) {
        expect(opened.layout.corners).toContainEqual({
          position: { x, y },
          type,
        });
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (source: CanvasImageSource) => drawnImages.push(source),
        } as unknown as CanvasRenderingContext2D;

        world.wallPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

        expect(
          drawnImages.map((image) => (image as HTMLImageElement).src),
        ).toEqual(images.map((image) => `isometric/walls/${image}`));
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    [13, 4, ['stoneWall_S.png', 'stoneWallColumn_N.png']],
    [13, 8, ['stoneWallColumn_W.png', 'stoneWall_N.png']],
    [17, 4, ['stoneWallColumn_S.png', 'stoneWallColumn_E.png']],
    [17, 8, ['stoneWallColumn_S.png', 'stoneWallColumn_E.png']],
  ] as const)(
    'joins every visible wall at the e1m1 junction (%i, %i)',
    (x, y, images) => {
      vi.stubGlobal(
        'Image',
        class {
          complete = true;
          naturalWidth = 256;
          naturalHeight = 512;
          src = '';

          addEventListener() {}
        },
      );

      try {
        const manifest = parseIsometricGraphicsManifest(
          JSON.parse(
            readFileSync(
              new URL('../../static/isometric/index.json', import.meta.url),
              'utf8',
            ),
          ),
        );
        expect(manifest).not.toBeNull();
        if (!manifest) return;

        const graphics = resolveIsometricGraphics(manifest, 'isometric');
        for (const open of [false, true]) {
          const dungeon = buildDungeonView({
            ...e1m1,
            discoveredRooms: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
            layout: {
              ...e1m1.layout,
              doors: e1m1.layout.doors.map((door) => ({ ...door, open })),
            },
          });
          const world = buildIsometricWorldView(dungeon, 48, false, graphics);
          const drawnImages: CanvasImageSource[] = [];
          const context = {
            drawImage: (image: CanvasImageSource) => drawnImages.push(image),
          } as unknown as CanvasRenderingContext2D;

          expect(world.rows[y]?.[x]).toBe('W');
          world.wallPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

          expect(drawnImages).toHaveLength(images.length);
          images.forEach((image, index) => {
            expect(drawnImages[index]).toHaveProperty(
              'src',
              `isometric/walls/${image}`,
            );
          });
        }
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it('selects every compound shape and honors its campaign override', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const faceCells: Record<string, { x: number; y: number }> = {
        n: { x: 1, y: 2 },
        e: { x: 0, y: 1 },
        s: { x: 1, y: 0 },
        w: { x: 2, y: 1 },
      };
      const cornerCells: Record<string, { x: number; y: number }> = {
        ITL: { x: 2, y: 2 },
        ITR: { x: 0, y: 2 },
        IBL: { x: 2, y: 0 },
        IBR: { x: 0, y: 0 },
      };
      const shapes = Object.keys(manifest.wallShapes ?? {}).filter(
        (shape) =>
          shape.includes('+') &&
          !['n+ITL', 'e+ITR', 's+IBR', 'w+ITL', 'es+ITR', 'sw+ITL'].includes(
            shape,
          ),
      );
      expect(shapes).toHaveLength(27);

      for (const shape of shapes) {
        const cells = ['###', '###', '###'].map((row) => row.split(''));
        for (const part of shape.split('+')) {
          const positions = cornerCells[part]
            ? [cornerCells[part]]
            : [...part].map((side) => faceCells[side]);
          for (const { x, y } of positions) cells[y][x] = 'A';
        }
        const grid = cells.map((row) => row.join(''));
        const dungeon: SceneDungeonView = {
          name: 'compound-wall-shape-test',
          discoveredRooms: ['A'],
          layout: {
            grid,
            sealedGrid: grid,
            corners: autoDetectCorners(grid),
            doors: [],
            secrets: [],
          },
        };
        const graphics = resolveIsometricGraphics(
          manifest,
          'isometric',
          {
            version: 1,
            cells: {},
            wallShapes: { [shape]: ['junction'] },
            tiles: { junction: { image: `walls/${shape}.png` } },
          },
          'campaign',
        );
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (image: CanvasImageSource) => drawnImages.push(image),
        } as unknown as CanvasRenderingContext2D;

        world.wallPainters?.[1]?.[1]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages, shape).toEqual([
          expect.objectContaining({ src: `campaign/walls/${shape}.png` }),
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('adds only the e1m1 junction pieces belonging to discovered rooms', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        [13, 4, ['E'], 'stoneWall_S.png'],
        [13, 4, ['G'], 'stoneWallColumn_N.png'],
        [13, 8, ['G'], 'stoneWallColumn_W.png'],
        [13, 8, ['H', 'I'], 'stoneWall_N.png'],
        [17, 4, ['E'], 'stoneWallColumn_S.png'],
        [17, 4, ['G'], 'stoneWallColumn_E.png'],
        [17, 8, ['G'], 'stoneWallColumn_S.png'],
        [17, 8, ['I'], 'stoneWallColumn_E.png'],
      ] as const;

      for (const [x, y, discoveredRooms, image] of cases) {
        const dungeon = buildDungeonView({
          ...e1m1,
          discoveredRooms: [...discoveredRooms],
        });
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (source: CanvasImageSource) => drawnImages.push(source),
        } as unknown as CanvasRenderingContext2D;

        world.wallPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages, `${x},${y}: ${discoveredRooms.join(',')}`).toEqual([
          expect.objectContaining({ src: `isometric/walls/${image}` }),
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps e1m3 corridor J wall faces when corridor B’s false door opens or closes', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      for (const open of [false, true]) {
        const dungeon = buildDungeonView({
          ...e1m3,
          discoveredRooms: ['A', 'B', 'C', 'J'],
          layout: {
            ...e1m3.layout,
            doors: e1m3.layout.doors.map((door) => ({
              ...door,
              open:
                !(door.x === 6 && door.y === 5 && door.side === 'Down') || open,
            })),
          },
        });
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: string[] = [];
        const context = {
          drawImage: (image: HTMLImageElement) => drawnImages.push(image.src),
        } as unknown as CanvasRenderingContext2D;

        expect(world.rows[6]?.[6]).toBe('D');
        expect(world.rows[6]?.[7]).toBe('W');
        world.wallPainters?.[6]?.[7]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages).toEqual([
          'isometric/walls/stoneWallColumn_S.png',
          'isometric/walls/stoneWall_W.png',
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('treats relocated doors in physical wall cells as walls for neighboring shapes', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        {
          side: 'Right',
          grid: ['AAAAA', 'AAA#A', 'AAA#A', 'AAA#A', 'AAAAA'],
          target: { x: 3, y: 2 },
          wall: { x: 3, y: 1 },
          images: ['stoneWall_E.png', 'stoneWall_S.png', 'stoneWall_W.png'],
        },
        {
          side: 'Left',
          grid: ['AAAAA', 'A#AAA', 'A#AAA', 'A#AAA', 'AAAAA'],
          target: { x: 1, y: 2 },
          wall: { x: 1, y: 1 },
          images: ['stoneWall_E.png', 'stoneWall_S.png', 'stoneWall_W.png'],
        },
        {
          side: 'Up',
          grid: ['AAAAA', 'A###A', 'AAAAA', 'AAAAA', 'AAAAA'],
          target: { x: 2, y: 1 },
          wall: { x: 1, y: 1 },
          images: ['stoneWall_E.png', 'stoneWall_S.png', 'stoneWall_N.png'],
        },
        {
          side: 'Down',
          grid: ['AAAAA', 'AAAAA', 'AAAAA', 'A###A', 'AAAAA'],
          target: { x: 2, y: 3 },
          wall: { x: 1, y: 3 },
          images: ['stoneWall_E.png', 'stoneWall_S.png', 'stoneWall_N.png'],
        },
      ] as const;

      for (const { side, grid, target, wall, images } of cases) {
        for (const open of [false, true]) {
          const dungeon: SceneDungeonView = {
            name: 'door-wall-shape-test',
            discoveredRooms: ['A'],
            layout: {
              grid: [...grid],
              sealedGrid: [...grid],
              doors: [{ x: 2, y: 2, side, open, hidden: false }],
              secrets: [],
            },
          };
          const world = buildIsometricWorldView(dungeon, 48, false, graphics);
          const drawnImages: string[] = [];
          const context = {
            drawImage: (image: HTMLImageElement) => drawnImages.push(image.src),
          } as unknown as CanvasRenderingContext2D;

          expect(world.rows[target.y]?.[target.x]).toBe('D');
          world.wallPainters?.[wall.y]?.[wall.x]?.draw(context, {
            x: 24,
            y: 24,
          });

          expect(
            drawnImages.map((src) => src.split('/').pop()),
            `${side}, open=${String(open)}`,
          ).toEqual(images);
        }
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps floor doors available as adjoining floor when selecting wall shapes', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const dungeon: SceneDungeonView = {
        name: 'floor-door-wall-shape-test',
        discoveredRooms: ['A'],
        layout: {
          grid: ['AAAAA', 'A#AAA', 'AAAAA'],
          doors: [{ x: 2, y: 1, side: 'Right', open: false, hidden: false }],
          secrets: [],
        },
      };
      const world = buildIsometricWorldView(
        dungeon,
        48,
        false,
        resolveIsometricGraphics(manifest, 'isometric'),
      );
      const drawnImages: string[] = [];
      const context = {
        drawImage: (image: HTMLImageElement) => drawnImages.push(image.src),
      } as unknown as CanvasRenderingContext2D;

      expect(world.rows[1]?.[2]).toBe('D');
      world.wallPainters?.[1]?.[1]?.draw(context, { x: 24, y: 24 });

      expect(drawnImages.map((src) => src.split('/').pop())).toEqual([
        'stoneWall_E.png',
        'stoneWall_S.png',
        'stoneWall_N.png',
        'stoneWall_W.png',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('distinguishes hidden floor from empty space when confirming inner corners', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      for (const [topRow, image] of [
        ['AB#', 'stoneWall_W.png'],
        ['A #', 'stoneWallColumn_S.png'],
      ]) {
        const grid = [topRow, '###', '###'];
        const dungeon: SceneDungeonView = {
          name: 'hidden-corner-neighbor-test',
          discoveredRooms: ['A'],
          layout: {
            grid,
            sealedGrid: grid,
            corners: autoDetectCorners(grid, ['A']),
            doors: [],
            secrets: [],
          },
        };
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (source: CanvasImageSource) => drawnImages.push(source),
        } as unknown as CanvasRenderingContext2D;

        expect(world.rows[0]?.[1]).toBe('H');
        world.wallPainters?.[1]?.[1]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages).toEqual([
          expect.objectContaining({ src: `isometric/walls/${image}` }),
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps classified artwork as the fallback for manifests without compound shapes', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(
        {
          ...manifest,
          wallShapes: Object.fromEntries(
            Object.entries(manifest.wallShapes ?? {}).filter(
              ([shape]) => !shape.includes('+'),
            ),
          ),
        },
        'legacy',
      );
      const dungeon = buildDungeonView({
        ...e1m1,
        discoveredRooms: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      });
      expect(dungeon.layout.corners).toContainEqual({
        position: { x: 13, y: 4 },
        type: CornerType.INNER_TOP_LEFT,
      });
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);
      const drawnImages: CanvasImageSource[] = [];
      const context = {
        drawImage: (image: CanvasImageSource) => drawnImages.push(image),
      } as unknown as CanvasRenderingContext2D;

      world.wallPainters?.[4]?.[13]?.draw(context, { x: 24, y: 24 });

      expect(drawnImages).toEqual([
        expect.objectContaining({
          src: 'legacy/walls/stoneWallColumn_N.png',
        }),
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws rear wall faces before front faces without a detached post', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const grid = ['A#', '#A'];
      const dungeon: SceneDungeonView = {
        name: 'multi-face-wall-test',
        discoveredRooms: ['A'],
        layout: {
          grid,
          sealedGrid: grid,
          corners: [],
          doors: [],
          secrets: [],
        },
      };
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);
      const drawnImages: string[] = [];
      const context = {
        drawImage: (image: CanvasImageSource) => {
          drawnImages.push((image as HTMLImageElement).src);
        },
      } as unknown as CanvasRenderingContext2D;

      world.wallPainters?.[0]?.[1]?.draw(context, { x: 24, y: 24 });

      expect(drawnImages.map((src) => src.split('/').pop())).toEqual([
        'stoneWall_E.png',
        'stoneWall_N.png',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('selects wall faces from the room side rather than connected wall sides', () => {
    const rows = ['WWWWW', 'WFFFW', 'WWWWW'];

    expect(getIsometricWallShape(rows, 2, 0)).toEqual({
      north: true,
      east: false,
      south: false,
      west: false,
    });
    expect(getIsometricWallShape(rows, 4, 1)).toEqual({
      north: false,
      east: true,
      south: false,
      west: false,
    });
    expect(getIsometricWallShape(rows, 2, 2)).toEqual({
      north: false,
      east: false,
      south: true,
      west: false,
    });
    expect(getIsometricWallShape(rows, 0, 1)).toEqual({
      north: false,
      east: false,
      south: false,
      west: true,
    });
  });

  it('treats a door opening like a floor when selecting adjoining wall faces', () => {
    const rows = ['  ', 'DW', ' F'];

    expect(getIsometricWallShape(rows, 1, 1)).toEqual({
      north: true,
      east: true,
      south: false,
      west: false,
    });
  });

  it('attaches doors to the wall strip on either side of all four doorway directions', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        {
          side: 'Right',
          grid: ['AAAAA', 'AAA#A', 'AAAAA', 'AAA#A', 'AAAAA'],
          target: { x: 3, y: 2 },
          imageSide: 'E',
        },
        {
          side: 'Left',
          grid: ['AAAAA', 'A#AAA', 'AAAAA', 'A#AAA', 'AAAAA'],
          target: { x: 1, y: 2 },
          imageSide: 'W',
        },
        {
          side: 'Up',
          grid: ['AAAAA', 'A#A#A', 'AAAAA', 'AAAAA', 'AAAAA'],
          target: { x: 2, y: 1 },
          imageSide: 'N',
        },
        {
          side: 'Down',
          grid: ['AAAAA', 'AAAAA', 'AAAAA', 'A#A#A', 'AAAAA'],
          target: { x: 2, y: 3 },
          imageSide: 'S',
        },
      ] as const;

      for (const { side, grid, target, imageSide } of cases) {
        for (const open of [false, true]) {
          const dungeon: SceneDungeonView = {
            name: 'door-wall-attachment-test',
            discoveredRooms: ['A'],
            layout: {
              grid: [...grid],
              sealedGrid: [...grid],
              doors: [{ x: 2, y: 2, side, open, hidden: false }],
              secrets: [],
            },
          };
          const world = buildIsometricWorldView(dungeon, 48, false, graphics);
          const drawnImages: CanvasImageSource[] = [];
          const context = {
            drawImage: (image: CanvasImageSource) => drawnImages.push(image),
          } as unknown as CanvasRenderingContext2D;

          expect(world.rows[target.y]?.[target.x]).toBe('D');
          expect(world.rows[2]?.[2]).toBe('F');
          world.doorPainters?.[target.y]?.[target.x]?.draw(context, {
            x: 24,
            y: 24,
          });

          expect(drawnImages).toHaveLength(1);
          expect(drawnImages[0]).toHaveProperty(
            'src',
            `isometric/doors/stoneWallGate${open ? '' : 'Closed'}_${imageSide}.png`,
          );
        }
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps door placement on ties and when neither side owns flanking walls', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const cases = [
        {
          grid: ['AAAAA', 'AA#AA', 'AAAAA', 'AAA#A', 'AAAAA'],
          sealedGrid: ['AAAAA', 'AA#AA', 'AAAAA', 'AAA#A', 'AAAAA'],
          side: 'Right',
          imageSide: 'W',
        },
        {
          grid: ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA'],
          sealedGrid: ['AAAAA', 'A#A#A', 'AAAAA', 'AAAAA', 'AAAAA'],
          side: 'Up',
          imageSide: 'S',
        },
      ] as const;

      for (const { grid, sealedGrid, side, imageSide } of cases) {
        const dungeon: SceneDungeonView = {
          name: 'door-wall-tie-test',
          discoveredRooms: ['A'],
          layout: {
            grid: [...grid],
            sealedGrid: [...sealedGrid],
            doors: [{ x: 2, y: 2, side, open: false, hidden: false }],
            secrets: [],
          },
        };
        const world = buildIsometricWorldView(dungeon, 48, false, graphics);
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (image: CanvasImageSource) => drawnImages.push(image),
        } as unknown as CanvasRenderingContext2D;

        expect(world.rows[2]?.[2]).toBe('D');
        world.doorPainters?.[2]?.[2]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages).toHaveLength(1);
        expect(drawnImages[0]).toHaveProperty(
          'src',
          `isometric/doors/stoneWallGateClosed_${imageSide}.png`,
        );
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('aligns the e1m0 doorways with their flanking walls without revealing room C', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const manifest = parseIsometricGraphicsManifest(
        JSON.parse(
          readFileSync(
            new URL('../../static/isometric/index.json', import.meta.url),
            'utf8',
          ),
        ),
      );
      expect(manifest).not.toBeNull();
      if (!manifest) return;

      const dungeon = buildDungeonView({
        ...e1m0,
        discoveredRooms: ['A', 'B', 'D', 'E'],
      });
      const graphics = resolveIsometricGraphics(manifest, 'isometric');
      const world = buildIsometricWorldView(dungeon, 48, false, graphics);

      expect(world.rows[9]?.[3]).toBe('F');
      expect(world.rows[9]?.[4]).toBe('D');
      expect(world.rows[9]?.[6]).toBe('D');
      expect(world.rows[9]?.[7]).toBe('F');
      expect(world.rows[6]?.[7]).toBe('D');
      expect(world.rows[7]?.[7]).toBe('F');
      expect(world.rows[2]?.[8]).toBe('H');
      expect(world.rows[4]?.[7]).toBe('D');

      for (const [x, y, image] of [
        [4, 9, 'stoneWallGateClosed_E.png'],
        [6, 9, 'stoneWallGateClosed_W.png'],
        [7, 6, 'stoneWallGateClosed_N.png'],
        [7, 4, 'stoneWallGateClosed_S.png'],
      ] as const) {
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (source: CanvasImageSource) => drawnImages.push(source),
        } as unknown as CanvasRenderingContext2D;

        world.doorPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages).toEqual([
          expect.objectContaining({ src: `isometric/doors/${image}` }),
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('scales image-backed cells to the projected tile width', () => {
    expect(getIsometricTileDimensions(48, { ax: 1 }, 1, 256, 512)).toEqual({
      width: 96,
      height: 192,
    });
  });
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

  it('hides hidden doors and keeps visible open doors as door cells', () => {
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

    expect(buildIsometricWorldView(dungeon, 48).rows).toEqual(['FDF']);
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

describe('isometric pillar painters', () => {
  const pillarPosition = (): { x: number; y: number } => {
    const y = e1m1.layout.grid.findIndex((row) => row.includes('A'));
    return { x: e1m1.layout.grid[y]?.indexOf('A') ?? 0, y };
  };

  const pillarDungeon = (discovered: boolean) => {
    const position = pillarPosition();
    return {
      ...e1m1,
      discoveredRooms: discovered ? ['A'] : [],
      layout: { ...e1m1.layout, pillars: [position] },
    };
  };

  it('draws a discovered pillar as one anchored full sprite', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = true;
        naturalWidth = 256;
        naturalHeight = 512;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const graphics = {
        cells: { pillar: 'pillar' },
        wallShapes: {},
        pillarVariants: ['pillar'],
        tiles: {
          pillar: {
            imageUrl: 'test-isometric-pillar.png',
            scale: 0.5,
            anchor: { x: 0.25, y: 0.75 },
          },
        },
      };
      const painters = buildIsometricPillarPainters(
        pillarDungeon(true),
        {} as CanvasImageSource,
        48,
        { ax: 1, by: 0.5 },
        graphics,
      );
      const draws: unknown[][] = [];
      const context = {
        drawImage: (...args: unknown[]) => draws.push(args),
      } as unknown as CanvasRenderingContext2D;

      expect(painters).toHaveLength(1);
      painters[0]?.draw(context, { x: 100, y: 100 });

      expect(draws).toHaveLength(1);
      expect(draws[0]?.[0]).toMatchObject({ src: 'test-isometric-pillar.png' });
      expect(draws[0]?.slice(1)).toEqual([88, 52, 48, 96]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('hides undiscovered pillars even in debug mode', () => {
    const painters = buildIsometricPillarPainters(
      pillarDungeon(false),
      {} as CanvasImageSource,
      48,
      { ax: 1, by: 0.5 },
    );

    expect(painters).toEqual([]);
  });

  it('keeps the split pillar fallback while the full sprite is unavailable', () => {
    vi.stubGlobal(
      'Image',
      class {
        complete = false;
        naturalWidth = 0;
        naturalHeight = 0;
        src = '';

        addEventListener() {}
      },
    );

    try {
      const groundSheet = {} as CanvasImageSource;
      const graphics = {
        cells: { pillar: 'loadingPillar' },
        wallShapes: {},
        pillarVariants: ['loadingPillar'],
        tiles: {
          loadingPillar: {
            imageUrl: 'loading-isometric-pillar.png',
            scale: 1,
            anchor: { x: 0.5, y: 1 },
          },
        },
      };
      const painters = buildIsometricPillarPainters(
        pillarDungeon(true),
        groundSheet,
        48,
        { ax: 1, by: 0.5 },
        graphics,
      );
      const drawnImages: CanvasImageSource[] = [];
      const context = {
        drawImage: (image: CanvasImageSource) => drawnImages.push(image),
      } as unknown as CanvasRenderingContext2D;

      expect(painters).toHaveLength(2);
      painters.forEach((painter) => painter.draw(context, { x: 24, y: 24 }));

      expect(drawnImages).toEqual([groundSheet, groundSheet]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the split pillar fallback when its tile definition is missing', () => {
    const painters = buildIsometricPillarPainters(
      pillarDungeon(true),
      {} as CanvasImageSource,
      48,
      { ax: 1, by: 0.5 },
      {
        cells: { pillar: 'missingPillar' },
        wallShapes: {},
        pillarVariants: ['missingPillar'],
        tiles: {},
      },
    );

    expect(painters).toHaveLength(2);
  });
});
