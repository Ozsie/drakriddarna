import type {
  Door,
  GameState,
  InteractableCell,
  Item,
  ItemLocation,
  LightSource,
  Monster,
  Secret,
  WinCondition,
} from '../types';
import {
  CellAlignment,
  Colour,
  Level,
  MonsterType,
  SecretType,
  Side,
} from '../types';
import { monsterWeapons } from '../items/weapons';
import { monsterArmour } from '../items/armours';
import { monsterShields } from '../items/shields';
import { liveHeroes } from '../hero/HeroLogic';
import { addLog } from '../core';
import { COLLAPSED, EMPTY, WALL } from '../core';
import {
  getMonsterTemplate,
  registerMonsterTemplate,
} from '../monsters/MonsterRegistry';

// Built-in monster templates, registered here so campaign-defined monster
// types can register their own stat templates the same way via
// `registerMonsterTemplate` (see src/monsters/MonsterRegistry.ts).
registerMonsterTemplate(MonsterType.ORC, {
  level: Level.APPRENTICE,
  defense: 0,
  health: 2,
  maxHealth: 2,
  experience: 1,
  weapon: monsterWeapons[0],
  rangedWeapon: monsterWeapons[1],
  armour: monsterArmour[0],
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt_monster.wav',
  deathSound: 'sfx/die_monster.wav',
});
registerMonsterTemplate(MonsterType.TROLL, {
  level: Level.KNIGHT,
  defense: 1,
  health: 3,
  maxHealth: 3,
  experience: 2,
  weapon: monsterWeapons[2],
  armour: monsterArmour[1],
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt2_monster.wav',
  deathSound: 'sfx/die2_monster.wav',
});
registerMonsterTemplate(MonsterType.YELLOW_DARK_LORD, {
  actions: 3,
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt3_monster.wav',
  deathSound: 'sfx/die_boss.wav',
});
registerMonsterTemplate(MonsterType.GREEN_DARK_LORD, {
  weapon: monsterWeapons[4],
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt3_monster.wav',
  deathSound: 'sfx/die_boss.wav',
});
registerMonsterTemplate(MonsterType.BLUE_DARK_LORD, {
  shield: monsterShields[0],
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt3_monster.wav',
  deathSound: 'sfx/die_boss.wav',
});

export { COLLAPSED, EMPTY, WALL };
export * from './dungeonParser';
export * from './dungeonValidator';
export * from '../interactables/InteractableLogic';

