// Narrow-screen ("compact") UI mode. Below this CSS-pixel width the corner
// panels (events, diary) collapse into small square buttons and only the
// active actor's card is drawn, so the board stays usable on phones.
export const COMPACT_UI_MAX_WIDTH = 700;

export const isCompactUi = (viewWidth: number): boolean =>
  viewWidth > 0 && viewWidth < COMPACT_UI_MAX_WIDTH;

// Size of the square a collapsed compact panel collapses into.
export const COMPACT_TOGGLE_SIZE = 40;
