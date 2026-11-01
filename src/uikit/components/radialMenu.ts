// Radial menu component: the circular action menu that opens around a
// hero — a ring of buttons with icons (item sprites through the asset
// port, emoji icons otherwise) and a tooltip for the hovered one. Kit
// component per the 02 contract — the view model carries the ring origin
// (grid coords) and the buttons with labels, icons and sprite refs
// prebuilt by the game-side adapter; the layout is pure geometry; hits
// are semantic button ids.

import { drawSpriteFrame } from '../kit/spriteFrame';
import { composeFont } from '../primitives/text';
import type { SpriteRef, UiContext } from '../env';
import type { UiTheme } from '../theme';

export interface RadialButtonVm {
  /** Hit-test identity: the button's index in the ring. */
  readonly id: number;
  readonly label: string;
  readonly icon: string;
  /** Item art, drawn through the asset port when set. */
  readonly sprite?: SpriteRef;
}

export interface RadialMenuViewModel {
  /** The cell the menu opened on, in grid coords. */
  readonly origin: { readonly x: number; readonly y: number };
  readonly buttons: readonly RadialButtonVm[];
}

export interface RadialButtonItemLayout {
  button: RadialButtonVm;
  x: number;
  y: number;
  radius: number;
}

export interface RadialMenuLayout {
  centerX: number;
  centerY: number;
  items: RadialButtonItemLayout[];
}

/** Semantic hit: which ring button is under the point. */
export type RadialMenuHit = { kind: 'button'; id: number } | null;

export const emptyRadialMenuLayout = (): RadialMenuLayout => ({
  centerX: 0,
  centerY: 0,
  items: [],
});

export const layoutRadialMenu = (
  vm: RadialMenuViewModel | null,
  cellSize: number,
): RadialMenuLayout => {
  if (!vm || vm.buttons.length === 0) return emptyRadialMenuLayout();

  const centerX = vm.origin.x * cellSize + cellSize / 2;
  const centerY = vm.origin.y * cellSize + cellSize / 2;
  const ringRadius = cellSize * 1.1;
  const buttonRadius = Math.max(16, cellSize * (16 / 48));

  return {
    centerX,
    centerY,
    items: vm.buttons.map((button, i) => {
      const angle = (i / vm.buttons.length) * 2 * Math.PI - Math.PI / 2;
      return {
        button,
        x: centerX + ringRadius * Math.cos(angle),
        y: centerY + ringRadius * Math.sin(angle),
        radius: buttonRadius,
      };
    }),
  };
};

export const hitTestRadialMenu = (
  layout: RadialMenuLayout,
  point: { x: number; y: number },
): RadialMenuHit => {
  for (const item of layout.items) {
    const dx = point.x - item.x;
    const dy = point.y - item.y;
    if (Math.hypot(dx, dy) <= item.radius) {
      return { kind: 'button', id: item.button.id };
    }
  }
  return null;
};

export interface RenderRadialMenuOptions {
  /** The hovered button id, for the highlight and the tooltip. */
  readonly hoveredId?: number | null;
}

export const renderRadialMenu = (
  layout: RadialMenuLayout,
  ui: UiContext,
  options?: RenderRadialMenuOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || layout.items.length === 0) return;

  ctx.save();
  for (const btn of layout.items) {
    const isHovered = options?.hoveredId === btn.button.id;

    // Draw circular button background
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered
      ? theme.palette.hover.radialFill
      : theme.palette.overlay.scrimStrong;
    ctx.fill();
    ctx.lineWidth = theme.shape.strokeWidth.regular;
    ctx.strokeStyle = isHovered
      ? theme.palette.border.ringHover
      : theme.palette.border.ring;
    ctx.stroke();

    // Draw button icon: item sprite if available, emoji icon otherwise
    const spriteDrawn = btn.button.sprite
      ? drawSpriteFrame(
          ctx,
          ui.assets,
          btn.button.sprite,
          btn.x - Math.round(btn.radius * 0.75),
          btn.y - Math.round(btn.radius * 0.75),
          Math.round(btn.radius * 1.5),
        )
      : false;
    if (!spriteDrawn) {
      ctx.fillStyle = theme.palette.text.bright;
      ctx.font = `${Math.round(btn.radius)}px ${
        theme.typography.families.plain
      }`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.button.icon, btn.x, btn.y);
    }
  }

  // Draw tooltip for hovered button if present
  const hoveredId = options?.hoveredId;
  if (hoveredId !== undefined && hoveredId !== null && hoveredId >= 0) {
    const hoveredBtn = layout.items.find(
      (item) => item.button.id === hoveredId,
    );
    if (hoveredBtn) {
      renderRadialTooltip(
        ctx,
        {
          x: hoveredBtn.x,
          y: hoveredBtn.y,
          radius: hoveredBtn.radius,
          label: hoveredBtn.button.label,
        },
        theme,
      );
    }
  }
  ctx.restore();
};

/**
 * The hovered button's tooltip: a small centered box above the button.
 */
export const renderRadialTooltip = (
  ctx: CanvasRenderingContext2D,
  button: { x: number; y: number; radius: number; label: string },
  theme: UiTheme,
): void => {
  const text = button.label;
  if (!text) return;

  ctx.save();
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.md,
    theme.typography.weights.regular,
    theme.typography.families.compact,
  );
  const textMetrics =
    typeof ctx.measureText === 'function'
      ? ctx.measureText(text)
      : { width: text.length * 7 };
  const paddingX = 8;
  const paddingY = 4;
  const boxWidth = textMetrics.width + paddingX * 2;
  const boxHeight = 20;

  const boxX = button.x - boxWidth / 2;
  const boxY = button.y - button.radius - boxHeight - paddingY;

  ctx.fillStyle = theme.palette.overlay.tooltip;
  ctx.strokeStyle = theme.palette.border.soft;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  } else {
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.palette.text.bright;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, button.x, boxY + boxHeight / 2);
  ctx.restore();
};
