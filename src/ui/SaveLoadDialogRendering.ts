// Game-side facade for the save/load dialog. Its consumer-owned composition
// keeps the historical entry points and the CanvasMenuItem-carrying row hit;
// the adapter in ./viewmodels/saveLoadDialog remains the only place that reads
// saved-game items.

import type { GameState } from '../types';
import type { CanvasMenuItem, MenuCallbacks } from '../menu/MenuLogic';
import type { UiEnv, UiContext } from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/primitives';
import { composeFont } from '@hoard-engine/primitives';
import {
  hitTestComposition,
  layoutComposition,
  renderComposition,
  type CompositionLayoutNode,
  type CompositionNode,
} from '@hoard-engine/uikit';
import {
  savedGameItems,
  toSaveLoadDialogViewModel,
  type SaveLoadDialogMode,
} from './viewmodels/saveLoadDialog';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export type {
  SaveLoadDialogMode,
  SaveLoadDialogRowViewModel,
  SaveLoadDialogViewModel,
} from './viewmodels/saveLoadDialog';

export interface SaveLoadDialogRowLayout {
  item: CanvasMenuItem;
  bounds: Rect;
}

export interface SaveLoadDialogLayout {
  hasContent: boolean;
  mode: SaveLoadDialogMode;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  /** Name input row, shown in save mode. */
  inputBounds?: Rect;
  /** Save rows, shown in load mode. */
  rows: SaveLoadDialogRowLayout[];
  actionButtonBounds?: Rect;
  actionButtonLabel?: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  /** Shown when more saves exist than fit the panel. */
  footerBounds?: Rect;
  footerText: string;
}

export interface RenderSaveLoadDialogOptions {
  saveName?: string;
  hoveredItemId?: string | null;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type SaveLoadDialogHitResult =
  | { type: 'row'; item: CanvasMenuItem }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'input' }
  | { type: 'panel' }
  | { type: 'backdrop' };

export type SaveLoadDialogOptions = {
  mode?: SaveLoadDialogMode;
  callbacks?: MenuCallbacks;
} & RenderSaveLoadDialogOptions;

const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;

const emptyLayout = (mode: SaveLoadDialogMode): SaveLoadDialogLayout => ({
  hasContent: false,
  mode,
  backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  titleText: '',
  subtitleText: '',
  rows: [],
  footerText: '',
});

const layoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: SaveLoadDialogOptions | undefined,
): SaveLoadDialogLayout => {
  const mode = options?.mode ?? 'save';
  const env = legacyUiEnv(options?.env);
  if (viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout(mode);
  }
  const vm = toSaveLoadDialogViewModel(state, mode, env.t);
  if (!vm) return emptyLayout(mode);

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;
  const isSave = vm.mode === 'save';
  const headerHeight = 64;
  const inputHeight = 38;
  const inputGap = 10;
  const buttonGap = 12;
  const maxPanelHeight = Math.min(540, viewHeight - marginY * 2);
  const minPanelHeight = Math.min(220, maxPanelHeight);
  const maxContentHeight =
    maxPanelHeight - paddingY * 2 - headerHeight - BTN_HEIGHT - buttonGap;

  let rowCount = 0;
  let footerText = '';
  if (!isSave) {
    rowCount = Math.max(
      0,
      Math.floor((maxContentHeight + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)),
    );
    if (vm.rows.length > rowCount) {
      while (
        rowCount > 1 &&
        rowCount * (ROW_HEIGHT + ROW_GAP) + 20 > maxContentHeight
      ) {
        rowCount -= 1;
      }
      footerText = env.t('content.menu.loadGame.moreSaves', {
        count: String(vm.rows.length - rowCount),
      });
    } else {
      rowCount = vm.rows.length;
    }
  }
  const hasFooter = footerText !== '';
  const contentHeight = isSave
    ? inputHeight + inputGap
    : rowCount * (ROW_HEIGHT + ROW_GAP) + (hasFooter ? 20 : 0);
  const panelHeight = Math.max(
    minPanelHeight,
    Math.min(
      maxPanelHeight,
      paddingY * 2 + headerHeight + contentHeight + BTN_HEIGHT + buttonGap,
    ),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);
  const btnY = panelY + panelHeight - paddingY - BTN_HEIGHT;
  const contentTop = panelY + paddingY + headerHeight;
  const inputBounds = isSave
    ? {
        x: panelX + paddingX,
        y: contentTop,
        width: contentWidth,
        height: inputHeight,
      }
    : undefined;
  const rows: SaveLoadDialogRowLayout[] = [];
  let rowY = contentTop;
  for (let index = 0; index < rowCount; index += 1) {
    rows.push({
      item: savedGameItems(state, options?.callbacks)[index],
      bounds: {
        x: panelX + paddingX,
        y: rowY,
        width: contentWidth,
        height: ROW_HEIGHT,
      },
    });
    rowY += ROW_HEIGHT + ROW_GAP;
  }
  let footerBounds: Rect | undefined;
  if (hasFooter) {
    footerBounds = {
      x: panelX + paddingX,
      y: rowY - ROW_GAP + 4,
      width: contentWidth,
      height: 16,
    };
  }
  const actionWidth = isSave ? 140 : 100;
  const actionButtonBounds = {
    x: panelX + panelWidth - paddingX - actionWidth,
    y: btnY,
    width: actionWidth,
    height: BTN_HEIGHT,
  };
  const secondaryButtonBounds = isSave
    ? { x: panelX + paddingX, y: btnY, width: 100, height: BTN_HEIGHT }
    : undefined;
  return {
    hasContent: true,
    mode,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText: vm.titleText,
    subtitleText: vm.subtitleText,
    inputBounds,
    rows,
    actionButtonBounds,
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel: vm.secondaryButtonLabel,
    footerBounds,
    footerText,
  };
};

