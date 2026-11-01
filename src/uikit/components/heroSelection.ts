// Hero selection component: the step of the New Game flow where the
// player picks 1..maxHeroes heroes from the campaign roster and renames
// them. Kit component per the 02 contract — the view model carries the
// roster (ids, default names, colours), the party limits and the button
// labels prebuilt by the game-side adapter; selection, typed names and
// focus are layout options; hits are semantic hero ids.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import { drawModalFrame, drawModalHeader } from '../kit/modalFrame';
import { drawButton } from '../kit/button';
import { drawListRow, listRowStyles } from '../kit/listRow';
import { drawTextInput } from '../kit/textInput';
import type { UiContext, UiEnv } from '../env';
import type { UiTheme } from '../theme';

export interface HeroSelectionRowVm {
  /** Hit-test identity: the roster hero's id. */
  readonly id: string;
  /** The roster default name, shown until the player types one. */
  readonly defaultLabel: string;
  /** The hero's colour, drawn as the row swatch. */
  readonly colour: string;
}

export interface HeroSelectionViewModel {
  readonly headerText: string;
  readonly startButtonLabel: string;
  readonly backButtonLabel: string;
  /** The party always has at least one hero. */
  readonly minHeroes: number;
  /** The campaign's maximum party size. */
  readonly maxHeroes: number;
  readonly rows: readonly HeroSelectionRowVm[];
}

