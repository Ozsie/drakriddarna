# Game Masters

This directory contains all playable Game Masters. Each Game Master defines a distinct
director personality, difficulty modifiers, starting equipment adjustments, event rules,
and monster AI behavior modifiers.

Game Masters are automatically discovered and registered by `src/gameMasters/index.ts`
via `import.meta.glob` — no core code needs to be modified to add a new Game Master.
Translations under `src/gameMasters/*/translations/{en,sv}.json` are also automatically
discovered and loaded into the `content` translation namespace.

## Directory Layout

Each Game Master lives in its own folder, named after its `id`:

```
src/gameMasters/
  index.ts                     // auto-discovery registry & fallback resolver
  README.md                    // this file
  storyTeller/                 // Built-in Easy Game Master
    gameMaster.ts              // entry point (default export of type GameMaster)
    translations/
      en.json
      sv.json
  tactician/                   // Built-in Normal/Medium Game Master (Default)
    gameMaster.ts
    translations/
      en.json
      sv.json
  brutalOverlord/              // Built-in Hard Game Master
    gameMaster.ts
    translations/
      en.json
      sv.json
  myCustomGameMaster/          // Custom Game Master example
    gameMaster.ts
    translations/
      en.json
      sv.json
```

## Built-in Game Masters

Drakriddarna ships with three built-in Game Masters representing classic difficulty tiers:

1. **Story Teller** (`storyTeller` / *Easy*):
   - Hero stat buffs (+1 Attack, +1 Movement, +2 Search).
   - Starts all heroes with an extra **Small Shield**.
   - 25% chance for archer monsters to forget their bows.
   - Forgiving spawn buffers (min distance 4 tiles, delayed until round 4).
   - Generous AI Director: switches to `EASE` mode when party HP < 50% or any hero is dead.
2. **Tactician** (`tactician` / *Normal / Default*):
   - Baseline tabletop balance (0 stat modifiers, standard sword starting equipment).
   - 15% forgotten bow chance, spawn distance 3 tiles, round 3 threshold.
   - Balanced AI Director: switches to `EASE` when party HP < 45% or any hero is dead; `PUSH` when party HP > 80% with <= 1 monster remaining.
3. **Brutal Overlord** (`brutalOverlord` / *Hard*):
   - Hero stat penalties (-1 Max HP, -1 Movement).
   - 0% forgotten bow chance (flawless archer discipline), aggressive spawn buffer (1 tile, starting round 2).
   - Relentless AI Director: rarely eases off (only when hero dead AND party HP < 25%), pushes aggressively (`PUSH` when party HP > 65% or <= 2 monsters).
   - Aggressive monster behaviors receive a +25% weight bonus (`baseWeight * 1.25`).

---

## Creating a New Game Master

1. **Create the folder**: `src/gameMasters/myCustomGameMaster/`.
2. **Create translations**: `translations/en.json` and `translations/sv.json` under the `gameMaster.<id>` namespace.
3. **Create `gameMaster.ts`** with a default export implementing `GameMaster`.

### Step 1: Translations

Translations are merged into the `content` translation dictionary. Structure your JSON files as follows:

`translations/en.json`:
```json
{
  "gameMaster": {
    "myCustomGameMaster": {
      "name": "The Chaos Weaver",
      "description": "An unpredictable master of fortune who alters event decks and challenges the party with erratic monster pacing."
    }
  }
}
```

`translations/sv.json`:
```json
{
  "gameMaster": {
    "myCustomGameMaster": {
      "name": "Kaosvävaren",
      "description": "En oförutsägbar mästare av ödet som förändrar händelsekorten och utmanar sällskapet med oberäkneligt monstertempo."
    }
  }
}
```

### Step 2: Implementation (`gameMaster.ts`)

