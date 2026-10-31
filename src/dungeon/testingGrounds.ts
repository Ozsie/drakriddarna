import type { Dungeon } from '../types';
import {
  CellAlignment,
  Colour,
  ConditionType,
  LightEffect,
  MonsterType,
  SecretType,
  Side,
  TerrainType,
} from '../types';
import { defineDungeon } from './dungeonParser';
import { weapons } from '../items/weapons';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { magicItems } from '../items/magicItems';

export const testingGrounds: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.testingGrounds.name',
  intro: 'campaign.iceDragon.testingGrounds.name',
  beaten: true,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: true,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_ALL_OF_TYPE,
      targetMonsterType: MonsterType.ORC,
      fulfilled: false,
    },
    {
      type: ConditionType.REACH_CELL,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_AT_LEAST,
      killMinCount: 5,
      fulfilled: false,
    },
  ],
  nextDungeon: e1m0,
  startingPositions: [
    [2, 9],
    [1, 8],
    [1, 9],
    [1, 10],
  ],
  discoveredRooms: ['A', 'D', 'I'],
  // Dim dungeon to demo light sources illuminating their surroundings.
  ambientLight: 0.2,
  layout: {
    grid: [
      '###########',
      '#CCCCCCCCC#',
      '#C#CCCCCCC#',
      '#C#CCCCCCC#',
      '#J#####E###',
      '#J#####EDDD',
      '#J#FFFFE##D',
      '###F###AA#D',
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '##G########',
      ' #G#IIIIII#',
      ' #GIIIII#I#',
      ' ##########',
    ],
    pillars: [
      [8, 3],
      [7, 9],
    ],
    lights: [
      // Flickering ceiling torch near the starting positions.
      [2, 8, CellAlignment.CEILING, { effect: LightEffect.FLICKER, rate: 2 }],
      // Room C: chandelier swinging gently from left to right.
      [
        4,
        2,
        CellAlignment.CEILING,
        {
          color: '#FFD9A0',
          radius: 2.5,
          intensity: 0.5,
          softness: 0.7,
          effect: LightEffect.SWAY,
          rate: 0.4,
        },
      ],
      // Cool pulsing light next to the pillar at (7, 9) to demo shadow
      // casting, with soft edges.
      [
        7,
        8,
        CellAlignment.CEILING,
        {
          color: '#87CEEB',
          radius: 3,
          intensity: 0.5,
          softness: 0.8,
          effect: LightEffect.PULSE,
          rate: 0.5,
        },
      ],
      // Corridor D: slowly sweeping beam.
      [10, 7, CellAlignment.CENTER, { effect: LightEffect.SWEEP, rate: 0.25 }],
      // Room I: steady ceiling fixture, illuminating everything below it
      // without actor shadows.
      [6, 13, CellAlignment.CEILING],
      // Golden sparkles over the cell and its neighbours.
      [
        5,
        8,
        CellAlignment.TOP_LEFT,
        { color: '#FFD700', effect: LightEffect.SPARKLE, rate: 0.8 },
      ],
      // Purple breathing aura ring around the cell center.
      [
        7,
        10,
        CellAlignment.CENTER,
        { color: '#9B59B6', effect: LightEffect.AURA, rate: 0.5 },
      ],
    ],
    pits: [
      [6, 3],
      [6, 2],
    ],
    // Terrain cells: a slow-moving water patch and a lava patch that
    // burns on enter and at turn end, glowing on its own.
    terrain: [
      [2, 8, TerrainType.WATER, { movementCost: 2 }],
      [3, 8, TerrainType.WATER, { movementCost: 2 }],
      [
        6,
        8,
        TerrainType.LAVA,
        {
          damageOnEnter: 1,
          damageOnTurnEnd: 1,
          light: {
            alignment: CellAlignment.CENTER,
            color: '#FF6A00',
            radius: 1.5,
            intensity: 0.35,
            softness: 0.4,
            effect: LightEffect.FLICKER,
            rate: 2,
          },
        },
      ],
      [6, 9, TerrainType.LAVA, { damageOnEnter: 1, damageOnTurnEnd: 1 }],
    ],
    // Unlit brazier: interact with it (repeatedly) to toggle its torch
    // light. The gas valve floods room C with sleeping-green fog; the
    // lava vent floods four cells with burning lava and shakes the
    // board.
    interactables: [
      [
        4,
        8,
        'toggleLight',
        {
          oneTime: false,
          name: 'Brazier',
          light: {
            alignment: CellAlignment.CENTER,
            color: '#FFB85C',
            radius: 2.5,
            intensity: 0.45,
            softness: 0.4,
            effect: LightEffect.FLICKER,
            rate: 1.5,
            enabled: false,
          },
        },
      ],
      [
        4,
        1,
        'fillRoomFog',
        {
          oneTime: true,
          name: 'campaign.iceDragon.testingGrounds.interactables.gasValve',
          nameTranslationKey:
            'campaign.iceDragon.testingGrounds.interactables.gasValve',
          args: {
            room: 'C',
            options: {
              color: '#9ccc9c',
              opacity: 0.4,
              rate: 0.5,
              softness: 0.7,
              density: 0.4,
              damageOnEnter: 1,
              nameTranslationKey: 'campaign.iceDragon.testingGrounds.fog.name',
            },
          },
        },
      ],
      [
        4,
        3,
        'spawnLava',
        {
          oneTime: true,
          name: 'campaign.iceDragon.testingGrounds.interactables.lavaVent',
          nameTranslationKey:
            'campaign.iceDragon.testingGrounds.interactables.lavaVent',
          args: {
            cells: [
              { x: 3, y: 2 },
              { x: 4, y: 2 },
              { x: 3, y: 3 },
              { x: 4, y: 3 },
            ],
            options: { damageOnEnter: 1, damageOnTurnEnd: 1 },
            shake: 10,
          },
        },
      ],
    ],
    corridors: ['G', 'E', 'F'],
    // Room J is filled with a slowly breathing, soft-edged poisonous fog:
    // harmless to enter, damaging to linger in, and absorbing the light
    // of glows shining through it. Corridor G is a wall of dense mist no
    // light penetrates.
    roomFog: {
      J: {
        softness: 0.8,
        density: 0.6,
        damageOnTurnEnd: 1,
        nameTranslationKey: 'campaign.iceDragon.testingGrounds.fog.name',
      },
      G: { blocksLight: true },
    },
    doors: [
      [Side.UP, 3, 8, { trapped: 1, hidden: true }],
      [Side.LEFT, 7, 6, { locked: true }],
      [Side.UP, 7, 7, { trapped: 1 }],
      [Side.UP, 7, 4],
      [Side.DOWN, 2, 10, { hidden: true }],
      [Side.DOWN, 1, 3],
      [Side.RIGHT, 1, 3],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Green, 1, 1],
      [MonsterType.ORC, Colour.Red, 4, 9],
      [MonsterType.TROLL, Colour.Green, 5, 1],
    ],
    secrets: [
      [
        SecretType.TRAP_DOOR,
        3,
        9,
        'campaign.iceDragon.testingGrounds.secrets.trapDoor',
      ],
      [SecretType.EQUIPMENT, 1, 10],
      [SecretType.EQUIPMENT, 5, 10, weapons[2]],
    ],
    notes: [
      [
        2,
        10,
        'Some note\nto test rendering\n on game board. \nThe note is pretty long, so we g\net several lines of text. I wonder how it handles a linebreak?\nLike this apparently.',
      ],
    ],
    items: [
      [3, 10, magicItems[0]],
      [4, 10, magicItems[1]],
      [5, 10, magicItems[6]],
      [6, 10, magicItems[2]],
      [7, 10, magicItems[3]],
      [8, 10, magicItems[4]],
      [8, 7, magicItems[5]],
      [10, 10],
    ],
  },
  events: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
});
