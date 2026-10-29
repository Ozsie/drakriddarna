import { describe, expect, it } from 'vitest';
import { campaigns } from '../index';
import en from './translations/en.json';
import sv from './translations/sv.json';

describe('brogue campaign', () => {
  it('is registered through the real auto-discovery path', () => {
    const campaign = campaigns['brogue'];
    expect(campaign).toBeDefined();
    expect(campaign.id).toBe('brogue');
    expect(campaign.name).toBe('campaign.brogue.name');
    expect(campaign.heroes.length).toBe(4);
  });

  it('exposes a chain of 10 dungeons', () => {
    const { dungeons } = campaigns['brogue'];
    expect(dungeons.length).toBe(10);
    for (let i = 0; i < dungeons.length - 1; i++) {
      expect(dungeons[i].nextDungeon).toBe(dungeons[i + 1]);
    }
    expect(dungeons[9].nextDungeon).toBeUndefined();
  });

  it('resolves every emitted translation key in both languages', () => {
    for (const translations of [en, sv]) {
      const brogue = translations['brogue'];
      expect(brogue).toBeDefined();
      expect(Object.keys(brogue)).toContain('name');
      expect(Object.keys(brogue.secrets)).toEqual(
        expect.arrayContaining(['randomEquipment', 'trapDoor']),
      );
      for (let depth = 1; depth <= 10; depth++) {
        const floor = (
          brogue as unknown as Record<string, Record<string, unknown>>
        )[`floor${depth}`];
        expect(Object.keys(floor ?? {})).toEqual(
          expect.arrayContaining(['name', 'intro']),
        );
      }
    }
  });
});
