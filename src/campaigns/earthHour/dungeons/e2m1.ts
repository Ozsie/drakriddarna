import {
  type Actor,
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  type InteractableCell,
  MonsterType,
  SecretType,
  Side,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/dungeonParser';
import { registerInteractableEffect } from '../../../interactables/InteractableLogic';
import { addLog, findCell, i18n } from '../../../core';
import { e2m2 } from './e2m2';

export const CALL_ELEVATOR = 'CALL_ELEVATOR';

registerInteractableEffect(
  CALL_ELEVATOR,
  (state: GameState, interactable: InteractableCell, actor?: Actor | Hero) => {
    const elevatorDoor = state.dungeon.layout.doors.find(
      (door) => door.x === 5 && door.y === 3 && door.side === Side.DOWN,
    );
    if (elevatorDoor) {
      elevatorDoor.locked = false;
    }
    state.dungeon.layout.secrets = state.dungeon.layout.secrets.filter(
      (secret) => {
        const room = findCell(
          state.dungeon.layout.grid,
          secret.position.x,
          secret.position.y,
        );
        return !(room === 'I' && secret.type === SecretType.TRAP_DOOR);
      },
    );

    state.dungeon.layout.pillars = [{ x: 5, y: 5 }];

    addLog(state, 'campaign.earthHour.e2m1.logs.elevatorCalled', {
      hero: i18n(actor?.name ?? ''),
    });
    return true;
  },
);

export const e2m1: Dungeon = defineDungeon({
  name: 'campaign.earthHour.e2m1.name',
  intro: 'campaign.earthHour.e2m1.intro',
  nextDungeon: e2m2,
  winConditions: [
    {
      type: ConditionType.REACH_CELL,
      targetCell: { x: 5, y: 5 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '##### #####',
      '#AAA###GGG#',
      '#AAA#HHGGG#',
      '#AAA#H#GGG#',
      '##B#III#F##',
      ' #B#III#F# ',
      '##B#III#F##',
      '#CCC###EEE#',
      '#CCCDDDEEE#',
      '#CCC###EEE#',
      '##### #EEE#',
      '      #####',
    ],
    corridors: ['B', 'D', 'F', 'H'],
    doors: [
      [Side.DOWN, 2, 3],
      [Side.DOWN, 2, 6],
      [Side.RIGHT, 3, 8],
      [Side.RIGHT, 6, 8],
      [Side.UP, 8, 7],
      [Side.UP, 8, 4],
      [Side.LEFT, 7, 2],
      [Side.DOWN, 5, 3, { locked: true }],
    ],
    monsters: [
      [MonsterType.ORCH, Colour.Blue, 1, 9],
      [MonsterType.ORCH, Colour.Red, 3, 9],
      [MonsterType.ORCH, Colour.Green, 6, 8],
      [MonsterType.ORCH, Colour.Yellow, 9, 7],
    ],
    secrets: [
      [SecretType.NOTE, 2, 6, 'campaign.earthHour.e2m1.secrets.note1'],
      [SecretType.EQUIPMENT, 8, 1],
      [SecretType.MAGIC_ITEM, 9, 1],
      [SecretType.TRAP_DOOR, 4, 4],
      [SecretType.TRAP_DOOR, 4, 5],
      [SecretType.TRAP_DOOR, 4, 6],
      [SecretType.TRAP_DOOR, 5, 4],
      [SecretType.TRAP_DOOR, 5, 5],
      [SecretType.TRAP_DOOR, 5, 6],
      [SecretType.TRAP_DOOR, 6, 4],
      [SecretType.TRAP_DOOR, 6, 5],
      [SecretType.TRAP_DOOR, 6, 6],
    ],
    notes: [
      [7, 8, 'campaign.earthHour.e2m1.notes.hint1'],
      [5, 4, 'campaign.earthHour.e2m1.notes.darkRoom'],
    ],
    interactables: [
      [
        9,
        10,
        'addHero',
        {
          name: 'Oswin',
          colour: Colour.Yellow,
          oneTime: true,
        },
      ],
      [
        5,
        2,
        CALL_ELEVATOR,
        {
          oneTime: true,
          triggerOn: 'interact',
          secret: true,
        },
      ],
      [
        5,
        5,
        'nextDungeon',
        {
          oneTime: true,
          triggerOn: 'interact',
          secret: false,
        },
      ],
    ],
  },
});
