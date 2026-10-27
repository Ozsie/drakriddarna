/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest';
import {
  getCurrentDirectorState,
  renderDebugPrintout,
} from './DebugOverlayRendering';
import { getHeroCardsLayout } from './HeroCardRendering';
import type { GameState, Hero } from '../types';
import { Colour, ItemType, Level } from '../types';

const createMockHero = (name = 'Hero1'): Hero => ({
  name,
  actions: 2,
  movement: 4,
  maxMovement: 4,
  defense: 1,
  health: 6,
  maxHealth: 6,
  colour: Colour.Red,
  experience: 0,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Sword',
    dice: 2,
    amountInDeck: 1,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 10,
    ignoresShield: false,
    ignoresArmour: false,
    useHearHeroes: true,
  },
  inventory: [],
  isInventoryOpen: false,
});

const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
  heroes: [createMockHero()],
  dungeon: {
    name: 'Test Dungeon',
    beaten: false,
    winConditions: [],
    events: [],
    intro: '',
    killCount: 0,
    discoveredRooms: ['A'],
    layout: {
      grid: ['AAA'],
      doors: [],
      monsters: [],
      secrets: [],
      interactables: [],
      items: [],
      pillars: [],
      pits: [],
      notes: [],
      corridors: [],
      corners: [],
    },
    startingPositions: [{ x: 1, y: 1 }],
  },
  actionLog: [],
  itemDeck: [],
  magicItemDeck: [],
  settings: {},
  eventDeck: [],
  reRender: false,
  drawEvents: false,
  ...overrides,
});

const createMockCtx = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    font: '',
    fillText: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

describe('DebugOverlayRendering', () => {
  it('draws the re-render counter just above the hero cards', () => {
    const ctx = createMockCtx();
    const viewWidth = 800;
    const viewHeight = 600;
    const state = createMockState();
    const heroCardsTop = getHeroCardsLayout(viewWidth, viewHeight, state)
      .containerBounds.y;

    renderDebugPrintout(ctx, viewWidth, viewHeight, state, {
      totalReRenders: 7,
      staticReRenders: 3,
      dynamicReRenders: 4,
      dynamicFps: 60,
      overlayFps: 30,
    });

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(ctx.fillText).mock.calls;
    expect(calls[0][0]).toBe('Re-renders: 7 (Static: 3, Dynamic: 4)');
    expect(calls[0][1]).toBe(8);
    expect(calls[0][2]).toBe(heroCardsTop - 6 - 24);
    expect(calls[1][0]).toBe('FPS (Dynamic: 60, Overlay: 30)');
    expect(calls[1][1]).toBe(8);
    expect(calls[1][2]).toBe(heroCardsTop - 6 - 12);
    expect(calls[2][0]).toBe(
      `Director: ${String(getCurrentDirectorState(state))}`,
    );
    expect(calls[2][1]).toBe(8);
    expect(calls[2][2]).toBe(heroCardsTop - 6);
  });

  it('shows a placeholder director line without state', () => {
    const ctx = createMockCtx();
    renderDebugPrintout(ctx, 800, 600, null, {
      totalReRenders: 1,
      staticReRenders: 1,
      dynamicReRenders: 0,
      dynamicFps: 0,
      overlayFps: 0,
    });

    const calls = vi.mocked(ctx.fillText).mock.calls;
    expect(calls[2][0]).toBe('Director: -');
    expect(calls[2][2]).toBe(600 - 6);
  });

  it('falls back to the bottom of the view without hero cards', () => {
    const ctx = createMockCtx();
    const viewWidth = 800;
    const viewHeight = 600;

    renderDebugPrintout(ctx, viewWidth, viewHeight, undefined, {
      totalReRenders: 1,
      staticReRenders: 1,
      dynamicReRenders: 0,
      dynamicFps: 0,
      overlayFps: 0,
    });

    const [, , y] = vi.mocked(ctx.fillText).mock.calls[2];
    expect(y).toBe(viewHeight - 6);
  });

  it('never draws above the top of the view', () => {
    const ctx = createMockCtx();
    renderDebugPrintout(ctx, 800, 20, createMockState(), {
      totalReRenders: 1,
      staticReRenders: 1,
      dynamicReRenders: 0,
      dynamicFps: 0,
      overlayFps: 0,
    });

    const [, , y] = vi.mocked(ctx.fillText).mock.calls[0];
    expect(y).toBeGreaterThanOrEqual(14);
  });
});
