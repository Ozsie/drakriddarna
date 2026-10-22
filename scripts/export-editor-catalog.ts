/**
 * Exports the shared-content catalog snapshot for the Drakriddarna Campaign
 * Editor (editor spec 03). This is the ONLY game-repo file the editor
 * requires; scripts/ is not part of the shipped game.
 *
 * The game's own TypeScript modules are the authority: item ids, deck sizes,
 * monster types and stats, interactable effects, event numbers and enum
 * vocabularies are read from src/ directly — never hand-edit the output.
 *
 * Run (from the repo root) and redirect into the editor:
 *
 *   ./node_modules/.bin/vite-node scripts/export-editor-catalog.ts \
 *     > <editor>/app/src/main/resources/catalog.json
 *
 * (npx tsx scripts/export-editor-catalog.ts works identically if tsx is
 * installed.)
 */

import { execSync } from 'node:child_process';

import { weapons, monsterWeapons } from '../src/items/weapons';
import { armour, monsterArmour } from '../src/items/armours';
import { shields, monsterShields } from '../src/items/shields';
import { magicItems } from '../src/items/magicItems';
import {
  CellAlignment,
  Colour,
  ConditionType,
  LightEffect,
  MonsterType,
  SecretType,
  Side,
} from '../src/types';
import { getMonsterTemplate } from '../src/monsters/MonsterRegistry';
import { interactableEffects } from '../src/interactables/InteractableLogic';
import { events } from '../src/events/events';
// Importing DungeonLogic registers the built-in monster stat templates so
// getMonsterTemplate below can report them.
import '../src/dungeon/DungeonLogic';

type CatalogItem = {
  id: string;
  kind: 'weapon' | 'armour' | 'shield' | 'magic' | 'monster';
  nameKey?: string;
  amountInDeck: number;
  import: { module: string; export: string; index: number };
};

const toItem = (
  item: { id?: string; name: string; nameTranslationKey?: string; amountInDeck: number },
  kind: CatalogItem['kind'],
  module: string,
  exportName: string,
  index: number,
): CatalogItem => {
  if (!item.id) {
    throw new Error(
      `${exportName}[${index}] has no id; catalog items need stable ids.`,
    );
  }
  return {
    id: item.id,
    kind,
    nameKey: item.nameTranslationKey ?? item.name,
    amountInDeck: item.amountInDeck,
    import: { module, export: exportName, index },
  };
};

const itemExport = (
  items: Array<{ id?: string; name: string; nameTranslationKey?: string; amountInDeck: number }>,
  kind: CatalogItem['kind'],
  module: string,
  exportName: string,
): CatalogItem[] => items.map((item, index) => toItem(item, kind, module, exportName, index));

const monsterTypes = Object.keys(MonsterType).map((member) => {
  const template = getMonsterTemplate(MonsterType[member as keyof typeof MonsterType]);
  const stats: Record<string, number> = {};
  if (template?.health !== undefined) stats.health = template.health;
  if (template?.defense !== undefined) stats.defense = template.defense;
  if (template?.experience !== undefined) stats.experience = template.experience;
  return {
    id: member,
    import: { module: 'types', export: 'MonsterType', member },
    ...(Object.keys(stats).length > 0 ? { stats } : {}),
  };
});

// Numeric enums carry reverse mappings; keep only the member names.
const enumMembers = (enumObject: Record<string, string | number>): string[] =>
  Object.keys(enumObject).filter((key) => Number.isNaN(Number(key)));

const generatedFrom = (() => {
  try {
    return `game repo commit ${execSync('git rev-parse --short HEAD').toString().trim()}`;
  } catch {
    return 'game repo (commit unknown)';
  }
})();

const catalog = {
  version: 1,
  generatedFrom,
  items: [
    ...itemExport(weapons, 'weapon', 'items/weapons', 'weapons'),
    ...itemExport(monsterWeapons, 'monster', 'items/weapons', 'monsterWeapons'),
    ...itemExport(armour, 'armour', 'items/armours', 'armour'),
    ...itemExport(monsterArmour, 'monster', 'items/armours', 'monsterArmour'),
    ...itemExport(shields, 'shield', 'items/shields', 'shields'),
    ...itemExport(monsterShields, 'monster', 'items/shields', 'monsterShields'),
    ...itemExport(magicItems, 'magic', 'items/magicItems', 'magicItems'),
  ],
  monsterTypes,
  interactableEffects: Object.keys(interactableEffects).sort(),
  eventNumbers: [...new Set(events.map((event) => event.number))].sort(
    (a, b) => a - b,
  ),
  enums: {
    Colour: enumMembers(Colour),
    Side: enumMembers(Side),
    SecretType: enumMembers(SecretType),
    ConditionType: enumMembers(ConditionType),
    CellAlignment: enumMembers(CellAlignment),
    LightEffect: Object.keys(LightEffect),
    // TriggerOn is a type union, not a runtime value; the values are the
    // literals accepted by the game's parser (src/types.ts, InteractableCell).
    TriggerOn: ['interact', 'step', 'both'],
  },
};

process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
