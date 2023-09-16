import type {
  GameState,
  Hero,
  Position
} from "../types";
import { SecretType } from "../types";
import { addLog, isNeighbouring, roll } from "../game";

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

function lookForHiddenDoor(state: GameState, hero: Hero, result: number) {
  const hiddenDoor = findHiddenDoor(state, hero.position);
  if (hiddenDoor) {
    addLog(state, `${hero.name} searched (${result}) and found a hidden door`);
    return true;
  }
  return false;
}

function lookForTrap(state: GameState, hero: Hero, result: number) {
  const trap = findTrap(state, hero.position);
  if (trap) {
    addLog(state, `${hero.name} searched (${result}) and found a trap in a door`);
    trap.trapped = false;
    return true;
  }
  return false;
}

function lookForSecret(state: GameState, hero: Hero, result: number) {
  const secret = findSecret(state, hero.position);
  if (secret) {
    addLog(state, `${hero.name} searched (${result}) and found ${secret.name}`);
    secret.found = true;
    return true;
  }
  return false;
}

function lookForTrapDoor(state: GameState, hero: Hero, result: number) {
  const trapDoor = findTrapDoor(state, hero.position);
  if (trapDoor) {
    addLog(state, `${hero.name} searched (${result}) and found ${trapDoor.name}`);
    trapDoor.found = true;
    return true;
  }
  return false;
}

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