import type { Actor, GameState, Hero, Monster } from '../types';
import { MonsterType } from '../types';
import { addLog, doReRender, i18n } from '../core';
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

const getNonDarkLordMonsters = (state: GameState) =>
  state.dungeon.layout.monsters.filter((monster) =>
    [MonsterType.ORC, MonsterType.TROLL].includes(monster.type),
  );

export const monsterActions = (state: GameState) => {
  const visibleMonsters = findVisibleMonsters(state);
  if (visibleMonsters.length === 0) {
    addLog(state, 'logs.monsterAction.noMonsterAct');
  }

  const passableGrid = createPassableGrid(state);

  visibleMonsters.forEach((monster) => {
    const maxActions = monster.actions;
    addLog(state, 'logs.monsterAction.acted', { monster: i18n(monster.name) });
    while (monster.actions > 0) {
      doReRender(state);
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
          break;
        }
        case MonsterAction.RANGED_ATTACK: {
          const target: Hero = selectRangedTarget(visibleHeroes, monster);
          monsterAttack(state, monster, target, true);
          break;
        }
        case MonsterAction.MOVE: {
          monsterMove(state, monster, passableGrid);
          break;
        }
        case MonsterAction.DIAGONAL_FIRE_ATTACK:
          performFireAttack(state, monster, diagonalTargets);
          break;
        case MonsterAction.ORTHOGONAL_FIRE_ATTACK:
          performFireAttack(state, monster, orthogonalTargets);
          break;
        case MonsterAction.SAME_ROOM_FIRE_ATTACK:
          performFireAttack(state, monster, sameRoomTargets);
      }
      monster.movement = getEffectiveMaxMovement(monster);
    }
    monster.actions = maxActions;
    monster.movement = getEffectiveMaxMovement(monster);
  });
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
      [MonsterType.YELLOW_DARK_LORD, MonsterType.BLUE_DARK_LORD].includes(
        source.type,
      ) &&
      Math.abs(source.position.x - target.position.x) ===
        Math.abs(source.position.y - target.position.y) &&
      distanceInGrid(source.position, target.position) > 1,
  );

const findOrthogonalTargets = (possibleTargets: Actor[], source: Monster) =>
  possibleTargets.filter(
    (target) =>
      [MonsterType.RED_DARK_LORD, MonsterType.BLUE_DARK_LORD].includes(
        source.type,
      ) &&
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
      [MonsterType.GREEN_DARK_LORD, MonsterType.BLUE_DARK_LORD].includes(
        source.type,
      ) &&
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
