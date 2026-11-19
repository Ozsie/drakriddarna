import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHeroViewModels, buildMonsterViewModels } from './adapters';
import {
  clearActorAnimations,
  getActorFacing,
  playActorAttack,
  recordActorStep,
  setActorFacing,
} from '../core';
import type {
  ActorSprite,
  ActorSpriteFacing,
  Corpse,
  GameState,
  Hero,
  Monster,
} from '../types';
import { Colour, Level, MonsterType } from '../types';
import { weapons } from '../items/weapons';

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string): HTMLImageElement =>
    ({ naturalWidth: 128, width: 128, src: url }) as HTMLImageElement,
}));

const facingOrder: ActorSpriteFacing[] = [
  'east',
  'southEast',
  'south',
  'southWest',
  'west',
  'northWest',
  'north',
  'northEast',
];

const projectedFacing: Record<ActorSpriteFacing, ActorSpriteFacing> = {
  east: 'southEast',
  southEast: 'south',
  south: 'southWest',
  southWest: 'west',
  west: 'northWest',
  northWest: 'north',
  north: 'northEast',
  northEast: 'east',
};

const directionalSprite = (): ActorSprite => {
  const idleCrops: NonNullable<ActorSprite['frameCrops']>['idle'] = {};
  facingOrder.forEach((facing, index) => {
    idleCrops[facing] = { x: index, y: index, size: 30 };
  });
  return {
    frameWidth: 32,
    frameHeight: 32,
    animations: { idle: 1, walk: 1, attack: 1 },
    animationImages: {
      idle: 'facing-sheet.png',
      walk: 'facing-sheet.png',
      attack: 'facing-sheet.png',
    },
    facings: facingOrder,
    frameCrops: { idle: idleCrops, walk: idleCrops, attack: idleCrops },
  };
};

const makeHero = (name: string): Hero => ({
  name,
  actions: 2,
  movement: 2,
  maxMovement: 2,
  defense: 0,
  health: 5,
  maxHealth: 5,
  colour: Colour.Red,
  experience: 0,
  position: { x: 0, y: 0 },
  level: Level.APPRENTICE,
  weapon: weapons[0],
  inventory: [],
  isInventoryOpen: false,
  sprite: directionalSprite(),
});

const makeMonster = (): Monster =>
  ({
    name: 'Orc',
    type: MonsterType.ORC,
    actions: 2,
    movement: 2,
    maxMovement: 2,
    defense: 0,
    health: 3,
    maxHealth: 4,
    colour: Colour.Green,
    experience: 1,
    position: { x: 0, y: 0 },
    level: Level.APPRENTICE,
    inventory: [],
    sprite: directionalSprite(),
  }) as unknown as Monster;

const makeState = (
  heroes: Hero[] = [],
  monsters: Monster[] = [],
  corpses: Corpse[] = [],
): GameState => ({
  heroes,
  dungeon: {
    name: 'Test Dungeon',
    intro: '',
    discoveredRooms: ['A'],
    layout: {
      grid: ['A'],
      doors: [],
      monsters,
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      corpses,
    },
    startingPositions: [],
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
  drawEvents: false,
});

describe('isometric actor facing', () => {
  afterEach(() => {
    clearActorAnimations();
  });

  it.each(facingOrder)(
    'projects hero grid facing %s while keeping the default builder top-down',
    (gridFacing) => {
      const actor = makeHero('Hero');
      setActorFacing(actor, gridFacing, 1_000);
      const state = makeState([actor]);

      const topDown = buildHeroViewModels(
        state,
        {} as CanvasImageSource,
        false,
        1_000,
      )[0];
      const isometric = buildHeroViewModels(
        state,
        {} as CanvasImageSource,
        false,
        1_000,
        'isometric',
      )[0];
      const topDownRow = facingOrder.indexOf(gridFacing);
      const isometricRow = facingOrder.indexOf(projectedFacing[gridFacing]);

      expect(topDown.sprite).toMatchObject({
        sx: topDownRow,
        sy: topDownRow * 32 + topDownRow,
        sw: 30,
      });
      expect(isometric.sprite).toMatchObject({
        sx: isometricRow,
        sy: isometricRow * 32 + isometricRow,
        sw: 30,
      });
      expect(getActorFacing(actor)).toBe(gridFacing);
    },
  );

  it('projects a grid-south walk and attack to screen down-left', () => {
    const actor = makeHero('Hero');
    recordActorStep(actor, { x: 0, y: 1 }, 200, 1_000);
    const state = makeState([actor]);

    const [walking] = buildHeroViewModels(
      state,
      {} as CanvasImageSource,
      false,
      1_050,
      'isometric',
    );
    playActorAttack(actor, 300, 1_060);
    const [attacking] = buildHeroViewModels(
      state,
      {} as CanvasImageSource,
      false,
      1_080,
      'isometric',
    );

    expect(walking.sprite).toMatchObject({ sx: 3, sy: 3 * 32 + 3 });
    expect(attacking.sprite).toMatchObject({ sx: 3, sy: 3 * 32 + 3 });
    expect(getActorFacing(actor)).toBe('south');
  });

  it('uses the projected facing for monster sprite frames and crops', () => {
    const actor = makeMonster();
    setActorFacing(actor, 'south', 1_000);
    const state = makeState([], [actor]);

    const [view] = buildMonsterViewModels(
      state,
      {} as CanvasImageSource,
      false,
      1_000,
      'isometric',
    );

    expect(view.sprite).toMatchObject({
      sx: 3,
      sy: 3 * 32 + 3,
      sw: 30,
      sh: 30,
    });
    expect(getActorFacing(actor)).toBe('south');
  });
});
