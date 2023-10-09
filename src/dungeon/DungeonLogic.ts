import type {
  Door,
  GameState,
  Item,
  ItemLocation,
  Monster,
  Secret,
  WinCondition,
} from '../types';
import { Colour, Level, MonsterType, SecretType, Side } from '../types';
import { monsterWeapons } from '../items/weapons';
import { monsterArmour } from '../items/armours';
import { monsterShields } from '../items/shields';
import { liveHeroes } from '../hero/HeroLogic';
import { addLog } from '../game';

export const EMPTY = ' ';
export const COLLAPSED = '?';
export const WALL = '#';

export const onCheckFulfilled: {
  [index: string]: (state: GameState, self: WinCondition) => boolean;
} = {
  hasNecklaceOfLight: (state: GameState, self: WinCondition): boolean => {
    const hasNecklaceOfLight = liveHeroes(state).some((hero) =>
      hero.inventory.some(
        (item) => item.name === 'items.magicItems.necklaceOfLight.name',
      ),
    );
    if (state.settings['debug']) {
      addLog(state, 'logs.debug.hasNecklaceOfLight', {
        hasNecklaceOfLight: hasNecklaceOfLight ? 'Y' : 'N',
      });
    }
    return self.fulfilled && hasNecklaceOfLight;
  },
};

export const createEquipment = (
  x: number,
  y: number,
  item: Item,
): ItemLocation => ({
  item,
  position: { x, y },
});

export const createSecret = (
  type: SecretType,
  name: string,
  x: number,
  y: number,
): Secret => ({
  type,
  name,
  position: { x, y },
  found: false,
});

export const createSecretWithItem = (
  type: SecretType,
  x: number,
  y: number,
  item: Item,
): Secret => ({
  type,
  name: item.name,
  position: { x, y },
  found: false,
  item,
});

export const createDoor = (side: Side, x: number, y: number): Door => ({
  side,
  x,
  y,
  locked: false,
  trapped: false,
  open: false,
  hidden: false,
  trapAttacks: 0,
});

export const createTrappedDoor = (
  side: Side,
  x: number,
  y: number,
  trapAttacks: number,
): Door => ({
  ...createDoor(side, x, y),
  trapped: true,
  trapAttacks,
});

export const createHiddenDoor = (side: Side, x: number, y: number): Door => ({
  ...createDoor(side, x, y),
  hidden: true,
});

export const createLockedDoor = (side: Side, x: number, y: number): Door => ({
  ...createDoor(side, x, y),
  locked: true,
});

export const createTrappedLockedDoor = (
  side: Side,
  x: number,
  y: number,
  trapAttacks: number,
): Door => ({
  ...createDoor(side, x, y),
  locked: true,
  trapped: true,
  trapAttacks,
});

export const createTrappedHiddenDoor = (
  side: Side,
  x: number,
  y: number,
  trapAttacks: number,
): Door => ({
  ...createDoor(side, x, y),
  hidden: true,
  trapped: true,
  trapAttacks,
});

export const createMonsterWithInventory = (
  type: MonsterType,
  colour: Colour,
  x: number,
  y: number,
  inventory: Item[],
): Monster => {
  const monster = createMonster(type, colour, x, y);
  monster.inventory = inventory;
  return monster;
};

export const createMonster = (
  type: MonsterType,
  colour: Colour,
  x: number,
  y: number,
): Monster => {
  const indexOfColour = Object.values(Colour).indexOf(colour);
  const colourName = Object.keys(Colour)[indexOfColour];

  let level = Level.MASTER;
  let actions = 2;
  let defense = 2;
  let health = 4;
  let maxHealth = 4;
  let experience = 4;
  let weapon = monsterWeapons[3];
  let armour = monsterArmour[2];
  let rangedWeapon = undefined;
  let shield = undefined;
  if (type === MonsterType.ORCH) {
    level = Level.APPRENTICE;
    defense = 0;
    health = 2;
    maxHealth = 2;
    experience = 1;
    weapon = monsterWeapons[0];
    rangedWeapon = monsterWeapons[1];
    armour = monsterArmour[0];
  } else if (type === MonsterType.TROLL) {
    level = Level.KNIGHT;
    defense = 1;
    health = 3;
    maxHealth = 3;
    experience = 2;
    weapon = monsterWeapons[2];
    armour = monsterArmour[1];
  } else if (type === MonsterType.YELLOW_DARK_LORD) {
    actions = 3;
  } else if (type === MonsterType.GREEN_DARK_LORD) {
    weapon = monsterWeapons[4];
  } else if (type === MonsterType.BLUE_DARK_LORD) {
    shield = monsterShields[0];
  }

  return {
    type,
    level,
    colour,
    actions,
    defense,
    health,
    maxHealth,
    experience,
    weapon,
    armour,
    shield,
    rangedWeapon,
    name: type + ' (' + colourName + ')',
    movement: 3,
    maxMovement: 3,
    position: { x, y },
    incapacitated: false,
    inventory: [],
  };
};
