# 09 — Game Master Editor (Design)

> **Status: design for phase 2.** The campaign editor (milestones M1–M7, 08) comes first; this doc spec'ed the GM feature so it can be scheduled
> without re-opening the architecture. It reuses the M1–M4 infrastructure
> (project file protocol, catalog, marker protection, generation panel) and
> adds no new architectural concepts.

## What a Game Master is

A GM (`GameMaster` in `src/types.ts`) is a director personality: hero stat
modifiers, starting equipment, monster spawn pacing, AI director rules, and
optional gameplay hooks. GMs live in `src/gameMasters/<id>/gameMaster.ts`
with `translations/{en,sv}.json`, auto-discovered by
`src/gameMasters/index.ts` via `import.meta.glob` — same discovery pattern as
campaigns. Translations merge into the **`content`** namespace under
`gameMaster.<id>.*` (unlike campaigns, which use the `campaign` namespace).

## Data vs. code split

The `GameMaster` type mixes plain data with behaviour functions. The editor
splits it into three tiers:

| Tier                                                | Fields                                                                                                                                                                                                                                                                                                                                                       | Editor support                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Declarative** (fully edited)                      | `id`, `nameTranslationKey`, `descriptionTranslationKey`, `modifiers` (attack/defense/movement/search/health), `startingEquipment` (weapon/shield/armour + inventory), `events.minMonsterSpawnDistance`, `events.earliestMonsterRound`, `events.skipHungryTrollBelowHalfHealth`, `monsterBehavior.bowForgottenChance`, `initialState` (arbitrary JSON object) | Form UI, validated                                |
| **Modelled behaviour** (declarative DSL, see below) | `monsterBehavior.getDirectorState` (director pacing), `monsterBehavior.calculateBehaviorWeight` (tag weight multipliers)                                                                                                                                                                                                                                     | Rule editor UI                                    |
| **Raw code** (escape hatch only)                    | `GameMasterRules` (modifySearchRoll, onSearchFailed, damage modifiers, onHeroDowned), `EventDifficulty.modifyEventDeck`, `EventDifficulty.onEventDrawn`, all `GameMasterLifecycleHooks`                                                                                                                                                                      | Monospace text areas; stored and emitted verbatim |

The split is empirical: the three built-in GMs (`storyTeller`, `tactician`,
`brutalOverlord`) use only the declarative + modelled tiers — a GM built
entirely in the editor can reproduce any of them exactly. The raw tier
exists so power authors aren't blocked, with the explicit trade-off that raw
snippets are not validated by the editor.

## Domain model

```kotlin
@Serializable
data class GameMasterDoc(
    val id: String,
    val modifiers: GmModifiers,          // 5 ints, default 0
    val monsterBehavior: GmMonsterBehavior,
    val events: GmEvents,
    val startingEquipment: GmStartingEquipment,
    val initialState: JsonObject? = null,  // emitted as () => ({ ...json })
    val behaviorTagWeights: Map<String, Double> = emptyMap(),
    val customCode: Map<String, String> = emptyMap(),  // escape hatch, keyed by hook name
)

@Serializable
data class GmModifiers(val attack: Int, val defense: Int, val movement: Int,
                       val search: Int, val health: Int)

@Serializable
data class GmMonsterBehavior(
    val bowForgottenChance: Double = 0.15,
    val directorPolicy: DirectorPolicy,
)

@Serializable
data class GmEvents(
    val minMonsterSpawnDistance: Int = 3,
    val earliestMonsterRound: Int = 3,
    val skipHungryTrollBelowHalfHealth: Boolean = true,
)

@Serializable
data class GmStartingEquipment(
    val weapon: CatalogRef? = null,
    val shield: CatalogRef? = null,
    val armour: CatalogRef? = null,
    val inventory: List<CatalogRef> = emptyList(),
)
```

### Director policy DSL

`getDirectorState` maps a per-turn context
(`hasDeadHero`, `partyHpPercentage` 0..1, `aliveMonsterCount`) to a pacing
state `EASE | PUSH | NEUTRAL` (`src/monsters/behavior/types.ts`). All three
built-ins express it as ordered threshold rules, so the editor models it as
exactly that:

```kotlin
@Serializable
data class DirectorPolicy(
    val rules: List<DirectorRule>,        // evaluated in order, first match wins
    val fallback: DirectorState = NEUTRAL,
)

@Serializable
data class DirectorRule(
    val match: MatchMode,                 // ALL (and) | ANY (or)
    val hasDeadHero: Boolean? = null,     // required value; null = ignore
    val partyHpBelow: Double? = null,     // partyHpPercentage < value
    val partyHpAbove: Double? = null,     // partyHpPercentage > value
    val monstersAtMost: Int? = null,      // aliveMonsterCount <= value
    val result: DirectorState,
)

enum class DirectorState { EASE, PUSH, NEUTRAL }
enum class MatchMode { ALL, ANY }
```

Coverage check against the built-ins:

- storyTeller: `ANY(hasDeadHero=true, partyHpBelow=0.45) -> EASE`;
  `ALL(partyHpAbove=0.85, monstersAtMost=1) -> PUSH`
- tactician: `ANY(hasDeadHero=true, partyHpBelow=0.45) -> EASE`;
  `ALL(partyHpAbove=0.8, monstersAtMost=1) -> PUSH`
- brutalOverlord: `ALL(hasDeadHero=true, partyHpBelow=0.25) -> EASE`;
  `ANY(partyHpAbove=0.65, monstersAtMost=2) -> PUSH`

`calculateBehaviorWeight` reduces to `behaviorTagWeights` (brutalOverlord:
`{"aggressive": 1.1}`), since the only existing use is a per-tag multiplier.
GMs needing anything else use the escape hatch.

### Escape hatch (`customCode`)

- Keys are the exact `GameMaster` property names: `onRoundStart`,
  `modifySearchRoll`, `modifyEventDeck`, etc.
- Values are raw TS **expressions** (typically arrow functions) pasted into
  monospace text areas with a per-field hint of the expected signature.
- The generator emits them verbatim: `onRoundStart: <snippet>,`. It performs
  only brace/paren balance and non-empty checks; type errors surface when
  the game repo runs `npm run check` (the generation panel's optional game
  check command, 06, becomes genuinely useful here — promote it to
  recommended for GM generation).
- Snippets are stored in the project file; the UI labels the section
  "Advanced (raw TypeScript)".

## Project file and code generation

### File layout

```
src/gameMasters/<id>/
  gameMaster.editor.json    <- editor source of truth (same protocol as 03)
  gameMaster.ts             <- generated
  translations/en.json      <- generated (merged, see below)
  translations/sv.json      <- generated
```

Same rules as 03: `formatVersion`, atomic save, `// GENERATED FILE` marker,
refusal to overwrite non-marker files, stale-file reporting. The app's
Open/New commands learn a second document kind (`campaign` | `gameMaster`);
the EditorStore generalizes to a `sealed class ProjectDoc` wrapper or an
equivalent minimal discriminator — whichever touches the M1–M5 code least.

### `gameMaster.ts` template

```ts
// GENERATED FILE - DO NOT EDIT. Source: gameMaster.editor.json (Drakriddarna Campaign Editor).
import type { GameMaster } from '../../types';
import { weapons } from '../../items/weapons';
import type { DirectorState } from '../../monsters/behavior';

export const myMaster: GameMaster = {
  id: 'myMaster',
  nameTranslationKey: 'content.gameMaster.myMaster.name',
  descriptionTranslationKey: 'content.gameMaster.myMaster.description',
  modifiers: { attack: 0, defense: 0, movement: 0, search: 2, health: 1 },
  monsterBehavior: {
    bowForgottenChance: 0.2,
    getDirectorState: ({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    }): DirectorState => {
      if (hasDeadHero || partyHpPercentage < 0.45) {
        return 'EASE';
      }
      if (partyHpPercentage > 0.8 && aliveMonsterCount <= 1) {
        return 'PUSH';
      }
      return 'NEUTRAL';
    },
    calculateBehaviorWeight: (behavior, _context, baseWeight) => {
      if (behavior.tags.includes('aggressive')) {
        return baseWeight * 1.1;
      }
      return baseWeight;
    },
  },
  events: {
    minMonsterSpawnDistance: 3,
    earliestMonsterRound: 4,
    skipHungryTrollBelowHalfHealth: true,
  },
  startingEquipment: { weapon: weapons[0], inventory: [] },
};

export default myMaster;
```

Generator rules:

- Variable name = `id` verbatim (matches built-ins); requires a valid
  identifier (validation, below).