export const getSaveLoadDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: SaveLoadDialogOptions,
): SaveLoadDialogLayout => layoutFor(viewWidth, viewHeight, state, options);

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  offsetX: bounds.x,
  offsetY: bounds.y,
  alignSelf: 'start',
  justifySelf: 'start',
});

const fitText = (
  text: string,
  width: number,
  env: UiEnv,
  size: 'sm' | 'lg' | 'xl',
  bold = false,
): string => {
  const font = composeFont(
    env.theme,
    env.theme.typography.sizes[size],
    bold ? env.theme.typography.weights.bold : undefined,
  );
  if (env.measure.width(text, font) <= width) return text;
  let trimmed = text;
  while (
    trimmed.length > 1 &&
    env.measure.width(`${trimmed}...`, font) > width
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
};

const compositionFor = (
  layout: SaveLoadDialogLayout,
  env: UiEnv,
  options: RenderSaveLoadDialogOptions | undefined,
): CompositionNode => {
  const panel = layout.panelBounds;
  const children: CompositionNode[] = [
    positioned(
      { type: 'hitTarget', actionId: 'backdrop' },
      layout.backdropBounds,
    ),
    positioned({ type: 'hitTarget', actionId: 'panel' }, panel),
    positioned(
      { type: 'fill', themeStyle: { overlay: 'scrimDialog' } },
      layout.backdropBounds,
    ),
    positioned(
      {
        type: 'fill',
        shape: 'roundedRect',
        themeStyle: {
          surface: 'panelDialog',
          border: 'panelDialog',
          radius: 10,
          strokeWidth: 'regular',
        },
      },
      panel,
    ),
    positioned(
      {
        type: 'text',
        text: layout.titleText,
        role: 'heading',
        baseline: 'top',
        themeStyle: {
          text: 'headerDialog',
          fontSize: 'title',
          fontWeight: 'bold',
        },
      },
      { x: panel.x + 18, y: panel.y + 14, width: panel.width - 36, height: 28 },
    ),
    positioned(
      {
        type: 'text',
        text: layout.subtitleText,
        baseline: 'top',
        themeStyle: { text: 'secondary', fontSize: 'lg' },
      },
      { x: panel.x + 18, y: panel.y + 38, width: panel.width - 36, height: 22 },
    ),
  ];
  if (layout.inputBounds) {
    const bounds = layout.inputBounds;
    children.push(positioned({ type: 'hitTarget', actionId: 'input' }, bounds));
    children.push(
      positioned(
        {
          type: 'textInput',
          actionId: 'input',
          value: options?.saveName ?? '',
          focused: true,
          themeStyle: {
            surface: 'input',
            border: 'inputFocus',
            text: 'strong',
            fontSize: 'xl',
            radius: 4,
            strokeWidth: 'medium',
          },
        },
        bounds,
      ),
    );
  }
  for (const row of layout.rows) {
    const id = row.item.id;
    const hovered = options?.hoveredItemId === id;
    children.push(
      positioned({ type: 'hitTarget', actionId: `row:${id}` }, row.bounds),
    );
    children.push(
      positioned(
        {
          type: 'fill',
          shape: 'roundedRect',
          themeStyle: {
            surface: hovered ? 'rowHover' : 'row',
            border: 'row',
            radius: 6,
            strokeWidth: 'thin',
          },
        },
        row.bounds,
      ),
    );
    children.push(
      positioned(
        {
          type: 'text',
          text: fitText(row.item.label, row.bounds.width - 24, env, 'lg', true),
          baseline: 'middle',
          themeStyle: {
            text: hovered ? 'bright' : 'dialogValue',
            fontSize: 'lg',
            fontWeight: 'bold',
          },
        },
        {
          x: row.bounds.x + 12,
          y: row.bounds.y,
          width: row.bounds.width - 24,
          height: 32,
        },
      ),
    );
    if (row.item.hint) {
      children.push(
        positioned(
          {
            type: 'text',
            text: fitText(row.item.hint, row.bounds.width - 24, env, 'sm'),
            baseline: 'middle',
            themeStyle: {
              text: hovered ? 'secondary' : 'muted',
              fontSize: 'sm',
            },
          },
          {
            x: row.bounds.x + 12,
            y: row.bounds.y + 23,
            width: row.bounds.width - 24,
            height: 22,
          },
        ),
      );
    }
  }
  if (layout.footerBounds && layout.footerText) {
    children.push(
      positioned(
        {
          type: 'text',
          text: layout.footerText,
          baseline: 'middle',
          themeStyle: { text: 'muted', fontSize: 'sm' },
        },
        layout.footerBounds,
      ),
    );
  }
  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    children.push(
      positioned(
        {
          type: 'button',
          actionId: 'secondary',
          label: layout.secondaryButtonLabel,
          variant: 'secondary',
        },
        layout.secondaryButtonBounds,
      ),
    );
  }
  if (layout.actionButtonBounds && layout.actionButtonLabel) {
    const isSave = layout.mode === 'save';
    children.push(
      positioned(
        {
          type: 'button',
          actionId: 'action',
          label: layout.actionButtonLabel,
          variant: isSave ? 'primary' : 'secondary',
          ...(!isSave
            ? {
                themeStyle: {
                  surface: options?.hoveredAction
                    ? 'buttonSecondaryHover'
                    : 'buttonSecondary',
                  border: 'buttonSecondary',
                  text: 'bright',
                  fontSize: 'xl',
                  fontWeight: 'bold',
                  radius: 6,
                  strokeWidth: 'medium',
                },
                hoverThemeStyle: { surface: 'buttonSecondaryHover' },
              }
            : {}),
        },
        layout.actionButtonBounds,
      ),
    );
  }
  return {
    type: 'stack',
    width: layout.backdropBounds.width,
    height: layout.backdropBounds.height,
    children,
  };
};

