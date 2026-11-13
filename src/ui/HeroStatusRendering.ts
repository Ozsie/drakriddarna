// Game-side facade for the hero status screen (the full-screen status and
// inventory overlay opened from a hero card's inventory button). The
// component (layout, hit test, render over the view model) lives in the
// kit; the adapter in ./viewmodels/heroStatus is the only place that reads
// GameState. This module keeps the historical entry points — render and
// hit — for the board controller and tests, with the item sources resolved
// on game objects (Hero / Item).

import type { GameState, Hero, Item } from '../types';
import type {
  CompositionNode,
  CompositionStack,
  CompositionThemeStyle,
  Rect,
  UiContext,
  UiEnv,
} from '@hoard-engine/uikit';
import {
  composeFont,
  hitTestComposition,
  layoutComposition,
  PER_CHAR_WIDTH_FALLBACK,
  renderComposition,
  truncateText,
  wrapTextMeasured,
} from '@hoard-engine/uikit';
import {
  heroStatusItemForSource,
  heroWithOpenStatus,
  toHeroStatusViewModel,
  type HeroStatusEffectVm,
  type HeroStatusItemVm,
  type HeroStatusSelection,
  type HeroStatusSelectionSource,
  type HeroStatusSlotId,
  type HeroStatusSlotVm,
  type HeroStatusStatVm,
  type HeroStatusViewModel,
} from './viewmodels/heroStatus';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export type { HeroStatusSelection, HeroStatusSelectionSource };
export type {
  HeroStatusDetailVm,
  HeroStatusEffectVm,
  HeroStatusItemVm,
  HeroStatusSlotId,
  HeroStatusSlotVm,
  HeroStatusStatVm,
  HeroStatusViewModel,
} from './viewmodels/heroStatus';

export interface RenderHeroStatusOptions {
  /** The currently selected item (slot or inventory index), null for none. */
  readonly selection?: HeroStatusSelection | null;
  /** Whether the close button is hovered. */
  readonly isCloseHovered?: boolean;
  /** Whether the detail area's use button is hovered. */
  readonly isUseHovered?: boolean;
  readonly env?: UiEnv;
}

export type HeroStatusHitResult =
  | { type: 'close'; hero: Hero }
  | { type: 'slot'; hero: Hero; slotId: HeroStatusSlotId; item: Item | null }
  | { type: 'item'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'use'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'panel'; hero: Hero }
  | { type: 'backdrop'; hero: Hero };

const viewBounds = (viewWidth: number, viewHeight: number): Rect => ({
  x: 0,
  y: 0,
  width: viewWidth,
  height: viewHeight,
});

interface HeroStatusSlotLayout {
  vm: HeroStatusSlotVm;
  bounds: Rect;
}

interface HeroStatusCellLayout {
  vm: HeroStatusItemVm | null;
  itemIndex: number | null;
  bounds: Rect;
}

interface HeroStatusStatLayout {
  vm: HeroStatusStatVm;
  bounds: Rect;
}

interface HeroStatusEffectLayout {
  vm: HeroStatusEffectVm;
  bounds: Rect;
}

interface HeroStatusDetailLayout {
  vm: NonNullable<HeroStatusViewModel['detail']>;
  bounds: Rect;
  useButtonBounds?: Rect;
  descriptionLines: readonly string[];
}

interface HeroStatusLayout {
  hasContent: boolean;
  vm: HeroStatusViewModel;
  panelBounds: Rect;
  closeButtonBounds: Rect;
  slots: readonly HeroStatusSlotLayout[];
  detail: HeroStatusDetailLayout | null;
  descriptionBounds: Rect;
  statusEffectsBounds: Rect;
  effects: readonly HeroStatusEffectLayout[];
  inventoryGrid: readonly HeroStatusCellLayout[];
  stats: readonly HeroStatusStatLayout[];
}