export interface HeroSelectionRowLayout {
  heroId: string;
  /** The name to display: the typed name or the roster default. */
  label: string;
  colour: string;
  selected: boolean;
  /** Unselected while the party is full: drawn dimmed, click is a no-op. */
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

/** Semantic hit: which part of the selection panel is under the point. */
export type HeroSelectionHit =
  | { kind: 'checkbox'; heroId: string }
  | { kind: 'nameInput'; heroId: string }
  | { kind: 'row'; heroId: string }
  | { kind: 'start' }
  | { kind: 'back' }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

export interface HeroSelectionLayoutOptions {
  /** Roster-order ids of the selected heroes. */
  selectedHeroIds?: readonly string[];
  /** Player-typed names by hero id. */
  names?: Record<string, string>;
  focusedHeroId?: string | null;
}

const ROW_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;
const CHECKBOX_SIZE = 20;
const SWATCH_SIZE = 14;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

export const emptyHeroSelectionLayout = (): HeroSelectionLayout => ({
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

export const layoutHeroSelection = (
  vm: HeroSelectionViewModel | null,
  viewBounds: Rect,
  env: UiEnv,
  options?: HeroSelectionLayoutOptions,
): HeroSelectionLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) {
    return emptyHeroSelectionLayout();
  }

  const selectedIds = options?.selectedHeroIds ?? [];
  const names = options?.names ?? {};

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const contentWidth = panelWidth - PADDING_X * 2;
  const maxPanelHeight = Math.min(600, Math.max(220, viewHeight - marginY * 2));

  const rowsTop = PADDING_Y + HEADER_HEIGHT;
  const rowsHeight =
    vm.rows.length * ROW_HEIGHT + (vm.rows.length - 1) * ROW_GAP;
  const panelHeight = Math.max(
    220,
    Math.min(
      maxPanelHeight,
      PADDING_Y * 2 + HEADER_HEIGHT + rowsHeight + BTN_HEIGHT + 12 + 12,
    ),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);
  const btnY = panelY + panelHeight - PADDING_Y - BTN_HEIGHT;

  // When the roster does not fit, the newest stay visible.
  const visibleRowCount = Math.max(
    1,
    Math.min(
      vm.rows.length,
      Math.floor(
        (panelHeight -
          PADDING_Y * 2 -
          HEADER_HEIGHT -
          BTN_HEIGHT -
          24 +
          ROW_GAP) /
          (ROW_HEIGHT + ROW_GAP),
      ),
    ),
  );

  const rows: HeroSelectionRowLayout[] = vm.rows
    .slice(0, visibleRowCount)
    .map((hero, index) => {
      const heroId = hero.id;
      const rowY = panelY + rowsTop + index * (ROW_HEIGHT + ROW_GAP);
      const checkboxBounds: Rect = {
        x: panelX + PADDING_X,
        y: rowY + (ROW_HEIGHT - CHECKBOX_SIZE) / 2,
        width: CHECKBOX_SIZE,
        height: CHECKBOX_SIZE,
      };
      const swatchBounds: Rect = {
        x: checkboxBounds.x + CHECKBOX_SIZE + 10,
        y: rowY + (ROW_HEIGHT - SWATCH_SIZE) / 2,
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
      };
      const nameInputBounds: Rect = {
        x: swatchBounds.x + SWATCH_SIZE + 10,
        y: rowY + (ROW_HEIGHT - 30) / 2,
        width:
          panelX + panelWidth - PADDING_X - (swatchBounds.x + SWATCH_SIZE + 10),
        height: 30,
      };
      const selected = selectedIds.includes(heroId);
      const typed = names[heroId];
      return {
        heroId,
        // Edited names show raw (empty included); unedited rows
        // prefill with the roster default.
        label: typed !== undefined ? typed : hero.defaultLabel,
        colour: hero.colour,
        selected,
        dimmed: !selected && selectedIds.length >= vm.maxHeroes,
        focused: options?.focusedHeroId === heroId,
        rowBounds: {
          x: panelX + PADDING_X,
          y: rowY,
          width: contentWidth,
          height: ROW_HEIGHT,
        },
        checkboxBounds,
        swatchBounds,
        nameInputBounds,
      };
    });

  const startWidth = 120;
  const backWidth = 100;

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
    startButtonBounds: {
      x: panelX + panelWidth - PADDING_X - startWidth,
      y: btnY,
      width: startWidth,
      height: BTN_HEIGHT,
    },
    startButtonLabel: vm.startButtonLabel,
    startEnabled: selectedIds.length >= vm.minHeroes,
    backButtonBounds: {
      x: panelX + PADDING_X,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: vm.backButtonLabel,
  };
};

export const hitTestHeroSelection = (
  layout: HeroSelectionLayout,
  point: { x: number; y: number },
): HeroSelectionHit => {
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInRect(point.x, point.y, row.checkboxBounds)) {
      return { kind: 'checkbox', heroId: row.heroId };
    }
    if (isPointInRect(point.x, point.y, row.nameInputBounds)) {
      return { kind: 'nameInput', heroId: row.heroId };
    }
    if (isPointInRect(point.x, point.y, row.rowBounds)) {
      return { kind: 'row', heroId: row.heroId };
    }
  }
  if (isPointInRect(point.x, point.y, layout.startButtonBounds)) {
    return { kind: 'start' };
  }
  if (isPointInRect(point.x, point.y, layout.backButtonBounds)) {
    return { kind: 'back' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  return { kind: 'backdrop' };
};

export interface RenderHeroSelectionOptions {
  readonly hoveredHeroId?: string | null;
  readonly hoveredAction?: boolean;
  readonly hoveredSecondary?: boolean;
}

export const renderHeroSelection = (
  layout: HeroSelectionLayout,
  ui: UiContext,
  options?: RenderHeroSelectionOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  ctx.save();

  // Centered modal panel, welcome/dialog style.
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);

  // Header + selected counter.
  drawModalHeader(ctx, p, layout.headerText, theme);

  ctx.fillStyle = theme.palette.text.secondary;
  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.textAlign = 'right';
  ctx.fillText(layout.countText, p.x + p.width - 18, p.y + 20);

  // Hero rows.
  for (const row of layout.rows) {
    const isHovered = options?.hoveredHeroId === row.heroId;
    const rb = row.rowBounds;
    drawListRow(
      ctx,
      rb,
      listRowStyles(theme, isHovered ? 'hover' : 'rest'),
      ROW_RADIUS,
    );

    // Selection checkbox, speedrunner-checkbox style.
    const cb = row.checkboxBounds;
    ctx.fillStyle = row.selected
      ? theme.palette.surface.checkboxSelected
      : theme.palette.surface.checkbox;
    drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
    ctx.fill();
    ctx.strokeStyle = row.selected
      ? theme.palette.border.checkboxSelected
      : theme.palette.border.input;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
    ctx.stroke();
    if (row.selected) {
      ctx.strokeStyle = theme.palette.text.bright;
      ctx.lineWidth = theme.shape.strokeWidth.regular;
      ctx.beginPath();
      ctx.moveTo(cb.x + 5, cb.y + cb.height / 2);
      ctx.lineTo(cb.x + cb.width / 2 - 1, cb.y + cb.height - 5);
      ctx.lineTo(cb.x + cb.width - 4, cb.y + 4);
      ctx.stroke();
    }

    // Colour swatch.
    const sw = row.swatchBounds;
    ctx.fillStyle = row.colour;
    drawRoundedRect(ctx, sw.x, sw.y, sw.width, sw.height, 3);
    ctx.fill();

    // Name field, save-dialog input style; dimmed when the row is.
    drawTextInput(ctx, row.nameInputBounds, row.label, theme, {
      focused: row.focused,
      textColor: row.dimmed
        ? theme.palette.text.dimmed
        : theme.palette.text.strong,
    });
  }

  // Back button (secondary style, bottom-left).
  drawButton(ctx, layout.backButtonBounds, layout.backButtonLabel, theme, {
    variant: 'secondary',
    hovered: Boolean(options?.hoveredSecondary),
  });

  // Start button (primary style, bottom-right); dimmed when disabled.
  ctx.globalAlpha = layout.startEnabled ? 1 : theme.alpha.dimmed;
  drawButton(ctx, layout.startButtonBounds, layout.startButtonLabel, theme, {
    variant: 'primary',
    hovered: Boolean(options?.hoveredAction),
  });
  ctx.globalAlpha = 1;

  ctx.restore();
};
