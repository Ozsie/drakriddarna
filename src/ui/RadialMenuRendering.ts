import { RadialAction, type RadialMenuEntry } from '../hero/RadialMenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import type { ItemSprite } from '../types';
import { i18n } from '../core';
import { drawItemSprite } from '../items/ItemSpriteRendering';
import { composeFont } from '../uikit/primitives/text';
import { defaultTheme, type UiTheme } from '../uikit/theme';

export const RADIAL_MENU_ICONS: Record<RadialAction, string> = {
  [RadialAction.SEARCH]: '🔍',
  [RadialAction.PICK_LOCK]: '🗝️',
  [RadialAction.OPEN_DOOR]: '🚪',
  [RadialAction.PICK_UP_ITEM]: '🎒',
  [RadialAction.INTERACT]: '⚡',
  [RadialAction.USE_ITEM]: '✨',
  [RadialAction.NEXT]: '→',
};

export const RADIAL_MENU_LABELS: Record<RadialAction, string> = {
  [RadialAction.SEARCH]: 'content.radialMenu.search',
  [RadialAction.PICK_LOCK]: 'content.radialMenu.pickLock',
  [RadialAction.OPEN_DOOR]: 'content.radialMenu.openDoor',
  [RadialAction.PICK_UP_ITEM]: 'content.radialMenu.pickUpItem',
  [RadialAction.INTERACT]: 'content.radialMenu.interact',
  [RadialAction.USE_ITEM]: 'content.radialMenu.useItem',
  [RadialAction.NEXT]: 'content.radialMenu.next',
};

export interface RadialButtonPosition {
  index: number;
  entry: RadialMenuEntry;
  x: number;
  y: number;
  radius: number;
  label: string;
  icon: string;
  sprite?: ItemSprite;
}

export const getRadialButtonPositions = (
  menu: RadialMenuState,
  cellSize: number,
): RadialButtonPosition[] => {
  if (!menu || !menu.entries || menu.entries.length === 0) return [];

  const centerX = menu.x * cellSize + cellSize / 2;
  const centerY = menu.y * cellSize + cellSize / 2;
  const ringRadius = cellSize * 1.1;
  const buttonRadius = Math.max(16, cellSize * (16 / 48));

  return menu.entries.map((entry, i) => {
    const angle = (i / menu.entries.length) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + ringRadius * Math.cos(angle);
    const y = centerY + ringRadius * Math.sin(angle);

    let label: string;
    let icon: string;
    let sprite: ItemSprite | undefined;

    if (entry.interactable) {
      const labelKey =
        entry.interactable.nameTranslationKey ??
        RADIAL_MENU_LABELS[entry.action];
      label = i18n(labelKey);
      icon = entry.interactable.icon ?? RADIAL_MENU_ICONS[entry.action] ?? '';
    } else if (entry.item) {
      const itemName = i18n(entry.item.nameTranslationKey ?? entry.item.name);
      if (entry.targetHero) {
        const targetName = i18n(entry.targetHero.name);
        label = `${itemName} (${targetName})`;
      } else {
        label = itemName;
      }
      icon =
        entry.item.icon ??
        (entry.item.properties?.ICON as string) ??
        RADIAL_MENU_ICONS[entry.action] ??
        '✨';
      sprite = entry.item.sprite;
    } else {
      const labelKey = RADIAL_MENU_LABELS[entry.action];
      const baseLabel = i18n(labelKey);
      label = baseLabel + (entry.door ? ` (${entry.door.side})` : '');
      icon = RADIAL_MENU_ICONS[entry.action] ?? '';
    }

    return {
      index: i,
      entry,
      x,
      y,
      radius: buttonRadius,
      label,
      icon,
      sprite,
    };
  });
};

export const findHoveredRadialButton = (
  menu: RadialMenuState,
  cellSize: number,
  worldPos: { x: number; y: number },
): RadialButtonPosition | undefined => {
  const buttons = getRadialButtonPositions(menu, cellSize);
  return buttons.find((btn) => {
    const dx = worldPos.x - btn.x;
    const dy = worldPos.y - btn.y;
    return Math.hypot(dx, dy) <= btn.radius;
  });
};

export const renderRadialTooltip = (
  ctx: CanvasRenderingContext2D,
  button: RadialButtonPosition,
  theme: UiTheme = defaultTheme,
) => {
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

export const renderRadialMenu = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  menu: RadialMenuState,
  hoveredIndex?: number | null,
  theme: UiTheme = defaultTheme,
) => {
  if (!menu) return;
  const buttons = getRadialButtonPositions(menu, cellSize);

  ctx.save();
  for (const btn of buttons) {
    const isHovered = hoveredIndex === btn.index;

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
    const spriteDrawn = btn.sprite
      ? drawItemSprite(
          ctx,
          btn.sprite,
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
      ctx.fillText(btn.icon, btn.x, btn.y);
    }
  }

  // Draw tooltip for hovered button if present
  if (
    hoveredIndex !== undefined &&
    hoveredIndex !== null &&
    hoveredIndex >= 0
  ) {
    const hoveredBtn = buttons.find((b) => b.index === hoveredIndex);
    if (hoveredBtn) {
      renderRadialTooltip(ctx, hoveredBtn, theme);
    }
  }
  ctx.restore();
};
