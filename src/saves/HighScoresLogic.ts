import type { HighScoreEntry } from '../types';

// Campaign high scores: the top scores of *completed* campaigns, one list
// per campaign id under a single `highScores` localStorage key. The
// party-wipe screen shows the list with the current run's score ranked
// against it (the current run is not persisted there — only a completed
// campaign records a high score).

const HIGH_SCORES_STORAGE_KEY = 'highScores';

/** Maximum number of entries kept per campaign. */
export const MAX_HIGH_SCORES = 10;

const hasLocalStorage = (): boolean => typeof localStorage !== 'undefined';

const parseStored = (
  raw: string | null | undefined,
): Record<string, HighScoreEntry[]> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, HighScoreEntry[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** Every stored high score list, keyed by campaign id. */
export const loadHighScores = (): Record<string, HighScoreEntry[]> =>
  hasLocalStorage()
    ? parseStored(localStorage.getItem(HIGH_SCORES_STORAGE_KEY))
    : {};

/** The stored top list for one campaign, best score first. */
export const getCampaignHighScores = (campaignId: string): HighScoreEntry[] =>
  [...(loadHighScores()[campaignId] ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);

/**
 * Records a completed campaign's score into its high score list and
 * returns the new top list. Scores of 0 are ignored (a wipe before any
 * scenario was completed should not pollute the list).
 */
export const recordHighScore = (
  campaignId: string,
  score: number,
): HighScoreEntry[] => {
  if (score <= 0) {
    return getCampaignHighScores(campaignId);
  }
  const all = loadHighScores();
  const entry: HighScoreEntry = { score, date: new Date().toISOString() };
  const entries = [...(all[campaignId] ?? []), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);
  all[campaignId] = entries;
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Storage unavailable or full: the list simply is not persisted.
    }
  }
  return entries;
};
