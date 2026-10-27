import type { GameState } from '../types';
import {
  getDirectorContext,
  getDirectorState,
  type DirectorState,
} from '../monsters/behavior';
import { getHeroCardsLayout } from './HeroCardRendering';

export interface DebugPrintoutCounts {
  totalReRenders: number;
  staticReRenders: number;
  dynamicReRenders: number;
  // Frames per second of the continuously repainted canvases: the
  // dynamic layer (actors, lights) and the overlay layer (effects).
  // The debug printout itself lives on the overlay layer, so its own
  // loop shows up in `overlayFps`.
  dynamicFps: number;
  overlayFps: number;
}

const MARGIN_X = 8;
const GAP_ABOVE_CARDS = 6;
const MIN_Y = 14;
const LINE_HEIGHT = 12;
const FONT = '10px Arial';

// The director state the monster AI would currently act on, derived from the
// same shared party-level inputs the AI turn uses.
export const getCurrentDirectorState = (
  state: GameState | null | undefined,
): DirectorState | null => {
  if (!state) return null;
  const { hasDeadHero, partyHpPercentage, aliveMonsterCount } =
    getDirectorContext(state);
  return getDirectorState(
    hasDeadHero,
    partyHpPercentage,
    aliveMonsterCount,
    state,
  );
};

// The debug printout sits on the left edge of the view, just above the
// highest hero card, so it stays clear of the top bar and the canvas menu.
// Falls back to the bottom of the view when no hero cards are laid out.
export const getDebugPrintoutPosition = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
): { x: number; y: number } => {
  const heroCardsTop = getHeroCardsLayout(viewWidth, viewHeight, state)
    .containerBounds.y;
  const y =
    heroCardsTop > 0
      ? Math.max(MIN_Y, heroCardsTop - GAP_ABOVE_CARDS)
      : Math.max(MIN_Y, viewHeight - GAP_ABOVE_CARDS);
  return { x: MARGIN_X, y };
};

// Draws the re-render counter and the current director state on the overlay
// layer. Resets the context transform so the printout is unaffected by board
// pan and zoom, and scales for the device pixel ratio.
export const renderDebugPrintout = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  counts: DebugPrintoutCounts,
): void => {
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const { x, y } = getDebugPrintoutPosition(viewWidth, viewHeight, state);
  const directorState = getCurrentDirectorState(state);
  const lines = [
    `Re-renders: ${String(counts.totalReRenders)} (Static: ${String(
      counts.staticReRenders,
    )}, Dynamic: ${String(counts.dynamicReRenders)})`,
    `FPS (Dynamic: ${String(counts.dynamicFps)}, Overlay: ${String(
      counts.overlayFps,
    )})`,
    `Director: ${String(directorState ?? '-')}`,
  ];

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);
  ctx.fillStyle = 'white';
  ctx.font = FONT;
  // The last line sits at the anchor; earlier lines stack above it so the
  // whole printout stays clear of the hero cards. Each line is clamped to
  // the top of the view so tiny views cannot clip the text away entirely.
  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      x,
      Math.max(MIN_Y, y - (lines.length - 1 - index) * LINE_HEIGHT),
    );
  });
  ctx.restore();
};
