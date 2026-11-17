import { describe, expect, it } from 'vitest';
import type { GameState, Hero } from '../types';
import { CellAlignment, Side } from '../types';
import {
  getAnimatedLightSpriteSignature,
  getDynamicSignature,
  getOverlaySignature,
  getPortalAuraSignature,
  getStaticSignature,
} from './DungeonBoardSignatures';

const createState = (overrides?: Partial<GameState>): GameState =>
  ({
    heroes: [],
    dungeon: {
      name: 'test-dungeon',
      layout: {
        grid: ['#AA#'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      discoveredRooms: ['A'],
      startingPositions: [{ x: 1, y: 0 }],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: true,
    ...overrides,
  }) as GameState;

describe('DungeonBoardSignatures', () => {
  it('animates the portal only while it is discovered and in the viewport', () => {
    const state = createState();
    const viewport = { x: 0, y: 0, width: 3, height: 1 };
    expect(getPortalAuraSignature(state.dungeon, 0, viewport)).toBe('');
    state.dungeon.portal = { x: 1, y: 0 };
    expect(getPortalAuraSignature(state.dungeon, 0, viewport)).toBe('0');
    expect(getPortalAuraSignature(state.dungeon, 124, viewport)).toBe('0');
    expect(getPortalAuraSignature(state.dungeon, 125, viewport)).toBe('1');
    expect(
      getPortalAuraSignature(state.dungeon, 125, { ...viewport, x: 10 }),
    ).toBe('');
    state.dungeon.discoveredRooms = [];
    expect(getPortalAuraSignature(state.dungeon, 125, viewport)).toBe('');
    state.dungeon.portal = undefined;
    expect(getPortalAuraSignature(state.dungeon, 125)).toBe('');
  });
  it('static signature changes when a door opens', () => {
    const state = createState();
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.doors = [
      {
        locked: false,
        open: true,
        trapped: false,
        hidden: false,
        x: 0,
        y: 0,
        side: Side.RIGHT,
        trapAttacks: 0,
        reinforced: false,
      },
    ];
    const after = getStaticSignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('static signature changes when a decorator is added', () => {
    const state = createState();
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.decorators = [
      {
        position: { x: 1, y: 0 },
        sprite: { image: 'decorators/bones.png', size: 32, index: 0 },
      },
    ];

    expect(getStaticSignature(state, false, 48)).not.toBe(before);
  });

  it('static signature changes when a projection-specific decorator sprite changes', () => {
    const state = createState();
    state.dungeon.layout.decorators = [
      {
        position: { x: 1, y: 0 },
        sprite: { image: 'decorators/bones.png', size: 32, index: 0 },
        sprites: {
          isometric: { image: 'decorators/bones-iso.png', size: 48, index: 0 },
        },
      },
    ];
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.decorators[0].sprites!.isometric = {
      image: 'decorators/bones-iso.png',
      size: 48,
      index: 1,
    };

    expect(getStaticSignature(state, false, 48)).not.toBe(before);
  });

  it('static signature changes when an item decorator changes', () => {
    const state = createState();
    state.dungeon.layout.items = [
      {
        position: { x: 1, y: 0 },
        decorator: {
          image: 'decorators/Bones_shadow3_1.png',
          size: 32,
          index: 0,
        },
      },
    ];
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.items[0].decorator!.index = 1;

    expect(getStaticSignature(state, false, 48)).not.toBe(before);
  });

  it('static signature ignores light sprites drawn on the dynamic layer', () => {
    const state = createState();
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprite: { x: 576, y: 96, size: 48 },
      },
    ];

    expect(getStaticSignature(state, false, 48)).toBe(before);
  });

  it('dynamic signature changes when a light sprite crop changes', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprite: { x: 576, y: 96, size: 48 },
      },
    ];
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.layout.lights[0].sprite = { x: 624, y: 96, size: 48 };

    expect(getDynamicSignature(state, false, 48)).not.toBe(before);
  });

  it('dynamic signature changes when a mode-specific light sprite changes', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprites: {
          isometric: { image: 'iso-light.png', x: 0, y: 0, size: 48 },
        },
      },
    ];
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.layout.lights[0].sprites!.isometric = {
      image: 'iso-light.png',
      x: 48,
      y: 0,
      size: 48,
    };

    expect(getDynamicSignature(state, false, 48)).not.toBe(before);
  });

  it('dynamic signature changes when a light sprite scale changes', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprite: { x: 576, y: 96, size: 48, scale: 0.75 },
      },
    ];
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.layout.lights[0].sprite = {
      x: 576,
      y: 96,
      size: 48,
      scale: 0.6,
    };

    expect(getDynamicSignature(state, false, 48)).not.toBe(before);
  });

  it('dynamic signature changes when a light sprite alignment offset changes', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprite: {
          x: 576,
          y: 96,
          size: 48,
          alignmentOffsets: {
            [CellAlignment.TOP_RIGHT]: { x: 2, y: -1 },
          },
        },
      },
    ];
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.layout.lights[0].sprite!.alignmentOffsets = {
      [CellAlignment.TOP_RIGHT]: { x: 3, y: -1 },
    };

    expect(getDynamicSignature(state, false, 48)).not.toBe(before);
  });

  it('animates discovered light sprites at their configured frame rate', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprite: {
          image: 'decorators/Torch Animated.png',
          x: 0,
          y: 0,
          size: 64,
          frameCount: 8,
          frameRate: 8,
        },
      },
    ];

    const firstFrame = getAnimatedLightSpriteSignature(state, false, 0);
    const secondFrame = getAnimatedLightSpriteSignature(state, false, 125);

    expect(firstFrame).not.toBe('');
    expect(secondFrame).not.toBe(firstFrame);
  });

  it('uses the active mode sprite for the animated frame signature', () => {
    const state = createState();
    state.dungeon.layout.lights = [
      {
        position: { x: 1, y: 0 },
        sprites: {
          topDown: {
            image: 'top-down.png',
            x: 0,
            y: 0,
            size: 32,
            frameCount: 8,
            frameRate: 8,
          },
          isometric: {
            image: 'isometric.png',
            x: 0,
            y: 0,
            size: 48,
            frameCount: 4,
            frameRate: 4,
          },
        },
      },
    ];

    expect(
      getAnimatedLightSpriteSignature(state, false, 250, 'topDown'),
    ).not.toBe(getAnimatedLightSpriteSignature(state, false, 250, 'isometric'));
  });

  it('static signature changes when a decorator crop changes', () => {
    const state = createState();
    state.dungeon.layout.decorators = [
      {
        position: { x: 1, y: 0 },
        sprite: {
          image: 'decorators/supplies_objects.png',
          size: 45,
          index: 0,
          sourceRect: { x: 146, y: 10, width: 29, height: 45 },
        },
      },
    ];
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.decorators[0].sprite.sourceRect = {
      x: 178,
      y: 11,
      width: 29,
      height: 44,
    };

    expect(getStaticSignature(state, false, 48)).not.toBe(before);
  });

  it('static signature changes when a decorator alignment changes', () => {
    const state = createState();
    state.dungeon.layout.decorators = [
      {
        position: { x: 1, y: 0 },
        alignment: CellAlignment.CENTER,
        sprite: { image: 'decorators/bones.png', size: 32, index: 0 },
      },
    ];
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.decorators[0].alignment = CellAlignment.TOP_LEFT;

    expect(getStaticSignature(state, false, 48)).not.toBe(before);
  });

  it('static signature changes when a corridor collapses and when it is restored', () => {
    const state = createState();
    const before = getStaticSignature(state, false, 48);
    state.dungeon.collapsedCorridors = [
      {
        letter: 'B',
        cells: [
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
      },
    ];
    const collapsed = getStaticSignature(state, false, 48);
    expect(collapsed).not.toBe(before);
    state.dungeon.collapsedCorridors = [];
    const restored = getStaticSignature(state, false, 48);
    expect(restored).toBe(before);
  });

  it('dynamic signature changes when a hero moves', () => {
    const state = createState();
    const hero = {
      name: 'Fearik',
      position: { x: 1, y: 0 },
      health: 7,
      actions: 2,
      movement: 3,
      incapacitated: false,
    } as Hero;
    state.heroes = [hero];
    const before = getDynamicSignature(state, false, 48);
    hero.position = { x: 2, y: 0 };
    const after = getDynamicSignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('dynamic signature changes when a corridor collapses', () => {
    const state = createState();
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.collapsedCorridors = [
      {
        letter: 'B',
        cells: [
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
      },
    ];
    const collapsed = getDynamicSignature(state, false, 48);
    expect(collapsed).not.toBe(before);
    state.dungeon.collapsedCorridors = [];
    expect(getDynamicSignature(state, false, 48)).toBe(before);
  });

  it('overlay signature changes when damage indicators appear', () => {
    const state = createState();
    const before = getOverlaySignature(state, false, 48);
    state.damageIndicators = [
      {
        id: 'd1',
        damage: 1,
        position: { x: 0, y: 0 },
        timestamp: 0,
      },
    ];
    const after = getOverlaySignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('signatures are stable for unchanged state', () => {
    const state = createState();
    expect(getStaticSignature(state, false, 48)).toBe(
      getStaticSignature(state, false, 48),
    );
    expect(getDynamicSignature(state, false, 48)).toBe(
      getDynamicSignature(state, false, 48),
    );
    expect(getOverlaySignature(state, false, 48)).toBe(
      getOverlaySignature(state, false, 48),
    );
  });
});
