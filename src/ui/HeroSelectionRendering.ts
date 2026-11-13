// Game-side facade for the hero selection step. The component (layout,
// hit test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/heroSelection owns the campaign roster rules and the
// rename/party helpers the controller drives. This module keeps the
// historical entry points so the board controller and the hit cascade
// work unchanged, with the exact same pixels: parity snapshots cover
// the whole chain.

import type {
  CompositionNode,
  CompositionStack,
  CompositionThemeStyle,
  Rect,
  UiContext,
  UiEnv,
} from '@hoard-engine/uikit';
import {
  hitTestComposition,
  layoutComposition,
  renderComposition,
} from '@hoard-engine/uikit';
import {
  toHeroSelectionViewModel,
  type HeroSelectionViewModel,
} from './viewmodels/heroSelection';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export {
  MAX_HERO_NAME_LENGTH,
  MIN_PARTY_SIZE,
  applyHeroRenameKey,
  buildSelectedHeroes,
  clampHeroName,
  getDefaultSelectedHeroIds,
  getHeroDefaultName,
  getHeroRenameValue,
  getMaxHeroes,
  isHeroSelectionStartEnabled,
  toggleHeroSelection,
} from './viewmodels/heroSelection';

export type { HeroSelectionViewModel } from './viewmodels/heroSelection';

export interface HeroSelectionOptions {
  /** Roster-order ids of the selected heroes. */
  selectedHeroIds: string[];
  /**
   * Player-typed names by hero id. A hero without an entry shows (and
   * edits) the roster default; once edited, the raw typed value shows,
   * empty included.
   */
  names: Record<string, string>;
  focusedHeroId?: string | null;
  hoveredHeroId?: string | null;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type HeroSelectionHitResult =
  | { type: 'checkbox'; heroId: string }
  | { type: 'nameInput'; heroId: string }
  | { type: 'row'; heroId: string }
  | { type: 'start' }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

export interface HeroSelectionRowLayout {
  heroId: string;
  label: string;
  colour: string;
  selected: boolean;
  dimmed: boolean;
  focused: boolean;
  rowBounds: Rect;
  checkboxBounds: Rect;
  swatchBounds: Rect;
  nameInputBounds: Rect;
}

export interface HeroSelectionLayout {
  hasContent: boolean;
  panelBounds: Rect;
  headerText: string;
  countText: string;
  rows: HeroSelectionRowLayout[];
  startButtonBounds: Rect;
  startButtonLabel: string;
  startEnabled: boolean;
  backButtonBounds: Rect;
  backButtonLabel: string;
}

const emptyLayout = (): HeroSelectionLayout => ({
  hasContent: false,
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  headerText: '',
  countText: '',
  rows: [],
  startButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  startButtonLabel: '',
  startEnabled: false,
  backButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  backButtonLabel: '',
});

const layoutFor = (
  viewWidth: number,
  viewHeight: number,
  vm: HeroSelectionViewModel,
  env: UiEnv,
  options?: HeroSelectionOptions,
): HeroSelectionLayout => {
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout();

  const selectedIds = options?.selectedHeroIds ?? [];
  const names = options?.names ?? {};
  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const contentWidth = panelWidth - 36;
  const maxPanelHeight = Math.min(600, Math.max(220, viewHeight - marginY * 2));
  const rowsHeight = vm.rows.length * 48 + (vm.rows.length - 1) * 8;
  const panelHeight = Math.max(
    220,
    Math.min(maxPanelHeight, 16 * 2 + 48 + rowsHeight + 36 + 12 + 12),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);
  const buttonY = panelY + panelHeight - 16 - 36;
  const visibleRowCount = Math.max(
    1,
    Math.min(
      vm.rows.length,
      Math.floor((panelHeight - 16 * 2 - 48 - 36 - 24 + 8) / (48 + 8)),
    ),
  );
  const rows = vm.rows.slice(0, visibleRowCount).map((hero, index) => {
    const rowY = panelY + 16 + 48 + index * (48 + 8);
    const checkboxBounds = {
      x: panelX + 18,
      y: rowY + 14,
      width: 20,
      height: 20,
    };
    const swatchBounds = {
      x: checkboxBounds.x + 30,
      y: rowY + 17,
      width: 14,
      height: 14,
    };
    const nameInputBounds = {
      x: swatchBounds.x + 24,
      y: rowY + 9,
      width: panelX + panelWidth - 18 - (swatchBounds.x + 24),
      height: 30,
    };
    const selected = selectedIds.includes(hero.id);
    const typed = names[hero.id];
    return {
      heroId: hero.id,
      label: typed !== undefined ? typed : hero.defaultLabel,
      colour: hero.colour,
      selected,
      dimmed: !selected && selectedIds.length >= vm.maxHeroes,
      focused: options?.focusedHeroId === hero.id,
      rowBounds: {
        x: panelX + 18,
        y: rowY,
        width: contentWidth,
        height: 48,
      },
      checkboxBounds,
      swatchBounds,
      nameInputBounds,
    };
  });
  const startButtonBounds = {
    x: panelX + panelWidth - 18 - 120,
    y: buttonY,
    width: 120,
    height: 36,
  };
  return {
    hasContent: true,
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    headerText: vm.headerText,
    countText: env.t('content.menu.heroSelection.count', {
      selected: String(selectedIds.length),
      max: String(vm.maxHeroes),
    }),
    rows,
    startButtonBounds,
    startButtonLabel: vm.startButtonLabel,
    startEnabled: selectedIds.length >= vm.minHeroes,
    backButtonBounds: {
      x: panelX + 18,
      y: buttonY,
      width: 100,
      height: 36,
    },
    backButtonLabel: vm.backButtonLabel,
  };
};

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  alignSelf: 'start',
  justifySelf: 'start',
  offsetX: bounds.x,
  offsetY: bounds.y,
});

