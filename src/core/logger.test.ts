import { describe, it, expect } from 'vitest';
import { addLog, doReRender, i18n } from './logger';
import type { Dungeon, GameState } from '../types';
import enContent from '../lib/translations/en/content.json';
import svContent from '../lib/translations/sv/content.json';

const dummyDungeon: Dungeon = {
  name: 'Test',
  intro: 'test-dungeon',
  layout: {
    grid: [],
    corridors: [],
    doors: [],
    items: [],
    monsters: [],
    notes: [],
    pillars: [],
    pits: [],
    secrets: [],
    corners: [],
  },
  startingPositions: [],
  discoveredRooms: [],
  winConditions: [],
  beaten: false,
  killCount: 0,
};

describe('logger module', () => {
  it('i18n returns key when translation is not loaded or missing', () => {
    expect(i18n('logs.gameSaved')).toBe('logs.gameSaved');
  });

  it('doReRender flags state as reRender = true', () => {
    const state: GameState = {
      heroes: [],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      drawEvents: true,
    };

    doReRender(state);
    expect(state.reRender).toBe(true);
  });

  it('addLog prepends log entries with current turn count', () => {
    const state: GameState = {
      heroes: [],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      turnCount: 3,
      drawEvents: true,
    };

    addLog(state, 'test.message', { foo: 'bar' });

    expect(state.actionLog).toHaveLength(1);
    expect(state.actionLog[0]).toEqual({
      key: 'test.message',
      properties: { foo: 'bar' },
      turn: 3,
    });
    expect(state.reRender).toBe(true);
  });

  it('contains matching indicator translation keys in en and sv content.json', () => {
    const expectedKeys = [
      'plusAction',
      'plusActions',
      'minusAction',
      'minusActions',
      'moreActions',
      'blinded',
      'elemental',
      'weakened',
      'invisible',
      'levelUp',
    ];

    expect(enContent.indicators).toBeDefined();
    expect(svContent.indicators).toBeDefined();

    for (const key of expectedKeys) {
      expect(enContent.indicators).toHaveProperty(key);
      expect(svContent.indicators).toHaveProperty(key);
      expect(
        typeof enContent.indicators[key as keyof typeof enContent.indicators],
      ).toBe('string');
      expect(
        typeof svContent.indicators[key as keyof typeof svContent.indicators],
      ).toBe('string');
    }
  });
});
