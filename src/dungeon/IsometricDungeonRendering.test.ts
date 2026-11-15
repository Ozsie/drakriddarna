import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createIsoView, type SceneDungeonView } from '@hoard-engine/scene';
import {
  buildDungeonView,
  type GameActorView,
  type GameHeroOverlayView,
} from '../scene/adapters';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import { CornerType } from '../types';
import { autoDetectCorners } from './cornerDetection';
import {
  parseIsometricGraphicsManifest,
  resolveIsometricGraphics,
} from './IsometricGraphics';
import {
  buildIsometricPillarPainters,
  buildHeroPainters,
  buildIsometricWorldView,
  feetPosition,
  getIsometricWallShape,
  getIsometricTileDimensions,
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
        [6, 4, CornerType.OUTER_TOP_RIGHT, 'stoneWallCorner_W.png'],
        [8, 4, CornerType.OUTER_TOP_LEFT, 'stoneWallCorner_S.png'],
        [8, 6, CornerType.OUTER_BOTTOM_LEFT, 'stoneWallCorner_E.png'],
        [6, 8, CornerType.OUTER_BOTTOM_RIGHT, 'stoneWallCorner_N.png'],
      ] as const;

      for (const [x, y, type, image] of turns) {
        expect(opened.layout.corners).toContainEqual({
          position: { x, y },
          type,
        });
        const drawnImages: CanvasImageSource[] = [];
        const context = {
          drawImage: (source: CanvasImageSource) => drawnImages.push(source),
        } as unknown as CanvasRenderingContext2D;

        world.wallPainters?.[y]?.[x]?.draw(context, { x: 24, y: 24 });

        expect(drawnImages).toEqual([
          expect.objectContaining({ src: `isometric/walls/${image}` }),
        ]);
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
      const shapes = Object.keys(manifest.wallShapes ?? {}).filter((shape) =>
        shape.includes('+'),
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
            `isometric/doors/stoneWallDoor${open ? 'Open' : 'Closed'}_${imageSide}.png`,
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
          `isometric/doors/stoneWallDoorClosed_${imageSide}.png`,
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
        [4, 9, 'stoneWallDoorClosed_E.png'],
        [6, 9, 'stoneWallDoorClosed_W.png'],
        [7, 6, 'stoneWallDoorClosed_N.png'],
        [7, 4, 'stoneWallDoorClosed_S.png'],
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