const rowActionId = (heroId: string): string => `row:${heroId}`;
const checkboxActionId = (heroId: string): string => `checkbox:${heroId}`;
const nameActionId = (heroId: string): string => `name:${heroId}`;

const compositionFor = (
  layout: HeroSelectionLayout,
  viewWidth: number,
  viewHeight: number,
  options?: HeroSelectionOptions,
): { root: CompositionStack; start: CompositionNode } => {
  const children: CompositionNode[] = [
    positioned(
      { type: 'hitTarget', actionId: 'backdrop' },
      { x: 0, y: 0, width: viewWidth, height: viewHeight },
    ),
    positioned(
      { type: 'panel', title: layout.headerText, padding: 0, children: [] },
      layout.panelBounds,
    ),
    positioned(
      {
        type: 'hitTarget',
        actionId: 'panel',
      },
      layout.panelBounds,
    ),
    positioned(
      {
        type: 'text',
        text: layout.countText,
        align: 'right',
        baseline: 'top',
        themeStyle: { text: 'secondary', fontSize: 'lg' },
      },
      {
        x: layout.panelBounds.x + layout.panelBounds.width - 18,
        y: layout.panelBounds.y + 20,
        width: 0,
        height: 0,
      },
    ),
  ];
  const theme = legacyUiEnv(options?.env).theme;

  for (const row of layout.rows) {
    const hovered = options?.hoveredHeroId === row.heroId;
    const rowStyle: CompositionThemeStyle = {
      surface: hovered ? 'rowHover' : 'row',
      border: hovered ? 'rowHover' : 'row',
      strokeWidth: 'thin',
      radius: 6,
    };
    children.push(
      positioned(
        {
          type: 'fill',
          shape: 'roundedRect',
          themeStyle: rowStyle,
        },
        row.rowBounds,
      ),
      positioned(
        { type: 'hitTarget', actionId: rowActionId(row.heroId) },
        row.rowBounds,
      ),
      positioned(
        {
          type: 'fill',
          shape: 'roundedRect',
          themeStyle: { fillColor: row.colour, radius: 3 },
        },
        row.swatchBounds,
      ),
      positioned(
        {
          type: 'checkbox',
          actionId: checkboxActionId(row.heroId),
          label: '',
          checked: row.selected,
        },
        row.checkboxBounds,
      ),
      positioned(
        {
          type: 'textInput',
          actionId: nameActionId(row.heroId),
          value: row.label,
          focused: row.focused,
          ...(row.dimmed
            ? { themeStyle: { textColor: theme.palette.text.dimmed } }
            : {}),
        },
        row.nameInputBounds,
      ),
    );
  }

  children.push(
    positioned(
      {
        type: 'button',
        actionId: 'back',
        label: layout.backButtonLabel,
        variant: 'secondary',
        themeStyle: {
          surface: options?.hoveredSecondary
            ? 'buttonSecondaryHover'
            : 'buttonSecondary',
          border: 'buttonSecondary',
          strokeWidth: 'thin',
          radius: 6,
          text: 'body',
          fontSize: 'xl',
          fontWeight: 'bold',
        },
      },
      layout.backButtonBounds,
    ),
  );
  const start = positioned(
    {
      type: 'button',
      actionId: 'start',
      label: layout.startButtonLabel,
      variant: 'primary',
      themeStyle: {
        surface: options?.hoveredAction
          ? 'buttonPrimaryHover'
          : 'buttonPrimary',
        border: 'buttonPrimary',
        strokeWidth: 'medium',
        radius: 6,
        text: 'bright',
        fontSize: 'xl',
        fontWeight: 'bold',
      },
    },
    layout.startButtonBounds,
  );
  children.push(start);
  return {
    root: { type: 'stack', width: viewWidth, height: viewHeight, children },
    start,
  };
};

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options: HeroSelectionOptions | undefined,
): HeroSelectionLayout => {
  const env = legacyUiEnv(options?.env);
  const vm = toHeroSelectionViewModel(campaignId, env.t);
  return layoutFor(viewWidth, viewHeight, vm, env, options);
};

