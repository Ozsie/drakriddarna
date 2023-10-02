import type { Actor, GameState, Hero, Monster, Position } from '../types';
import { MonsterType } from '../types';
import {
  addLog,
  doReRender,
  findCell,
  findNeighbouringHeroes,
  getDist,
  getEffectiveMaxMovement,
  hasLineOfSight,
  isDiscovered,
  isRoomDiscovered,
  isWalkable,
  takeDamage,
} from '../game';
import { liveHeroes } from '../hero/HeroLogic';
import { distanceInGrid } from '../hero/ClickInputLogic';

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
    [MonsterType.ORCH, MonsterType.TROLL].includes(monster.type),
  );

export const monsterActions = (state: GameState) => {
  const visibleMonsters = findVisibleMonsters(state);
  if (visibleMonsters.length === 0) {
    addLog(state, 'logs.monsterAction.noMonsterAct');
  }

  visibleMonsters.forEach((monster) => {
    const maxActions = monster.actions;
    addLog(state, 'logs.monsterAction.acted', { monster: monster.name });
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
          monsterMove(state, monster);
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
          monster: monster.name,
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.RANGED_ATTACK;
    } else if (sameRoomTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: monster.name,
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.SAME_ROOM_FIRE_ATTACK;
    } else if (visibleHeroes.length > 0 && orthogonalTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: monster.name,
        });
        return MonsterAction.MOVE;
      }
      return MonsterAction.ORTHOGONAL_FIRE_ATTACK;
    } else if (visibleHeroes.length > 0 && diagonalTargets.length > 0) {
      if (Math.random() < 0.1) {
        addLog(state, 'logs.monsterAction.moveDespiteTarget', {
          monster: monster.name,
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

const findVisibleMonsters = (state: GameState) =>
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

const findClosestHeroAndDistance = (
  state: GameState,
  monster: Monster,
): { hero: Hero; dist: number } =>
  liveHeroes(state)
    .map((hero) => ({
      hero,
      dist: getDist(hero.position, monster.position),
    }))
    .sort((a, b) => a.dist - b.dist)[0];

const monsterMove = (state: GameState, monster: Monster) => {
  const closestHeroAndDistance = findClosestHeroAndDistance(state, monster);

  while (monster.movement > 0) {
    if (closestHeroAndDistance && closestHeroAndDistance.dist > 1) {
      const possibleMoves = findPossibleMoves(state, monster.position);
      if (possibleMoves.length > 0) {
        const newPosition = possibleMoves
          .map((pos) => ({
            pos,
            dist: getDist(pos, closestHeroAndDistance.hero.position),
          }))
          .sort((a, b) => a.dist - b.dist)[0].pos;
        monster.position = newPosition;
        addLog(state, 'logs.monsterAction.movedTowards', {
          monster: monster.name,
          hero: closestHeroAndDistance.hero.name,
          x: `${newPosition.x}`,
          y: `${newPosition.y}`,
        });
      } else {
        addLog(state, 'logs.monsterAction.couldNotMove', {
          monster: monster.name,
        });
      }
    }
    monster.movement--;
  }
  monster.actions--;
};

const findPossibleMoves = (
  state: GameState,
  position: Position,
): Position[] => {
  const x = position.x;
  const y = position.y;

  const targets: Position[] = [];
  for (let tX = x - 1; tX <= x + 1; tX++) {
    for (let tY = y - 1; tY <= y + 1; tY++) {
      if (tX === x && tY === y) continue;
      if (
        isWalkable(state.dungeon.layout, tX, tY) &&
        isDiscovered(state.dungeon, tX, tY)
      ) {
        targets.push({ x: tX, y: tY });
      }
    }
  }

  return targets
    .filter(
      (pos) =>
        !liveHeroes(state).find(
          (hero) => hero.position.x === pos.x && hero.position.y === pos.y,
        ),
    )
    .filter(
      (pos) =>
        !state.dungeon.layout.monsters.some(
          (m) => m.position.x === pos.x && m.position.y === pos.y,
        ),
    );
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
        monster: source.name,
        target: target.name,
        armour: target.armour?.name,
      });
    } else {
      takeDamage(state, source, target, true);
    }
  });
};
