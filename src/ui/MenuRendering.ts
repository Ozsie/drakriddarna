import type { GameState } from '../types';
import {
  type CanvasMenuItem,
  type MenuCallbacks,
  type MenuView,
  getMenuHeader,
  getMenuItemsForView,
} from '../menu/MenuLogic';
import { composeFont } from '../uikit/primitives/text';
import { defaultTheme, type UiTheme } from '../uikit/theme';

export interface MenuItemLayout {
  item: CanvasMenuItem;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MenuLayout {
  view: MenuView;
  panelBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  headerBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  };
  items: MenuItemLayout[];
  footerBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  };
}

export interface RenderMenuOptions {
  view?: MenuView;
  hoveredItemId?: string | null;
  buildInfo?: { date: string; hash: string } | null;
  debugMode?: boolean;
  callbacks?: MenuCallbacks;
  theme?: UiTheme;
}

export interface MenuHitResult {
  type: 'backdrop' | 'panel' | 'item';
  item?: CanvasMenuItem;
}

export const isPointInBounds = (
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number },
): boolean =>
  x >= bounds.x &&
  x <= bounds.x + bounds.width &&
  y >= bounds.y &&
  y <= bounds.y + bounds.height;

export const getMenuLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderMenuOptions,
): MenuLayout => {
  const currentView: MenuView = options?.view ?? 'main';
  if (!state || viewWidth <= 0 || viewHeight <= 0) {
    return {
      view: currentView,
      panelBounds: { x: 0, y: 0, width: 0, height: 0 },
      headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
      items: [],
    };
  }

  const items = getMenuItemsForView(
    currentView,
    state,
    options?.callbacks,
    options?.debugMode,
  );
  const headerText = getMenuHeader(currentView);

  let footerText = '';
  if (currentView === 'main' && options?.buildInfo) {
    footerText = `${options.buildInfo.date} - ${options.buildInfo.hash}`;
  }

  const padding = 10;
  const panelWidth = Math.min(240, Math.max(120, viewWidth - 16));
  const panelX = 8;
  const panelY = 44; // Placed right under top bar (top 8 + height 32 + gap 4)
  const itemWidth = panelWidth - padding * 2;
  const itemHeight = 30;
  const itemGap = 6;
  const headerHeight = 26;
  const footerHeight = footerText ? 18 : 0;

  const contentHeight =
    headerHeight +
    (items.length > 0 ? items.length * (itemHeight + itemGap) : 0) +
    footerHeight;

  const panelHeight = contentHeight + padding * 2;

  let currentY = panelY + padding;

  const headerBounds = {
    x: panelX + padding,
    y: currentY,
    width: itemWidth,
    height: headerHeight,
    text: headerText,
  };

  currentY += headerHeight;

  const itemLayouts: MenuItemLayout[] = items.map((item) => {
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
  if (footerText) {
    footerBounds = {
      x: panelX + padding,
      y: currentY,
      width: itemWidth,
      height: footerHeight,
      text: footerText,
    };
  }

  return {
    view: currentView,
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    headerBounds,
    items: itemLayouts,
    footerBounds,
  };
};

export const getMenuHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderMenuOptions | undefined,
  x: number,
  y: number,
): MenuHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  if (x < 0 || y < 0 || x > viewWidth || y > viewHeight) return null;

  const layout = getMenuLayout(viewWidth, viewHeight, state, options);
  if (layout.panelBounds.width === 0 || layout.panelBounds.height === 0) {
    return null;
  }

  for (const itemLayout of layout.items) {
    if (isPointInBounds(x, y, itemLayout.bounds)) {
      return {
        type: 'item',
        item: itemLayout.item,
      };
    }
  }

  if (isPointInBounds(x, y, layout.panelBounds)) {
    return {
      type: 'panel',
    };
  }

  return {
    type: 'backdrop',
  };
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 6,
) => {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
};

const drawMenuButtonShape = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTR = 8,
  rBL = 8,
  rOther = 2,
) => {
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

export const renderMenuModal = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderMenuOptions,
) => {
  if (!ctx || !state || viewWidth <= 0 || viewHeight <= 0) return;

  const theme = options?.theme ?? defaultTheme;

  const layout = getMenuLayout(viewWidth, viewHeight, state, options);
  if (layout.panelBounds.width === 0 || layout.panelBounds.height === 0) return;

  ctx.save();

  // 1. Semi-transparent backdrop
  ctx.fillStyle = theme.palette.overlay.scrim;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // 2. Menu Panel
  const panel = layout.panelBounds;
  drawRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, 6);
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
