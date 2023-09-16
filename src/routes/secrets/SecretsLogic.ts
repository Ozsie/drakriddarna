import type { Actor, GameState, Hero, Position, Secret } from '../types';
import { Colour, Level, SecretType } from '../types';
import { addLog, isNeighbouring, isSamePosition, roll, takeDamage } from '../game';

export const searchForSecret = (state: GameState) => {
  const hero = state.currentActor as Hero;
  const result = roll(hero.level, 1)
  let trapDoor, hiddenDoor, trap, secret;
  if (result >= 1) {
    trapDoor = lookForTrapDoor(state, hero, result);
    if (!trapDoor) {
      hiddenDoor = lookForHiddenDoor(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor) {
      trap = lookForTrap(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor && !trap) {
      secret = lookForSecret(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor && !trap && !secret) {
      addLog(state, `${hero.name} searched but found nothing`);
    }
  } else {
    addLog(state, `${hero.name} searched but found nothing`);
  }
}

export const checkForTrapDoor = (state: GameState) => {
  const actor = state.currentActor
  if (!actor) return;
  const trap = state.dungeon.layout.secrets
    .filter((secret) => secret.type === SecretType.TRAP_DOOR)
    .filter((secret) => !secret.found)
    .find((secret) => isSamePosition(secret.position, actor.position));
  if (trap) {
    takeDamage(state, secretAsActor(trap), actor);
    addLog(state, `${actor.name} fell into a pit and is incapacitated for one turn.`)
    actor.movement = 0;
    actor.actions = 0;
    actor.incapacitated = true;
    trap.found = true;
  }
}

const secretAsActor = (secret: Secret): Actor => {
  return {
    health: 0,
    position: secret.position,
    defense: 0,
    experience: 0,
    actions: 0,
    movement: 0,
    colour: Colour.Red,
    maxHealth: 0,
    name: "Trap Door",
    level: Level.APPRENTICE,
    incapacitated: false,
    weapon: {
      name: "Falling",
      amountInDeck: 0,
      dice: 3,
      useHearHeroes: true,
      twoHanded: false,
      range: 1
    }
  };
}

const findHiddenDoor = (state: GameState, pos: Position) => {
  return state.dungeon.layout.doors.find((door) => {
    return door.hidden && isNeighbouring({x: door.x, y: door.y}, pos.x, pos.y);
  });
}

const findTrap = (state: GameState, pos: Position) => {
  return state.dungeon.layout.doors.find((door) => {
    return door.trapped && door.x === pos.x && door.y === pos.y;
  });
}

const findSecret = (state: GameState, pos: Position) => {
  return state.dungeon.layout.secrets.find((secret) => {
    return isNeighbouring(secret.position, pos.x, pos.y);
  });
}

const findTrapDoor = (state: GameState, pos: Position) => {
  return state.dungeon.layout.secrets
    .filter((secret) => secret.type === SecretType.TRAP_DOOR)
    .find((secret) => {
      return isNeighbouring(secret.position, pos.x, pos.y);
    });
}

const lookForHiddenDoor = (state: GameState, hero: Hero, result: number) => {
  const hiddenDoor = findHiddenDoor(state, hero.position);
  if (hiddenDoor) {
    addLog(state, `${hero.name} searched (${result}) and found a hidden door`);
    return true;
  }
  return false;
}

const lookForTrap = (state: GameState, hero: Hero, result: number) => {
  const trap = findTrap(state, hero.position);
  if (trap) {
    addLog(state, `${hero.name} searched (${result}) and found a trap in a door`);
    trap.trapped = false;
    return true;
  }
  return false;
}

const lookForSecret = (state: GameState, hero: Hero, result: number) => {
  const secret = findSecret(state, hero.position);
  if (secret) {
    addLog(state, `${hero.name} searched (${result}) and found ${secret.name}`);
    secret.found = true;
    return true;
  }
  return false;
}

const lookForTrapDoor = (state: GameState, hero: Hero, result: number) => {
  const trapDoor = findTrapDoor(state, hero.position);
  if (trapDoor) {
    addLog(state, `${hero.name} searched (${result}) and found ${trapDoor.name}`);
    trapDoor.found = true;
    return true;
  }
  return false;
}
