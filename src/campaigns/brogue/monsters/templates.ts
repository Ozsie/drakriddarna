import {
  ItemType,
  Level,
  type Armour,
  type Shield,
  type Weapon,
} from '../../../types';
import {
  registerMonsterTemplate,
  type MonsterStatOverrides,
} from '../../../monsters/MonsterRegistry';
import { weapons } from '../../../items/weapons';
import { armour } from '../../../items/armours';
import { shields } from '../../../items/shields';

/**
 * Campaign-local mid-tier monster templates (docs/random-campaign-spec/
 * 03-difficulty-curve.md): the built-in pool is thin between Knight
 * (TROLL) and the dark lords, so this campaign registers two of its own
 * via `registerMonsterTemplate` — no core edits.
 *
 * The type strings are the in-game display names (rendered like
 * 'Orc (Red)') and are therefore user-facing text: per the project AI
 * policy they are human-authored. The translated display names resolve
 * via `nameTranslationKey` from this campaign's own translation files
 * (campaign.brogue.monsters.* in translations/{en,sv}.json).
 */

export const MID_TIER_MONSTER_A = 'Dark Knight';
export const MID_TIER_MONSTER_B = 'Sorcerer';

// Monster `weapon` is melee-only regardless of its range; ranged attacks
// require `rangedWeapon` (MonsterLogic falls back to `weapon` up close).
// Sorcerer-only: amountInDeck 0 keeps it out of the hero item deck.
const magicMissile: Weapon = {
  id: 'magic_missile',
  name: 'campaign.brogue.weapons.magicMissile',
  nameTranslationKey: 'campaign.brogue.weapons.magicMissile',
  range: 5,
  dice: 3,
  twoHanded: false,
  useHearHeroes: true,
  amountInDeck: 0,
  type: ItemType.WEAPON,
  value: 0,
  ignoresShield: true,
  ignoresArmour: false,
  attackSound: 'sfx/fireball.mp3',
};

// Sorcerer-only equipment: names are user-facing text and human-authored
// (fill in campaign.brogue.armour/shields in the translation files).
// The armour trades the dark lord cape's defense 2 for defense 1 with
// magic protection; the shield blocks on 2 dice instead of the dark lord
// shield's 1.
const sorcererArmour: Armour = {
  id: 'sorcerer_armour',
  name: 'campaign.brogue.armour.sorcererArmour',
  nameTranslationKey: 'campaign.brogue.armour.sorcererArmour',
  defense: 1,
  magicProtection: true,
  amountInDeck: 0,
  type: ItemType.ARMOUR,
  movementReduction: 0,
  value: 0,
};

const sorcererShield: Shield = {
  id: 'sorcerer_shield',
  name: 'campaign.brogue.shields.sorcererShield',
  nameTranslationKey: 'campaign.brogue.shields.sorcererShield',
  type: ItemType.SHIELD,
  amountInDeck: 0,
  dice: 2,
  value: 0,
  blockSound: 'sfx/shield_block.mp3',
};

const templateA: MonsterStatOverrides = {
  nameTranslationKey: 'campaign.brogue.monsters.darkKnight',
  level: Level.KNIGHT,
  defense: 0,
  health: 4,
  maxHealth: 4,
  experience: 3,
  weapon: weapons[3],
  armour: armour[1],
  shield: shields[1],
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt2_monster.wav',
  deathSound: 'sfx/die2_monster.wav',
};

const templateB: MonsterStatOverrides = {
  nameTranslationKey: 'campaign.brogue.monsters.sorcerer',
  level: Level.LORD,
  defense: 1,
  health: 4,
  maxHealth: 4,
  experience: 4,
  rangedWeapon: magicMissile,
  armour: sorcererArmour,
  shield: sorcererShield,
  walkSound: 'sfx/walk_boss.wav',
  hurtSound: 'sfx/hurt3_monster.wav',
  deathSound: 'sfx/die_boss.wav',
};

registerMonsterTemplate(MID_TIER_MONSTER_A, templateA);
registerMonsterTemplate(MID_TIER_MONSTER_B, templateB);

export const MID_TIER_STATS: Record<string, MonsterStatOverrides> = {
  [MID_TIER_MONSTER_A]: templateA,
  [MID_TIER_MONSTER_B]: templateB,
};
