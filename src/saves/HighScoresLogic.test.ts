import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MAX_HIGH_SCORES,
  getCampaignHighScores,
  loadHighScores,
  recordHighScore,
} from './HighScoresLogic';

describe('HighScoresLogic', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const key in storageMock) {
      delete storageMock[key];
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        for (const key in storageMock) {
          delete storageMock[key];
        }
      },
    });
  });

  it('returns an empty list when nothing is recorded', () => {
    expect(getCampaignHighScores('iceDragonTreasure')).toEqual([]);
    expect(loadHighScores()).toEqual({});
  });

  it('records and reloads scores, best first', () => {
    recordHighScore('iceDragonTreasure', 500);
    recordHighScore('iceDragonTreasure', 900);
    recordHighScore('iceDragonTreasure', 700);

    const entries = getCampaignHighScores('iceDragonTreasure');
    expect(entries.map((entry) => entry.score)).toEqual([900, 700, 500]);
    expect(entries[0].date).toBeDefined();
  });

  it('keeps lists per campaign separate', () => {
    recordHighScore('iceDragonTreasure', 500);
    recordHighScore('otherCampaign', 100);

    expect(getCampaignHighScores('iceDragonTreasure')).toHaveLength(1);
    expect(getCampaignHighScores('otherCampaign')).toHaveLength(1);
    expect(getCampaignHighScores('iceDragonTreasure')[0].score).toBe(500);
  });

  it('caps the stored list at the maximum length', () => {
    for (let i = 1; i <= MAX_HIGH_SCORES + 5; i++) {
      recordHighScore('iceDragonTreasure', i * 10);
    }

    const entries = getCampaignHighScores('iceDragonTreasure');
    expect(entries).toHaveLength(MAX_HIGH_SCORES);
    expect(entries[0].score).toBe((MAX_HIGH_SCORES + 5) * 10);
    expect(entries[MAX_HIGH_SCORES - 1].score).toBe(60);
  });

  it('ignores zero scores', () => {
    expect(recordHighScore('iceDragonTreasure', 0)).toEqual([]);
    recordHighScore('iceDragonTreasure', 300);
    expect(recordHighScore('iceDragonTreasure', 0)).toHaveLength(1);
  });

  it('tolerates a corrupted stored payload', () => {
    storageMock['highScores'] = '{not json';
    expect(getCampaignHighScores('iceDragonTreasure')).toEqual([]);
  });
});