```typescript
import type { GameMaster } from '../../types';
import { shields } from '../../items/shields';
import { weapons } from '../../items/weapons';
import type {
  BehaviorContext,
  DirectorState,
  MonsterBehavior,
} from '../../monsters/behavior';

export const myCustomGameMaster: GameMaster = {
  id: 'myCustomGameMaster',
  nameTranslationKey: 'content.gameMaster.myCustomGameMaster.name',
  descriptionTranslationKey: 'content.gameMaster.myCustomGameMaster.description',

  // Persistent Custom State Factory
  initialState: () => ({
    tensionMeter: 0,
    hazardsSpawned: 0,
  }),

  // 1. Hero Stat Modifiers
  modifiers: {
    attack: 0,
    defense: 0,
    movement: 0,
    search: 1,
    health: 0,
  },

  // 2. Starting Equipment (Applied to party and newly recruited allies)
  startingEquipment: {
    weapon: weapons[0], // Standard Sword
    shield: shields[1], // Small Shield (optional)
    inventory: [],
  },

  // 3. Monster Behavior & AI Director Hooks
  monsterBehavior: {
    bowForgottenChance: 0.15,

    // Dynamic AI Director Pacing ('EASE' | 'NEUTRAL' | 'PUSH')
    getDirectorState: ({
      hasDeadHero,
      partyHpPercentage,
      aliveMonsterCount,
    }: {
      hasDeadHero: boolean;
      partyHpPercentage: number;
      aliveMonsterCount: number;
    }): DirectorState => {
      if (hasDeadHero || partyHpPercentage < 0.45) return 'EASE';
      if (partyHpPercentage > 0.8 && aliveMonsterCount <= 1) return 'PUSH';
      return 'NEUTRAL';
    },

    // Behavior Weight Multipliers / Overrides
    calculateBehaviorWeight: (
      behavior: MonsterBehavior,
      context: BehaviorContext,
      baseWeight: number,
    ): number => {
      // Example: Boost defensive/fleeing behaviors when heroes are strong
      if (behavior.tags.includes('defensive') && context.partyHpPercentage > 0.75) {
        return baseWeight * 1.5;
      }
      return baseWeight;
    },
  },

  // 4. Turn Events & Spawn Safeguards
  events: {
    minMonsterSpawnDistance: 3,
    earliestMonsterRound: 3,
    skipHungryTrollBelowHalfHealth: true,

    // Optional deck manipulation hook at game startup
    modifyEventDeck: (deck, state) => {
      // Example: filter out specific event IDs or reorder deck
      return deck;
    },

    // Optional hook executed whenever an event card is drawn
    onEventDrawn: (event, state) => {
      // Return null to cancel/skip the event, or return modified event
      return event;
    },
  },

  // 5. Lifecycle & Turn Flow Callbacks
  onGameInit: (state) => {
    // Called once when scenario or campaign initializes
  },
  onRoundStart: (round, state) => {
    // Called at the start of each new round
  },
  onHeroTurnStart: (hero, state) => {
    // Called at the start of an individual hero's turn
  },
  onHeroPhaseEnd: (state) => {
    // Called after all heroes finish turns, before monsters act
  },
  onMonsterPhaseEnd: (state) => {
    // Called after all monsters have acted
  },
  onPartyDefeat: (state) => {
    // Called when the party is wiped out or level is reset
  },
  onDungeonComplete: (state) => {
    // Called when all win conditions are met
  },

  // 6. Search & Combat Rule Overrides
  modifySearchRoll: (baseRoll, hero, state) => baseRoll,
  onSearchFailed: (hero, state) => {
    // Trigger wandering monster or dungeon trap on failed search
  },
  modifyHeroDamageDealt: (damage, attacker, defender, state) => damage,
  modifyMonsterDamageDealt: (damage, attacker, defender, state) => damage,
  onHeroDowned: (hero, state) => {
    // Trigger special penalty or narrative event when hero falls
  },
};

export default myCustomGameMaster;
```

---

## Configuration Reference

### 1. `modifiers`
Stat modifiers applied to all heroes:
- `attack` (`number`): Bonus attack dice added to attack rolls.
- `defense` (`number`): Bonus defense dice added to defense rolls.
- `movement` (`number`): Additional tiles heroes can move per action (default base is 3).
- `search` (`number`): Bonus added to D6 search rolls (searching succeeds on roll >= 5).
- `health` (`number`): Modifier to max HP (default base is 7).

