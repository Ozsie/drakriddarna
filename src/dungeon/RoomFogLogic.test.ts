import { describe, expect, it } from 'vitest';
import type { Actor, GameState, Layout, RoomFogOptions } from '../types';
import { Level } from '../types';
import {
  applyRoomFogEnterEffects,
  applyRoomFogTurnEndEffects,
  roomFogAt,
} from './RoomFogLogic';

const actor = (health: number): Actor =>
  ({
    name: 'hero.test',
    health,
    level: Level.KNIGHT,
    position: { x: 1, y: 1 },
  }) as unknown as Actor;

const makeState = (
  grid: string[],
  roomFog: Record<string, RoomFogOptions>,
  heroes: Actor[],
): GameState =>
  ({
    actionLog: [],
    heroes,
    dungeon: {
      layout: { grid, roomFog } as unknown as Layout,
      discoveredRooms: ['A'],
    },
  }) as unknown as GameState;

describe('roomFogAt', () => {
  it('finds the fog options of the room a position is in', () => {
    const state = makeState(['AAA', 'AAA'], { A: { opacity: 0.4 } }, []);
    expect(roomFogAt(state.dungeon.layout, { x: 1, y: 1 })?.opacity).toBe(0.4);
  });

  it('returns undefined outside fogged rooms', () => {
    const state = makeState(['AAA', 'ABB'], { A: { opacity: 0.4 } }, []);
    expect(roomFogAt(state.dungeon.layout, { x: 1, y: 0 })).toBeDefined();
    expect(roomFogAt(state.dungeon.layout, { x: 1, y: 1 })).toBeUndefined();
  });
});

describe('applyRoomFogEnterEffects', () => {
  it('applies the fog damage on enter to a hero in the room', () => {
    const hero = actor(5);
    const state = makeState(['AAA', 'AAA'], { A: { damageOnEnter: 2 } }, [
      hero,
    ]);
    applyRoomFogEnterEffects(state, hero);
    expect(hero.health).toBe(3);
    expect(state.damageIndicators).toHaveLength(1);
    expect(state.actionLog[0].key).toBe('logs.terrain.enterDamage');
  });

  it('applies no damage without fog damage configured', () => {
    const hero = actor(5);
    const state = makeState(['AAA', 'AAA'], { A: { opacity: 0.4 } }, [hero]);
    applyRoomFogEnterEffects(state, hero);
    expect(hero.health).toBe(5);
    expect(state.actionLog).toHaveLength(0);
  });

  it('does nothing to an actor outside a fogged room', () => {
    const hero = actor(5);
    hero.position = { x: 1, y: 1 };
    const state = makeState(['AAA', 'ABB'], { A: { damageOnEnter: 2 } }, [
      hero,
    ]);
    applyRoomFogEnterEffects(state, hero);
    expect(hero.health).toBe(5);
  });
});

describe('applyRoomFogTurnEndEffects', () => {
  it('applies the fog damage on turn end to a hero in the room', () => {
    const hero = actor(5);
    const state = makeState(['AAA', 'AAA'], { A: { damageOnTurnEnd: 1 } }, [
      hero,
    ]);
    applyRoomFogTurnEndEffects(state, hero);
    expect(hero.health).toBe(4);
    expect(state.actionLog[0].key).toBe('logs.terrain.turnEndDamage');
  });

  it('ignores the on-enter damage when ending the turn', () => {
    const hero = actor(5);
    const state = makeState(['AAA', 'AAA'], { A: { damageOnEnter: 3 } }, [
      hero,
    ]);
    applyRoomFogTurnEndEffects(state, hero);
    expect(hero.health).toBe(5);
  });

  it('uses the fog name translation key in the killed log', () => {
    const hero = actor(1);
    const state = makeState(
      ['AAA', 'AAA'],
      {
        A: {
          damageOnTurnEnd: 2,
          nameTranslationKey: 'campaign.test.poisonFog',
        },
      },
      [hero],
    );
    applyRoomFogTurnEndEffects(state, hero);
    expect(hero.health).toBe(0);
    expect(state.actionLog[0].key).toBe('logs.terrain.killed');
    expect(state.actionLog[0].properties?.terrain).toBe(
      'campaign.test.poisonFog',
    );
  });
});
