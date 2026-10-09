import type { GameState, IndicatorEffect } from '../types';

export const DAMAGE_INDICATOR_DURATION_MS = 1000;

export type EffectTransform = {
  xOffset: number;
  yOffset: number;
  alpha: number;
  scale: number;
};

export const EFFECT_TRANSFORMS: Record<
  IndicatorEffect,
  (progress: number, cellSize: number) => EffectTransform
> = {
  float: (progress: number, cellSize: number): EffectTransform => {
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

    return { xOffset: 0, yOffset, alpha, scale: 1 };
  },

  bounce: (progress: number, cellSize: number): EffectTransform => {
    const bounceHeight = cellSize * 0.4;
    const yOffset =
      -Math.abs(Math.sin(progress * Math.PI * 2)) *
        (1 - progress) *
        bounceHeight -
      progress * cellSize * 0.3;
    const alpha = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1;
    return { xOffset: 0, yOffset, alpha, scale: 1 };
  },

  crit: (progress: number, cellSize: number): EffectTransform => {
    const scale =
      progress < 0.2
        ? 1 + Math.sin((progress / 0.2) * (Math.PI / 2)) * 0.4
        : 1.4 - (progress - 0.2) * 0.4;
    const floatDistance = cellSize * 0.7;
    const yOffset = -Math.sin(progress * (Math.PI / 2)) * floatDistance;
    const alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
    return { xOffset: 0, yOffset, alpha, scale };
  },

  fade: (progress: number): EffectTransform => ({
    xOffset: 0,
    yOffset: 0,
    alpha: 1 - progress,
    scale: 1,
  }),

  static: (): EffectTransform => ({
    xOffset: 0,
    yOffset: 0,
    alpha: 1,
    scale: 1,
  }),
};

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
    const duration = indicator.durationMs ?? DAMAGE_INDICATOR_DURATION_MS;

    if (duration !== Infinity && (elapsed < 0 || elapsed > duration)) {
      return;
    }

    hasActiveIndicators = true;
    const progress =
      duration === Infinity || duration <= 0
        ? 0
        : Math.min(Math.max(elapsed / duration, 0), 1);

    const effectName = indicator.effect ?? 'float';
    const effectHandler =
      EFFECT_TRANSFORMS[effectName] ?? EFFECT_TRANSFORMS.float;
    const transform = effectHandler(progress, cellSize);

    const customOffsetX = indicator.offset?.x ?? 0;
    const customOffsetY = indicator.offset?.y ?? 0;
    const x =
      indicator.position.x * cellSize +
      cellSize / 2 +
      transform.xOffset +
      customOffsetX;
    const y =
      indicator.position.y * cellSize + transform.yOffset + customOffsetY;

    const text =
      indicator.text ??
      (indicator.damage !== undefined ? `${indicator.damage}` : '');
    if (!text) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, transform.alpha));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scale = transform.scale * (indicator.fontSizeScale ?? 1);
    const fontSize = Math.round(cellSize * 0.45 * scale);
    ctx.font = `900 ${fontSize}px "Cinzel", "Arial Black", Impact, sans-serif`;

    // Outline / stroke for high contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // Text fill (defaults to red)
    ctx.fillStyle = indicator.color ?? '#ff3333';
    ctx.fillText(text, x, y);

    ctx.restore();
  });

  return hasActiveIndicators;
};

export const renderFloatingIndicators = renderDamageIndicators;
