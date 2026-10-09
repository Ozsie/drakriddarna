import { RadialAction, type RadialMenuEntry } from '../hero/RadialMenuLogic';
import type { RadialMenuState } from '../store/radialMenuStore';
import { i18n } from '../core';

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
) => {
  const text = button.label;
  if (!text) return;

  ctx.save();
  ctx.font = '12px Arial, sans-serif';
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  } else {
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
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
      ? 'rgba(255, 255, 255, 0.35)'
      : 'rgba(0, 0, 0, 0.75)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();

    // Draw button icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(btn.radius)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.icon, btn.x, btn.y);
  }

  // Draw tooltip for hovered button if present
  if (
    hoveredIndex !== undefined &&
    hoveredIndex !== null &&
    hoveredIndex >= 0
  ) {
    const hoveredBtn = buttons.find((b) => b.index === hoveredIndex);
    if (hoveredBtn) {
      renderRadialTooltip(ctx, hoveredBtn);
    }
  }
  ctx.restore();
};
