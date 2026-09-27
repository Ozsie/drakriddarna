import type { Actor, GameState, Hero, Monster } from '../types';
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
  getDist,
  hasLineOfSight,
  isNeighbouring,
  isRoomDiscovered,
} from '../core';
import { getEffectiveMaxMovement, takeDamage } from '../core';
import { liveHeroes } from '../hero/HeroLogic';
import { distanceInGrid } from '../hero/ClickInputLogic';
import {
  createPassableGrid,
  findBestPathToHeroes,
  type PassableGrid,
} from './pathfinding';

enum MonsterAction {
  RANGED_ATTACK = 'RANGED_ATTACK',
  MELEE_ATTACK = 'MELEE_ATTACK',
  MOVE = 'MOVE',
  DIAGONAL_FIRE_ATTACK = 'DIAGONAL_FIRE_ATTACK',
  ORTHOGONAL_FIRE_ATTACK = 'ORTHOGONAL_FIRE_ATTACK',
  SAME_ROOM_FIRE_ATTACK = 'SAME_ROOM_FIRE_ATTACK',
}

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

    const maxActions = monster.actions;
    addLog(state, 'logs.monsterAction.acted', { monster: i18n(monster.name) });
    doReRender(state);
    opts.onActionCallback?.(state);

    while (monster.actions > 0 && monster.health > 0) {
      const customAbilityHandled = await tryCustomMonsterAbility(
        state,
        monster,
      );
      if (customAbilityHandled) {
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

      const passableGrid = createPassableGrid(state);
      const neighbouringHeroes: Hero[] = findNeighbouringHeroes(
        state,
        monster,
      ).filter((hero: Hero) => !hero.ignoredByMonsters);
      const visibleHeroes: Hero[] = findVisibleHeroes(state, monster);
      const diagonalTargets = findDiagonalTargets(
        [...visibleHeroes, ...getNonDarkLordMonsters(state)],
        monster,
      );
      const orthogonalTargets = findOrthogonalTargets(
        [...visibleHeroes, ...getNonDarkLordMonsters(state)],
        monster,
      );
      const sameRoomTargets = findSameRoomTargets(
        [...liveHeroes(state), ...getNonDarkLordMonsters(state)],
        monster,
        state,
      );
      const action = selectAction(
        state,
        monster,
        neighbouringHeroes,
        visibleHeroes,
        diagonalTargets,
        orthogonalTargets,
        sameRoomTargets,
      );
      switch (action) {
        case MonsterAction.MELEE_ATTACK: {
          const target: Hero = selectMeleeTarget(neighbouringHeroes);
          monsterAttack(state, monster, target, false);
          doReRender(state);
          opts.onActionCallback?.(state);
          if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
            await sleep(opts.delayAfterAttack);
          }
          break;
        }
        case MonsterAction.RANGED_ATTACK: {
          const target: Hero = selectRangedTarget(visibleHeroes, monster);
          monsterAttack(state, monster, target, true);
          doReRender(state);
          opts.onActionCallback?.(state);
          if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
            await sleep(opts.delayAfterAttack);
          }
          break;
        }
        case MonsterAction.MOVE: {
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
          break;
        }
        case MonsterAction.DIAGONAL_FIRE_ATTACK: {
          performFireAttack(state, monster, diagonalTargets);
          doReRender(state);
          opts.onActionCallback?.(state);
          if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
            await sleep(opts.delayAfterAttack);
          }
          break;
        }
        case MonsterAction.ORTHOGONAL_FIRE_ATTACK: {
          performFireAttack(state, monster, orthogonalTargets);
          doReRender(state);
          opts.onActionCallback?.(state);
          if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
            await sleep(opts.delayAfterAttack);
          }
          break;
        }
        case MonsterAction.SAME_ROOM_FIRE_ATTACK: {
          performFireAttack(state, monster, sameRoomTargets);
          doReRender(state);
          opts.onActionCallback?.(state);
          if (opts.delayAfterAttack && opts.delayAfterAttack > 0) {
            await sleep(opts.delayAfterAttack);
          }
          break;
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

const selectAction = (
  state: GameState,
  monster: Monster,
  neighbouringHeroes: Hero[],
  visibleHeroes: Hero[],
  diagonalTargets: Actor[],
  orthogonalTargets: Actor[],
  sameRoomTargets: Actor[],
): MonsterAction => {
  // Monsters prefer to perform a ranged attack (weapon or special fire attack)
  // against the hero with the most health left, as long as they have line of
  // sight (or another valid ranged option) to that hero.
  const allHeroes = [...new Set([...neighbouringHeroes, ...visibleHeroes])];
  if (allHeroes.length > 0) {
    const bestHero = allHeroes.slice().sort((a, b) => b.health - a.health)[0];
    const canRangedAttack =
      !!monster.rangedWeapon &&
      !bestHero.shield &&
      visibleHeroes.includes(bestHero);
    const canSameRoomAttack = sameRoomTargets.includes(bestHero);
    const canOrthogonalAttack = orthogonalTargets.includes(bestHero);
    const canDiagonalAttack = diagonalTargets.includes(bestHero);

    if (
      canRangedAttack ||
      canSameRoomAttack ||
      canOrthogonalAttack ||
      canDiagonalAttack
    ) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: i18n(monster.name),
        });
        return MonsterAction.MOVE;
      }
      if (canSameRoomAttack) {
        return MonsterAction.SAME_ROOM_FIRE_ATTACK;
      } else if (canOrthogonalAttack) {
        return MonsterAction.ORTHOGONAL_FIRE_ATTACK;
      } else if (canDiagonalAttack) {
        return MonsterAction.DIAGONAL_FIRE_ATTACK;
      }
      return MonsterAction.RANGED_ATTACK;
    }
  }

  if (neighbouringHeroes.length > 0) {
    return MonsterAction.MELEE_ATTACK;
  } else if (!monster.rangedWeapon && diagonalTargets.length === 0) {
    return MonsterAction.MOVE;
  } else {
    if (visibleHeroes.length > 0 && monster.rangedWeapon) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: i18n(monster.name),
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.RANGED_ATTACK;
    } else if (sameRoomTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: i18n(monster.name),
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.SAME_ROOM_FIRE_ATTACK;
    } else if (visibleHeroes.length > 0 && orthogonalTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: i18n(monster.name),
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.ORTHOGONAL_FIRE_ATTACK;
    } else if (visibleHeroes.length > 0 && diagonalTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: i18n(monster.name),
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.DIAGONAL_FIRE_ATTACK;
    } else {
      return MonsterAction.MOVE;
    }
  }
};

const selectRangedTarget = (possibleTargets: Hero[], monster: Monster): Hero =>
  possibleTargets
    .filter((hero) => !hero.shield)
    .sort((hero) => getDist(monster.position, hero.position))
    .sort(
      (a, b) =>
        b.health - a.health ||
        getDist(monster.position, a.position) -
          getDist(monster.position, b.position),
    )[0];

const selectMeleeTarget = (possibleTargets: Hero[]): Hero =>
  possibleTargets.sort((a, b) => b.health - a.health)[0];

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

const monsterAttack = (
  state: GameState,
  monster: Monster,
  hero: Hero,
  ranged: boolean,
) => {
  takeDamage(state, monster, hero, ranged);
  if (monster?.actions > 1 && monster?.movement < 3) {
    monster.actions -= 2;
  } else {
    monster.actions--;
  }
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