const layoutHeroStatus = (
  vm: HeroStatusViewModel,
  bounds: Rect,
  env: UiEnv,
): HeroStatusLayout => {
  const { width, height } = bounds;
  const marginX = width * 0.05;
  const marginY = height * 0.05;
  const panelBounds = {
    x: marginX,
    y: marginY,
    width: Math.max(0, width - marginX * 2),
    height: Math.max(0, height - marginY * 2),
  };
  const closeButtonBounds = {
    x: panelBounds.x + panelBounds.width - 20 - 6,
    y: panelBounds.y + 7,
    width: 20,
    height: 20,
  };
  const contentX = panelBounds.x + 16;
  const contentY = panelBounds.y + 34 + 16;
  const contentWidth = panelBounds.width - 32;
  const contentHeight = panelBounds.height - 34 - 32;
  const rightColumnWidth = Math.floor(contentWidth * 0.38);
  const statsTotalHeight =
    vm.stats.length * 36 + Math.max(0, vm.stats.length - 1) * 8;
  const statsTop = contentY + contentHeight - statsTotalHeight;
  const gridTop = contentY + 22;
  const gridMaxHeight = Math.max(0, statsTop - gridTop - 8);
  const rows = Math.max(4, Math.ceil(vm.inventory.length / 4));
  const cellWidth = Math.max(24, Math.floor((rightColumnWidth - 3 * 8) / 4));
  const lineHeight = Math.floor((gridMaxHeight - (rows - 1) * 8) / rows);
  const cellHeight = Math.min(
    Math.max(24, cellWidth),
    Math.max(24, lineHeight),
  );
  const slotColumnWidth = cellWidth;
  const middleColumnWidth = Math.max(
    0,
    contentWidth - slotColumnWidth - rightColumnWidth - 2 * 12,
  );
  const middleX = contentX + slotColumnWidth + 12;
  const rightX = middleX + middleColumnWidth + 12;
  const slots = vm.slots.map((slot, index) => ({
    vm: slot,
    bounds: {
      x: contentX,
      y: contentY + index * (22 + cellHeight + 10),
      width: slotColumnWidth,
      height: 22 + cellHeight,
    },
  }));
  const descriptionBounds = {
    x: middleX,
    y: contentY + 22,
    width: middleColumnWidth,
    height: Math.max(0, statsTop - 22 - 10 - 22 - contentY),
  };
  const statusEffectsBounds = {
    x: middleX,
    y: statsTop,
    width: middleColumnWidth,
    height: Math.max(0, contentY + contentHeight - statsTop),
  };
  const effectsMaxRows = Math.floor((statusEffectsBounds.height - 6) / 26);
  const effects = vm.effects
    .slice(0, Math.max(0, effectsMaxRows))
    .map((effect, index) => ({
      vm: effect,
      bounds: {
        x: statusEffectsBounds.x + 16,
        y: statusEffectsBounds.y + 6 + index * 26,
        width: statusEffectsBounds.width - 32,
        height: 20,
      },
    }));
  let detail: HeroStatusDetailLayout | null = null;
  if (vm.detail) {
    const useButtonBounds = vm.detail.hasUse
      ? {
          x: descriptionBounds.x + descriptionBounds.width - 84 - 16,
          y: descriptionBounds.y + descriptionBounds.height - 22 - 16,
          width: 84,
          height: 22,
        }
      : undefined;
    const textTop = descriptionBounds.y + 22 + 30;
    const textBottom = useButtonBounds
      ? useButtonBounds.y - 10
      : descriptionBounds.y + descriptionBounds.height - 16;
    const maxLines = Math.max(0, Math.floor((textBottom - textTop) / 16));
    const inset = (useButtonBounds ? 84 + 30 : 0) + 16;
    const widthForText = Math.max(32, descriptionBounds.width - inset);
    detail = {
      vm: vm.detail,
      bounds: descriptionBounds,
      useButtonBounds,
      descriptionLines: wrapTextMeasured(
        env.measure,
        vm.detail.descriptionText,
        widthForText,
        composeFont(env.theme, env.theme.typography.sizes.xxs),
      ).slice(0, Math.max(0, maxLines)),
    };
  }
  const inventoryGrid: HeroStatusCellLayout[] = [];
  for (let index = 0; index < rows * 4; index += 1) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const item = vm.inventory[index] ?? null;
    inventoryGrid.push({
      vm: item,
      itemIndex: item?.itemIndex ?? null,
      bounds: {
        x: rightX + column * (cellWidth + 8),
        y: gridTop + row * (cellHeight + 8),
        width: cellWidth,
        height: cellHeight,
      },
    });
  }
  const stats = vm.stats.map((stat, index) => ({
    vm: stat,
    bounds: {
      x: rightX,
      y: statsTop + index * 44,
      width: rightColumnWidth,
      height: 36,
    },
  }));
  return {
    hasContent: width > 0 && height > 0,
    vm,
    panelBounds,
    closeButtonBounds,
    slots,
    detail,
    descriptionBounds,
    statusEffectsBounds,
    effects,
    inventoryGrid,
    stats,
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

const textAt = (
  text: string,
  x: number,
  y: number,
  themeStyle: CompositionThemeStyle,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'top',
  lineHeight?: number,
): CompositionNode =>
  positioned(
    {
      type: 'text',
      text,
      align,
      baseline,
      themeStyle,
      ...(lineHeight === undefined ? {} : { lineHeight }),
    },
    { x, y, width: 0, height: 0 },
  );

const roundedFill = (
  bounds: Rect,
  themeStyle: CompositionThemeStyle,
): CompositionNode =>
  positioned({ type: 'fill', shape: 'roundedRect', themeStyle }, bounds);

const compositionFor = (
  layout: HeroStatusLayout,
  width: number,
  height: number,
  options: RenderHeroStatusOptions | undefined,
  ctx?: CanvasRenderingContext2D,
): CompositionStack => {
  const { vm } = layout;
  const theme = legacyUiEnv(options?.env, { viewWidth: width }).theme;
  const children: CompositionNode[] = [
    positioned(
      { type: 'hitTarget', actionId: 'backdrop' },
      { x: 0, y: 0, width, height },
    ),
    positioned(
      {
        type: 'fill',
        themeStyle: { overlay: 'scrimDialog' },
      },
      { x: 0, y: 0, width, height },
    ),
    positioned(
      {
        type: 'panel',
        title: vm.headerText,
        padding: 0,
        children: [],
      },
      layout.panelBounds,
    ),
    positioned({ type: 'hitTarget', actionId: 'panel' }, layout.panelBounds),
  ];

  const closeStyle: CompositionThemeStyle = {
    surface: options?.isCloseHovered ? 'closeButtonHover' : 'closeButton',
    border: 'panelDialog',
    strokeWidth: 'thin',
    radius: 3,
    text: 'headerDialog',
    fontSize: 'sm',
    fontWeight: 'bold',
    fontFamily: 'plain',
  };
  children.push(
    positioned(
      {
        type: 'button',
        actionId: 'close',
        label: vm.closeIcon,
        themeStyle: closeStyle,
      },
      layout.closeButtonBounds,
    ),
  );

  const boxHeaderStyle: CompositionThemeStyle = {
    text: 'headerDialog',
    fontSize: 'sm',
    fontWeight: 'bold',
  };
  const statStyle: CompositionThemeStyle = {
    fontSize: 'sm',
    fontWeight: 'bold',
  };
  const iconStyle: CompositionThemeStyle = {
    text: 'inventoryItem',
    fontSize: 'lg',
    fontWeight: 'regular',
    fontFamily: 'plain',
  };

  for (const slot of layout.slots) {
    const { bounds, vm: slotVm } = slot;
    const labelFont = composeFont(
      theme,
      theme.typography.sizes.sm,
      theme.typography.weights.bold,
    );
    const label = ctx
      ? truncateText(
          ctx,
          slotVm.labelText,
          Math.max(bounds.width, 30),
          labelFont,
          PER_CHAR_WIDTH_FALLBACK,
        )
      : slotVm.labelText;
    children.push(textAt(label, bounds.x, bounds.y + 4, boxHeaderStyle));
    const boxBounds = {
      ...bounds,
      y: bounds.y + 22,
      height: Math.max(0, bounds.height - 22),
    };
    children.push(
      roundedFill(boxBounds, {
        surface: slotVm.isSelected ? 'rowSelected' : 'row',
        border: slotVm.isSelected ? 'rowSelected' : 'row',
        strokeWidth: slotVm.isSelected ? 'regular' : 'thin',
        radius: 4,
      }),
    );
    if (slotVm.isEmpty) {
      if (slotVm.nameText) {
        const name = ctx
          ? truncateText(
              ctx,
              slotVm.nameText,
              boxBounds.width - 8,
              composeFont(theme, theme.typography.sizes.xxs),
              PER_CHAR_WIDTH_FALLBACK,
            )
          : slotVm.nameText;
        children.push(
          textAt(
            name,
            boxBounds.x + boxBounds.width / 2,
            boxBounds.y + boxBounds.height / 2,
            { text: 'faint', fontSize: 'xxs' },
            'center',
            'middle',
          ),
        );
      }
      continue;
    }
    const iconSize = Math.min(boxBounds.width - 8, boxBounds.height - 8);
    const iconBounds = {
      x: boxBounds.x + Math.floor((boxBounds.width - iconSize) / 2),
      y: boxBounds.y + Math.floor((boxBounds.height - iconSize) / 2),
      width: iconSize,
      height: iconSize,
    };
    if (slotVm.sprite) {
      children.push(
        positioned(
          {
            type: 'image',
            sprite: slotVm.sprite,
            fit: 'contain',
            fallback: 'surface',
            ...(slotVm.icon ? { fallbackText: slotVm.icon } : {}),
            themeStyle: iconStyle,
          },
          iconBounds,
        ),
      );
    } else if (slotVm.icon) {
      children.push(
        textAt(
          slotVm.icon,
          iconBounds.x + iconSize / 2,
          iconBounds.y + iconSize / 2,
          iconStyle,
          'center',
          'middle',
        ),
      );
    }
  }

  const description = layout.descriptionBounds;
  children.push(
    textAt(
      vm.descriptionHeaderText,
      description.x,
      description.y - 22,
      boxHeaderStyle,
    ),
  );
  if (description.height > 0) {
    children.push(
      roundedFill(description, {
        surface: 'row',
        border: 'row',
        strokeWidth: 'thin',
        radius: 5,
      }),
    );
  }
  if (layout.detail && description.height > 0) {
    const { vm: detail, descriptionLines } = layout.detail;
    const detailNameFont = composeFont(
      theme,
      theme.typography.sizes.lg,
      theme.typography.weights.bold,
    );
    const name = ctx
      ? truncateText(
          ctx,
          detail.nameText,
          description.width - 32,
          detailNameFont,
          PER_CHAR_WIDTH_FALLBACK,
        )
      : detail.nameText;
    children.push(
      textAt(name, description.x + 16, description.y + 10, {
        text: 'bright',
        fontSize: 'lg',
        fontWeight: 'bold',
      }),
    );
    let textTop = description.y + 36;
    if (detail.effectText) {
      const effectFont = composeFont(theme, theme.typography.sizes.sm);
      const effect = ctx
        ? truncateText(
            ctx,
            detail.effectText,
            description.width - 32,
            effectFont,
            PER_CHAR_WIDTH_FALLBACK,
          )
        : detail.effectText;
      children.push(
        textAt(effect, description.x + 16, textTop, {
          text: 'body',
          fontSize: 'sm',
        }),
      );
      textTop += 20;
    }
    if (descriptionLines.length > 0) {
      children.push(
        textAt(
          descriptionLines.join('\n'),
          description.x + 16,
          textTop,
          { text: 'secondary', fontSize: 'xxs' },
          'left',
          'top',
          16,
        ),
      );
    }
    if (layout.detail.useButtonBounds) {
      const isUsable = detail.isUsable;
      children.push(
        positioned(
          {
            type: 'button',
            actionId: isUsable ? 'use' : 'panel',
            label: isUsable ? detail.useText : detail.usedText,
            themeStyle: {
              surface: isUsable
                ? options?.isUseHovered
                  ? 'useButtonHover'
                  : 'useButton'
                : 'useButtonDisabled',
              border: isUsable ? 'useButton' : 'useButtonDisabled',
              strokeWidth: 'thin',
              radius: 3,
              text: isUsable ? 'bright' : 'inventoryUsed',
              fontSize: 'xxs',
              fontWeight: 'bold',
            },
          },
          layout.detail.useButtonBounds,
        ),
      );
    }
  }

  const effectsPanel = layout.statusEffectsBounds;
  if (effectsPanel.height > 0) {
    children.push(
      textAt(
        vm.statusEffectsHeaderText,
        effectsPanel.x,
        effectsPanel.y - 22,
        boxHeaderStyle,
      ),
      roundedFill(effectsPanel, {
        surface: 'row',
        border: 'row',
        strokeWidth: 'thin',
        radius: 5,
      }),
    );
    for (const effect of layout.effects) {
      const { bounds, vm: effectVm } = effect;
      const labelFont = composeFont(
        theme,
        theme.typography.sizes.sm,
        theme.typography.weights.bold,
      );
      const label = ctx
        ? truncateText(
            ctx,
            effectVm.labelText,
            bounds.width - 8,
            labelFont,
            PER_CHAR_WIDTH_FALLBACK,
          )
        : effectVm.labelText;
      children.push(
        roundedFill(bounds, {
          surface: 'input',
          border: 'row',
          strokeWidth: 'thin',
          radius: 3,
        }),
        textAt(
          label,
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
          { text: 'body', ...statStyle },
          'center',
          'middle',
        ),
      );
    }
  }

  if (layout.inventoryGrid.length > 0) {
    const firstCell = layout.inventoryGrid[0].bounds;
    children.push(
      textAt(
        vm.inventoryLabelText,
        firstCell.x,
        firstCell.y - 22,
        boxHeaderStyle,
      ),
    );
  }
  for (const cell of layout.inventoryGrid) {
    const { bounds, vm: item } = cell;
    children.push(
      roundedFill(bounds, {
        surface: item ? (item.isSelected ? 'rowSelected' : 'row') : 'input',
        border: item?.isSelected ? 'rowSelected' : 'row',
        strokeWidth: item?.isSelected ? 'regular' : 'thin',
        radius: 4,
      }),
    );
    if (!item) continue;
    const iconSize = Math.min(bounds.width - 8, bounds.height - 8);
    const iconBounds = {
      x: bounds.x + Math.floor((bounds.width - iconSize) / 2),
      y: bounds.y + Math.floor((bounds.height - iconSize) / 2),
      width: iconSize,
      height: iconSize,
    };
    if (item.sprite) {
      children.push(
        positioned(
          {
            type: 'image',
            sprite: item.sprite,
            fit: 'contain',
            fallback: 'surface',
            ...(item.icon ? { fallbackText: item.icon } : {}),
            themeStyle: iconStyle,
          },
          iconBounds,
        ),
      );
    } else if (item.icon) {
      children.push(
        textAt(
          item.icon,
          iconBounds.x + iconSize / 2,
          iconBounds.y + iconSize / 2,
          iconStyle,
          'center',
          'middle',
        ),
      );
    }
  }
  if (vm.inventory.length === 0 && layout.inventoryGrid.length > 0) {
    const first = layout.inventoryGrid[0].bounds;
    const last = layout.inventoryGrid[layout.inventoryGrid.length - 1].bounds;
    children.push(
      textAt(
        vm.inventoryEmptyText,
        (first.x + last.x + last.width) / 2,
        first.y + Math.floor((last.y + last.height - first.y) / 2),
        {
          text: 'faint',
          fontSize: 'sm',
          fontWeight: 'italic',
          fontFamily: 'compact',
        },
        'center',
        'top',
      ),
    );
  }

  for (const stat of layout.stats) {
    const { bounds, vm: statVm } = stat;
    children.push(
      roundedFill(bounds, {
        surface: 'input',
        border: 'row',
        strokeWidth: 'thin',
        radius: 4,
      }),
      textAt(
        statVm.labelText,
        bounds.x + 10,
        bounds.y + bounds.height / 2,
        { text: 'body', ...statStyle },
        'left',
        'middle',
      ),
      textAt(
        `${statVm.valueText} / ${statVm.maxText}`,
        bounds.x + bounds.width - 10,
        bounds.y + bounds.height / 2,
        { text: 'bright', ...statStyle },
        'right',
        'middle',
      ),
    );
  }

  for (const cell of layout.inventoryGrid) {
    if (cell.vm) {
      children.push(
        positioned(
          { type: 'hitTarget', actionId: `item:${cell.vm.itemIndex}` },
          cell.bounds,
        ),
      );
    }
  }
  for (const slot of layout.slots) {
    children.push(
      positioned(
        { type: 'hitTarget', actionId: `slot:${slot.vm.slotId}` },
        slot.bounds,
      ),
    );
  }
  if (layout.detail?.useButtonBounds && layout.detail.vm.isUsable) {
    children.push(
      positioned(
        { type: 'hitTarget', actionId: 'use' },
        layout.detail.useButtonBounds,
      ),
    );
  }
  children.push(
    positioned(
      { type: 'hitTarget', actionId: 'close' },
      layout.closeButtonBounds,
    ),
  );
  return { type: 'stack', width, height, children };
};

const viewModel = (
  viewWidth: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  env?: UiEnv,
): { vm: HeroStatusViewModel; env: UiEnv } | null => {
  if (!state || viewWidth <= 0) return null;
  const resolvedEnv = legacyUiEnv(env, { viewWidth });
  const vm = toHeroStatusViewModel(state, selection, resolvedEnv.t);
  return vm ? { vm, env: resolvedEnv } : null;
};

const layoutAndVmFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  env?: UiEnv,
): { layout: HeroStatusLayout; vm: HeroStatusViewModel; env: UiEnv } | null => {
  const built = viewModel(viewWidth, state, selection, env);
  if (!built || viewHeight <= 0) return null;
  const layout = layoutHeroStatus(
    built.vm,
    viewBounds(viewWidth, viewHeight),
    built.env,
  );
  return { layout, vm: built.vm, env: built.env };
};

