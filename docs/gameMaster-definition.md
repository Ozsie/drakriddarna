# Game Master definitions

This document is the reference for the `GameMaster` type — the game's name
for a difficulty director, in the spirit of Left 4 Dead's AI Director: a
data-plus-hooks object that modifies hero stats, starting equipment, monster
AI weights and discipline, event deck composition and pacing. For hands-on
instructions (folder setup, translations, a full annotated example), see
[src/gameMasters/README.md](../src/gameMasters/README.md).

## Discovery, resolution and persistence

Game Masters live in self-contained folders under `src/gameMasters/<id>/`,
each with a `gameMaster.ts` entry point that default-exports a `GameMaster`.
They are auto-discovered by `src/gameMasters/index.ts` via Vite's
`import.meta.glob('./*/gameMaster.ts')` and indexed by their `id` — creating
the folder is enough, no core-code changes or registration list.

Resolution via `getGameMaster(idOrAlias)` (`src/gameMasters/index.ts`):

1. Legacy/difficulty-word aliases are mapped first
   (`GAME_MASTER_ALIASES`: `'easy'` → `'storyTeller'`, `'normal'`/`'medium'`
   → `'tactician'`, `'hard'` → `'brutalOverlord'`, plus spelling variants).
2. The id is looked up in the registry.
3. An unknown id falls back to the default, `'tactician'`
   (`DEFAULT_GAME_MASTER_ID`).

The selected Game Master is stored on `state.gameMaster` and chosen when
starting a game (`init(campaignId, heroes, gameMasterId)` in
`src/game.ts`); its `initialState()` result is stored on
`state.gameMasterState` and persisted with the save. Three ship with the
game: `storyTeller` (easy), `tactician` (normal, default) and
`brutalOverlord` (hard) — see their folders and the README for their tuned
values.

## The `GameMaster` type

Defined in `src/types.ts`. Everything except identity and `modifiers` is
optional hooks — a minimal Game Master is an `id`, translation keys and
zero modifiers (that is essentially what `tactician` is).