export const onCheckFulfilled: {
  [index: string]: (state: GameState, self: WinCondition) => boolean;
} = {
  hasNecklaceOfLight: (state: GameState, self: WinCondition): boolean => {
    const hasNecklaceOfLight = liveHeroes(state).some((hero) =>
      hero.inventory.some(
        (item) =>
          item &&
          (item.id === 'necklace_of_light' ||
            item.name === 'items.magicItems.necklaceOfLight.name'),
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

export const createRandomItem = (x: number, y: number): ItemLocation => ({
  position: { x, y },
});

// Default light source values, shared by `createLight` and rendering.
export const DEFAULT_LIGHT_COLOR = '#FFB85C';
export const DEFAULT_LIGHT_RADIUS = 4;
export const DEFAULT_LIGHT_INTENSITY = 0.35;

export const createLight = (
  x: number,
  y: number,
  alignment: CellAlignment = CellAlignment.CENTER,
  options?: {
    color?: string;
    radius?: number;
    intensity?: number;
    enabled?: boolean;
    id?: string;
  },
): LightSource => ({
  id: options?.id ?? `light_${x}_${y}`,
  position: { x, y },
  alignment,
  color: options?.color ?? DEFAULT_LIGHT_COLOR,
  radius: options?.radius ?? DEFAULT_LIGHT_RADIUS,
  intensity: options?.intensity ?? DEFAULT_LIGHT_INTENSITY,
  enabled: options?.enabled ?? true,
});

export const createSecret = (
  type: SecretType,
  name: string,
  x: number,
  y: number,
  id?: string,
): Secret => ({
  id: id ?? `secret_${type.toLowerCase().replace(/ /g, '_')}_${x}_${y}`,
  type,
  name,
  nameTranslationKey: name,
  position: { x, y },
  found: false,
});

export const createInteractable = (
  x: number,
  y: number,
  effect: string,
  options?: {
    id?: string;
    name?: string;
    nameTranslationKey?: string;
    description?: string;
    descriptionTranslationKey?: string;
    interacted?: boolean;
    oneTime?: boolean;
    args?: Record<string, unknown>;
    icon?: string;
    triggerOn?: 'interact' | 'step' | 'both';
  },
): InteractableCell => ({
  id: options?.id ?? `interactable_${x}_${y}`,
  position: { x, y },
  effect,
  ...(options?.name
    ? {
        name: options.name,
        nameTranslationKey: options.nameTranslationKey ?? options.name,
      }
    : {}),
  ...(options?.description
    ? {
        description: options.description,
        descriptionTranslationKey:
          options.descriptionTranslationKey ?? options.description,
      }
    : {}),
  interacted: options?.interacted ?? false,
  oneTime: options?.oneTime ?? true,
  ...(options?.args ? { args: options.args } : {}),
  ...(options?.icon ? { icon: options.icon } : {}),
  triggerOn: options?.triggerOn ?? 'interact',
});

export const createSecretWithItem = (
  type: SecretType,
  x: number,
  y: number,
  item: Item,
  id?: string,
): Secret => ({
  id:
    id ??
    (item.id
      ? `secret_${item.id}_${x}_${y}`
      : `secret_${type.toLowerCase().replace(/ /g, '_')}_${x}_${y}`),
  type,
  name: item.nameTranslationKey ?? item.name,
  nameTranslationKey: item.nameTranslationKey ?? item.name,
  position: { x, y },
  found: false,
  item,
});

export const createDoor = (side: Side, x: number, y: number): Door => ({
  id: `door_${side.toLowerCase()}_${x}_${y}`,
  side,
  x,
  y,
  locked: false,
  trapped: false,
  open: false,
  hidden: false,
  reinforced: false,
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
  id?: string,
): Monster => {
  const monster = createMonster(type, colour, x, y, id);
  monster.inventory = inventory;
  return monster;
};

export const createMonster = (
  type: MonsterType,
  colour: Colour,
  x: number,
  y: number,
  id?: string,
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
  let sprite = undefined;
  let walkSound: string | undefined = undefined;
  let hurtSound: string | undefined = undefined;
  let deathSound: string | undefined = undefined;

  const template = getMonsterTemplate(type);
  if (template) {
    level = template.level ?? level;
    actions = template.actions ?? actions;
    defense = template.defense ?? defense;
    health = template.health ?? health;
    maxHealth = template.maxHealth ?? maxHealth;
    experience = template.experience ?? experience;
    weapon = template.weapon ?? weapon;
    armour = template.armour ?? armour;
    rangedWeapon = template.rangedWeapon ?? rangedWeapon;
    shield = template.shield ?? shield;
    sprite = template.sprite ?? sprite;
    walkSound = template.walkSound ?? template.walk;
    hurtSound = template.hurtSound ?? template.hurt;
    deathSound = template.deathSound ?? template.death;
  }

  const monsterName = type + ' (' + colourName + ')';

  return {
    id:
      id ??
      `${type
        .toLowerCase()
        .replace(/ /g, '_')}_${colourName.toLowerCase()}_${x}_${y}`,
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
    name: monsterName,
    nameTranslationKey: monsterName,
    movement: 3,
    maxMovement: 3,
    position: { x, y },
    incapacitated: false,
    inventory: [],
    temperament: Math.random() < 0.5 ? 'bold' : 'wary',
    passiveStreak: 0,
    ...(walkSound ? { walkSound, walk: walkSound } : {}),
    ...(hurtSound ? { hurtSound, hurt: hurtSound } : {}),
    ...(deathSound ? { deathSound, death: deathSound } : {}),
    ...(sprite ? { sprite } : {}),
  };
};
