# 03 — Dungeons (the floors)

## Structure

The magazine's floor plans (`Våning 1`–`Våning 3`) become chained
`Dungeon`s:

```
floor1 → nextDungeon → floor2 → nextDungeon → floor3
```

Each is a standalone scenario with its own name, intro, layout,
starting positions, win conditions and score record — the existing
campaign machinery (between-dungeons level-up/trade, scenario scoring,
campaign-complete statistics) works on `nextDungeon` chains already.

## Eternal darkness (new mechanic, engine change c)

The GM information states: the castle is in eternal darkness, so the
players may not see what is in a room until they are within two
squares; only then are the room's monsters and items placed on the
board. Orcs see in the dark and can shoot regardless.

Engine mapping:

- `ambientLight: 0` on every floor of this campaign (existing field —
  the dungeon is pitch black except around light sources).
- A new **optional** `Dungeon.contentRevealRadius?: number` (here `2`):
  while set, each monster and floor item in the layout carries a
  transient `revealed` flag, flipped to true the first time any living
  hero is within `contentRevealRadius` squares (grid distance, ignoring
  walls is **not** acceptable — the flag must not reveal through
  walls: use the existing visibility/passability helpers). Unrevealed
  monsters and items are not rendered on the board and show no
  indicators/tooltips; revealed ones stay revealed for the scenario.
  Room discovery (walls/floor outlines, door discovery) behaves as
  today — darkness hides **contents**, not geometry.
- Monsters are unaffected mechanically: their AI, LOS and ranged
  attacks work exactly as today (the orcs "shoot in the dark anyway").
  The reveal flag is a hero-information/rendering rule only.
- The flag lives per scenario and is not persisted distinctly — it
  derives on load from hero positions (recompute on `loadState` by
  replaying the proximity check, or store the flag; implementation
  picks one, tests pin it, no `saveVersion` bump either way).

Spec-sync: `contentRevealRadius` is a `Dungeon` field — update
[docs/dungeon-definition.md](../dungeon-definition.md) in the same
change.

## Authoring the layouts

- **Human-authored content**: the three floor plans are source game
  content. A human transcribes each printed plan into the grid DSL
  (`grid` room letters, `doors` with their locked/trapped flags, `walls`
  as `Side` edge tuples, `corridors`, `corners`, `pits`, `pillars`,
  `secrets`, `items`, `interactables`). AI must not design or alter the
  layouts; it implements the transcription and may report validator
  errors for the human to resolve against the original.
- Edge-based walls (added to the engine for this adventure) are the
  mechanism for the original's thin wall segments between adjacent
  floor cells.
- Validate every floor with `src/dungeon/dungeonValidator.ts` rules
  (see [docs/dungeon-definition.md](../dungeon-definition.md)); a
  floor that fails validation is a transcription question, never
  something to code around silently.

## The nine numbered rooms (source: `alvkonungen.md`)

The GM information's nine numbered entries map to engine mechanics as
follows. All quoted Swedish texts are used verbatim as human-authored
translation content (sv source; AI may translate to en):