| Field                       | Type                             | Description                                                                                                                                                          |
| :-------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | `string` (required)              | Unique identifier; matches the folder name and is the registry key and save-reference.                                                                               |
| `nameTranslationKey`        | `string` (required)              | Translation key of the display name (defined in the GM's own `translations/{en,sv}.json`, merged into the `content` namespace, e.g. `content.gameMaster.<id>.name`). |
| `descriptionTranslationKey` | `string`                         | Translation key of the description shown in the selection UI.                                                                                                        |
| `modifiers`                 | `GameMasterModifiers` (required) | Flat hero stat modifiers — see below.                                                                                                                                |
| `startingEquipment`         | `StartingEquipment`              | Weapon/shield/armour/inventory granted to each hero at campaign start and to allies recruited via the `addHero` interactable.                                        |
| `monsterBehavior`           | `MonsterBehaviorDifficulty`      | Monster AI discipline and director pacing — see below.                                                                                                               |
| `events`                    | `EventDifficulty`                | Event deck manipulation and monster-spawn safeguards — see below.                                                                                                    |
| `initialState`              | `() => TState`                   | Factory for the GM's custom persistent state, stored on `state.gameMasterState` and saved with the game.                                                             |

### `modifiers` — hero stat modifiers

All five fields are required numbers, usually `0`. They are read through
`getDifficulty(state)` (`src/core/DifficultLevels.ts`):

| Field      | Applied as                                                                                                                 |
| :--------- | :------------------------------------------------------------------------------------------------------------------------- |
| `attack`   | Extra attack dice on hero attack rolls (combat and item effects, `src/items/ItemLogic.ts`).                                |
| `defense`  | Extra defense dice on hero defense rolls.                                                                                  |
| `movement` | Extra movement points per move action (also consumed as extra action cost where rules demand it, `src/hero/HeroLogic.ts`). |
| `search`   | Bonus added to the D6 search roll (searching succeeds on roll ≥ 5, `src/secrets/SecretsLogic.ts`).                         |
| `health`   | Modifier to hero max HP (base 7, `src/hero/HeroLogic.ts`); also read by monster AI when estimating party strength.         |

### `monsterBehavior` — AI discipline and director pacing

| Field                                                                     | Description                                                                                                                                                                                                                                                                                 |
| :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bowForgottenChance`                                                      | 0–1 chance per turn that an archer monster forgets its bow and advances in melee.                                                                                                                                                                                                           |
| `getDirectorState({ hasDeadHero, partyHpPercentage, aliveMonsterCount })` | Pure pacing selector returning `'EASE'`, `'NEUTRAL'` or `'PUSH'`. `partyHpPercentage` is the live heroes' combined HP over combined max HP. The state shifts monster behavior weights (defensive actions on `EASE`, aggressive/flanking on `PUSH`) — rubber-banding, not a flat multiplier. |
| `calculateBehaviorWeight(behavior, context, baseWeight)`                  | Hook during monster AI decision scoring; scales the base weight of a candidate behavior based on the `BehaviorContext` (e.g. boost defensive behaviors when the party is strong).                                                                                                           |

Consumed by the monster AI in `src/monsters/` (`MonsterLogic.ts`,
`behavior/modifiers.ts`, `behavior/definitions/*`). Director states are
per-monster and shift each monster's behavior-weight sets.

### `events` — turn events and spawn safeguards

| Field                            | Description                                                                                              |
| :------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `minMonsterSpawnDistance`        | Minimum tile distance from living heroes where event-spawned monsters may appear.                        |
| `earliestMonsterRound`           | Monster-spawning events are skipped before this round number.                                            |
| `skipHungryTrollBelowHalfHealth` | When `true`, skip "The Hungry Troll" if the party's total HP is below 50%.                               |
| `modifyEventDeck(deck, state)`   | Transform the full `TurnEvent[]` deck at initialization (filter, reorder, add). Return the new deck.     |
| `onEventDrawn(event, state)`     | Intercept an event before resolution; return `null` to discard and skip it, or a (modified) `TurnEvent`. |

Consumed in `src/events/EventsLogic.ts`.

### Lifecycle hooks and rule overrides

Two hook groups exist, and the rule hooks can be written **top-level or
nested under a `rules` key** — both are consumed (`gm.rules?.x ?? gm.x` in
`src/core/combat.ts` and `src/secrets/SecretsLogic.ts`); the nested form
wins when both are set. Prefer one form consistently.

Lifecycle (`GameMasterLifecycleHooks`), all optional, invoked from the
turn flow in `src/game.ts`:

| Hook                           | Called when                                    |
| :----------------------------- | :--------------------------------------------- |
| `onGameInit(state)`            | The game/scenario initializes in `init()`.     |
| `onRoundStart(round, state)`   | A new round begins and `turnCount` increments. |
| `onHeroTurnStart(hero, state)` | An individual hero's turn starts.              |
| `onHeroPhaseEnd(state)`        | All hero turns complete, before monsters act.  |
| `onMonsterPhaseEnd(state)`     | After `monsterActions()` completes.            |
| `onPartyDefeat(state)`         | All heroes fall, or `resetLevel()` triggers.   |
| `onDungeonComplete(state)`     | All dungeon win conditions are fulfilled.      |

Search & combat rules (`GameMasterRules`), all optional:

| Hook                                                          | Called from                   | Effect                                                                |
| :------------------------------------------------------------ | :---------------------------- | :-------------------------------------------------------------------- |
| `modifySearchRoll(baseRoll, hero, state)`                     | `src/secrets/SecretsLogic.ts` | Alters the final D6 search roll.                                      |
| `onSearchFailed(hero, state)`                                 | `src/secrets/SecretsLogic.ts` | A search roll yields no discovery — spawn hazards, traps or ambushes. |
| `modifyHeroDamageDealt(damage, attacker, defender, state)`    | `src/core/combat.ts`          | Alters hero→monster damage before applying it.                        |
| `modifyMonsterDamageDealt(damage, attacker, defender, state)` | `src/core/combat.ts`          | Alters monster→hero damage before applying it.                        |
| `onHeroDowned(hero, state)`                                   | `src/core/combat.ts`          | A hero's health is reduced to 0.                                      |

Return values matter for the `modify*` hooks: return the (possibly
changed) input, not `undefined`, when you do not intend to cancel it.

## Minimal example

```ts
import type { GameMaster } from '../../types';

export const myCustomGameMaster: GameMaster = {
  id: 'myCustomGameMaster',
  nameTranslationKey: 'content.gameMaster.myCustomGameMaster.name',
  descriptionTranslationKey:
    'content.gameMaster.myCustomGameMaster.description',
  modifiers: { attack: 0, defense: 0, movement: 0, search: 1, health: 0 },
  monsterBehavior: {
    bowForgottenChance: 0.15,
    getDirectorState: ({ hasDeadHero, partyHpPercentage }) =>
      hasDeadHero || partyHpPercentage < 0.45
        ? 'EASE'
        : partyHpPercentage > 0.8
        ? 'PUSH'
        : 'NEUTRAL',
  },
};

export default myCustomGameMaster;
```

Translation files and the full annotated example are in
[src/gameMasters/README.md](../src/gameMasters/README.md).
