import type { Actor, DamageIndicator, Door, GameState, Weapon } from '../types';
import { Colour, ItemType, Level } from '../types';
import { roll } from './dice';
import { addLog, i18n } from './logger';

export const ATTACK_BONUS = 'ATTACK_BONUS';
export const RE_ROLL_ATTACK = 'RE_ROLL_ATTACK';

export const createDamageIndicator = (
  damage: number,
  position: { x: number; y: number },
): DamageIndicator => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  damage,
  position: { x: position.x, y: position.y },
  timestamp: Date.now(),
});

export const removeDamageIndicator = (state: GameState, id: string): void => {
  if (!state.damageIndicators) return;
  state.damageIndicators = state.damageIndicators.filter(
    (ind) => ind.id !== id,
  );
};

export const getEffectiveMaxMovement = (actor: Actor): number =>
  actor.maxMovement - (actor.armour?.movementReduction ?? 0);

export const canAct = (hero: Actor): boolean => {
  if (hero.movement < getEffectiveMaxMovement(hero)) {
    return hero.actions > 1;
  }
  return hero.actions > 0;
};

export const doorAsActor = (door: Door): Actor => ({
  health: 0,
  position: { x: door.x, y: door.y },
  defense: 0,
  experience: 0,
  actions: 0,
  movement: 0,
  maxMovement: 0,
  colour: Colour.Red,
  maxHealth: 0,
  name: 'Door',
  level: Level.APPRENTICE,
  incapacitated: false,
  weapon: {
    name: 'Trap',
    amountInDeck: 0,
    dice: door.trapAttacks,
    useHearHeroes: true,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: true,
    ignoresArmour: false,
  },
  inventory: [],
});

export const getDamageString = (
  damage: number,
  hits: number,
  shield: number,
  target: Actor,
): string => {
  const defense = target.armour?.defense ?? target.defense;
  return `${damage} damage (${hits}-(${defense}+${shield})=${damage})`;
};

export const takeDamage = (
  state: GameState,
  source: Actor & { rangedWeapon?: Weapon },
  target: Actor,
  ranged: boolean,
): void => {
  let weapon = source.weapon;
  if (ranged && source.rangedWeapon) {
    weapon = source.rangedWeapon;
  }
  let defense = 0;
  let shield = 0;
  if (!weapon.ignoresArmour) {
    defense = target.armour?.defense ?? target.defense;
  } else if (target.armour) {
    addLog(state, 'logs.takeDamage.armourUseless', {
      actor: i18n(target.name),
      weapon: i18n(weapon.name),
    });
  }
  if (!weapon.ignoresShield) {
    shield = roll(target.level, target.shield?.dice ?? 0);
  } else if (target.shield) {
    addLog(state, 'logs.takeDamage.shieldUseless', {
      actor: i18n(target.name),
      weapon: i18n(weapon.name),
    });
  }
  const canReRoll = source.inventory
    .filter((item) => item && item?.properties?.[RE_ROLL_ATTACK])
    .some((item) => {
      addLog(state, 'logs.takeDamage.usedEffect', {
        actor: i18n(source.name),
        item: i18n(item.name),
      });
      return item.properties?.[RE_ROLL_ATTACK];
    });
  const attackBonus = source.inventory
    .filter((item) => item && item?.properties?.[ATTACK_BONUS])
    .map((item) => {
      addLog(state, 'logs.takeDamage.usedEffect', {
        actor: i18n(source.name),
        item: i18n(item.name),
      });
      return item.properties?.[ATTACK_BONUS] as number;
    })
    .reduce((partial, bonus) => partial + bonus, 0);
  const blindedSubtraction = source.blinded ? 1 : 0;
  const weakenedSubtraction = source.weakened ? 1 : 0;
  const elementalAddition = source.weapon.elemental ? 1 : 0;
  const buff = attackBonus + elementalAddition;
  const deBuff = blindedSubtraction + weakenedSubtraction;
  const hits = roll(source.level, weapon.dice + buff - deBuff);
  let damage = Math.max(hits - (defense + shield), 0);
  if (damage === 0 && canReRoll) {
    addLog(state, 'logs.takeDamage.reRoll', { actor: i18n(source.name) });
    damage = Math.max(hits - (defense + shield), 0);
  }
  target.health -= damage;
  if (target.position) {
    if (!state.damageIndicators) {
      state.damageIndicators = [];
    }
    state.damageIndicators.push(createDamageIndicator(damage, target.position));
  }
  addLog(state, 'logs.takeDamage.attackedWith', {
    actor: i18n(source.name),
    target: i18n(target.name),
    weapon: i18n(weapon.name),
    damage: getDamageString(damage, hits, shield, target),
  });
  if (target.health <= 0) {
    addLog(state, 'logs.takeDamage.killed', {
      actor: i18n(source.name),
      target: i18n(target.name),
    });
    target.health = 0;
    target.level = Level.APPRENTICE;
  }
};
