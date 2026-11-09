import { describe, it, expect, vi } from 'vitest';
import { buildCorpseViewModels } from './adapters';
import type { Corpse, GameState } from '../types';

// The corpse's frozen frame needs a loaded sheet to resolve, which never
// happens in the test environment; this suite mocks the image cache with
// a ready 128px-wide image so the draw coordinates of the last death
// frame can be pinned (the rest of the corpse rules are covered in
// adapters.test.ts).

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string): HTMLImageElement | null =>
    ({ naturalWidth: 128, width: 128, src: url }) as HTMLImageElement,
}));

const stateWithCorpses = (corpses: Corpse[]): GameState => ({
  heroes: [],
  dungeon: {
    name: 'Test Dungeon',
    intro: '',
    discoveredRooms: ['A'],
    layout: {
      grid: ['A'],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      pillars: [],
      pits: [],
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

describe('corpse frames', () => {
  const now = 1_000_000;

  it('freezes the corpse on the last frame of the shared sheet death row', () => {
    const state = stateWithCorpses([
      {
        position: { x: 0, y: 0 },
        sprite: {
          image: 'sheet.png',
          frameWidth: 32,
          frameHeight: 32,
        },
        facing: 'south',
      },
    ]);

    const [view] = buildCorpseViewModels(state, now);

    // 128px-wide sheet at 32px frames: 4 frames, last one at x=96;
    // the death row is the 5th (index 4) of the shared sheet's rows.
    expect(view.sprite).toMatchObject({
      sx: 96,
      sy: 128,
      sw: 32,
      sh: 32,
    });
  });

  it('prefers the declared death frame count over the sheet geometry', () => {
    const state = stateWithCorpses([
      {
        position: { x: 0, y: 0 },
        sprite: {
          image: 'sheet.png',
          frameWidth: 32,
          frameHeight: 32,
          animations: { death: 15 },
        },
        facing: 'south',
      },
    ]);

    const [view] = buildCorpseViewModels(state, now);

    expect(view.sprite).toMatchObject({ sx: 14 * 32 });
  });

  it('draws per-animation packs on the facing row it fell at', () => {
    const state = stateWithCorpses([
      {
        position: { x: 0, y: 0 },
        sprite: {
          frameWidth: 32,
          frameHeight: 32,
          animations: { death: 4 },
          animationImages: { death: 'characters/knight/Die.png' },
          facings: ['east', 'south'],
          frameCrops: {
            death: { south: { x: 2, y: 4, size: 28 } },
          },
        },
        facing: 'south',
      },
    ]);

    const [view] = buildCorpseViewModels(state, now);

    // The pack's last frame at the 'south' row (index 1), inside its
    // declared crop window.
    expect(view.sprite).toMatchObject({
      sx: 3 * 32 + 2,
      sy: 32 + 4,
      sw: 28,
      sh: 28,
    });
  });
});
