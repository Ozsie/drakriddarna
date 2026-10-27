# 01 — Architecture

The randomized campaign is a pure consumer of the existing authoring
surfaces. Nothing in `src/core/`, `src/dungeon/`, `src/game.ts` or the store
changes; the generator only emits the same data a hand-authored campaign
folder would contain.

## Integration points (all existing, unmodified)

| Concern               | Surface                                                         | Notes                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Campaign registration | `src/campaigns/index.ts`                                        | Eagerly imports `src/campaigns/*/campaign.ts`; the campaign folder is picked up with zero registration code                                                                    |
| Dungeon construction  | `defineDungeon(def, options)` in `src/dungeon/dungeonParser.ts` | Runs `assertValidDungeon` by default (`options.validate` defaults to `true`) — the generator relies on this for rejection sampling                                             |
| Layout construction   | `defineLayout(def)` in the same file                            | Converts `DeclarativeLayout` (tuple shorthands for doors, monsters, items, ...) into a `Layout` and **auto-detects corners** from the grid — the generator never emits corners |
| Dungeon chaining      | `Dungeon.nextDungeon`                                           | Consumed by `src/dungeon/BetweenDungeonsLogic.ts` when a scenario is beaten; the generator builds the whole 10-dungeon chain up front                                          |
| Gameplay randomness   | Seedable rng in `src/core/dice.ts`                              | Read its API before writing the rig; generator code must never call `Math.random()`                                                                                            |
| Custom monsters       | `registerMonsterTemplate` in `src/monsters/MonsterRegistry.ts`  | Campaigns may register new monster stat templates from their own folder                                                                                                        |
| Translations          | `src/campaigns/<id>/translations/{en,sv}.json`                  | Auto-discovered via `import.meta.glob` in `src/lib/translations/index.ts`; sveltekit-i18n interpolation supplies the floor number                                              |
| Balancing             | `npm run balanceAnalysis`                                       | The existing campaign balance analysis; the generated campaign must be tuned against its output                                                                                |

## Module layout

All new code lives inside the campaign folder. The existing
`src/campaigns/brogue/` folder is the target (it is currently untracked,
work-in-progress); a different folder name is acceptable as long as the
whole bundle stays self-contained.

```
src/campaigns/brogue/
  campaign.ts                  // entry point: decks, hero(s), generated chain
  monsters/templates.ts        // optional: 1-2 new mid-tier monster templates
  translations/
    en.json                    // campaign name, floor name/intro templates
    sv.json
  generator/
    rng.ts                     // deterministic rng wrappers (pick, shuffle, ...)
    config.ts                  // the depth 1-10 curve (see 03)
    layoutGenerator.ts         // grid, room blobs, doors, connectivity
    populationGenerator.ts     // monsters, items, secrets, events
    generateCampaign.ts        // assembly, chaining, retry loop
    *.test.ts                  // colocated tests, one per module
  dungeons/                    // DELETED once generation works end to end
```

## Data flow

```
app start
  └─ src/campaigns/index.ts (eager import.meta.glob)
       └─ brogue/campaign.ts module top level
            └─ generateCampaign(CAMPAIGN_SEED)
                 └─ for depth 1..10:
                      ├─ seed = hash(CAMPAIGN_SEED, depth, attempt)
                      ├─ layoutGenerator.generateLayout(seed, depth)
                      ├─ populationGenerator.populate(layout, seed, depth)
                      ├─ defineDungeon({ ...layout, winConditions, ... })
                      │    └─ assertValidDungeon → throw on invalid
                      └─ on failure: attempt += 1 and retry (bounded)
                 └─ chain dungeon N .nextDungeon = dungeon N+1
            └─ Campaign { dungeons: [dungeon1, ...] }

play
  └─ BetweenDungeonsLogic follows .nextDungeon
  └─ saves serialize the Dungeon chain exactly as for static campaigns
```

## Constraints of load-time generation

- **Pure and fast.** Top-level campaign code runs once per app start.
  Generation must be synchronous, side-effect free (no `Date.now()`, no
  `Math.random()`, no network) and complete in milliseconds for ten grids of
  at most ~26x26.
- **Never crash the app.** The retry loop is bounded (see 02). If every
  attempt fails, the generator falls back to a hardcoded known-good seed for
  that depth rather than throwing at import time.
- **No core edits as an escape hatch.** If a required behavior seems to need
  a core change, stop and re-read the existing surfaces first —
  `docs/dungeon-definition.md` documents the full `Dungeon`/`Layout`
  authoring surface. If a core change is truly unavoidable, it is a scope
  change that must be surfaced to the user, not something to slip in.
- **Dungeon shape follows the existing brogue dungeons.** Lowercase room
  letters `a`..`j` filling room cells, spaces for void, `#` walls between
  rooms, doors declared as `[Side, x, y, options?]` tuples on the
  room-to-room boundary cells.
