import type { GameState } from '../types';
import { renderFloatingTexts } from '@hoard-engine/scene';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged) and passes the
// state's plain indicator data to the view-model core in the
// @hoard-engine/scene package (the scene contracts re-declare the
// indicator shape structurally, so the game data passes by
// compatibility).

export {
  DAMAGE_INDICATOR_DURATION_MS,
  EFFECT_TRANSFORMS,
  type EffectTransform,
  renderFloatingTexts,
} from '@hoard-engine/scene';

export const renderDamageIndicators = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
): boolean =>
  renderFloatingTexts(ctx, cellSize, state.damageIndicators ?? [], currentTime);

export const renderFloatingIndicators = renderDamageIndicators;