- Director rules emit one `if` per rule, in order: conditions joined by
  `&&` (ALL) or `||` (ANY), falling back to `return 'NEUTRAL';` (or the
  configured fallback). Rules with a single condition still emit an `if`.
  `hasDeadHero: true` -> `hasDeadHero`, `false` -> `!hasDeadHero`.
- Omit `calculateBehaviorWeight` when `behaviorTagWeights` is empty; emit
  one tag-`if` per entry (sorted by tag).
- `initialState` emits as `initialState: () => (<object literal from JSON>),`
  with keys in the JSON's stored order.
- Omit empty `customCode` entries; emit remaining ones verbatim, in the
  field order of the `GameMaster` type.
- Omit null starting-equipment fields; emit `inventory: []` when empty
  (matches built-in style).
- Style, determinism, golden-file testing: identical rules as 04
  (prettier-compatible, byte-identical for equal input).

### Translations

GM translations live under the `content` namespace, which is **shared
across all GMs**: every GM's `translations/en.json` has the root key
`gameMaster` containing only its own `<id>` subtree. The generator merges
marker-protected: it writes only `gameMaster.<id>.*` keys and must never
remove or rewrite another GM's keys in a shared file it did not create.
Keys: `content.gameMaster.<id>.name` and `.description` (the only two the
built-ins use; v1 needs no other keys).

## UI

A single-window form editor (no canvas). Sections in a vertical scroll,
validation panel at the bottom, Save/Generate in the shared header:

1. **Identity** — id (disabled after first generation), name and
   description texts for each language (writes the two translation keys).
2. **Hero modifiers** — five steppers (-2..+2) with plain-language labels
   ("Attack +1 means heroes hit more often"). Show a live summary card:
   "Easy / Normal / Hard"-style gauge derived from the settings (heuristic
   shown as guidance only, not stored).
3. **Monster behaviour** — bow-forgotten-chance slider (0..1, shown as %),
   director policy as an ordered rule list (add/remove/reorder; per rule:
   match mode toggle, condition chips with value inputs, result dropdown),
   fallback dropdown, and a tag-weight table.
   Include a **simulation strip**: for sample contexts (healthy party,
   wounded party, dead hero, few monsters left) show which rule fires and
   the resulting state — cheap to compute in-process, catches ordering bugs
   immediately.
4. **Events** — three fields (spawn distance, earliest round, skip-hungry-
   troll checkbox).
5. **Starting equipment** — pickers over the catalog (weapon/shield/armour)
   plus an inventory list of item refs.
6. **Advanced (raw TypeScript)** — collapsible; escape-hatch text areas.

## Validation

| Rule                                                                                                     | Severity |
| -------------------------------------------------------------------------------------------------------- | -------- |
| `id` matches `^[a-zA-Z][a-zA-Z0-9]*$` (identifier, needed for the exported variable)                     | Blocking |
| Duplicate GM id (another `src/gameMasters/<id>/` exists)                                                 | Blocking |
| Modifier outside -2..+2                                                                                  | Warning  |
| `bowForgottenChance` outside 0..1; `partyHpAbove`/`partyHpBelow` outside 0..1; `monstersAtMost` negative | Blocking |
| `partyHpAbove` and `partyHpBelow` both set in one rule and inconsistent (above <= below)                 | Warning  |
| Unreachable director rule (fully shadowed by an earlier rule)                                            | Warning  |
| Director rule with no conditions set                                                                     | Blocking |
| Catalog refs unresolvable                                                                                | Blocking |
| Raw snippet fails brace-balance check or contains `import`                                               | Blocking |
| Name/description missing in any language                                                                 | Blocking |

Blocking rules gate generation; findings reuse the 07 finding codes
(`gm.id`, `gm.director.unreachable`, ...) and the shared panel/canvas-free
presentation.

## Testing

- Golden files: fixtures reproducing `tactician` and `brutalOverlord` from
  pure editor data must generate byte-identical logic to the built-ins
  (formatting of the function bodies may differ slightly from the
  hand-written originals — the test targets semantic equivalence: same
  imports, same emitted conditions; assert on normalized whitespace).
- DSL tests: rule evaluation (ALL/ANY, first-match-wins, fallback) tested
  in `core` against the three built-in GMs' pacing decisions over a grid
  of contexts (e.g. partyHp in 0.1 steps x dead-hero x monster counts).
- Generator tests: omit-empty rules, customCode passthrough, translation
  merge preserving a foreign GM's keys in a shared file.
