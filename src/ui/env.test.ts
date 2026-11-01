// M3: compact layout is a parameter, not a width read. With env.mode set,
// the layout follows the env even at wide widths; without an env, the
// historical width-derived rule still applies (legacy call sites).

import { describe, expect, it } from 'vitest';
import type { UiEnv } from '../uikit/env';
import { defaultUiEnv, layoutModeForWidth } from './env';
import { getHeroCardsLayout } from './HeroCardRendering';
import { getMonsterCardsLayout } from './MonsterCardRendering';
import {
  midCampaignState,
  REGULAR_HEIGHT,
  REGULAR_WIDTH,
} from './parity/fixtures';

describe('layout mode as a parameter', () => {
  it('derives compact from width when no env is passed', () => {
    expect(layoutModeForWidth(REGULAR_WIDTH)).toBe('regular');
    expect(layoutModeForWidth(600)).toBe('compact');
  });

  it('follows env.mode over the view width', () => {
    const state = midCampaignState();
    const compactEnv: UiEnv = { ...defaultUiEnv, mode: 'compact' };

    const regularCards = getHeroCardsLayout(
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      state,
    );
    const compactCards = getHeroCardsLayout(
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      state,
      compactEnv,
    );
    expect(regularCards.cards.length).toBeGreaterThan(
      compactCards.cards.length,
    );

    const compactMonsters = getMonsterCardsLayout(
      REGULAR_WIDTH,
      REGULAR_HEIGHT,
      state,
      compactEnv,
    );
    // Compact keeps only the active/target actor's card.
    expect(compactMonsters.cards.length).toBeLessThanOrEqual(2);
  });
});
