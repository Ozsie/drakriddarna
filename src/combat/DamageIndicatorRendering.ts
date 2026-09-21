import type { GameState } from '../types';

export const DAMAGE_INDICATOR_DURATION_MS = 1000;

export const renderDamageIndicators = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
): boolean => {
  if (!state.damageIndicators || state.damageIndicators.length === 0) {
    return false;
  }

  let hasActiveIndicators = false;

  state.damageIndicators.forEach((indicator) => {
    const timestamp = indicator.timestamp ?? currentTime;
    const elapsed = currentTime - timestamp;

    if (elapsed < 0 || elapsed > DAMAGE_INDICATOR_DURATION_MS) {
      return;
    }

    hasActiveIndicators = true;
    const progress = Math.min(
      Math.max(elapsed / DAMAGE_INDICATOR_DURATION_MS, 0),
      1,
    );

    // Ease-out curve for upward floating
    const floatDistance = cellSize * 0.6;
    const yOffset = -Math.sin(progress * (Math.PI / 2)) * floatDistance;

    // Fade in quickly, stay, then fade out
    let alpha = 1;
    if (progress < 0.15) {
      alpha = progress / 0.15;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }

    const x = indicator.position.x * cellSize + cellSize / 2;
    const y = indicator.position.y * cellSize + yOffset;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(
      cellSize * 0.45,
    )}px "Cinzel", "Arial Black", Impact, sans-serif`;

    // Outline / stroke for high contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.lineJoin = 'round';
    ctx.strokeText(`${indicator.damage}`, x, y);

    // Text fill
    ctx.fillStyle = '#ff3333';
    ctx.fillText(`${indicator.damage}`, x, y);

    ctx.restore();
  });

  return hasActiveIndicators;
};
