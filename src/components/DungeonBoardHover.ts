import type {
  BetweenDungeonsHitResult,
  DungeonIntroHitResult,
  EventCardHitResult,
  HeroCardsHitResult,
  MenuHitResult,
  SaveLoadDialogHitResult,
  TopBarHitElement,
} from '../ui/UIRendering';
import type { PartyWipeAction } from '../types';
import type { UiHit } from './DungeonBoardUiHit';

// Hover tracking for the board's UI surfaces. The state is a plain object
// owned by the controller; every transition below mutates it and reports
// whether anything changed (so the caller only re-renders the UI layer
// when a hover flag actually flipped) plus the cursor to show.
export interface BoardHoverState {
  hoveredRadialIndex: number | null;
  isMenuHovered: boolean;
  isDebugHovered: boolean;
  isLogHovered: boolean;
  isDungeonIntroCloseHovered: boolean;
  hoveredMenuItemId: string | null;
  hoveredInventoryHeroName: string | null;
  hoveredCloseHeroName: string | null;
  hoveredUseItem: { heroName: string; itemIndex: number } | null;
  isEventCardToggleHovered: boolean;
  isBdActionHovered: boolean;
  isBdSecondaryHovered: boolean;
  hoveredBdItem: { heroIndex: number; itemIndex: number } | null;
  hoveredBdGiveHeroIndex: number | null;
  hoveredBdWipeAction: PartyWipeAction | null;
  isSdActionHovered: boolean;
  isSdSecondaryHovered: boolean;
}

export const createBoardHoverState = (): BoardHoverState => ({
  hoveredRadialIndex: null,
  isMenuHovered: false,
  isDebugHovered: false,
  isLogHovered: false,
  isDungeonIntroCloseHovered: false,
  hoveredMenuItemId: null,
  hoveredInventoryHeroName: null,
  hoveredCloseHeroName: null,
  hoveredUseItem: null,
  isEventCardToggleHovered: false,
  isBdActionHovered: false,
  isBdSecondaryHovered: false,
  hoveredBdItem: null,
  hoveredBdGiveHeroIndex: null,
  hoveredBdWipeAction: null,
  isSdActionHovered: false,
  isSdSecondaryHovered: false,
});

export interface HoverResult {
  cursor: string | null;
  changed: boolean;
}

const clearTopBarHovers = (hover: BoardHoverState): boolean => {
  let changed = false;
  if (hover.isMenuHovered) {
    hover.isMenuHovered = false;
    changed = true;
  }
  if (hover.isDebugHovered) {
    hover.isDebugHovered = false;
    changed = true;
  }
  if (hover.isLogHovered) {
    hover.isLogHovered = false;
    changed = true;
  }
  return changed;
};

const clearHeroCardHovers = (hover: BoardHoverState): boolean => {
  let changed = false;
  if (hover.hoveredInventoryHeroName !== null) {
    hover.hoveredInventoryHeroName = null;
    changed = true;
  }
  if (hover.hoveredCloseHeroName !== null) {
    hover.hoveredCloseHeroName = null;
    changed = true;
  }
  if (hover.hoveredUseItem !== null) {
    hover.hoveredUseItem = null;
    changed = true;
  }
  return changed;
};

// The between-dungeons overlay consumes the whole board while open, so the
// hit may be null (pointer over its panel or backdrop).
export const updateBetweenDungeonsHover = (
  hover: BoardHoverState,
  hit: BetweenDungeonsHitResult | null,
): HoverResult => {
  let changed = false;
  const isAction = hit?.type === 'actionButton';
  const isSecondary = hit?.type === 'secondaryButton';
  const isItem = hit?.type === 'item';
  const isGive = hit?.type === 'giveItem';
  const isWipe = hit?.type === 'wipeButton';
  if (hover.isBdActionHovered !== isAction) {
    hover.isBdActionHovered = isAction;
    changed = true;
  }
  if (hover.isBdSecondaryHovered !== isSecondary) {
    hover.isBdSecondaryHovered = isSecondary;
    changed = true;
  }
  const itemVal =
    isItem && hit?.type === 'item'
      ? { heroIndex: hit.heroIndex, itemIndex: hit.itemIndex }
      : null;
  if (JSON.stringify(hover.hoveredBdItem) !== JSON.stringify(itemVal)) {
    hover.hoveredBdItem = itemVal;
    changed = true;
  }
  const giveVal =
    isGive && hit?.type === 'giveItem' ? hit.targetHeroIndex : null;
  if (hover.hoveredBdGiveHeroIndex !== giveVal) {
    hover.hoveredBdGiveHeroIndex = giveVal;
    changed = true;
  }
  const wipeVal = isWipe && hit?.type === 'wipeButton' ? hit.action : null;
  if (hover.hoveredBdWipeAction !== wipeVal) {
    hover.hoveredBdWipeAction = wipeVal;
    changed = true;
  }
  return {
    cursor:
      isAction || isSecondary || isItem || isGive || isWipe
        ? 'pointer'
        : 'default',
    changed,
  };
};

