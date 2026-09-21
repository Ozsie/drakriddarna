/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  renderDoors,
  renderGrid,
  renderPillars,
  renderSecrets,
} from './DungeonRendering';
import { renderHeroes } from '../hero/HeroRendering';
import { renderMonsters } from '../monsters/MonsterRendering';
import { renderNotes } from '../notes/NotesRendering';
import { renderDamageIndicators } from '../combat/DamageIndicatorRendering';
import { renderItems } from '../items/ItemRendering';
import { recordActorStep, clearActorAnimations } from '../core';
import { weapons, monsterWeapons } from '../items/weapons';
import type { GameState, Hero, Monster } from '../types';
import {
  Colour,
  Level,
  MonsterType,
  Side,
  SecretType,
  ItemType,
} from '../types';

const createMockState = (): GameState => {
  const hero: Hero = {
    name: 'Fearik',
    actions: 2,
    movement: 4,
    maxMovement: 4,
    defense: 2,
    health: 6,
    maxHealth: 6,
    colour: Colour.Red,
    experience: 0,
    position: { x: 1, y: 1 },
    level: Level.APPRENTICE,
    weapon: weapons[0],
    inventory: [],
    isInventoryOpen: false,
  };

  const monster: Monster = {
    name: 'Orc (Green)',
    type: MonsterType.ORC,
    actions: 2,
    movement: 4,
    maxMovement: 4,
    defense: 1,
    health: 4,
    maxHealth: 4,
    colour: Colour.Green,
    experience: 1,
    position: { x: 2, y: 2 },
    level: Level.APPRENTICE,
    weapon: monsterWeapons[0],
    inventory: [],
  };

  return {
    dungeon: {
      name: 'Test Dungeon',
      discoveredRooms: ['A'],
      layout: {
        grid: ['AAA', 'AAA', 'AAA'],
        doors: [
          {
            x: 1,
            y: 0,
            side: Side.UP,
            open: false,
            locked: false,
            hidden: false,
            trapped: false,
            trapAttacks: 0,
          },
        ],
        secrets: [
          {
            name: 'Trap',
            type: SecretType.TRAP_DOOR,
            position: { x: 2, y: 1 },
            found: true,
          },
        ],
        monsters: [monster],
        notes: [{ message: 'Secret note', position: { x: 1, y: 1 } }],
        items: [
          {
            item: {
              name: 'Potion',
              type: ItemType.MAGIC,
              value: 10,
              amountInDeck: 1,
            },
            position: { x: 0, y: 1 },
          },
        ],
        corridors: [],
        corners: [],
        pillars: [{ x: 0, y: 0 }],
        pits: [{ x: 2, y: 0 }],
      },
      startingPositions: [{ x: 1, y: 1 }],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    heroes: [hero],
    currentActor: hero,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: { cellSize: 48 },
    eventDeck: [],
    reRender: false,
  };
};

const createMockCtx = () =>
  ({
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

describe('Multi-Layer Canvas Rendering Pipeline', () => {
  it('renders static layers (grid, secrets, items, doors, pillars) onto static context', () => {
    const state = createMockState();
    const staticCtx = createMockCtx();
    const mockGround = { src: 'ground.png' } as unknown as CanvasImageSource;

    renderGrid(staticCtx, mockGround, 48, state, false);
    renderSecrets(staticCtx, mockGround, 48, state, false);
    renderItems(staticCtx, mockGround, 48, state, false);
    renderDoors(staticCtx, mockGround, 48, state, false);
    renderPillars(staticCtx, mockGround, 48, state, false);

    expect(staticCtx.drawImage).toHaveBeenCalled();
  });

  it('renders dynamic actors (heroes, monsters) onto dynamic context without touching static layer', () => {
    const state = createMockState();
    const actorCtx = createMockCtx();
    const mockActors = { src: 'actors.png' } as unknown as CanvasImageSource;

    renderMonsters(actorCtx, mockActors, 48, state, false);
    renderHeroes(actorCtx, mockActors, 48, state, false);

    expect(actorCtx.drawImage).toHaveBeenCalled();
    expect(actorCtx.fillRect).toHaveBeenCalled();
  });

  it('renders overlay notes and damage indicators onto overlay context', () => {
    const state = createMockState();
    state.damageIndicators = [{ id: '1', damage: 4, position: { x: 1, y: 1 } }];
    const overlayCtx = createMockCtx();
    const mockActors = { src: 'actors.png' } as unknown as CanvasImageSource;

    renderNotes(overlayCtx, mockActors, 48, state, false);
    renderDamageIndicators(overlayCtx, 48, state, Date.now());

    expect(overlayCtx.fillText).toHaveBeenCalled();
    expect(overlayCtx.fill).toHaveBeenCalled();
  });

  it('tracks active actor animations during dynamic render loop', () => {
    clearActorAnimations();
    const state = createMockState();
    const actorCtx = createMockCtx();
    const mockActors = { src: 'actors.png' } as unknown as CanvasImageSource;
    const now = 10000;

    // Stationary actors should return false
    const heroAnimStationary = renderHeroes(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now,
    );
    const monsterAnimStationary = renderMonsters(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now,
    );
    expect(heroAnimStationary).toBe(false);
    expect(monsterAnimStationary).toBe(false);

    // Record movement step
    recordActorStep(state.heroes[0], { x: 2, y: 1 }, 200, now);
    recordActorStep(state.dungeon.layout.monsters[0], { x: 3, y: 2 }, 200, now);

    // While in progress: both should return true
    const heroAnimMoving = renderHeroes(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now + 50,
    );
    const monsterAnimMoving = renderMonsters(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now + 50,
    );
    expect(heroAnimMoving).toBe(true);
    expect(monsterAnimMoving).toBe(true);

    // After animation duration finishes: both should return false
    const heroAnimFinished = renderHeroes(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now + 250,
    );
    const monsterAnimFinished = renderMonsters(
      actorCtx,
      mockActors,
      48,
      state,
      false,
      now + 250,
    );
    expect(heroAnimFinished).toBe(false);
    expect(monsterAnimFinished).toBe(false);
  });
});
