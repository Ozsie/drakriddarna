import type {
  Actor,
  DamageIndicator,
  Door,
  GameState,
  Hero,
  IndicatorEffect,
  Monster,
  Position,
  Weapon,
} from '../types';
import { Colour, ItemType, Level } from '../types';
import { roll } from './dice';
import { addLog, i18n } from './logger';
import { getDifficulty } from './DifficultLevels';
import { flashActor, playActorAttack, playActorDeath } from './ActorAnimation';
import { createBloodSplatter, createProjectile } from '../combat';
import { soundEffectManager } from '../audio';

export const ATTACK_BONUS = 'ATTACK_BONUS';
export const RE_ROLL_ATTACK = 'RE_ROLL_ATTACK';

export const createIndicator = (
  textOrDamage: string | number,
  position: { x: number; y: number },
  options?: {
    color?: string;
    effect?: IndicatorEffect;
    durationMs?: number;
    fontSizeScale?: number;
    offset?: { x?: number; y?: number };
    timestamp?: number;
  },
): DamageIndicator => {
  const isNumber = typeof textOrDamage === 'number';
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    damage: isNumber ? textOrDamage : undefined,
    text: `${textOrDamage}`,
    position: { x: position.x, y: position.y },
    color: options?.color ?? '#ff3333',
    effect: options?.effect ?? 'float',
    durationMs: options?.durationMs,
    fontSizeScale: options?.fontSizeScale,
    offset: options?.offset,
    timestamp: options?.timestamp ?? Date.now(),
  };
};

export const createDamageIndicator = (
  damage: number,
  position: { x: number; y: number },
  options?: {
    color?: string;
    effect?: IndicatorEffect;
    durationMs?: number;
    fontSizeScale?: number;
    offset?: { x?: number; y?: number };
    timestamp?: number;
  },
): DamageIndicator => createIndicator(damage, position, options);

export const removeDamageIndicator = (state: GameState, id: string): void => {
  if (!state.damageIndicators) return;
  state.damageIndicators = state.damageIndicators.filter(
    (ind) => ind.id !== id,
  );
};

// Everything that happens when an actor is downed by damage: clamps
// health, resets the level, plays the death animation and sound, and fires
// the difficulty's onHeroDowned hook for heroes. Shared by combat and
// environmental damage (e.g. terrain).
export const processActorDowned = (state: GameState, target: Actor): void => {
  target.health = 0;
  target.level = Level.APPRENTICE;
  playActorDeath(target);
  if (state.heroes.includes(target)) {
    const gm = getDifficulty(state);
    const onHeroDowned = gm.rules?.onHeroDowned ?? gm.onHeroDowned;
    onHeroDowned?.(target as Hero, state);
  }
  soundEffectManager.playActorDeath(target);
};

export const getEffectiveMaxMovement = (
  actor: Actor,
  movementModifier = 0,
): number =>
  actor.maxMovement - (actor.armour?.movementReduction ?? 0) + movementModifier;

export const getEffectiveMaxHealth = (
  actor: Actor,
  healthModifier = 0,
): number => actor.maxHealth + healthModifier;

export const canAct = (hero: Actor, movementModifier = 0): boolean => {
  if (hero.actions <= 0) {
    return false;
  }
  if (hero.movement < getEffectiveMaxMovement(hero, movementModifier)) {
    return hero.actions > 1;
  }
  return hero.actions > 0;
};

/**
 * Standard action cost for an activity (attack, search, pick lock,
 * interact, item use): with full movement left it costs one action, but
 * performed after partial movement it costs all remaining actions for the
 * turn (approximated by spending two). When no actions are left, movement
 * is zeroed; `refillMovement` also refreshes movement while actions
 * remain, for activities that leave the actor free to keep moving
 * afterwards (e.g. lock picking). This models the cost of standard
 * actions, whereas `consumeActions` models exhausting movement and
 * replenishing it by spending an action.
 */
export const spendStandardAction = (
  actor: Actor,
  movementModifier = 0,
  refillMovement = false,
): void => {
  const maxMovement = getEffectiveMaxMovement(actor, movementModifier);
  if (actor.actions > 1 && actor.movement < maxMovement) {
    actor.actions = Math.max(0, actor.actions - 2);
  } else {
    actor.actions = Math.max(0, actor.actions - 1);
  }
  settleMovementAfterAction(actor, movementModifier, refillMovement);
};

/**
 * Zeroes movement once an actor is out of actions; optionally refreshes
 * movement to max while actions remain.
 */
export const settleMovementAfterAction = (
  actor: Actor,
  movementModifier = 0,
  refillMovement = false,
): void => {
  if (actor.actions === 0) {
    actor.movement = 0;
  } else if (refillMovement) {
    actor.movement = getEffectiveMaxMovement(actor, movementModifier);
  }
};

/**
 * An abstract attacker for environmental hazards (door traps, pit falls,
 * earthquakes): a defenceless, actionless actor whose weapon describes the
 * hazard's attack dice and which defenses it bypasses.
 */
export const createHazardActor = (
  id: string | undefined,
  name: string,
  position: Position,
  weapon: Weapon,
): Actor => ({
  ...(id ? { id } : {}),
  name,
  nameTranslationKey: name,
  actions: 0,
  health: 0,
  maxHealth: 0,
  maxMovement: 0,
  position: { x: position.x, y: position.y },
  weapon,
  level: Level.APPRENTICE,
  movement: 0,
  experience: 0,
  colour: Colour.Red,
  inventory: [],
  defense: 0,
  incapacitated: false,
});