export const renderHeroStatus = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderHeroStatusOptions,
): void => {
  const built = layoutAndVmFor(
    viewWidth,
    viewHeight,
    state,
    options?.selection ?? null,
    options?.env,
  );
  if (!built) return;

  const ui: UiContext = {
    ...built.env,
    ctx,
    assets: uiAssetProvider,
  };
  const composition = compositionFor(
    built.layout,
    viewWidth,
    viewHeight,
    options,
    ctx,
  );
  const tree = layoutComposition(
    composition,
    viewBounds(viewWidth, viewHeight),
    built.env,
  );
  ctx.save();
  renderComposition(tree, ui);
  ctx.restore();
};

export const getHeroStatusHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  screenX = 0,
  screenY = 0,
  env?: UiEnv,
): HeroStatusHitResult | null => {
  const hero = heroWithOpenStatus(state);
  if (!hero) return null;

  const built = layoutAndVmFor(viewWidth, viewHeight, state, selection, env);
  if (!built) return null;

  const composition = compositionFor(
    built.layout,
    viewWidth,
    viewHeight,
    undefined,
  );
  const tree = layoutComposition(
    composition,
    viewBounds(viewWidth, viewHeight),
    built.env,
  );
  const hit = hitTestComposition(tree, { x: screenX, y: screenY });
  if (!hit) return null;
  const actionId = hit.actionId;
  if (!actionId) return null;

  if (actionId.startsWith('item:')) {
    const itemIndex = Number(actionId.slice('item:'.length));
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return null;
    const item = (hero.inventory ?? [])[itemIndex];
    return item ? { type: 'item', hero, item, itemIndex } : null;
  }

  switch (actionId) {
    case 'close':
      return { type: 'close', hero };
    case 'panel':
      return { type: 'panel', hero };
    case 'backdrop':
      return { type: 'backdrop', hero };
    case 'slot:weapon': {
      const item = heroStatusItemForSource(hero, { kind: 'weapon' });
      return { type: 'slot', hero, slotId: 'weapon', item };
    }
    case 'slot:armour': {
      const item = heroStatusItemForSource(hero, { kind: 'armour' });
      return { type: 'slot', hero, slotId: 'armour', item };
    }
    case 'slot:shield': {
      const item = heroStatusItemForSource(hero, { kind: 'shield' });
      return { type: 'slot', hero, slotId: 'shield', item };
    }
    case 'use': {
      if (!selection || selection.heroId !== hero.name) return null;
      if (selection.source.kind !== 'inventory') return null;
      const item = heroStatusItemForSource(hero, selection.source);
      return item
        ? {
            type: 'use',
            hero,
            item,
            itemIndex: selection.source.itemIndex,
          }
        : null;
    }
    default:
      return null;
  }
};