| #   | Source text (verbatim)                                                                                                                                                                     | Engine implementation                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The elf materializes "sofort äventyrarna ställer sig på en ruta framför en dörr" and pipes the read-aloud line; the trapped door bears a Dark Lord bronze face, the other door an elf face | An `onRoomDiscovered`/proximity log playing the elf's line when a hero first stands on a cell in front of a door (custom event or room effect keyed to door-adjacent cells); the trapped and plain doors carry `notes` with the relief descriptions. The door relief textures are clue text only — the engine's trapped-door mechanics apply as-is      |
| 2   | Floor inscription; locked door ahead with Dark Lord relief; locked + trapped door with the Elf King's face; left-end door with rope stub and cloud engraving                               | The inscription is a `note` in the corridor cell/room; the three doors get their locked/trapped flags per the plan and `notes` with the relief descriptions                                                                                                                                                                                             |
| 3   | The troll wears a medallion with the Elf King's face; its back reads "Säg mitt namn blott gånger tre…"; saying "Teneldor" teleports you to room 4 and reveals the secret door              | The medallion is a scenario item (04) transferred to the heroes when the troll dies (monster inventory via `createMonsterWithInventory`, handled by the shared `killMonster` path). A campaign interactable/log prompt on the medallion's **use**: saying the name (using the item) teleports the user to room 4's position and reveals the secret door |
| 4   | Tapestry of the Elf King hanging a medallion and walking through a wall; secret door behind it, discoverable **only** with the medallion from room 3                                       | `HIDDEN_DOOR` secret with a new gated-discovery condition: the door's secret can only be found by a hero carrying the medallion (item-gated search — see below), in addition to the item-use teleport from room 3                                                                                                                                       |
| 5   | A large gold-framed mirror on the pillar; script in the mirror: "Häng mig upp på gyllne krok"                                                                                              | The mirror is a carryable scenario item (04) placed at the pillar cell, with the script as its description/pickup log                                                                                                                                                                                                                                   |
| 6   | A golden hook on the wall; hanging the mirror from room 5 here reveals the secret door within the frame; the door can also be found by searching                                           | An interactable (custom effect) on the hook cell: if the activating hero carries the mirror, remove it from the inventory, place it on the hook and reveal the secret door. The door additionally carries a normal search-discoverable secret (`LETAR` = the existing Search action)                                                                    |
| 7   | Magic fountain in the room's middle: standing in it, roll all nine of the game's dice; the hits remove that many damage points                                                             | Interactable with a custom campaign effect (`triggerOn: 'step'` or interact): roll 9 dice at the hero's level via the seeded rng (`roll(level, 9)`), heal that many health points, capped at `maxHealth`; log with campaign keys                                                                                                                        |
| 8   | Stairs leading up; spending one movement point puts you on the stair symbol of the next floor                                                                                              | The built-in `'nextDungeon'` interactable effect on the stair cell (`triggerOn: 'step'`): consuming the step's movement point is the existing movement behaviour; verify the movement-point semantics in review, do not add new cost machinery                                                                                                          |
| 9   | At the top of the tower stands the possessed Elf King — see 05                                                                                                                             | `createMonster` for the boss at the tower-top cell (05)                                                                                                                                                                                                                                                                                                 |

### Item-gated secret discovery (room 4)

The engine's search/secret discovery does not currently support
"only findable if carrying item X". Minimal mechanism: an optional
`Secret.requiredItemId` (or a campaign-registered check) that
`searchForSecret` respects — a hero without the medallion simply does
not find this secret, with no spoiler log. If implementation finds a
cleaner existing hook (e.g. an interactable that reveals the secret on
interaction while carrying the item, mirroring the e1m4 necklace-stair
case), prefer it and record the choice here; the room-6 mirror case
shows the interactable route is already available. Any new
`Secret`/`WinCondition` field triggers a
[docs/dungeon-definition.md](../dungeon-definition.md) sync.

## Win conditions

- Floors 1–2: `REACH_CELL` on the stair cell (room 8) — the stairs are
  the exit — or the `'nextDungeon'` interactable completing the
  dungeon; use whichever composes with the interactable (see the
  built-in `'nextDungeon'` behaviour), per the original plans.
- Floor 3: `ConditionType.KILL_ALL_OF_TYPE` targeting the boss's
  monster type (05). "När mörkerherren är död är uppdraget slut och
  alvkonungen befriad."

If the original plans require a condition the engine cannot express,
stop and surface it (a new `ConditionType` would be an engine change
plus a `docs/dungeon-definition.md` sync — do not slip it in).

## Events per floor

The magazine text does not define floor-specific event cards; the
global event deck applies. If the human wants floor-specific special
occurrences (e.g. the elf appearance as a recurring event), define
them campaign-locally (`events/customEvents.ts` +
`registerEventEffect`, `Campaign.eventDeck`) with unique `number`s and
per-floor `Dungeon.events` filters.

## Content inputs (human)

| Input                                                                                                               | Used by                               |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| The three floor plan transcriptions (rooms, doors, locked/trapped flags, stairs positions, monster/item placements) | `dungeons/floor{1,2,3}.ts` grids      |
| Floor names, intro texts (sv, human-authored)                                                                       | `Dungeon.name` / `intro` translations |
| Monster placement per floor (types, positions, inventories)                                                         | layout `monsters`                     |
| Where each numbered room sits on which floor (the GM numbers 1–9 vs the three plans)                                | room mapping above                    |
