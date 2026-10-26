import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../types';
import type {
  BetweenDungeonsHitResult,
  DungeonIntroHitResult,
  EventCardHitResult,
  HeroCardsHitResult,
  MenuHitResult,
  MonsterCardsHitResult,
  DiaryAndWinConditionsHitResult,
  TopBarHitElement,
} from '../ui/UIRendering';
import {
  findUiHit,
  type UiHitContext,
  type UiHitTesters,
} from './DungeonBoardUiHit';

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

const createContext = (overrides?: Partial<UiHitContext>): UiHitContext => ({
  viewWidth: 800,
  viewHeight: 600,
  state: createState(),
  x: 10,
  y: 10,
  ctx: null,
  showDungeonIntro: false,
  dungeonIntroDismissed: false,
  isLogOpen: false,
  debugMode: false,
  isCanvasMenuOpen: false,
  menuView: 'main',
  menuCallbacks: {},
  buildInfo: { date: 'today', hash: 'abc' },
  eventCardCollapsed: false,
  ...overrides,
});

const bdHit: BetweenDungeonsHitResult = { type: 'actionButton' };
const introHit: DungeonIntroHitResult = { type: 'backdrop' };
const menuHit: MenuHitResult = { type: 'item', item: { id: 'x' } as never };
const heroHit: HeroCardsHitResult = {
  type: 'inventoryButton',
  hero: { name: 'Fearik' } as never,
};
const monsterHit: MonsterCardsHitResult = {
  type: 'card',
  monster: {} as never,
};
const diaryHit: DiaryAndWinConditionsHitResult = { type: 'panel' };
const eventHit: EventCardHitResult = { type: 'toggle' };

const noHitTesters: UiHitTesters = {
  betweenDungeons: () => null,
  dungeonIntro: () => null,
  topBar: () => null,
  menu: () => null,
  heroCards: () => null,
  monsterCards: () => null,
  diary: () => null,
  eventCard: () => null,
};

describe('findUiHit cascade', () => {
  it('returns null when no UI element is hit', () => {
    expect(findUiHit(createContext(), noHitTesters)).toBeNull();
  });

  it('asks the testers in cascade order and stops at the first hit', () => {
    const testers = {
      ...noHitTesters,
      topBar: () => 'menu' as TopBarHitElement,
      heroCards: vi.fn(() => heroHit),
    };
    const hit = findUiHit(createContext(), testers);
    expect(hit).toEqual({ kind: 'topBar', hit: 'menu' });
    expect(testers.heroCards).not.toHaveBeenCalled();
  });

  it('tests the between-dungeons overlay first when it is active', () => {
    const testers = {
      ...noHitTesters,
      betweenDungeons: () => bdHit,
      topBar: () => 'menu' as TopBarHitElement,
    };
    const hit = findUiHit(
      createContext({ state: createState({ betweenDungeons: undefined }) }),
      testers,
    );
    expect(hit).toEqual({ kind: 'topBar', hit: 'menu' });
  });

  it('skips a between-dungeons miss and continues the cascade', () => {
    const testers = {
      ...noHitTesters,
      betweenDungeons: () => null,
      topBar: () => 'menu' as TopBarHitElement,
    };
    const hit = findUiHit(createContext(), testers);
    expect(hit).toEqual({ kind: 'topBar', hit: 'menu' });
  });

  it('only tests the dungeon intro while it is shown', () => {
    const testers = {
      ...noHitTesters,
      dungeonIntro: vi.fn(() => introHit),
    };
    expect(findUiHit(createContext(), testers)).toBeNull();
    expect(testers.dungeonIntro).not.toHaveBeenCalled();

    const hit = findUiHit(createContext({ showDungeonIntro: true }), testers);
    expect(hit).toEqual({ kind: 'dungeonIntro', hit: introHit });
  });

  it('only tests the canvas menu while it is open', () => {
    const testers = {
      ...noHitTesters,
      menu: vi.fn(() => menuHit),
    };
    expect(findUiHit(createContext(), testers)).toBeNull();
    expect(testers.menu).not.toHaveBeenCalled();

    const hit = findUiHit(createContext({ isCanvasMenuOpen: true }), testers);
    expect(hit).toEqual({ kind: 'menu', hit: menuHit });
  });

  it('orders hero cards before monster cards, diary and event card', () => {
    const testers: UiHitTesters = {
      ...noHitTesters,
      heroCards: () => heroHit,
      monsterCards: () => monsterHit,
      diary: () => diaryHit,
      eventCard: () => eventHit,
    };
    expect(findUiHit(createContext(), testers)).toEqual({
      kind: 'heroCards',
      hit: heroHit,
    });
  });

  it('orders the diary before the event card', () => {
    const testers: UiHitTesters = {
      ...noHitTesters,
      diary: () => diaryHit,
      eventCard: () => eventHit,
    };
    expect(findUiHit(createContext(), testers)).toEqual({
      kind: 'diary',
      hit: diaryHit,
    });
  });

  it('forwards the board position and options to each tester', () => {
    const topBar = vi.fn(() => null as TopBarHitElement);
    const menu = vi.fn(() => null);
    const eventCard = vi.fn(() => null);
    const context = createContext({
      x: 123,
      y: 45,
      isLogOpen: true,
      debugMode: true,
      isCanvasMenuOpen: true,
      menuView: 'debug',
      eventCardCollapsed: true,
    });
    findUiHit(context, { ...noHitTesters, topBar, menu, eventCard });

    expect(topBar).toHaveBeenCalledWith(
      context.viewWidth,
      context.state,
      123,
      45,
      null,
      { isLogOpen: true, debugMode: true },
    );
    expect(menu).toHaveBeenCalledWith(
      context.viewWidth,
      context.viewHeight,
      context.state,
      {
        view: 'debug',
        debugMode: true,
        callbacks: {},
        buildInfo: context.buildInfo,
      },
      123,
      45,
    );
    expect(eventCard).toHaveBeenCalledWith(
      context.viewWidth,
      context.viewHeight,
      context.state,
      true,
      123,
      45,
    );
  });
});
