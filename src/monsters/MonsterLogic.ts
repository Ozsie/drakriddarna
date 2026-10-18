import {
  type Actor,
  type GameState,
  type Hero,
  Level,
  type Monster,
  type Position,
  type Weapon,
} from '../types';
import { MonsterType } from '../types';
import {
  getMonsterAbilities,
  getMonsterAbilityHandler,
  hasMonsterAbility,
  isDarkLord,
  registerMonsterAbility,
} from './MonsterRegistry';
import {
  addLog,
  doReRender,
  getActorRemainingAnimationDuration,
  i18n,
  recordActorStep,
  sleep,
} from '../core';
import {
  findCell,
  findNeighbouringHeroes,
  hasLineOfSight,
  isNeighbouring,
  isRoomDiscovered,
} from '../core';
import {
  getDifficulty,
  getEffectiveMaxHealth,
  getEffectiveMaxMovement,
  takeDamage,
} from '../core';
import { liveHeroes } from '../hero/HeroLogic';
import { distanceInGrid } from '../hero/ClickInputLogic';
import {
  createPassableGrid,
  findBestPathToHeroes,
  type PassableGrid,
} from './pathfinding';
import type { BehaviorContext, MonsterBehavior, SlotAction } from './behavior';
import {
  findCoverPositions,
  findKitePosition,
  findOverwatchPositions,
  findRepositionRangedPosition,
  findRetreatPosition,
  findSprayAlignPosition,
  getBehaviorsForMonsterType,
  getDirectorState,
  logMonsterBehaviorDecision,
  resetRoundTargetCounters,
  rollBowForgotten,
  selectBehavior,
  selectScoredTarget,
} from './behavior';
import { createFlameEffect } from '../combat';
import { soundEffectManager } from '../audio';

export { resetRoundTargetCounters } from './behavior';

export interface MonsterTurnOptions {
  delayBetweenMonsters?: number;
  delayBetweenActions?: number;
  delayAfterAttack?: number;
  waitForMovement?: boolean;
  onActionCallback?: (state: GameState) => void;
}

export const DEFAULT_MONSTER_TURN_OPTIONS: MonsterTurnOptions = {
  delayBetweenMonsters: 300,
  delayBetweenActions: 250,
  delayAfterAttack: 350,
  waitForMovement: true,
};

// Built-in dark lord abilities, registered here so campaign-defined monster
// types can register their own abilities the same way via
// `registerMonsterAbility` (see src/monsters/MonsterRegistry.ts).
registerMonsterAbility(MonsterType.YELLOW_DARK_LORD, 'diagonalFireAttack');
registerMonsterAbility(MonsterType.BLUE_DARK_LORD, 'diagonalFireAttack');
registerMonsterAbility(MonsterType.RED_DARK_LORD, 'orthogonalFireAttack');
registerMonsterAbility(MonsterType.BLUE_DARK_LORD, 'orthogonalFireAttack');
registerMonsterAbility(MonsterType.GREEN_DARK_LORD, 'sameRoomFireAttack');
registerMonsterAbility(MonsterType.BLUE_DARK_LORD, 'sameRoomFireAttack');

const getNonDarkLordMonsters = (state: GameState) =>
  state.dungeon.layout.monsters.filter((monster) => !isDarkLord(monster.type));

// Built-in ability keys handled directly by the default action-selection
// logic below; any other ability registered on a monster type is treated
// as a fully custom ability and dispatched through a campaign-registered
// handler instead (see `registerMonsterAbilityHandler` in MonsterRegistry.ts).
const BUILTIN_ABILITIES = new Set([
  'diagonalFireAttack',
  'orthogonalFireAttack',
  'sameRoomFireAttack',
]);

const tryCustomMonsterAbility = async (
  state: GameState,
  monster: Monster,
): Promise<boolean> => {
  const customAbilities = getMonsterAbilities(monster.type).filter(
    (ability) => !BUILTIN_ABILITIES.has(ability),
  );
  for (const ability of customAbilities) {
    const handler = getMonsterAbilityHandler(ability);
    if (handler) {
      const handled = await handler(state, monster);
      if (handled) return true;
    }
  }
  return false;
};

