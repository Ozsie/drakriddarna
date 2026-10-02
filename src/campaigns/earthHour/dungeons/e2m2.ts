import {
  type Actor,
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  type InteractableCell,
  MonsterType,
  Side,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/dungeonParser';
import { addLog, i18n } from '../../../core';
import { registerInteractableEffect } from '../../../interactables/InteractableLogic';
import { shields } from '../../../items/shields';
import { createMonster } from '../../../dungeon/DungeonLogic';

export const E2M2_LEVER = 'E2M2_LEVER';

registerInteractableEffect(
  E2M2_LEVER,
  (state: GameState, _interactable: InteractableCell, actor?: Actor | Hero) => {
    const levers =
      state.dungeon.layout.interactables?.filter(
        (item) => item.effect === E2M2_LEVER,
      ) ?? [];

    const activatedCount = levers.filter((lever) => lever.interacted).length;

    if (activatedCount === 3) {
      const door = state.dungeon.layout.doors.find(
        (d) => d.x === 12 && d.y === 1 && d.side === Side.UP,
      );
      if (door) {
        door.locked = false;
        door.reinforced = false;
      }
      addLog(state, 'campaign.earthHour.e2m2.logs.allLeversPulled', {
        hero: i18n(actor?.name ?? ''),
      });
    } else {
      addLog(state, 'campaign.earthHour.e2m2.logs.leverPulled', {
        hero: i18n(actor?.name ?? ''),
        remaining: `${3 - activatedCount}`,
      });
    }

    return true;
  },
);

export const e2m2: Dungeon = defineDungeon({
  name: 'campaign.earthHour.e2m2.name',
  intro: 'campaign.earthHour.e2m2.intro',
  winConditions: [
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 12, y: 1 },
      fulfilled: false,
    },
  ],
  discoveredRooms: ['A'],
  startingPositions: [
    [12, 4],
    [12, 5],
    [12, 6],
  ],
  layout: {
    grid: [
      '           ###  ',
      '     ##### #D#  ',
      '     #EEEDDDD#  ',
      '  ####EEE###D#  ',
      '  #EEEEEE#AAA#  ',
      '  ####EEE#AAA#  ',
      '######C#CCAAA#  ',
      '#CCC##C#C###C###',
      '###CCCCCCC##C#C#',
      '  #CCC#CCC##C#C#',
      '  #CCC#CCCCCCCC#',
      '  ########CCCC##',
      '         ###### ',
    ],
    monsters: [
      {
        ...createMonster(MonsterType.TROLL, Colour.Green, 7, 3),
        shield: shields[1],
      },
    ],
    pillars: [[11, 6]],
    doors: [
      [Side.LEFT, 10, 6],
      [Side.DOWN, 12, 6],
      [Side.UP, 12, 4],
      [Side.UP, 6, 6],
      [Side.UP, 8, 6],
      [Side.LEFT, 9, 2],
      [Side.UP, 12, 1, { locked: true, reinforced: true }],
    ],
    notes: [
      [12, 1, 'campaign.earthHour.e2m2.notes.exit'],
      [9, 2, 'campaign.earthHour.e2m2.notes.troll'],
      [6, 6, 'campaign.earthHour.e2m2.notes.troll'],
      [8, 6, 'campaign.earthHour.e2m2.notes.troll'],
    ],
    interactables: [
      [
        3,
        4,
        E2M2_LEVER,
        {
          name: 'campaign.earthHour.e2m2.interactables.lever1',
          oneTime: true,
          triggerOn: 'interact',
        },
      ],
      [
        1,
        7,
        E2M2_LEVER,
        {
          name: 'campaign.earthHour.e2m2.interactables.lever2',
          oneTime: true,
          triggerOn: 'interact',
        },
      ],
      [
        14,
        8,
        E2M2_LEVER,
        {
          name: 'campaign.earthHour.e2m2.interactables.lever3',
          oneTime: true,
          triggerOn: 'interact',
        },
      ],
    ],
  },
});