export const getHeroSelectionLayout = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): HeroSelectionLayout =>
  kitLayoutFor(viewWidth, viewHeight, campaignId, options);

export const getHeroSelectionHit = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  x: number,
  y: number,
  options?: HeroSelectionOptions,
): HeroSelectionHitResult | null => {
  const layout = kitLayoutFor(viewWidth, viewHeight, campaignId, options);
  if (!layout.hasContent) return null;
  const env = legacyUiEnv(options?.env);
  const composition = compositionFor(
    layout,
    viewWidth,
    viewHeight,
    options,
  ).root;
  const hit = hitTestComposition(
    layoutComposition(
      composition,
      { x: 0, y: 0, width: viewWidth, height: viewHeight },
      env,
    ),
    { x, y },
  );
  if (!hit) return null;

  if (hit.actionId === 'panel') return { type: 'panel' };
  if (hit.actionId === 'backdrop') return { type: 'backdrop' };
  if (hit.actionId === 'start') return { type: 'start' };
  if (hit.actionId === 'back') return { type: 'back' };
  const [kind, ...idParts] = hit.actionId.split(':');
  const heroId = idParts.join(':');
  switch (kind) {
    case 'checkbox':
      return { type: 'checkbox', heroId };
    case 'name':
      return { type: 'nameInput', heroId };
    case 'row':
      return { type: 'row', heroId };
  }
  return null;
};

export const renderHeroSelection = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): void => {
  const layout = kitLayoutFor(viewWidth, viewHeight, campaignId, options);
  if (!layout.hasContent) return;

  const env = legacyUiEnv(options?.env);
  const ui: UiContext = {
    ...env,
    ctx,
    assets: uiAssetProvider,
  };
  const viewBounds = { x: 0, y: 0, width: viewWidth, height: viewHeight };
  const composition = compositionFor(layout, viewWidth, viewHeight, options);
  const baseComposition = {
    ...composition.root,
    children: composition.root.children.filter(
      (node) => node !== composition.start,
    ),
  };
  const baseLayout = layoutComposition(baseComposition, viewBounds, env);
  const startLayout = layoutComposition(composition.start, viewBounds, env);

  ctx.save();
  renderComposition(baseLayout, ui);
  ctx.globalAlpha = layout.startEnabled ? 1 : env.theme.alpha.dimmed;
  renderComposition(startLayout, ui);
  ctx.globalAlpha = 1;
  ctx.restore();
};
