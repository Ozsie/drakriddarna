import { describe, it, expect } from 'vitest';
import { resolveTileset } from './TilesetLogic';
import type { Campaign, Dungeon } from '../types';

const createDungeon = (tileset?: string): Dungeon =>
  ({
    name: 'Test Dungeon',
    intro: '',
    layout: {
      grid: [],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    },
    startingPositions: [],
    discoveredRooms: [],
    winConditions: [],
    beaten: false,
    killCount: 0,
    ...(tileset ? { tileset } : {}),
  }) as Dungeon;

const createCampaign = (tileset?: string): Campaign =>
  ({
    id: 'testCampaign',
    name: 'Test Campaign',
    dungeons: [],
    heroes: [],
    itemDeck: [],
    magicItemDeck: [],
    ...(tileset ? { tileset } : {}),
  }) as Campaign;

describe('resolveTileset', () => {
  const fallback = 'default-tiles.png';

  it('uses the fallback tileset when neither dungeon nor campaign defines one', () => {
    expect(resolveTileset(createDungeon(), createCampaign(), fallback)).toBe(
      fallback,
    );
  });

  it('uses the fallback tileset when dungeon and campaign are undefined', () => {
    expect(resolveTileset(undefined, undefined, fallback)).toBe(fallback);
  });

  it('uses the campaign tileset when only the campaign defines one', () => {
    expect(
      resolveTileset(createDungeon(), createCampaign('ice.png'), fallback),
    ).toBe('ice.png');
  });

  it('uses the dungeon tileset when only the dungeon defines one', () => {
    expect(
      resolveTileset(createDungeon('lava.png'), createCampaign(), fallback),
    ).toBe('lava.png');
  });

  it('prefers the dungeon tileset over the campaign tileset', () => {
    expect(
      resolveTileset(
        createDungeon('lava.png'),
        createCampaign('ice.png'),
        fallback,
      ),
    ).toBe('lava.png');
  });
});
