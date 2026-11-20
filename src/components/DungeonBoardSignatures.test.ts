import { describe, expect, it } from 'vitest';
import type { GameState, Hero, Item, Monster } from '../types';
import {
  CellAlignment,
  Colour,
  CornerType,
  ItemType,
  Level,
  SecretType,
  Side,
} from '../types';
import {
  getAnimatedLightSpriteSignature,
  getDynamicSignature,
  getIsometricLightMaskSignature,
  getItemAuraSignature,
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

const expectSignatureChange = (
  signature: () => string,
  mutate: () => void,
): void => {
  const before = signature();
  mutate();
  expect(signature()).not.toBe(before);
};

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

  it('animates enabled carried auras only while discovered and in the viewport', () => {
    const state = createState({
      heroes: [
        {
          name: 'Fearik',
          health: 6,
          position: { x: 1, y: 0 },
          inventory: [{ id: 'boots_of_speed' } as Hero['inventory'][number]],
        } as Hero,
      ],
    });
    const viewport = { x: 0, y: 0, width: 3, height: 1 };

    expect(getItemAuraSignature(state, 0, viewport)).toContain(
      'boots_of_speed',
    );
    expect(getItemAuraSignature(state, 124, viewport)).toBe(
      getItemAuraSignature(state, 0, viewport),
    );
    expect(getItemAuraSignature(state, 125, viewport)).not.toBe(
      getItemAuraSignature(state, 0, viewport),
    );
    expect(getItemAuraSignature(state, 125, { ...viewport, x: 10 })).toBe('');

    const before = getDynamicSignature(state, false, 48);
    state.heroes[0].inventory[0].disabled = true;
    expect(getItemAuraSignature(state, 125, viewport)).toBe('');
    expect(getDynamicSignature(state, false, 48)).not.toBe(before);

    state.heroes[0].inventory[0].disabled = false;
    state.dungeon.discoveredRooms = [];
    expect(getItemAuraSignature(state, 125, viewport)).toBe('');
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

  it('dynamic signature changes when room fog absorption changes', () => {
    const state = createState();
    state.dungeon.layout.roomFog = { A: { density: 0.4 } };
    const before = getDynamicSignature(state, false, 48);
    state.dungeon.layout.roomFog.A.density = 0.7;

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

  it('includes static world changes in the isometric dynamic signature', () => {
    const state = createState();
    state.dungeon.layout.secrets = [
      {
        name: 'Trap door',
        type: SecretType.TRAP_DOOR,
        position: { x: 1, y: 0 },
        found: false,
      },
    ];
    const topDownBefore = getDynamicSignature(state, false, 48);
    const isometricBefore = getDynamicSignature(
      state,
      false,
      48,
      getStaticSignature(state, false, 48),
    );
    state.dungeon.layout.secrets[0].found = true;

    expect(getDynamicSignature(state, false, 48)).toBe(topDownBefore);
    expect(
      getDynamicSignature(
        state,
        false,
        48,
        getStaticSignature(state, false, 48),
      ),
    ).not.toBe(isometricBefore);
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

  it('static signatures observe in-place world and discovery mutations', () => {
    const state = createState();
    const signature = () => getStaticSignature(state, false, 48);
    const door = {
      locked: false,
      open: false,
      trapped: false,
      hidden: false,
      x: 1,
      y: 0,
      side: Side.RIGHT,
      trapAttacks: 0,
      reinforced: false,
    };
    state.dungeon.layout.doors.push(door);
    expectSignatureChange(signature, () => {
      door.open = true;
    });
    expectSignatureChange(signature, () => {
      door.locked = true;
    });
    expectSignatureChange(signature, () => {
      door.hidden = true;
    });

    const secret = {
      name: 'Hidden passage',
      type: SecretType.TRAP_DOOR,
      position: { x: 1, y: 0 },
      found: false,
    };
    state.dungeon.layout.secrets.push(secret);
    expectSignatureChange(signature, () => {
      secret.found = true;
    });

    const interactable = {
      position: { x: 1, y: 0 },
      effect: 'toggleLight',
      interacted: false,
    };
    state.dungeon.layout.interactables = [interactable];
    expectSignatureChange(signature, () => {
      interactable.interacted = true;
    });

    const firstItem = { position: { x: 1, y: 0 } };
    const secondItem = { position: { x: 2, y: 0 } };
    expectSignatureChange(signature, () => {
      state.dungeon.layout.items.push(firstItem);
    });
    expectSignatureChange(signature, () => {
      state.dungeon.layout.items.push(secondItem);
    });
    expectSignatureChange(signature, () => {
      state.dungeon.layout.items.splice(0, 1);
    });

    const decorator = {
      position: { x: 1, y: 0 },
      sprite: { image: 'decorator.png', size: 32, index: 0 },
    };
    state.dungeon.layout.decorators = [decorator];
    expectSignatureChange(signature, () => {
      decorator.sprite.index = 1;
    });

    state.dungeon.layout.terrain = [];
    expectSignatureChange(signature, () => {
      state.dungeon.layout.terrain!.push({
        type: 'water',
        position: { x: 1, y: 0 },
      });
    });
    expectSignatureChange(signature, () => {
      state.dungeon.discoveredRooms.push('B');
    });
    state.dungeon.collapsedCorridors = [];
    expectSignatureChange(signature, () => {
      state.dungeon.collapsedCorridors!.push({
        letter: 'B',
        cells: [{ x: 2, y: 0 }],
      });
    });
  });

  it('dynamic signatures observe in-place actor, item, monster, and light mutations', () => {
    const state = createState();
    const hero: Hero = {
      name: 'Fearik',
      position: { x: 1, y: 0 },
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 7,
      maxHealth: 7,
      colour: Colour.Red,
      experience: 0,
      level: Level.HERO,
      weapon: {
        name: 'Sword',
        amountInDeck: 1,
        type: ItemType.WEAPON,
        value: 0,
        dice: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: false,
        ignoresShield: false,
        ignoresArmour: false,
      },
      inventory: [],
      isInventoryOpen: false,
    };
    state.heroes.push(hero);
    const signature = () => getDynamicSignature(state, false, 48);

    expectSignatureChange(signature, () => {
      hero.health -= 1;
    });
    expectSignatureChange(signature, () => {
      hero.actions -= 1;
    });
    expectSignatureChange(signature, () => {
      hero.position.x += 1;
    });

    const lightItem: Item = {
      id: 'lantern',
      name: 'Lantern',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
      light: { radius: 2 },
    };
    expectSignatureChange(signature, () => {
      hero.inventory.push(lightItem);
    });
    expectSignatureChange(signature, () => {
      lightItem.disabled = true;
    });
    expectSignatureChange(signature, () => {
      hero.blinded = true;
    });
    expectSignatureChange(signature, () => {
      hero.weapon.elemental = true;
    });

    const monster = {
      name: 'Orc',
      position: { x: 2, y: 0 },
      health: 4,
    } as Monster;
    state.dungeon.layout.monsters.push(monster);
    expectSignatureChange(signature, () => {
      state.dungeon.layout.monsters.splice(0, 1);
    });

    const light = { position: { x: 1, y: 0 }, enabled: true };
    state.dungeon.layout.lights = [light];
    expectSignatureChange(signature, () => {
      light.enabled = false;
    });

    const interactable = {
      position: { x: 1, y: 0 },
      effect: 'toggleLight',
      light: { enabled: true },
    };
    state.dungeon.layout.interactables = [interactable];
    expectSignatureChange(signature, () => {
      interactable.light.enabled = false;
    });
    state.eventLights = [];
    expectSignatureChange(signature, () => {
      state.eventLights!.push({
        id: 'event-light',
        position: { x: 2, y: 0 },
      });
    });
    state.dungeon.collapsedCorridors = [];
    expectSignatureChange(signature, () => {
      state.dungeon.collapsedCorridors!.push({
        letter: 'B',
        cells: [{ x: 2, y: 0 }],
      });
    });
  });

  it('isometric light-mask key observes nested geometry and renderer inputs', () => {
    const state = createState();
    const frameLights = [{ position: { x: 1, y: 0 }, radius: 2 }];
    let debugMode = false;
    let lightSig = 'light-signature';
    const view = { zoom: 1 };
    let pixelRatio = 1;
    let lightCanvasSize: [number, number] = [1440, 960];
    let maskCanvasSize: [number, number] = [1440, 960];
    const signature = () =>
      getIsometricLightMaskSignature(
        state,
        debugMode,
        lightSig,
        frameLights,
        view,
        pixelRatio,
        lightCanvasSize,
        maskCanvasSize,
      );

    expectSignatureChange(signature, () => {
      state.dungeon.layout.grid[0] = '#AB#';
    });
    const door = {
      locked: false,
      open: false,
      trapped: false,
      hidden: false,
      x: 1,
      y: 0,
      side: Side.RIGHT,
      trapAttacks: 0,
      reinforced: false,
    };
    state.dungeon.layout.doors.push(door);
    expectSignatureChange(signature, () => {
      door.open = true;
    });
    state.dungeon.layout.pits = [];
    expectSignatureChange(signature, () => {
      state.dungeon.layout.pits!.push({ x: 1, y: 0 });
    });
    expectSignatureChange(signature, () => {
      state.dungeon.layout.corners.push({
        position: { x: 1, y: 0 },
        type: CornerType.INNER_TOP_LEFT,
      });
    });
    state.dungeon.layout.roomFog = { A: { density: 0.3 } };
    expectSignatureChange(signature, () => {
      state.dungeon.layout.roomFog!.A.density = 0.6;
    });
    expectSignatureChange(signature, () => {
      state.dungeon.discoveredRooms.push('B');
    });
    expectSignatureChange(signature, () => {
      state.dungeon.isometricGraphics = 'test-graphics';
    });
    expectSignatureChange(signature, () => {
      frameLights[0].radius = 3;
    });
    expectSignatureChange(signature, () => {
      debugMode = true;
    });
    expectSignatureChange(signature, () => {
      lightSig = 'updated-light-signature';
    });
    expectSignatureChange(signature, () => {
      view.zoom = 2;
    });
    expectSignatureChange(signature, () => {
      pixelRatio = 2;
    });
    expectSignatureChange(signature, () => {
      lightCanvasSize = [2880, 1920];
    });
    expectSignatureChange(signature, () => {
      maskCanvasSize = [2880, 1920];
    });
  });

  it('overlay signature observes pushes to each transient effect list', () => {
    const state = createState();
    const signature = () => getOverlaySignature(state, false, 48);

    expectSignatureChange(signature, () => {
      state.bloodSplatters = [
        {
          id: 'blood',
          position: { x: 1, y: 0 },
          particles: [],
        },
      ];
    });
    expectSignatureChange(signature, () => {
      state.projectiles = [
        {
          id: 'projectile',
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
        },
      ];
    });
    expectSignatureChange(signature, () => {
      state.flameEffects = [
        {
          id: 'flame',
          position: { x: 1, y: 0 },
          sprite: 'fireAoE',
        },
      ];
    });
  });

  it('returns to equal signatures after in-place mutations are reverted', () => {
    const state = createState();
    const door = {
      locked: false,
      open: false,
      trapped: false,
      hidden: false,
      x: 1,
      y: 0,
      side: Side.RIGHT,
      trapAttacks: 0,
      reinforced: false,
    };
    state.dungeon.layout.doors.push(door);
    const hero = {
      name: 'Fearik',
      position: { x: 1, y: 0 },
      health: 7,
      actions: 2,
      movement: 3,
      incapacitated: false,
    } as Hero;
    state.heroes.push(hero);
    const before = {
      static: getStaticSignature(state, false, 48),
      dynamic: getDynamicSignature(state, false, 48),
      overlay: getOverlaySignature(state, false, 48),
    };

    door.open = true;
    hero.health -= 1;
    state.damageIndicators = [
      { id: 'damage', position: { x: 1, y: 0 }, timestamp: 0 },
    ];
    expect(getStaticSignature(state, false, 48)).not.toBe(before.static);
    expect(getDynamicSignature(state, false, 48)).not.toBe(before.dynamic);
    expect(getOverlaySignature(state, false, 48)).not.toBe(before.overlay);

    door.open = false;
    hero.health += 1;
    state.damageIndicators.pop();
    expect(getStaticSignature(state, false, 48)).toBe(before.static);
    expect(getDynamicSignature(state, false, 48)).toBe(before.dynamic);
    expect(getOverlaySignature(state, false, 48)).toBe(before.overlay);
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
