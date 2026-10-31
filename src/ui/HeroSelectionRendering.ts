import { i18n } from '../core';
import { getCampaign } from '../campaigns';
import type { Campaign, Hero } from '../types';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';

// The hero selection step of the New Game flow: after the new-game dialog
// the player picks 1..maxHeroes heroes from the campaign roster, renames
// them if desired, and starts the run with that party. The name inputs
// behave like text inputs prefilled with the roster name: erasing and
// appending both edit the value shown in the field. Same centered
// panel style as the welcome screen and the save/load dialog; the layout/
// hit/render split keeps it testable without a real canvas.

/** Player-typed names are clamped but never corrected or generated. */
export const MAX_HERO_NAME_LENGTH = 20;

/** The party always has at least one hero, regardless of the campaign. */
export const MIN_PARTY_SIZE = 1;

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
  rowBounds: CardBounds;
  checkboxBounds: CardBounds;
  swatchBounds: CardBounds;
  nameInputBounds: CardBounds;
}

export interface HeroSelectionLayout {
  hasContent: boolean;
  panelBounds: CardBounds;
  headerText: string;
  countText: string;
  rows: HeroSelectionRowLayout[];
  startButtonBounds: CardBounds;
  startButtonLabel: string;
  startEnabled: boolean;
  backButtonBounds: CardBounds;
  backButtonLabel: string;
}

export type HeroSelectionHitResult =
  | { type: 'checkbox'; heroId: string }
  | { type: 'nameInput'; heroId: string }
  | { type: 'row'; heroId: string }
  | { type: 'start' }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const COUNT_FONT = '13px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const NAME_FONT = '14px Arial, Helvetica, sans-serif';

const PANEL_RADIUS = 10;
const ROW_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;
const CHECKBOX_SIZE = 20;
const SWATCH_SIZE = 14;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

/** The campaign's maximum party size (its roster size unless capped). */
export const getMaxHeroes = (campaign: Campaign): number =>
  Math.max(MIN_PARTY_SIZE, campaign.maxHeroes ?? campaign.heroes.length);

/** All roster heroes selected, up to the campaign maximum, in roster order. */
export const getDefaultSelectedHeroIds = (campaign: Campaign): string[] =>
  campaign.heroes
    .map((hero) => hero.id ?? '')
    .filter((id) => id !== '')
    .slice(0, getMaxHeroes(campaign));

/**
 * Toggles a hero's selection. Deselection is always allowed (Start is
 * disabled below the minimum); selection is capped at the campaign
 * maximum. The result keeps the roster order.
 */
export const toggleHeroSelection = (
  rosterIds: string[],
  selectedIds: string[],
  heroId: string,
  maxHeroes: number,
): string[] => {
  if (selectedIds.includes(heroId)) {
    return selectedIds.filter((id) => id !== heroId);
  }
  if (selectedIds.length >= maxHeroes) {
    return selectedIds;
  }
  return rosterIds.filter((id) => selectedIds.includes(id) || id === heroId);
};

/** Names are user content: length-clamped, never corrected or generated. */
export const clampHeroName = (name: string): string =>
  name.slice(0, MAX_HERO_NAME_LENGTH);

/** The roster default a name input is prefilled with. */
export const getHeroDefaultName = (
  campaign: Campaign,
  heroId: string,
): string => {
  const hero = campaign.heroes.find((h) => h.id === heroId);
  return hero ? i18n(hero.nameTranslationKey ?? hero.name) : '';
};

/**
 * The value the rename editor edits: the typed name once the hero has
 * one, otherwise the prefilled roster default — so erasing and appending
 * both start from the name shown in the input.
 */
export const getHeroRenameValue = (
  campaign: Campaign,
  heroId: string,
  names: Record<string, string>,
): string => names[heroId] ?? getHeroDefaultName(campaign, heroId);

/**
 * Applies one rename keystroke: Backspace erases the last character,
 * a printable character appends (length-clamped), anything else is a
 * no-op.
 */
export const applyHeroRenameKey = (value: string, key: string): string =>
  key === 'Backspace'
    ? value.slice(0, -1)
    : key.length === 1
    ? clampHeroName(value + key)
    : value;

/** Start needs at least one selected hero (empty names fall back). */
export const isHeroSelectionStartEnabled = (selectedIds: string[]): boolean =>
  selectedIds.length >= MIN_PARTY_SIZE;

/**
 * The override heroes for `init()`: deep clones of the selected roster
 * heroes in roster order, with the typed names applied. Renamed heroes
 * keep the roster id and get the typed name as their translation key, so
 * unrenamed heroes keep their translations and renamed ones display the
 * literal typed name. The campaign's registered roster is never touched.
 */
export const buildSelectedHeroes = (
  campaign: Campaign,
  selectedIds: string[],
  names: Record<string, string>,
): Hero[] =>
  campaign.heroes
    .filter((hero) => hero.id !== undefined && selectedIds.includes(hero.id))
    .map((hero) => {
      const clone = structuredClone(hero) as Hero;
      const typed = names[hero.id ?? ''] ?? '';
      const trimmed = typed.trim();
      if (trimmed) {
        clone.name = clampHeroName(trimmed);
        clone.nameTranslationKey = clone.name;
      }
      return clone;
    });

