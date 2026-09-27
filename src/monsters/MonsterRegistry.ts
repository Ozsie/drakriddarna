import type { Armour, GameState, Monster, Shield, Weapon } from '../types';
import type { Level } from '../types';

// Extensible registry that allows any module (core or a campaign's own
// monsters/*.ts file) to register brand-new monster types, without editing
// this file or any other shared engine file. See src/campaigns/README.md.

export type MonsterStatOverrides = Partial<{
  level: Level;
  actions: number;
  defense: number;
  health: number;
  maxHealth: number;
  experience: number;
  weapon: Weapon;
  armour: Armour;
  rangedWeapon: Weapon;
  shield: Shield;
}>;

const monsterTemplates: Record<string, MonsterStatOverrides> = {};

export const registerMonsterTemplate = (
  type: string,
  overrides: MonsterStatOverrides,
): void => {
  monsterTemplates[type] = overrides;
};

export const getMonsterTemplate = (
  type: string,
): MonsterStatOverrides | undefined => monsterTemplates[type];

// Not a closed union: campaigns can invent brand-new ability keys and
// register a handler for them via `registerMonsterAbilityHandler` below,
// without editing this file or MonsterLogic.ts. The 3 built-in fire attacks
// remain available as literal string constants for convenience.
export type MonsterAbility =
  | 'diagonalFireAttack'
  | 'orthogonalFireAttack'
  | 'sameRoomFireAttack'
  | string;

const monsterAbilities: Record<string, Set<MonsterAbility>> = {};

export const registerMonsterAbility = (
  type: string,
  ability: MonsterAbility,
): void => {
  if (!monsterAbilities[type]) {
    monsterAbilities[type] = new Set();
  }
  monsterAbilities[type].add(ability);
};

export const hasMonsterAbility = (
  type: string,
  ability: MonsterAbility,
): boolean => monsterAbilities[type]?.has(ability) ?? false;

export const isDarkLord = (type: string): boolean =>
  hasMonsterAbility(type, 'diagonalFireAttack') ||
  hasMonsterAbility(type, 'orthogonalFireAttack') ||
  hasMonsterAbility(type, 'sameRoomFireAttack');

export const getMonsterAbilities = (type: string): MonsterAbility[] =>
  monsterAbilities[type] ? Array.from(monsterAbilities[type]) : [];

// Fully custom monster abilities: a campaign can register a handler for a
// brand-new ability key (e.g. `'poisonCloud'`) that implements completely
// new behaviour. The handler is invoked once per monster action (before the
// default melee/ranged/fire-attack/move selection); returning `true` means
// the handler consumed the monster's action (see MonsterLogic.ts).
export type MonsterAbilityHandler = (
  state: GameState,
  monster: Monster,
) => boolean | Promise<boolean>;

const monsterAbilityHandlers: Record<string, MonsterAbilityHandler> = {};

export const registerMonsterAbilityHandler = (
  ability: string,
  handler: MonsterAbilityHandler,
): void => {
  monsterAbilityHandlers[ability] = handler;
};

export const getMonsterAbilityHandler = (
  ability: string,
): MonsterAbilityHandler | undefined => monsterAbilityHandlers[ability];
