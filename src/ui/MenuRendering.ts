import type { GameState } from '../types';
import {
  type CanvasMenuItem,
  type MenuCallbacks,
  type MenuView,
  getMenuHeader,
  getMenuItemsForView,
} from '../menu/MenuLogic';

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
}

export interface MenuHitResult {
  type: 'backdrop' | 'panel' | 'item';
  item?: CanvasMenuItem;
}

const DEFAULT_FONT = '13px sans-serif';
const HEADER_FONT = 'bold 15px sans-serif';
const FOOTER_FONT = '10px sans-serif';

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

  const layout = getMenuLayout(viewWidth, viewHeight, state, options);
  if (layout.panelBounds.width === 0 || layout.panelBounds.height === 0) return;

  ctx.save();

  // 1. Semi-transparent backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // 2. Menu Panel
  const panel = layout.panelBounds;
  drawRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, 6);
  ctx.fillStyle = 'rgba(28, 33, 40, 0.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3. Header Text
  const header = layout.headerBounds;
  ctx.font = HEADER_FONT;
  ctx.fillStyle = '#f8fafc';
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
      ? 'rgba(71, 85, 105, 0.95)'
      : 'rgba(37, 41, 50, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isHovered
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = DEFAULT_FONT;
    ctx.fillStyle = isHovered ? '#ffffff' : '#e2e8f0';
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
    ctx.font = FOOTER_FONT;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
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
