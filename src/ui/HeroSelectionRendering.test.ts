import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildSelectedHeroes,
  clampHeroName,
  getDefaultSelectedHeroIds,
  getHeroSelectionHit,
  getHeroSelectionLayout,
  getMaxHeroes,
  isHeroSelectionStartEnabled,
  toggleHeroSelection,
  MAX_HERO_NAME_LENGTH,
  MIN_PARTY_SIZE,
} from './HeroSelectionRendering';
import { campaigns, getCampaign } from '../campaigns';
import { loadTranslations } from '$lib/translations';

describe('HeroSelectionRendering', () => {
  beforeAll(async () => {
    // Labels are human-authored translations; without a loaded locale
    // i18n falls back to the raw keys.
    await loadTranslations('en');
  });

  const campaign = getCampaign('iceDragonTreasure');
  const rosterIds = campaign.heroes.map((hero) => hero.id ?? '');

  describe('campaign limits', () => {
    it('defaults maxHeroes to the roster size', () => {
      expect(getMaxHeroes(campaign)).toBe(campaign.heroes.length);
    });

    it('caps maxHeroes and never goes below one', () => {
      const capped = { ...campaign, maxHeroes: 2 };
      expect(getMaxHeroes(capped)).toBe(2);
      expect(getMaxHeroes({ ...campaign, maxHeroes: 0 })).toBe(MIN_PARTY_SIZE);
    });
  });

  describe('selection logic', () => {
    it('selects the whole roster up to the maximum by default', () => {
      const capped = { ...campaign, maxHeroes: 2 };
      expect(getDefaultSelectedHeroIds(campaign)).toHaveLength(
        campaign.heroes.length,
      );
      expect(getDefaultSelectedHeroIds(capped)).toEqual(rosterIds.slice(0, 2));
    });

    it('keeps selection in roster order when toggling', () => {
      const selected = toggleHeroSelection(
        rosterIds,
        [rosterIds[0]],
        rosterIds[3],
        rosterIds.length,
      );
      expect(selected).toEqual([rosterIds[0], rosterIds[3]]);
    });

    it('caps selection at the campaign maximum', () => {
      const max = 2;
      let selected = toggleHeroSelection(rosterIds, [], rosterIds[0], max);
      selected = toggleHeroSelection(rosterIds, selected, rosterIds[1], max);
      // The party is full: further selections are no-ops.
      const capped = toggleHeroSelection(
        rosterIds,
        selected,
        rosterIds[2],
        max,
      );
      expect(capped).toEqual(selected);
    });

    it('allows deselecting down to zero, but Start then needs one', () => {
      const selected = toggleHeroSelection(
        rosterIds,
        [rosterIds[0]],
        rosterIds[0],
        rosterIds.length,
      );
      expect(selected).toEqual([]);
      expect(isHeroSelectionStartEnabled(selected)).toBe(false);
      expect(
        isHeroSelectionStartEnabled(
          toggleHeroSelection(rosterIds, [], rosterIds[1], rosterIds.length),
        ),
      ).toBe(true);
    });
  });

  describe('rename rules', () => {
    it('clamps names to the maximum length', () => {
      expect(clampHeroName('a'.repeat(40))).toHaveLength(MAX_HERO_NAME_LENGTH);
    });

    it('builds override heroes as renamed deep clones of the roster', () => {
      const names: Record<string, string> = {
        [rosterIds[0]]: 'Renowned One',
      };
      const heroes = buildSelectedHeroes(
        campaign,
        [rosterIds[3], rosterIds[0]],
        names,
      );
      expect(heroes).toHaveLength(2);
      // Roster order, not click order.
      expect(heroes[0]?.id).toBe(rosterIds[0]);
      expect(heroes[0]?.name).toBe('Renowned One');
      expect(heroes[0]?.nameTranslationKey).toBe('Renowned One');
      // Unrenamed heroes keep the roster definition.
      expect(heroes[1]?.name).toBe(campaign.heroes[3]?.name);
      expect(heroes[1]?.nameTranslationKey).toBe(
        campaign.heroes[3]?.nameTranslationKey,
      );
      // Clones: mutating the override never touches the registry.
      heroes[0]!.name = 'mutated';
      expect(campaign.heroes[0]?.name).not.toBe('mutated');
    });

    it('falls back to the default name when a typed name is empty', () => {
      const heroes = buildSelectedHeroes(campaign, [rosterIds[0]], {
        [rosterIds[0]]: '   ',
      });
      expect(heroes[0]?.name).toBe(campaign.heroes[0]?.name);
      expect(heroes[0]?.nameTranslationKey).toBe(
        campaign.heroes[0]?.nameTranslationKey,
      );
    });
  });

  describe('layout', () => {
    it('returns empty content without view dimensions', () => {
      const layout = getHeroSelectionLayout(0, 0, 'iceDragonTreasure');
      expect(layout.hasContent).toBe(false);
    });

    it('shows one row per roster hero and centers the panel', () => {
      const layout = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: rosterIds,
        names: {},
      });
      expect(layout.hasContent).toBe(true);
      expect(layout.rows).toHaveLength(campaign.heroes.length);
      const { panelBounds } = layout;
      expect(
        Math.abs(panelBounds.x * 2 + panelBounds.width - 800),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(panelBounds.y * 2 + panelBounds.height - 600),
      ).toBeLessThanOrEqual(1);
    });

    it('starts disabled below one selected hero and counts the party', () => {
      const empty = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: [],
        names: {},
      });
      expect(empty.startEnabled).toBe(false);
      const partial = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: rosterIds.slice(0, 2),
        names: {},
      });
      expect(partial.startEnabled).toBe(true);
    });

    it('dims unselected rows while the party is full', () => {
      const full = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: rosterIds,
        names: {},
      });
      expect(full.rows.every((row) => !row.dimmed)).toBe(true);
      // A capped campaign with a full party dims the unselected extras.
      campaigns['heroSelectionTestCapped'] = {
        ...campaign,
        id: 'heroSelectionTestCapped',
        maxHeroes: 2,
      };
      const capped = getHeroSelectionLayout(
        800,
        600,
        'heroSelectionTestCapped',
        {
          selectedHeroIds: rosterIds.slice(0, 2),
          names: {},
        },
      );
      const dimmedRows = capped.rows.filter((row) => row.dimmed);
      expect(dimmedRows).toHaveLength(rosterIds.length - 2);
      expect(
        capped.rows.filter((row) => row.selected).map((row) => row.heroId),
      ).toEqual(rosterIds.slice(0, 2));
    });
  });

  describe('hit', () => {
    it('separates checkbox, name input and row clicks', () => {
      const layout = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: rosterIds,
        names: {},
      });
      const row = layout.rows[0];
      expect(row).toBeDefined();
      if (!row) return;
      const checkboxHit = getHeroSelectionHit(
        800,
        600,
        'iceDragonTreasure',
        row.checkboxBounds.x + 5,
        row.checkboxBounds.y + 5,
        { selectedHeroIds: rosterIds, names: {} },
      );
      expect(checkboxHit).toEqual({ type: 'checkbox', heroId: row.heroId });
      const inputHit = getHeroSelectionHit(
        800,
        600,
        'iceDragonTreasure',
        row.nameInputBounds.x + 30,
        row.nameInputBounds.y + row.nameInputBounds.height / 2,
        { selectedHeroIds: rosterIds, names: {} },
      );
      expect(inputHit).toEqual({ type: 'nameInput', heroId: row.heroId });
    });

    it('hits Start and Back in their corners', () => {
      const layout = getHeroSelectionLayout(800, 600, 'iceDragonTreasure', {
        selectedHeroIds: rosterIds,
        names: {},
      });
      const startHit = getHeroSelectionHit(
        800,
        600,
        'iceDragonTreasure',
        layout.startButtonBounds.x + layout.startButtonBounds.width / 2,
        layout.startButtonBounds.y + layout.startButtonBounds.height / 2,
        { selectedHeroIds: rosterIds, names: {} },
      );
      expect(startHit).toEqual({ type: 'start' });
      const backHit = getHeroSelectionHit(
        800,
        600,
        'iceDragonTreasure',
        layout.backButtonBounds.x + layout.backButtonBounds.width / 2,
        layout.backButtonBounds.y + layout.backButtonBounds.height / 2,
        { selectedHeroIds: rosterIds, names: {} },
      );
      expect(backHit).toEqual({ type: 'back' });
    });

    it('reports the backdrop outside the panel', () => {
      const hit = getHeroSelectionHit(800, 600, 'iceDragonTreasure', 10, 10, {
        selectedHeroIds: rosterIds,
        names: {},
      });
      expect(hit).toEqual({ type: 'backdrop' });
    });
  });
});
