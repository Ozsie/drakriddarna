import type { GameState, Hero, Monster, Position } from "../types";
import {
  addLog,
  findCell,
  findNeighbouringHeroes,
  getDist,
  getEffectiveMaxMovement,
  hasLineOfSight,
  isDiscovered,
  isWalkable,
  takeDamage,
} from "../game";
import { liveHeroes } from "../hero/HeroLogic";

enum MonsterAction {
  RANGED_ATTACK = "RANGED_ATTACK",
  MELEE_ATTACK = "MELEE_ATTACK",
  MOVE = "MOVE",
}

export const monsterActions = (state: GameState) => {
  const visibleMonsters = findVisibleMonsters(state);
  if (visibleMonsters.length === 0) {
    addLog(state, "No monsters can act");
  }

  visibleMonsters.forEach((monster) => {
    const maxActions = monster.actions;
    addLog(state, `${monster.name} acted `);
    while (monster.actions > 0) {
      state.reRender = true;
      const neighbouringHeroes: Hero[] = findNeighbouringHeroes(
        state,
        monster,
      ).filter((hero: Hero) => !hero.ignoredByMonsters);
      const visibleHeroes: Hero[] = findVisibleHeroes(state, monster);
      const action = selectAction(
        state,
        monster,
        neighbouringHeroes,
        visibleHeroes,
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
): MonsterAction => {
  if (neighbouringHeroes.length > 0) {
    return MonsterAction.MELEE_ATTACK;
  } else if (!monster.rangedWeapon) {
    return MonsterAction.MOVE;
  } else {
    if (visibleHeroes.length > 0 && monster.rangedWeapon) {
      if (Math.random() < 0.1) {
        addLog(
          state,
          `${monster.name} decided to move despite seeing a target.`,
        );
        return MonsterAction.MOVE;
      }
      return MonsterAction.RANGED_ATTACK;
    } else {
      return MonsterAction.MOVE;
    }
  }
};

const selectRangedTarget = (
  possibleTargets: Hero[],
  monster: Monster,
): Hero => {
  return possibleTargets
    .filter((hero) => !hero.shield)
    .sort((hero) => getDist(monster.position, hero.position))
    .sort((a, b) => {
      return (
        b.health - a.health ||
        getDist(monster.position, a.position) -
          getDist(monster.position, b.position)
      );
    })[0];
};

const selectMeleeTarget = (possibleTargets: Hero[]): Hero => {
  return possibleTargets.sort((a, b) => {
    return b.health - a.health;
  })[0];
};

const findVisibleHeroes = (state: GameState, monster: Monster): Hero[] => {
  return liveHeroes(state)
    .filter((hero: Hero) => !hero.ignoredByMonsters)
    .filter((hero) =>
      hasLineOfSight(monster.position, hero.position, 48, state),
    );
};

const findVisibleMonsters = (state: GameState) => {
  return state.dungeon.layout.monsters.filter((monster) => {
    const cell = findCell(
      state.dungeon.layout.grid,
      monster.position.x,
      monster.position.y,
    );
    return (
      cell && state.dungeon.discoveredRooms.includes(cell) && monster.health > 0
    );
  });
};

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
): { hero: Hero; dist: number } => {
  return liveHeroes(state)
    .map((hero) => {
      return {
        hero,
        dist: getDist(hero.position, monster.position),
      };
    })
    .sort((a, b) => {
      return a.dist - b.dist;
    })[0];
};

const monsterMove = (state: GameState, monster: Monster) => {
  const closestHeroAndDistance = findClosestHeroAndDistance(state, monster);

  while (monster.movement > 0) {
    if (closestHeroAndDistance.dist > 1) {
      const possibleMoves = findPossibleMoves(state, monster.position);
      if (possibleMoves.length > 0) {
        const newPosition = possibleMoves
          .map((pos) => {
            return {
              pos,
              dist: getDist(pos, closestHeroAndDistance.hero.position),
            };
          })
          .sort((a, b) => {
            return a.dist - b.dist;
          })[0].pos;
        monster.position = newPosition;
        addLog(
          state,
          `${monster.name} moved towards ${closestHeroAndDistance.hero.name} (${newPosition.x},${newPosition.y})`,
        );
      } else {
        addLog(state, `${monster.name} could not move`);
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
    .filter((pos) => {
      return !liveHeroes(state).find(
        (hero) => hero.position.x === pos.x && hero.position.y === pos.y,
      );
    })
    .filter((pos) => {
      return !state.dungeon.layout.monsters.some(
        (m) => m.position.x === pos.x && m.position.y === pos.y,
      );
    });
};
