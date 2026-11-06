import { describe, it, expect } from 'vitest';
import type { Dungeon } from '../types';
import type { SceneDungeonView } from '@hoard-engine/scene';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';

// The dungeon-plane contract is consumer-defined: the renderer declares
// the plain shapes it reads and the game's Dungeon passes by structural
// compatibility (docs/engine-packages.md, dependency rule 1). These
// tests pin that compatibility at compile time — a change to Dungeon or
// to the contract that breaks it fails type-checking here first.

describe('SceneDungeonView contract', () => {
  it('the game Dungeon satisfies the view contract structurally', () => {
    const toView = (dungeon: Dungeon): SceneDungeonView => dungeon;
    expect(toView).toBeDefined();
  });

  it('a campaign dungeon passes as the view contract', () => {
    const toView = (dungeon: Dungeon): SceneDungeonView => dungeon;
    expect(toView(e1m0).layout).toBeDefined();
    expect(toView(e1m0).discoveredRooms).toContain('A');
  });
});
