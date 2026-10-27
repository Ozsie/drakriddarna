import type { GameState } from '../types';
import type { MenuCallbacks, MenuView } from '../menu/MenuLogic';
import {
  getBetweenDungeonsHit,
  getDiaryAndWinConditionsHit,
  getDungeonIntroHit,
  getEventCardHit,
  getHeroCardsHit,
  getMenuHit,
  getMonsterCardsHit,
  getSaveLoadDialogHit,
  getTopBarHit,
} from '../ui/UIRendering';
import type { BetweenDungeonsHitResult } from '../ui/BetweenDungeonsRendering';
import type { TopBarHitElement } from '../ui/TopBarRendering';
import type { MenuHitResult } from '../ui/MenuRendering';
import type {
  SaveLoadDialogHitResult,
  SaveLoadDialogMode,
} from '../ui/SaveLoadDialogRendering';
import type { HeroCardsHitResult } from '../ui/HeroCardRendering';
import type { MonsterCardsHitResult } from '../ui/MonsterCardRendering';
import type { DiaryAndWinConditionsHitResult } from '../ui/DiaryAndWinConditionRendering';
import type { EventCardHitResult } from '../ui/EventCardRendering';
import type { DungeonIntroHitResult } from '../ui/DungeonIntroRendering';

// The first UI element under a board position, in the fixed cascade order
// the board dispatches UI input: save/load dialog (the topmost centered
// modal — it can be opened on top of the between-dungeons/party-wipe
// overlay), between-dungeons overlay, dungeon intro, top bar, canvas
// menu, hero cards, monster cards, diary and event card.
export type UiHit =
  | { kind: 'betweenDungeons'; hit: BetweenDungeonsHitResult }
  | { kind: 'dungeonIntro'; hit: DungeonIntroHitResult }
  | { kind: 'saveLoadDialog'; hit: SaveLoadDialogHitResult }
  | { kind: 'topBar'; hit: TopBarHitElement }
  | { kind: 'menu'; hit: MenuHitResult }
  | { kind: 'heroCards'; hit: HeroCardsHitResult }
  | { kind: 'monsterCards'; hit: MonsterCardsHitResult }
  | { kind: 'diary'; hit: DiaryAndWinConditionsHitResult }
  | { kind: 'eventCard'; hit: EventCardHitResult };

export interface UiHitContext {
  viewWidth: number;
  viewHeight: number;
  state: GameState;
  x: number;
  y: number;
  ctx?: CanvasRenderingContext2D | null;
  showDungeonIntro: boolean;
  dungeonIntroDismissed: boolean;
  isLogOpen: boolean;
  debugMode: boolean | undefined;
  isCanvasMenuOpen: boolean;
  menuView: MenuView;
  menuCallbacks: MenuCallbacks;
  buildInfo?: { date: string; hash: string } | null;
  eventCardCollapsed: boolean;
  /** Open centered save/load dialog mode, or null when closed. */
  saveLoadDialogMode: SaveLoadDialogMode | null;
  saveName: string;
}

// The individual hit testers, injectable so the cascade order itself can
// be tested without depending on any rendered geometry.
export interface UiHitTesters {
  betweenDungeons: typeof getBetweenDungeonsHit;
  dungeonIntro: typeof getDungeonIntroHit;
  saveLoadDialog: typeof getSaveLoadDialogHit;
  topBar: typeof getTopBarHit;
  menu: typeof getMenuHit;
  heroCards: typeof getHeroCardsHit;
  monsterCards: typeof getMonsterCardsHit;
  diary: typeof getDiaryAndWinConditionsHit;
  eventCard: typeof getEventCardHit;
}

export const defaultUiHitTesters: UiHitTesters = {
  betweenDungeons: getBetweenDungeonsHit,
  dungeonIntro: getDungeonIntroHit,
  saveLoadDialog: getSaveLoadDialogHit,
  topBar: getTopBarHit,
  menu: getMenuHit,
  heroCards: getHeroCardsHit,
  monsterCards: getMonsterCardsHit,
  diary: getDiaryAndWinConditionsHit,
  eventCard: getEventCardHit,
};

export const findUiHit = (
  context: UiHitContext,
  testers: UiHitTesters = defaultUiHitTesters,
): UiHit | null => {
  if (context.saveLoadDialogMode) {
    const hit = testers.saveLoadDialog(
      context.viewWidth,
      context.viewHeight,
      context.state,
      {
        mode: context.saveLoadDialogMode,
        callbacks: context.menuCallbacks,
      },
      context.x,
      context.y,
    );
    if (hit) {
      return { kind: 'saveLoadDialog', hit };
    }
  }
  if (context.state.betweenDungeons) {
    const hit = testers.betweenDungeons(
      context.viewWidth,
      context.viewHeight,
      context.state,
      context.x,
      context.y,
    );
    if (hit) {
      return { kind: 'betweenDungeons', hit };
    }
  }
  if (context.showDungeonIntro) {
    const hit = testers.dungeonIntro(
      context.viewWidth,
      context.viewHeight,
      context.state,
      context.x,
      context.y,
      { dismissed: context.dungeonIntroDismissed },
      context.ctx,
    );
    if (hit) {
      return { kind: 'dungeonIntro', hit };
    }
  }
  const topBarHit = testers.topBar(
    context.viewWidth,
    context.state,
    context.x,
    context.y,
    context.ctx,
    { isLogOpen: context.isLogOpen, debugMode: context.debugMode },
  );
  if (topBarHit) {
    return { kind: 'topBar', hit: topBarHit };
  }
  if (context.isCanvasMenuOpen) {
    const hit = testers.menu(
      context.viewWidth,
      context.viewHeight,
      context.state,
      {
        view: context.menuView,
        debugMode: context.debugMode,
        callbacks: context.menuCallbacks,
        buildInfo: context.buildInfo,
      },
      context.x,
      context.y,
    );
    if (hit) {
      return { kind: 'menu', hit };
    }
  }
  const heroHit = testers.heroCards(
    context.viewWidth,
    context.viewHeight,
    context.state,
    context.x,
    context.y,
  );
  if (heroHit) {
    return { kind: 'heroCards', hit: heroHit };
  }
  const monsterHit = testers.monsterCards(
    context.viewWidth,
    context.viewHeight,
    context.state,
    context.x,
    context.y,
  );
  if (monsterHit) {
    return { kind: 'monsterCards', hit: monsterHit };
  }
  const diaryHit = testers.diary(
    context.viewWidth,
    context.viewHeight,
    context.state,
    context.x,
    context.y,
    context.ctx,
  );
  if (diaryHit) {
    return { kind: 'diary', hit: diaryHit };
  }
  const eventHit = testers.eventCard(
    context.viewWidth,
    context.viewHeight,
    context.state,
    context.eventCardCollapsed,
    context.x,
    context.y,
  );
  if (eventHit) {
    return { kind: 'eventCard', hit: eventHit };
  }
  return null;
};