export const doorAsActor = (door: Door): Actor =>
  createHazardActor(
    undefined,
    'Door',
    { x: door.x, y: door.y },
    {
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
      attackSound: 'sfx/arrow.mp3',
    },
  );

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
  soundEffectManager.playWeaponAttack(weapon);
  playActorAttack(source);
  const isHeroSource = state.heroes.includes(source);
  const isHeroTarget = state.heroes.includes(target);
  if (isHeroSource && !isHeroTarget) {
    target.lastAttackedBy = source.id ?? source.name;
    target.lastAttackedByHero = source;
  }
  const difficultyModifiers = getDifficulty(state).modifiers;
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
    if (shield > 0) {
      soundEffectManager.playShieldBlockSound(target.shield);
    }
  } else if (target.shield) {
    addLog(state, 'logs.takeDamage.shieldUseless', {
      actor: i18n(target.name),
      weapon: i18n(weapon.name),
    });
  }
  const rerollItem = source.inventory.find(
    (item) =>
      item &&
      !item.disabled &&
      !item.properties?.USED &&
      item.properties?.[RE_ROLL_ATTACK],
  );
  const attackBonus = source.inventory
    .filter((item) => item && item?.properties?.[ATTACK_BONUS])
    .reduce(
      (partial, item) => partial + (item.properties?.[ATTACK_BONUS] as number),
      0,
    );
  const blindedSubtraction = source.blinded ? 1 : 0;
  const weakenedSubtraction = source.weakened ? 1 : 0;
  const elementalAddition = source.weapon.elemental ? 1 : 0;
  const attackDifficultyModifier = isHeroSource
    ? difficultyModifiers.attack
    : 0;
  const defenseDifficultyModifier = isHeroTarget
    ? difficultyModifiers.defense
    : 0;
  const buff = attackBonus + elementalAddition + attackDifficultyModifier;
  const deBuff = blindedSubtraction + weakenedSubtraction;
  let hits = roll(source.level, weapon.dice + buff - deBuff);
  let damage = Math.max(
    hits - (defense + defenseDifficultyModifier + shield),
    0,
  );
  // Ring of Precision: one re-roll of the attack dice per combat round when
  // the attack would otherwise deal no damage.
  if (damage === 0 && rerollItem) {
    addLog(state, 'logs.takeDamage.reRoll', { actor: i18n(source.name) });
    if (rerollItem.properties) rerollItem.properties.USED = true;
    hits = roll(source.level, weapon.dice + buff - deBuff);
    damage = Math.max(hits - (defense + defenseDifficultyModifier + shield), 0);
  }
  const gm = getDifficulty(state);
  if (isHeroSource && !isHeroTarget) {
    const modifyHeroDmg =
      gm.rules?.modifyHeroDamageDealt ?? gm.modifyHeroDamageDealt;
    if (modifyHeroDmg) {
      damage = Math.max(
        0,
        modifyHeroDmg(damage, source as Hero, target as Monster, state),
      );
    }
  } else if (!isHeroSource && isHeroTarget) {
    const modifyMonsterDmg =
      gm.rules?.modifyMonsterDamageDealt ?? gm.modifyMonsterDamageDealt;
    if (modifyMonsterDmg) {
      damage = Math.max(
        0,
        modifyMonsterDmg(damage, source as Monster, target as Hero, state),
      );
    }
  }
  target.health -= damage;
  const isRanged =
    ranged &&
    Boolean(
      source.position &&
        target.position &&
        (source.position.x !== target.position.x ||
          source.position.y !== target.position.y),
    );
  const now = Date.now();
  let impactTime = now;
  if (isRanged && source.position && target.position) {
    const projectile = createProjectile(source.position, target.position, {
      timestamp: now,
      color: weapon.elemental ? '#ff7700' : '#ffdd44',
    });
    if (!state.projectiles) {
      state.projectiles = [];
    }
    state.projectiles.push(projectile);
    impactTime = now + (projectile.durationMs ?? 200);
  }

  flashActor(target, 200, impactTime);

  if (target.position) {
    if (damage > 0) {
      if (!state.bloodSplatters) {
        state.bloodSplatters = [];
      }
      state.bloodSplatters.push(
        createBloodSplatter(target.position, {
          damage,
          timestamp: impactTime,
        }),
      );
    }

    if (!state.damageIndicators) {
      state.damageIndicators = [];
    }
    if (damage > 0 && damage >= weapon.dice - (target.armour?.defense ?? 0)) {
      state.damageIndicators.push(
        createIndicator(damage, target.position, {
          effect: 'crit',
          timestamp: impactTime,
        }),
      );
      soundEffectManager.playCriticalHit();
    } else {
      state.damageIndicators.push(
        createDamageIndicator(damage, target.position, {
          timestamp: impactTime,
        }),
      );
    }
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
    processActorDowned(state, target);
  } else {
    if (damage > 0) {
      soundEffectManager.playActorHurt(target);
    } else {
      soundEffectManager.playMiss();
    }
    if (weapon.id === 'green_dark_lord_sword') {
      addLog(state, 'logs.takeDamage.paralyzed', {
        target: i18n(target.name),
        weapon: i18n(weapon.name),
      });
      target.movement = 0;
      target.actions = 0;
      target.incapacitated = true;
      soundEffectManager.playParalyze();
    }
  }
};