export const updateDungeonIntroHover = (
  hover: BoardHoverState,
  hit: DungeonIntroHitResult,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  if (clearHeroCardHovers(hover)) {
    changed = true;
  }
  if (hover.isEventCardToggleHovered) {
    hover.isEventCardToggleHovered = false;
    changed = true;
  }
  const isClose = hit.type === 'close';
  if (hover.isDungeonIntroCloseHovered !== isClose) {
    hover.isDungeonIntroCloseHovered = isClose;
    changed = true;
  }
  return { cursor: isClose ? 'pointer' : 'default', changed };
};

export const updateTopBarHover = (
  hover: BoardHoverState,
  hit: TopBarHitElement,
  isLogOpen: boolean,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearHeroCardHovers(hover);
  let cursor: string;
  if (hit === 'menu') {
    cursor = 'pointer';
    if (!hover.isMenuHovered) {
      hover.isMenuHovered = true;
      changed = true;
    }
    if (hover.isDebugHovered) {
      hover.isDebugHovered = false;
      changed = true;
    }
    if (hover.isLogHovered) {
      hover.isLogHovered = false;
      changed = true;
    }
  } else if (hit === 'debug') {
    cursor = 'pointer';
    if (hover.isMenuHovered) {
      hover.isMenuHovered = false;
      changed = true;
    }
    if (!hover.isDebugHovered) {
      hover.isDebugHovered = true;
      changed = true;
    }
    if (hover.isLogHovered) {
      hover.isLogHovered = false;
      changed = true;
    }
  } else if (hit === 'log' || (isLogOpen && hit === 'logDropdown')) {
    cursor = 'pointer';
    if (hover.isMenuHovered) {
      hover.isMenuHovered = false;
      changed = true;
    }
    if (hover.isDebugHovered) {
      hover.isDebugHovered = false;
      changed = true;
    }
    if (!hover.isLogHovered) {
      hover.isLogHovered = true;
      changed = true;
    }
  } else {
    cursor = 'default';
    if (hover.isMenuHovered) {
      hover.isMenuHovered = false;
      changed = true;
    }
    if (hover.isDebugHovered) {
      hover.isDebugHovered = false;
      changed = true;
    }
    if (hover.isLogHovered) {
      hover.isLogHovered = false;
      changed = true;
    }
  }
  return { cursor, changed };
};

export const updateMenuHover = (
  hover: BoardHoverState,
  hit: MenuHitResult,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  if (clearHeroCardHovers(hover)) {
    changed = true;
  }
  const newHoveredId = hit.type === 'item' && hit.item ? hit.item.id : null;
  if (hover.hoveredMenuItemId !== newHoveredId) {
    hover.hoveredMenuItemId = newHoveredId;
    changed = true;
  }
  return {
    cursor: hit.type === 'item' ? 'pointer' : 'default',
    changed,
  };
};

export const updateHeroCardsHover = (
  hover: BoardHoverState,
  hit: HeroCardsHitResult,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  const newInvHero = hit.type === 'inventoryButton' ? hit.hero.name : null;
  const newCloseHero = hit.type === 'inventoryClose' ? hit.hero.name : null;
  const newUseItem =
    hit.type === 'inventoryUseItem'
      ? { heroName: hit.hero.name, itemIndex: hit.itemIndex }
      : null;
  if (hover.hoveredInventoryHeroName !== newInvHero) {
    hover.hoveredInventoryHeroName = newInvHero;
    changed = true;
  }
  if (hover.hoveredCloseHeroName !== newCloseHero) {
    hover.hoveredCloseHeroName = newCloseHero;
    changed = true;
  }
  if (
    hover.hoveredUseItem?.heroName !== newUseItem?.heroName ||
    hover.hoveredUseItem?.itemIndex !== newUseItem?.itemIndex
  ) {
    hover.hoveredUseItem = newUseItem;
    changed = true;
  }
  const isButtonHover =
    hit.type === 'inventoryButton' ||
    hit.type === 'inventoryClose' ||
    hit.type === 'inventoryUseItem';
  return { cursor: isButtonHover ? 'pointer' : 'default', changed };
};

const clearHoverCards = (
  hover: BoardHoverState,
  options: { eventCardToggle: boolean },
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  if (clearHeroCardHovers(hover)) {
    changed = true;
  }
  if (options.eventCardToggle && hover.isEventCardToggleHovered) {
    hover.isEventCardToggleHovered = false;
    changed = true;
  }
  return { cursor: 'default', changed };
};