const compositionLayoutFor = (
  layout: SaveLoadDialogLayout,
  env: UiEnv,
  options: RenderSaveLoadDialogOptions | undefined,
): CompositionLayoutNode =>
  layoutComposition(
    compositionFor(layout, env, options),
    layout.backdropBounds,
    env,
  );

export const getSaveLoadDialogHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: SaveLoadDialogOptions | undefined,
  x: number,
  y: number,
): SaveLoadDialogHitResult | null => {
  const layout = layoutFor(viewWidth, viewHeight, state, options);
  if (!layout.hasContent) return null;
  const env = legacyUiEnv(options?.env);
  const hit = hitTestComposition(compositionLayoutFor(layout, env, options), {
    x,
    y,
  });
  if (
    hit?.kind === 'hitTarget' ||
    hit?.kind === 'button' ||
    hit?.kind === 'textInput'
  ) {
    const actionId = hit.actionId;
    if (actionId.startsWith('row:')) {
      const item = savedGameItems(state, options?.callbacks).find(
        (menuItem) => menuItem.id === actionId.slice(4),
      );
      return item ? { type: 'row', item } : null;
    }
    if (
      actionId === 'action' ||
      actionId === 'secondary' ||
      actionId === 'input'
    ) {
      return { type: actionId };
    }
    if (actionId === 'panel' || actionId === 'backdrop')
      return { type: actionId };
  }
  return { type: 'backdrop' };
};

export const renderSaveLoadDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: SaveLoadDialogOptions,
): void => {
  const layout = layoutFor(viewWidth, viewHeight, state, options);
  if (!layout.hasContent) return;

  const ui: UiContext = {
    ...legacyUiEnv(options?.env),
    ctx,
    assets: uiAssetProvider,
  };
  const composition = compositionLayoutFor(layout, ui, options);
  renderComposition(composition, ui, {
    hoveredActionId: options?.hoveredAction
      ? 'action'
      : options?.hoveredSecondary
        ? 'secondary'
        : options?.hoveredItemId
          ? `row:${options.hoveredItemId}`
          : null,
    focusedActionId: layout.inputBounds ? 'input' : null,
  });
};