export const monsterActions = async (
  state: GameState,
  options?: MonsterTurnOptions,
): Promise<void> => {
  resetRoundTargetCounters(state);
  const opts = { ...DEFAULT_MONSTER_TURN_OPTIONS, ...options };
  const visibleMonsters = findVisibleMonsters(state);
  if (visibleMonsters.length === 0) {
    addLog(state, 'logs.monsterAction.noMonsterAct');
    doReRender(state);
    opts.onActionCallback?.(state);
    return;
  }

  for (let mIdx = 0; mIdx < visibleMonsters.length; mIdx++) {
    const monster = visibleMonsters[mIdx];
    if (monster.health <= 0) continue;

    if (monster.exhausted) {
      monster.exhausted = false;
      continue;
    }

    const maxActions = monster.actions;
    addLog(state, 'logs.monsterAction.acted', { monster: i18n(monster.name) });
    doReRender(state);
    opts.onActionCallback?.(state);

    // Initialize turn state
    if (!monster.temperament) {
      monster.temperament = Math.random() < 0.5 ? 'bold' : 'wary';
    }
    monster.forgotBowThisTurn = rollBowForgotten(state);

    // Compute director context
    const allHeroes = state.heroes;
    const healthModifier = getDifficulty(state).modifiers.health;
    const totalMaxHp = allHeroes.reduce(
      (sum, h) => sum + getEffectiveMaxHealth(h, healthModifier),
      0,
    );
    const totalCurrentHp = allHeroes.reduce(
      (sum, h) => sum + Math.max(0, h.health),
      0,
    );
    const partyHpPercentage = totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 1;
    const hasDeadHero = allHeroes.some((h) => h.health <= 0 || h.incapacitated);
    const aliveMonsterCount = state.dungeon.layout.monsters.filter(
      (m) => m.health > 0,
    ).length;
    const directorState = getDirectorState(
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    );

    const passableGrid = createPassableGrid(state);
    const neighbouringHeroes: Hero[] = findNeighbouringHeroes(
      state,
      monster,
    ).filter((hero: Hero) => !hero.ignoredByMonsters);
    const visibleHeroes: Hero[] = findVisibleHeroes(state, monster);

    const context: BehaviorContext = {
      state,
      monster,
      passableGrid,
      neighbouringHeroes,
      visibleHeroes,
      partyHpPercentage,
      hasDeadHero,
      aliveMonsterCount,
      directorState,
    };

    const behaviors = getBehaviorsForMonsterType(monster.type);
    const { chosenBehavior, evaluatedBehaviors } = selectBehavior(
      behaviors,
      context,
    );

    logMonsterBehaviorDecision(
      {
        monster,
        temperament: monster.temperament,
        directorState,
        passiveStreak: monster.passiveStreak ?? 0,
        forgotBowThisTurn: monster.forgotBowThisTurn,
        evaluatedBehaviors,
        chosenBehavior,
      },
      Boolean(state.settings?.['debug']),
    );

    let performedAttack = false;

    // Execute slots
    for (const slot of chosenBehavior.slots) {
      if (monster.actions <= 0 || monster.health <= 0) break;

      const customAbilityHandled = await tryCustomMonsterAbility(
        state,
        monster,
      );
      if (customAbilityHandled) {
        monster.actions--;
        doReRender(state);
        opts.onActionCallback?.(state);
        monster.movement = getEffectiveMaxMovement(monster);
        if (
          monster.actions > 0 &&
          opts.delayBetweenActions &&
          opts.delayBetweenActions > 0
        ) {
          await sleep(opts.delayBetweenActions);
        }
        continue;
      }

      await executeSlotAction(
        slot,
        state,
        monster,
        passableGrid,
        opts,
        () => {
          performedAttack = true;
        },
        chosenBehavior,
      );

      monster.movement = getEffectiveMaxMovement(monster);

      if (
        monster.actions > 0 &&
        opts.delayBetweenActions &&
        opts.delayBetweenActions > 0
      ) {
        await sleep(opts.delayBetweenActions);
      }
    }

    // If extra actions remain (e.g. 3-action monsters)
    while (monster.actions > 0 && monster.health > 0) {
      const customAbilityHandled = await tryCustomMonsterAbility(
        state,
        monster,
      );
      if (customAbilityHandled) {
        monster.actions--;
        doReRender(state);
        opts.onActionCallback?.(state);
        monster.movement = getEffectiveMaxMovement(monster);
        if (
          monster.actions > 0 &&
          opts.delayBetweenActions &&
          opts.delayBetweenActions > 0
        ) {
          await sleep(opts.delayBetweenActions);
        }
        continue;
      }

      const neighbours = findNeighbouringHeroes(state, monster).filter(
        (h) => !h.ignoredByMonsters,
      );
      const visible = findVisibleHeroes(state, monster);

      if (neighbours.length > 0) {
        const target = selectMeleeTarget(neighbours, monster, state);
        monsterAttack(state, monster, target, false);
        performedAttack = true;
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (
        visible.length > 0 &&
        monster.rangedWeapon &&
        !monster.forgotBowThisTurn
      ) {
        const target = selectRangedTarget(visible, monster, state);
        monsterAttack(state, monster, target, true);
        performedAttack = true;
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else {
        monsterMove(state, monster, passableGrid);
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.waitForMovement !== false) {
          const animRemaining = getActorRemainingAnimationDuration(monster);
          const moveWait =
            animRemaining > 0 ? animRemaining : opts.delayBetweenActions ?? 0;
          if (moveWait > 0) {
            await sleep(moveWait);
          }
        }
      }

      monster.movement = getEffectiveMaxMovement(monster);

      if (
        monster.actions > 0 &&
        opts.delayBetweenActions &&
        opts.delayBetweenActions > 0
      ) {
        await sleep(opts.delayBetweenActions);
      }
    }

    // End of turn updates
    if (!performedAttack) {
      monster.passiveStreak = (monster.passiveStreak ?? 0) + 1;
    } else {
      monster.passiveStreak = 0;
    }
    monster.forgotBowThisTurn = false;

    monster.actions = maxActions;
    monster.movement = getEffectiveMaxMovement(monster);

    if (
      mIdx < visibleMonsters.length - 1 &&
      opts.delayBetweenMonsters &&
      opts.delayBetweenMonsters > 0
    ) {
      await sleep(opts.delayBetweenMonsters);
    }
  }
};

export const isAttackSlot = (slot: SlotAction): boolean =>
  slot === 'melee' || slot === 'shoot' || slot === 'fire_spray';

export const hasTwoAttackActions = (behavior?: MonsterBehavior): boolean => {
  if (!behavior) return false;
  return behavior.slots.filter(isAttackSlot).length >= 2;
};

const executeSlotAction = async (
  slot: SlotAction,
  state: GameState,
  monster: Monster,
  passableGrid: PassableGrid,
  opts: MonsterTurnOptions,
  onAttack: () => void,
  chosenBehavior?: MonsterBehavior,
): Promise<void> => {
  switch (slot) {
    case 'melee': {
      const neighbours = findNeighbouringHeroes(state, monster).filter(
        (h) => !h.ignoredByMonsters,
      );
      if (neighbours.length > 0) {
        const target = selectMeleeTarget(neighbours, monster, state);
        monsterAttack(state, monster, target, false);
        onAttack();
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (hasTwoAttackActions(chosenBehavior)) {
        await executeSlotAction(
          'move',
          state,
          monster,
          createPassableGrid(state),
          opts,
          onAttack,
          chosenBehavior,
        );
      } else {
        monster.actions--;
      }
      break;
    }
    case 'shoot': {
      const visible = findVisibleHeroes(state, monster);
      if (
        visible.length > 0 &&
        monster.rangedWeapon &&
        !monster.forgotBowThisTurn
      ) {
        const target = selectRangedTarget(visible, monster, state);
        monsterAttack(state, monster, target, true);
        onAttack();
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (hasTwoAttackActions(chosenBehavior)) {
        await executeSlotAction(
          'move',
          state,
          monster,
          createPassableGrid(state),
          opts,
          onAttack,
          chosenBehavior,
        );
      } else {
        monster.actions--;
      }
      break;
    }
    case 'move': {
      if (chosenBehavior?.name === 'Reposition and shoot') {
        const repo = findRepositionRangedPosition(
          state,
          monster,
          passableGrid,
          monster.movement,
        );
        if (repo && repo.path.length > 0) {
          monsterMoveToPosition(state, monster, repo.path);
        } else {
          monsterMove(state, monster, passableGrid);
        }
      } else if (chosenBehavior?.name === 'Line up') {
        const align = findSprayAlignPosition(
          state,
          monster,
          passableGrid,
          monster.movement,
        );
        if (align && align.path.length > 0) {
          monsterMoveToPosition(state, monster, align.path);
        } else {
          monsterMove(state, monster, passableGrid);
        }
      } else {
        monsterMove(state, monster, passableGrid);
      }
      doReRender(state);
      opts.onActionCallback?.(state);
      if (opts.waitForMovement !== false) {
        const animRemaining = getActorRemainingAnimationDuration(monster);
        const moveWait =
          animRemaining > 0 ? animRemaining : opts.delayBetweenActions ?? 0;
        if (moveWait > 0) {
          await sleep(moveWait);
        }
      }
      break;
    }
    case 'move_away': {
      if (chosenBehavior?.name === 'Kite') {
        const kite = findKitePosition(
          state,
          monster,
          passableGrid,
          monster.movement,
        );
        if (kite && kite.path.length > 0) {
          monsterMoveToPosition(state, monster, kite.path);
        } else {
          monsterMoveAway(state, monster, passableGrid);
        }
      } else {
        monsterMoveAway(state, monster, passableGrid);
      }
      doReRender(state);
      opts.onActionCallback?.(state);
      if (opts.waitForMovement !== false) {
        const animRemaining = getActorRemainingAnimationDuration(monster);
        const moveWait =
          animRemaining > 0 ? animRemaining : opts.delayBetweenActions ?? 0;
        if (moveWait > 0) {
          await sleep(moveWait);
        }
      }
      break;
    }
    case 'move_to_cover': {
      monsterMoveToCover(state, monster, passableGrid);
      doReRender(state);
      opts.onActionCallback?.(state);
      if (opts.waitForMovement !== false) {
        const animRemaining = getActorRemainingAnimationDuration(monster);
        const moveWait =
          animRemaining > 0 ? animRemaining : opts.delayBetweenActions ?? 0;
        if (moveWait > 0) {
          await sleep(moveWait);
        }
      }
      break;
    }
    case 'hold': {
      monster.actions--;
      break;
    }
    case 'fire_spray': {
      const visible = findVisibleHeroes(state, monster);
      const diag = findDiagonalTargets(
        [...visible, ...getNonDarkLordMonsters(state)],
        monster,
      );
      const orth = findOrthogonalTargets(
        [...visible, ...getNonDarkLordMonsters(state)],
        monster,
      );
      const sameRoom = findSameRoomTargets(
        [...liveHeroes(state), ...getNonDarkLordMonsters(state)],
        monster,
        state,
      );

      if (sameRoom.length > 0) {
        performFireAttack(state, monster, sameRoom);
        onAttack();
        monster.actions--;
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (orth.length > 0) {
        performFireAttack(state, monster, orth);
        onAttack();
        monster.actions--;
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (diag.length > 0) {
        performFireAttack(state, monster, diag);
        onAttack();
        monster.actions--;
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else if (hasTwoAttackActions(chosenBehavior)) {
        await executeSlotAction(
          'move',
          state,
          monster,
          createPassableGrid(state),
          opts,
          onAttack,
          chosenBehavior,
        );
      } else {
        monster.actions--;
      }
      break;
    }
    case 'move_or_melee': {
      const neighbours = findNeighbouringHeroes(state, monster).filter(
        (h) => !h.ignoredByMonsters,
      );
      if (neighbours.length > 0) {
        const target = selectMeleeTarget(neighbours, monster, state);
        monsterAttack(state, monster, target, false);
        onAttack();
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
          await sleep(opts.delayAfterAttack);
        }
      } else {
        monsterMove(state, monster, passableGrid);
        doReRender(state);
        opts.onActionCallback?.(state);
        if (opts.waitForMovement !== false) {
          const animRemaining = getActorRemainingAnimationDuration(monster);
          const moveWait =
            animRemaining > 0 ? animRemaining : opts.delayBetweenActions ?? 0;
          if (moveWait > 0) {
            await sleep(moveWait);
          }
        }
      }
      break;
    }
  }
};

export const selectRangedTarget = (
  possibleTargets: Hero[],
  monster: Monster,
  state?: GameState,
  rng?: () => number,
): Hero => {
  if (possibleTargets.length === 0) return possibleTargets[0];
  const unshielded = possibleTargets.filter((hero) => !hero.shield);
  const targets = unshielded.length > 0 ? unshielded : possibleTargets;
  if (targets.length === 1) return targets[0];

  return selectScoredTarget(targets, {
    state,
    monster,
    ranged: true,
    stepsByHero: () => 0,
    rng,
  });
};

export const selectMeleeTarget = (
  possibleTargets: Hero[],
  monsterOrState?: Monster | GameState,
  stateOrMonster?: GameState | Monster,
  rng?: () => number,
): Hero => {
  if (possibleTargets.length === 0) return possibleTargets[0];
  if (possibleTargets.length === 1) return possibleTargets[0];

  let monster: Monster | undefined;
  let state: GameState | undefined;
  if (monsterOrState && 'type' in monsterOrState) {
    monster = monsterOrState;
    state = stateOrMonster as GameState | undefined;
  } else if (monsterOrState && 'dungeon' in monsterOrState) {
    state = monsterOrState;
    monster = stateOrMonster as Monster | undefined;
  }

  if (!monster) {
    monster = {
      level: Level.MASTER,
      weapon: { dice: 3 } as Weapon,
    } as Monster;
  }

  return selectScoredTarget(possibleTargets, {
    state,
    monster,
    ranged: false,
    stepsByHero: () => 0,
    rng,
  });
};

const findVisibleHeroes = (state: GameState, monster: Monster): Hero[] =>
  liveHeroes(state)
    .filter((hero: Hero) => !hero.ignoredByMonsters)
    .filter((hero) =>
      hasLineOfSight(monster.position, hero.position, 48, state, false),
    );

export const findVisibleMonsters = (state: GameState) =>
  state.dungeon.layout.monsters.filter((monster) => {
    const cell = findCell(
      state.dungeon.layout.grid,
      monster.position.x,
      monster.position.y,
    );
    return cell && isRoomDiscovered(state.dungeon, cell) && monster.health > 0;
  });

export const monsterAttack = (
  state: GameState,
  monster: Monster,
  hero: Hero,
  ranged: boolean,
) => {
  hero.roundTargetCount = (hero.roundTargetCount ?? 0) + 1;
  if (!state.roundTargetCounts) {
    state.roundTargetCounts = {};
  }
  const heroKey = hero.id ?? hero.name;
  state.roundTargetCounts[heroKey] =
    (state.roundTargetCounts[heroKey] ?? 0) + 1;
  takeDamage(state, monster, hero, ranged);
  monster.actions--;
};

export const monsterMoveToPosition = (
  state: GameState,
  monster: Monster,
  path: Position[],
) => {
  const steps = [...path];
  while (monster.movement > 0 && steps.length > 0) {
    const nextPos = steps.shift()!;
    const isOccupied =
      state.dungeon.layout.monsters.some(
        (m) =>
          m !== monster &&
          m.health > 0 &&
          m.position.x === nextPos.x &&
          m.position.y === nextPos.y,
      ) ||
      liveHeroes(state).some(
        (h) => h.position.x === nextPos.x && h.position.y === nextPos.y,
      );

    if (isOccupied) break;

    recordActorStep(monster, nextPos);
    monster.position = nextPos;
    addLog(state, 'logs.monsterAction.movedTowards', {
      monster: i18n(monster.name),
      hero: '',
      x: `${nextPos.x}`,
      y: `${nextPos.y}`,
    });
    monster.movement--;
  }
  monster.actions--;
};

export const monsterMoveToCover = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
) => {
  const coverTiles = findCoverPositions(
    state,
    monster,
    passableGrid,
    monster.movement,
  );
  if (coverTiles.length > 0 && coverTiles[0].path.length > 0) {
    monsterMoveToPosition(state, monster, coverTiles[0].path);
    return;
  }
  const overwatchTiles = findOverwatchPositions(
    state,
    monster,
    passableGrid,
    monster.movement,
  );
  if (overwatchTiles.length > 0 && overwatchTiles[0].path.length > 0) {
    monsterMoveToPosition(state, monster, overwatchTiles[0].path);
    return;
  }
  monsterMove(state, monster, passableGrid);
};

export const monsterMoveAway = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
) => {
  const retreatTile = findRetreatPosition(
    state,
    monster,
    passableGrid,
    monster.movement,
  );
  if (retreatTile && retreatTile.path.length > 0) {
    monsterMoveToPosition(state, monster, retreatTile.path);
    return;
  }
  monsterMove(state, monster, passableGrid);
};

export const monsterMove = (
  state: GameState,
  monster: Monster,
  passableGrid?: PassableGrid,
) => {
  const grid = passableGrid ?? createPassableGrid(state);
  const target = findBestPathToHeroes(state, monster, grid);

  if (!target || target.path.length === 0) {
    addLog(state, 'logs.monsterAction.couldNotMove', {
      monster: i18n(monster.name),
    });
    monster.movement = 0;
    monster.actions--;
    return;
  }

  while (monster.movement > 0 && target.path.length > 0) {
    const nextPos = target.path.shift()!;
    const isOccupied =
      state.dungeon.layout.monsters.some(
        (m) =>
          m !== monster &&
          m.health > 0 &&
          m.position.x === nextPos.x &&
          m.position.y === nextPos.y,
      ) ||
      liveHeroes(state).some(
        (h) => h.position.x === nextPos.x && h.position.y === nextPos.y,
      );

    if (isOccupied) {
      const recomputed = findBestPathToHeroes(state, monster, grid);
      if (!recomputed || recomputed.path.length === 0) {
        break;
      }
      target.path = recomputed.path;
      target.hero = recomputed.hero;
      continue;
    }

    recordActorStep(monster, nextPos);
    monster.position = nextPos;
    addLog(state, 'logs.monsterAction.movedTowards', {
      monster: i18n(monster.name),
      hero: i18n(target.hero.name),
      x: `${nextPos.x}`,
      y: `${nextPos.y}`,
    });
    monster.movement--;

    if (
      isNeighbouring(
        monster.position,
        target.hero.position.x,
        target.hero.position.y,
      )
    ) {
      break;
    }
  }

  monster.actions--;
};

const findDiagonalTargets = (possibleTargets: Actor[], source: Monster) =>
  possibleTargets.filter(
    (target) =>
      hasMonsterAbility(source.type, 'diagonalFireAttack') &&
      Math.abs(source.position.x - target.position.x) ===
        Math.abs(source.position.y - target.position.y) &&
      distanceInGrid(source.position, target.position) > 1,
  );

const findOrthogonalTargets = (possibleTargets: Actor[], source: Monster) =>
  possibleTargets.filter(
    (target) =>
      hasMonsterAbility(source.type, 'orthogonalFireAttack') &&
      (source.position.x === target.position.x ||
        source.position.y === target.position.y) &&
      distanceInGrid(source.position, target.position) > 1,
  );

const findSameRoomTargets = (
  possibleTargets: Actor[],
  source: Monster,
  state: GameState,
) =>
  possibleTargets.filter(
    (target) =>
      hasMonsterAbility(source.type, 'sameRoomFireAttack') &&
      findCell(
        state.dungeon.layout.grid,
        source.position.x,
        source.position.y,
      ) ===
        findCell(
          state.dungeon.layout.grid,
          target.position.x,
          target.position.y,
        ),
  );

const performFireAttack = (
  state: GameState,
  source: Monster,
  targets: Actor[],
) => {
  targets.forEach((target) => {
    soundEffectManager.playFireBall();
    if (target.position) {
      if (!state.flameEffects) {
        state.flameEffects = [];
      }
      state.flameEffects.push(createFlameEffect(target.position));
    }
    if (state.heroes.includes(target as Hero)) {
      target.roundTargetCount = (target.roundTargetCount ?? 0) + 1;
      if (!state.roundTargetCounts) {
        state.roundTargetCounts = {};
      }
      const heroKey = target.id ?? target.name;
      state.roundTargetCounts[heroKey] =
        (state.roundTargetCounts[heroKey] ?? 0) + 1;
    }
    if (target.armour?.magicProtection) {
      addLog(state, 'logs.monsterAction.fireAttackDeflected', {
        monster: i18n(source.name),
        target: i18n(target.name),
        armour: i18n(target.armour?.name),
      });
    } else {
      takeDamage(state, source, target, true);
    }
  });
};
