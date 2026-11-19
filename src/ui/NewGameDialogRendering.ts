// Game-side facade for the new-game dialog. Its consumer-owned composition
// keeps the historical entry points while the adapter in
// ./viewmodels/newGameDialog remains the only place that reads game data.

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
  toNewGameDialogViewModel,
  type NewGameDialogViewModel,
} from './viewmodels/newGameDialog';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export { getCampaignRows, getGameMasterRows } from './viewmodels/newGameDialog';
export type {
  NewGameDialogRowVm,
  NewGameDialogViewModel,
} from './viewmodels/newGameDialog';

export interface NewGameDialogRowLayout {
  id: string;
  label: string;
  bounds: Rect;
  selected: boolean;
}

export interface NewGameDialogLayout {
  hasContent: boolean;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  campaignHeaderText: string;
  gameMasterHeaderText: string;
  campaignRows: NewGameDialogRowLayout[];
  gameMasterRows: NewGameDialogRowLayout[];
  checkboxBounds: Rect;
  checkboxLabelText: string;
  speedrunMode: boolean;
  /** Seed label + input, shown only in speedrunner mode. */
  seedLabelText?: string;
  seedInputBounds?: Rect;
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds: Rect;
  secondaryButtonLabel: string;
}

export interface NewGameDialogOptions {
  selectedCampaignId?: string;
  selectedGameMasterId?: string;
  speedrunMode?: boolean;
  seedInput?: string;
  hoveredCampaignId?: string | null;
  hoveredGameMasterId?: string | null;
  isCheckboxHovered?: boolean;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type NewGameDialogHitResult =
  | { type: 'campaign'; campaignId: string }
  | { type: 'gameMaster'; gameMasterId: string }
  | { type: 'checkbox' }
  | { type: 'seedInput' }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const emptyLayout = (speedrunMode = false): NewGameDialogLayout => ({
  hasContent: false,
  backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  titleText: '',
  campaignHeaderText: '',
  gameMasterHeaderText: '',
  campaignRows: [],
  gameMasterRows: [],
  checkboxBounds: { x: 0, y: 0, width: 0, height: 0 },
  checkboxLabelText: '',
  speedrunMode,
  actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  actionButtonLabel: '',
  secondaryButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  secondaryButtonLabel: '',
});

const ROW_HEIGHT = 36;
const ROW_GAP = 6;
const BTN_HEIGHT = 36;
const CHECKBOX_SIZE = 20;
const SEED_INPUT_WIDTH = 140;
const SEED_INPUT_HEIGHT = 30;
const COLUMN_HEADER_HEIGHT = 22;

const layoutFor = (
  viewWidth: number,
  viewHeight: number,
  options: NewGameDialogOptions | undefined,
): NewGameDialogLayout => {
  const env = legacyUiEnv(options?.env);
  const vm = toNewGameDialogViewModel(env.t);
  const speedrunMode = Boolean(options?.speedrunMode);
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout(speedrunMode);

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(420, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;
  const headerHeight = 48;
  const optionsRowHeight = 36;
  const buttonGap = 12;
  const rowCount = Math.max(vm.campaignRows.length, vm.gameMasterRows.length);
  const columnsHeight =
    COLUMN_HEADER_HEIGHT + rowCount * (ROW_HEIGHT + ROW_GAP);
  const panelHeight = Math.max(
    240,
    Math.min(
      Math.min(600, viewHeight - marginY * 2),
      paddingY * 2 +
        headerHeight +
        columnsHeight +
        optionsRowHeight +
        buttonGap +
        BTN_HEIGHT,
    ),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);
  const columnsTop = panelY + paddingY + headerHeight;
  const colGap = 16;
  const colWidth = Math.floor((contentWidth - colGap) / 2);
  const campaignColX = panelX + paddingX;
  const gameMasterColX = campaignColX + colWidth + colGap;
  const buildRows = (
    data: NewGameDialogViewModel['campaignRows'],
    columnX: number,
    selectedId: string | undefined,
  ): NewGameDialogRowLayout[] =>
    data.map((entry, index) => ({
      id: entry.id,
      label: entry.label,
      selected: entry.id === selectedId,
      bounds: {
        x: columnX,
        y: columnsTop + COLUMN_HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP),
        width: colWidth,
        height: ROW_HEIGHT,
      },
    }));
  const campaignRows = buildRows(
    vm.campaignRows,
    campaignColX,
    options?.selectedCampaignId,
  );
  const gameMasterRows = buildRows(
    vm.gameMasterRows,
    gameMasterColX,
    options?.selectedGameMasterId,
  );
  const optionsRowY = columnsTop + columnsHeight + 10;
  const checkboxBounds = {
    x: campaignColX,
    y: optionsRowY + (optionsRowHeight - CHECKBOX_SIZE) / 2,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
  };
  const seedInputBounds = speedrunMode
    ? {
        x: panelX + panelWidth - paddingX - SEED_INPUT_WIDTH,
        y: optionsRowY + (optionsRowHeight - SEED_INPUT_HEIGHT) / 2,
        width: SEED_INPUT_WIDTH,
        height: SEED_INPUT_HEIGHT,
      }
    : undefined;
  const btnY = panelY + panelHeight - paddingY - BTN_HEIGHT;
  return {
    hasContent: true,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText: vm.titleText,
    campaignHeaderText: vm.campaignHeaderText,
    gameMasterHeaderText: vm.gameMasterHeaderText,
    campaignRows,
    gameMasterRows,
    checkboxBounds,
    checkboxLabelText: vm.checkboxLabelText,
    speedrunMode,
    seedLabelText: seedInputBounds ? vm.seedLabelText : undefined,
    seedInputBounds,
    actionButtonBounds: {
      x: panelX + panelWidth - paddingX - 120,
      y: btnY,
      width: 120,
      height: BTN_HEIGHT,
    },
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds: {
      x: panelX + paddingX,
      y: btnY,
      width: 100,
      height: BTN_HEIGHT,
    },
    secondaryButtonLabel: vm.secondaryButtonLabel,
  };
};

export const getNewGameDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): NewGameDialogLayout => layoutFor(viewWidth, viewHeight, options);

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  offsetX: bounds.x,
  offsetY: bounds.y,
  alignSelf: 'start',
  justifySelf: 'start',
});