export const getHeroSelectionLayout = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): HeroSelectionLayout => {
  const emptyLayout: HeroSelectionLayout = {
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
  };
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout;
  const campaign = getCampaign(campaignId);
  const maxHeroes = getMaxHeroes(campaign);
  const selectedIds = options?.selectedHeroIds ?? [];
  const names = options?.names ?? {};

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const contentWidth = panelWidth - PADDING_X * 2;
  const maxPanelHeight = Math.min(600, Math.max(220, viewHeight - marginY * 2));

  const rowsTop = PADDING_Y + HEADER_HEIGHT;
  const rowsHeight =
    campaign.heroes.length * ROW_HEIGHT +
    (campaign.heroes.length - 1) * ROW_GAP;
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
      campaign.heroes.length,
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

  const rows: HeroSelectionRowLayout[] = campaign.heroes
    .slice(0, visibleRowCount)
    .map((hero, index) => {
      const heroId = hero.id ?? '';
      const rowY = panelY + rowsTop + index * (ROW_HEIGHT + ROW_GAP);
      const checkboxBounds: CardBounds = {
        x: panelX + PADDING_X,
        y: rowY + (ROW_HEIGHT - CHECKBOX_SIZE) / 2,
        width: CHECKBOX_SIZE,
        height: CHECKBOX_SIZE,
      };
      const swatchBounds: CardBounds = {
        x: checkboxBounds.x + CHECKBOX_SIZE + 10,
        y: rowY + (ROW_HEIGHT - SWATCH_SIZE) / 2,
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
      };
      const nameInputBounds: CardBounds = {
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
        label:
          typed !== undefined ? typed : getHeroDefaultName(campaign, heroId),
        colour: hero.colour,
        selected,
        dimmed: !selected && selectedIds.length >= maxHeroes,
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
    headerText: i18n('content.menu.heroSelection.header'),
    countText: i18n('content.menu.heroSelection.count', {
      selected: String(selectedIds.length),
      max: String(maxHeroes),
    }),
    rows,
    startButtonBounds: {
      x: panelX + panelWidth - PADDING_X - startWidth,
      y: btnY,
      width: startWidth,
      height: BTN_HEIGHT,
    },
    startButtonLabel: i18n('content.menu.heroSelection.buttons.start'),
    startEnabled: isHeroSelectionStartEnabled(selectedIds),
    backButtonBounds: {
      x: panelX + PADDING_X,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: i18n('content.menu.loadGame.buttons.back'),
  };
};

export const getHeroSelectionHit = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  x: number,
  y: number,
  options?: HeroSelectionOptions,
): HeroSelectionHitResult | null => {
  const layout = getHeroSelectionLayout(
    viewWidth,
    viewHeight,
    campaignId,
    options,
  );
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInBounds(x, y, row.checkboxBounds)) {
      return { type: 'checkbox', heroId: row.heroId };
    }
    if (isPointInBounds(x, y, row.nameInputBounds)) {
      return { type: 'nameInput', heroId: row.heroId };
    }
    if (isPointInBounds(x, y, row.rowBounds)) {
      return { type: 'row', heroId: row.heroId };
    }
  }
  if (isPointInBounds(x, y, layout.startButtonBounds)) {
    return { type: 'start' };
  }
  if (isPointInBounds(x, y, layout.backButtonBounds)) {
    return { type: 'back' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  return { type: 'backdrop' };
};

export const renderHeroSelection = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): void => {
  const layout = getHeroSelectionLayout(
    viewWidth,
    viewHeight,
    campaignId,
    options,
  );
  if (!layout.hasContent) return;

  ctx.save();

  // Centered modal panel, welcome/dialog style.
  const p = layout.panelBounds;
  ctx.fillStyle = '#181b22';
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, PANEL_RADIUS);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, PANEL_RADIUS);
  ctx.stroke();

  // Header + selected counter.
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.headerText, p.x + 18, p.y + 14);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = COUNT_FONT;
  ctx.textAlign = 'right';
  ctx.fillText(layout.countText, p.x + p.width - 18, p.y + 20);

  // Hero rows.
  for (const row of layout.rows) {
    const isHovered = options?.hoveredHeroId === row.heroId;
    const rb = row.rowBounds;
    ctx.fillStyle = isHovered ? '#334155' : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, ROW_RADIUS);
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, ROW_RADIUS);
    ctx.stroke();

    // Selection checkbox, speedrunner-checkbox style.
    const cb = row.checkboxBounds;
    ctx.fillStyle = row.selected ? '#ca8a04' : '#1e293b';
    drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
    ctx.fill();
    ctx.strokeStyle = row.selected ? '#fde047' : '#475569';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
    ctx.stroke();
    if (row.selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
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
    const input = row.nameInputBounds;
    ctx.fillStyle = '#0f1217';
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.fill();
    ctx.strokeStyle = row.focused ? '#fbbf24' : '#475569';
    ctx.lineWidth = row.focused ? 1.5 : 1;
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.stroke();

    ctx.font = NAME_FONT;
    ctx.fillStyle = row.dimmed ? '#64748b' : '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.label, input.x + 10, input.y + input.height / 2);
    if (row.focused) {
      // Static caret after the text.
      ctx.fillRect(
        input.x + 10 + ctx.measureText(row.label).width + 2,
        input.y + input.height / 2 - 9,
        1,
        18,
      );
    }
  }

  // Back button (secondary style, bottom-left).
  const sb = layout.backButtonBounds;
  const isSecondaryHovered = Boolean(options?.hoveredSecondary);
  ctx.fillStyle = isSecondaryHovered ? '#475569' : '#334155';
  drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.backButtonLabel,
    sb.x + sb.width / 2,
    sb.y + sb.height / 2,
  );

  // Start button (primary style, bottom-right); dimmed when disabled.
  const ab = layout.startButtonBounds;
  const isActionHovered = Boolean(options?.hoveredAction);
  ctx.globalAlpha = layout.startEnabled ? 1 : 0.5;
  ctx.fillStyle = isActionHovered ? '#b45309' : '#92400e';
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.startButtonLabel,
    ab.x + ab.width / 2,
    ab.y + ab.height / 2,
  );
  ctx.globalAlpha = 1;

  ctx.restore();
};
