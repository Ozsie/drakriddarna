// Menu component: the drop-down panel opened from the top bar. Kit
// component per the 02 contract — the view model carries the menu view,
// header, item labels and footer text prebuilt by the game-side adapter
// (item ids are semantic); layout is canvas-free; the item rows use the
// asymmetric button shape the menu has always drawn.

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import {
  roundRectPath,
  isPointInRect,
  composeFont,
} from '@hoard-engine/primitives';
import type { UiContext } from '../env';

export interface MenuItemVm {
  /** Hit-test identity: the menu item's id. */
  readonly id: string;
  readonly label: string;
}

export interface MenuViewModel {
  /** The menu view name, for facade-side item resolution. */
  readonly view: string;
  readonly headerText: string;
  readonly items: readonly MenuItemVm[];
  /** Build-info line on the main view; empty when absent. */
  readonly footerText: string;
}

export interface MenuItemLayout {
  item: MenuItemVm;
  bounds: Rect;
}

export interface MenuLayout {
  view: string;
  backdropBounds: Rect;
  panelBounds: Rect;
  headerBounds: Rect & { text: string };
  items: MenuItemLayout[];
  footerBounds?: Rect & { text: string };
}

/** Semantic hit: which part of the menu is under the point. */
export type MenuHit =
  | { kind: 'item'; itemId: string }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

export const layoutMenu = (
  vm: MenuViewModel | null,
  viewBounds: Rect,
): MenuLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) {
    return {
      view: vm?.view ?? 'main',
      backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
      panelBounds: { x: 0, y: 0, width: 0, height: 0 },
      headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
      items: [],
    };
  }

  const padding = 10;
  const panelWidth = Math.min(240, Math.max(120, viewWidth - 16));
  const panelX = 8;
  const panelY = 44; // Placed right under top bar (top 8 + height 32 + gap 4)
  const itemWidth = panelWidth - padding * 2;
  const itemHeight = 30;
  const itemGap = 6;
  const headerHeight = 26;
  const footerHeight = vm.footerText ? 18 : 0;

  const contentHeight =
    headerHeight +
    (vm.items.length > 0 ? vm.items.length * (itemHeight + itemGap) : 0) +
    footerHeight;

  const panelHeight = contentHeight + padding * 2;

  let currentY = panelY + padding;

  const headerBounds = {
    x: panelX + padding,
    y: currentY,
    width: itemWidth,
    height: headerHeight,
    text: vm.headerText,
  };

  currentY += headerHeight;

  const items: MenuItemLayout[] = vm.items.map((item) => {
    const itemLayout: MenuItemLayout = {
      item,
      bounds: {
        x: panelX + padding,
        y: currentY,
        width: itemWidth,
        height: itemHeight,
      },
    };
    currentY += itemHeight + itemGap;
    return itemLayout;
  });

  let footerBounds: MenuLayout['footerBounds'];
  if (vm.footerText) {
    footerBounds = {
      x: panelX + padding,
      y: currentY,
      width: itemWidth,
      height: footerHeight,
      text: vm.footerText,
    };
  }

  return {
    view: vm.view,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    headerBounds,
    items,
    footerBounds,
  };
};

export const hitTestMenu = (
  layout: MenuLayout,
  point: { x: number; y: number },
): MenuHit => {
  if (layout.panelBounds.width === 0 || layout.panelBounds.height === 0) {
    return null;
  }

  for (const itemLayout of layout.items) {
    if (isPointInRect(point.x, point.y, itemLayout.bounds)) {
      return { kind: 'item', itemId: itemLayout.item.id };
    }
  }

  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }

  return { kind: 'backdrop' };
};

// The asymmetric menu-item shape: top-right and bottom-left corners are
// strongly rounded, the others slightly.
const drawMenuButtonShape = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTR = 8,
  rBL = 8,
  rOther = 2,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + rOther, y);
  ctx.lineTo(x + w - rTR, y);
  ctx.arcTo(x + w, y, x + w, y + rTR, rTR);
  ctx.lineTo(x + w, y + h - rOther);
  ctx.arcTo(x + w, y + h, x + w - rOther, y + h, rOther);
  ctx.lineTo(x + rBL, y + h);
  ctx.arcTo(x, y + h, x, y + h - rBL, rBL);
  ctx.lineTo(x, y + rOther);
  ctx.arcTo(x, y, x + rOther, y, rOther);
  ctx.closePath();
};

export interface RenderMenuOptions {
  readonly hoveredItemId?: string | null;
}

export const renderMenu = (
  layout: MenuLayout,
  ui: UiContext,
  options?: RenderMenuOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || layout.panelBounds.width === 0 || layout.panelBounds.height === 0)
    return;

  ctx.save();

  // 1. Semi-transparent backdrop
  const backdrop = layout.backdropBounds;
  ctx.fillStyle = theme.palette.overlay.scrim;
  ctx.fillRect(backdrop.x, backdrop.y, backdrop.width, backdrop.height);

  // 2. Menu Panel
  const panel = layout.panelBounds;
  roundRectPath(ctx, panel.x, panel.y, panel.width, panel.height, 6);
  ctx.fillStyle = theme.palette.surface.panelMenu;
  ctx.fill();
  ctx.strokeStyle = theme.palette.border.subtle;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  ctx.stroke();

  // 3. Header Text
  const header = layout.headerBounds;
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.xxl,
    theme.typography.weights.bold,
    theme.typography.families.plain,
  );
  ctx.fillStyle = theme.palette.text.strong;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    header.text,
    header.x + header.width / 2,
    header.y + header.height / 2 - 2,
  );

  // 4. Menu Items
  for (const itemLayout of layout.items) {
    const isHovered = options?.hoveredItemId === itemLayout.item.id;
    const bounds = itemLayout.bounds;

    drawMenuButtonShape(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.fillStyle = isHovered
      ? theme.palette.surface.itemHover
      : theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = isHovered
      ? theme.palette.border.soft
      : theme.palette.border.subtle;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.font = composeFont(
      theme,
      theme.typography.sizes.lg,
      theme.typography.weights.regular,
      theme.typography.families.plain,
    );
    ctx.fillStyle = isHovered
      ? theme.palette.text.bright
      : theme.palette.text.body;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      itemLayout.item.label,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
  }

  // 5. Footer Text (build info)
  if (layout.footerBounds) {
    const footer = layout.footerBounds;
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.xxs,
      theme.typography.weights.regular,
      theme.typography.families.plain,
    );
    ctx.fillStyle = theme.palette.text.faint;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      footer.text,
      footer.x + footer.width / 2,
      footer.y + footer.height / 2,
    );
  }

  ctx.restore();
};