export const updateMonsterCardsHover = (hover: BoardHoverState): HoverResult =>
  clearHoverCards(hover, { eventCardToggle: false });

export const updateDiaryHover = (hover: BoardHoverState): HoverResult =>
  clearHoverCards(hover, { eventCardToggle: true });

export const updateEventCardHover = (
  hover: BoardHoverState,
  hit: EventCardHitResult,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  if (clearHeroCardHovers(hover)) {
    changed = true;
  }
  const isToggle = hit.type === 'toggle';
  if (hover.isEventCardToggleHovered !== isToggle) {
    hover.isEventCardToggleHovered = isToggle;
    changed = true;
  }
  return { cursor: isToggle ? 'pointer' : 'default', changed };
};

export const updateSaveLoadDialogHover = (
  hover: BoardHoverState,
  hit: SaveLoadDialogHitResult,
): HoverResult => {
  hover.hoveredRadialIndex = null;
  let changed = clearTopBarHovers(hover);
  if (clearHeroCardHovers(hover)) {
    changed = true;
  }
  if (hover.isEventCardToggleHovered) {
    hover.isEventCardToggleHovered = false;
    changed = true;
  }
  const isAction = hit.type === 'action';
  const isSecondary = hit.type === 'secondary';
  if (hover.isSdActionHovered !== isAction) {
    hover.isSdActionHovered = isAction;
    changed = true;
  }
  if (hover.isSdSecondaryHovered !== isSecondary) {
    hover.isSdSecondaryHovered = isSecondary;
    changed = true;
  }
  const newHoveredId = hit.type === 'row' && hit.item ? hit.item.id : null;
  if (hover.hoveredMenuItemId !== newHoveredId) {
    hover.hoveredMenuItemId = newHoveredId;
    changed = true;
  }
  return {
    cursor:
      isAction || isSecondary || hit.type === 'row' ? 'pointer' : 'default',
    changed,
  };
};

export const updateHoverForUiHit = (
  hover: BoardHoverState,
  hit: UiHit,
  isLogOpen: boolean,
): HoverResult => {
  switch (hit.kind) {
    case 'betweenDungeons':
      return updateBetweenDungeonsHover(hover, hit.hit);
    case 'dungeonIntro':
      return updateDungeonIntroHover(hover, hit.hit);
    case 'saveLoadDialog':
      return updateSaveLoadDialogHover(hover, hit.hit);
    case 'topBar':
      return updateTopBarHover(hover, hit.hit, isLogOpen);
    case 'menu':
      return updateMenuHover(hover, hit.hit);
    case 'heroCards':
      return updateHeroCardsHover(hover, hit.hit);
    case 'monsterCards':
      return updateMonsterCardsHover(hover);
    case 'diary':
      return updateDiaryHover(hover);
    case 'eventCard':
      return updateEventCardHover(hover, hit.hit);
  }
};

// Resets every hover flag (used when the pointer leaves the UI elements or
// the board itself). The radial index is only cleared when `radial` is
// set: the pointer-move fall-through handles the radial menu separately.
export const clearBoardHovers = (
  hover: BoardHoverState,
  options: { radial: boolean },
): boolean => {
  let changed = false;
  if (options.radial && hover.hoveredRadialIndex !== null) {
    hover.hoveredRadialIndex = null;
    changed = true;
  }
  if (hover.isDungeonIntroCloseHovered) {
    hover.isDungeonIntroCloseHovered = false;
    changed = true;
  }
  if (hover.isMenuHovered) {
    hover.isMenuHovered = false;
    changed = true;
  }
  if (hover.isDebugHovered) {
    hover.isDebugHovered = false;
    changed = true;
  }
  if (hover.isLogHovered) {
    hover.isLogHovered = false;
    changed = true;
  }
  if (hover.isEventCardToggleHovered) {
    hover.isEventCardToggleHovered = false;
    changed = true;
  }
  if (hover.hoveredInventoryHeroName !== null) {
    hover.hoveredInventoryHeroName = null;
    changed = true;
  }
  if (hover.hoveredCloseHeroName !== null) {
    hover.hoveredCloseHeroName = null;
    changed = true;
  }
  if (hover.hoveredUseItem !== null) {
    hover.hoveredUseItem = null;
    changed = true;
  }
  if (hover.hoveredMenuItemId !== null) {
    hover.hoveredMenuItemId = null;
    changed = true;
  }
  if (hover.isSdActionHovered) {
    hover.isSdActionHovered = false;
    changed = true;
  }
  if (hover.isSdSecondaryHovered) {
    hover.isSdSecondaryHovered = false;
    changed = true;
  }
  return changed;
};