const rowComposition = (
  row: NewGameDialogRowLayout,
  actionId: string,
  hovered: boolean,
): CompositionNode[] => [
  positioned({ type: 'hitTarget', actionId }, row.bounds),
  positioned(
    {
      type: 'fill',
      shape: 'roundedRect',
      themeStyle: {
        surface: row.selected ? 'rowSelected' : hovered ? 'rowHover' : 'row',
        border: row.selected ? 'rowSelected' : 'row',
        radius: 6,
        strokeWidth: 'thin',
      },
    },
    row.bounds,
  ),
  positioned(
    {
      type: 'text',
      text: row.label,
      baseline: 'middle',
      themeStyle: {
        text: row.selected ? 'rowSelected' : hovered ? 'bright' : 'dialogValue',
        fontSize: 'lg',
      },
    },
    {
      x: row.bounds.x + 12,
      y: row.bounds.y,
      width: row.bounds.width - 24,
      height: row.bounds.height,
    },
  ),
];

const compositionFor = (
  layout: NewGameDialogLayout,
  options: NewGameDialogOptions | undefined,
): CompositionNode => {
  const panel = layout.panelBounds;
  const env = legacyUiEnv(options?.env);
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
  ];
  const headerY = layout.campaignRows[0]?.bounds.y
    ? layout.campaignRows[0].bounds.y - COLUMN_HEADER_HEIGHT
    : panel.y + 62;
  for (const [text, x] of [
    [
      layout.campaignHeaderText,
      layout.campaignRows[0]?.bounds.x ?? panel.x + 18,
    ],
    [
      layout.gameMasterHeaderText,
      layout.gameMasterRows[0]?.bounds.x ?? panel.x + 18,
    ],
  ] as const) {
    children.push(
      positioned(
        {
          type: 'text',
          text,
          baseline: 'top',
          themeStyle: { text: 'secondary', fontSize: 'md', fontWeight: 'bold' },
        },
        { x, y: headerY, width: panel.width / 2, height: 22 },
      ),
    );
  }
  for (const row of layout.campaignRows) {
    children.push(
      ...rowComposition(
        row,
        `campaign:${row.id}`,
        options?.hoveredCampaignId === row.id,
      ),
    );
  }
  for (const row of layout.gameMasterRows) {
    children.push(
      ...rowComposition(
        row,
        `gameMaster:${row.id}`,
        options?.hoveredGameMasterId === row.id,
      ),
    );
  }
  children.push(
    positioned(
      {
        type: 'checkbox',
        actionId: 'checkbox',
        label: '',
        checked: layout.speedrunMode,
        themeStyle: {
          surface: layout.speedrunMode ? 'checkboxSelected' : 'checkbox',
          border: layout.speedrunMode
            ? 'checkboxSelected'
            : options?.isCheckboxHovered
              ? 'rowHover'
              : 'input',
          strokeWidth: 'thin',
        },
      },
      layout.checkboxBounds,
    ),
  );
  const checkboxLabelFont = composeFont(
    env.theme,
    env.theme.typography.sizes.lg,
  );
  const checkboxLabelWidth = Math.max(0, panel.width - 48);
  children.push(
    positioned(
      {
        type: 'text',
        text: layout.checkboxLabelText,
        baseline: 'middle',
        themeStyle: {
          text: layout.speedrunMode ? 'rowSelected' : 'body',
          fontSize: 'lg',
        },
      },
      {
        x: layout.checkboxBounds.x + 30,
        y: layout.checkboxBounds.y - 8,
        width: Math.min(
          checkboxLabelWidth,
          env.measure.width(layout.checkboxLabelText, checkboxLabelFont),
        ),
        height: 36,
      },
    ),
  );
  if (layout.seedLabelText && layout.seedInputBounds) {
    const input = layout.seedInputBounds;
    children.push(
      positioned(
        {
          type: 'text',
          text: layout.seedLabelText,
          align: 'right',
          baseline: 'middle',
          themeStyle: { text: 'muted', fontSize: 'md' },
        },
        { x: input.x - 180, y: input.y, width: 170, height: input.height },
      ),
    );
    children.push(
      positioned(
        {
          type: 'textInput',
          actionId: 'seedInput',
          value: options?.seedInput ?? '',
          focused: true,
          themeStyle: {
            surface: 'input',
            border: 'inputFocus',
            text: 'strong',
            fontSize: 'md',
            radius: 4,
            strokeWidth: 'medium',
          },
        },
        input,
      ),
    );
  }
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
  children.push(
    positioned(
      {
        type: 'button',
        actionId: 'action',
        label: layout.actionButtonLabel,
        variant: 'primary',
      },
      layout.actionButtonBounds,
    ),
  );
  return {
    type: 'stack',
    width: layout.backdropBounds.width,
    height: layout.backdropBounds.height,
    children,
  };
};