### 2. `startingEquipment` (optional)
Equipment granted to each hero at the beginning of a campaign and to allies recruited through `addHero` interactables:
- `weapon` (`Weapon`): Starting main weapon (e.g. `weapons[0]`).
- `shield` (`Shield`): Starting shield (e.g. `shields[1]`).
- `armour` (`Armour`): Starting body armour.
- `inventory` (`Item[]`): Additional items in the hero's backpack.

### 3. `monsterBehavior` (optional)
Controls monster AI discipline, director pacing, and dynamic action weights:
- `bowForgottenChance` (`number`, 0–1): Chance each turn that an archer monster forgets to use its bow and advances in melee.
- `getDirectorState(context)`: Evaluates dynamic AI pacing:
  - `hasDeadHero` (`boolean`): Whether at least one party hero is dead.
  - `partyHpPercentage` (`number`, 0–1): Combined current HP of live heroes divided by combined max HP.
  - `aliveMonsterCount` (`number`): Number of living monsters currently on the dungeon board.
  - Returns `'EASE'` (backs off, favors defensive/cautious monster actions), `'NEUTRAL'` (standard balance), or `'PUSH'` (presses advantage, favors aggressive/flanking actions).
- `calculateBehaviorWeight(behavior, context, baseWeight)`: Hook called during monster AI decision scoring to modify behavior weight.

### 4. `events` (optional)
Controls how turn events spawn monsters and manipulate the event deck:
- `minMonsterSpawnDistance` (`number`): Minimum tile distance from living heroes where event-spawned monsters can appear.
- `earliestMonsterRound` (`number`): Monster-spawning events are skipped during early rounds prior to this round number.
- `skipHungryTrollBelowHalfHealth` (`boolean`): If `true`, the `The Hungry Troll` event is skipped if the party's total HP is under 50%.
- `modifyEventDeck(deck, state)`: Intercepts and transforms the full `TurnEvent[]` deck at initialization.
- `onEventDrawn(event, state)`: Intercepts an event before resolution; return `null` to discard and skip, or return a modified `TurnEvent`.

### 5. `initialState` & Custom State Management (optional)
- `initialState()`: Factory function returning initial state for this GM.
- The returned object is stored on `state.gameMasterState` on `GameState` and persisted across actions and save files.

### 6. Lifecycle & Turn Flow Callbacks (optional)
- `onGameInit(state)`: Called when the game/scenario initializes in `init()`.
- `onRoundStart(round, state)`: Called when a new round begins and `turnCount` increments.
- `onHeroTurnStart(hero, state)`: Called at the beginning of each hero's turn.
- `onHeroPhaseEnd(state)`: Called after all hero turns complete, immediately prior to `monsterActions()`.
- `onMonsterPhaseEnd(state)`: Called immediately after `monsterActions()` completes.
- `onPartyDefeat(state)`: Called when all heroes fall or when `resetLevel()` is triggered.
- `onDungeonComplete(state)`: Called when all dungeon win conditions are fulfilled.

### 7. Search & Combat Rule Hooks (optional)
- `modifySearchRoll(baseRoll, hero, state)`: Intercepts and alters the final D6 roll result during `searchForSecret`.
- `onSearchFailed(hero, state)`: Triggered when a search roll yields no discoveries (allows spawning wandering hazards, traps, or ambush monsters).
- `modifyHeroDamageDealt(damage, attacker, defender, state)`: Alters damage inflicted by a hero attacking a monster before applying damage.
- `modifyMonsterDamageDealt(damage, attacker, defender, state)`: Alters damage inflicted by a monster attacking a hero before applying damage.
- `onHeroDowned(hero, state)`: Triggered immediately when a hero's health is reduced to 0.

---

## Selection & Backwards Compatibility

Game Masters are selected when starting a game (`init(campaignId, heroes, gameMasterId)`).
For compatibility with legacy save files and difficulty settings:
- `'easy'` resolves to `'storyTeller'`
- `'normal'` / `'medium'` resolves to `'tactician'`
- `'hard'` resolves to `'brutalOverlord'`

To access registered Game Masters in code:
```typescript
import { gameMasters, getGameMaster } from 'src/gameMasters';

// List all registered Game Masters
const allGMs = Object.values(gameMasters);

// Resolve by id (with fallback to default tactician)
const gm = getGameMaster('myCustomGameMaster');
```