const compositionLayoutFor = (
  layout: NewGameDialogLayout,
  env: UiEnv,
  options: NewGameDialogOptions | undefined,
): CompositionLayoutNode =>
  layoutComposition(
    compositionFor(layout, options),
    layout.backdropBounds,
    env,
  );

export const getNewGameDialogHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
  options?: NewGameDialogOptions,
): NewGameDialogHitResult | null => {
  const layout = layoutFor(viewWidth, viewHeight, options);
  if (!layout.hasContent) return null;
  const env = legacyUiEnv(options?.env);
  const hit = hitTestComposition(compositionLayoutFor(layout, env, options), {
    x,
    y,
  });
  if (
    hit?.kind !== 'hitTarget' &&
    hit?.kind !== 'button' &&
    hit?.kind !== 'checkbox' &&
    hit?.kind !== 'textInput'
  ) {
    return { type: 'backdrop' };
  }
  if (hit.actionId.startsWith('campaign:')) {
    return { type: 'campaign', campaignId: hit.actionId.slice(9) };
  }
  if (hit.actionId.startsWith('gameMaster:')) {
    return { type: 'gameMaster', gameMasterId: hit.actionId.slice(11) };
  }
  if (
    hit.actionId === 'action' ||
    hit.actionId === 'secondary' ||
    hit.actionId === 'checkbox' ||
    hit.actionId === 'seedInput'
  ) {
    return { type: hit.actionId };
  }
  if (hit.actionId === 'panel' || hit.actionId === 'backdrop')
    return { type: hit.actionId };
  return null;
};

export const renderNewGameDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): void => {
  const layout = layoutFor(viewWidth, viewHeight, options);
  if (!layout.hasContent) return;

  const ui: UiContext = {
    ...legacyUiEnv(options?.env),
    ctx,
    assets: uiAssetProvider,
  };
  const composition = compositionLayoutFor(layout, ui, options);
  const hoveredActionId = options?.hoveredCampaignId
    ? `campaign:${options.hoveredCampaignId}`
    : options?.hoveredGameMasterId
      ? `gameMaster:${options.hoveredGameMasterId}`
      : options?.isCheckboxHovered
        ? 'checkbox'
        : options?.hoveredAction
          ? 'action'
          : options?.hoveredSecondary
            ? 'secondary'
            : null;
  renderComposition(composition, ui, {
    hoveredActionId,
    focusedActionId: layout.seedInputBounds ? 'seedInput' : null,
  });
};
