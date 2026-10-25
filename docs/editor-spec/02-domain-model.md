# 02 — Domain Model

The editor's domain model mirrors the game's **declarative** authoring layer
(`src/dungeon/dungeonParser.ts`), not the runtime `Layout` type. The generator
emits calls to `defineDungeon(...)` / `defineLayout(...)` (see 04), so the
model below is the data the editor owns.

> Authoritative sources (spec quotes can go stale): types in `src/types.ts`,
> declarative input types + parsers in `src/dungeon/dungeonParser.ts`,
> validators in `src/dungeon/dungeonValidator.ts`. Reference campaign:
> `src/campaigns/iceDragonTreasure/`.

## Grid semantics

A dungeon layout is a rectangular ASCII grid (`List<String>`, all rows the
same length — pad shorter rows with spaces on load, keep them rectangular on
resize):

| Char | Meaning |
|---|---|
| `#` | Wall |
| ` ` (space) | Void — outside the dungeon; nothing may be placed here |
| `?` | Collapsed corridor cell (see `collapsedCorridor`) |
| `A`–`Z` | A cell belonging to the room or corridor identified by that letter |

`#` walls occupy a full grid cell. For rooms that are not separated by a
whole cell of rock, the layout also carries **edge walls** (`walls`) — thin
walls that sit on the boundary between two adjacent floor cells, defined as
a cell plus a side, exactly like doors. They block movement, line of sight,
search and light like a closed door does.

Room vs corridor is **positional, not typographic**: any letter listed in
`corridors` is a corridor; every other letter is a room. Rooms are discovered
as units when a hero enters any of their cells; corridors are explored cell
by cell. `discoveredRooms` lists room letters visible to the heroes when the
dungeon starts.

Consequences for the editor:

- The grid tool works on characters: paint walls, void, room letters; assign
  letters to corridors via the corridors list.
- Changing a letter anywhere changes the room of every cell carrying it —
  rooms are letter-sharing regions, not rectangles.
- Corners are **not** edited: `defineLayout` runs `autoDetectCorners(grid)`
  and derives them. The editor never stores or generates `corners`.

## Entities

### CampaignDoc

Mirrors `Campaign` (data subset):

| Field | Type | Notes |
|---|---|---|
| `id` | String | folder name, must be a valid directory name (`[a-zA-Z][a-zA-Z0-9]*`) |
| `translationNamespace` | String | key prefix for translations; default = `id` (iceDragonTreasure uses `iceDragon`, hence the explicit field) |
| `nameKey` | String | generated as `campaign.<ns>.name` |
| `dungeonIds` | List<String> | ordered chain; dungeon order defines progression (each dungeon links to the next) |
| `heroes` | List<HeroDoc> | see below |
| `itemDeck` / `magicItemDeck` | List<DeckEntry> | references into the catalog, each with a count |
| `tileset` | String? | campaign-wide tileset path |
| `events` | List<Int>? | campaign-level event deck: **data-only v1** — restricts which global event numbers may be drawn (per dungeon in `DungeonDoc.events`) |

### HeroDoc

v1 supports the `newHero(name, colour)` form (name + colour only). Full
custom `Actor` heroes (stats, starting equipment, sprite) are out of scope.
`name` is a free-text hero name (not translated).

### DungeonDoc

Mirrors `DeclarativeDungeon`:

| Field | Type | Notes |
|---|---|---|
| `id` | String | file stem for `dungeons/<id>.ts`, e.g. `e1m0` |
| `nameKey` / `introKey` | String | `campaign.<ns>.<id>.name` / `.intro` |
| `grid` | List<String> | see above |
| `corridors` | List<Char> | letters that are corridors |
| `discoveredRooms` | List<Char> | rooms visible at start; default `['A']` |
| `startingPositions` | List<Position> | up to 4, order matters (hero order) |
| `doors` | List<DoorDoc> | |
| `monsters` | List<MonsterDoc> | |
| `secrets` | List<SecretDoc> | |
| `notes` | List<NoteDoc> | |
| `items` | List<ItemPlacement> | floor items; `item` optional (random loot) |
| `interactables` | List<InteractableDoc> | |
| `lights` | List<LightDoc> | |
| `pillars` / `pits` | List<Position> | |
| `walls` | List<WallDoc> | edge walls between adjacent floor cells |
| `wallColour` | String? | fill colour of edge walls (default grey); per-wall colours win |
| `winConditions` | List<WinConditionDoc> | |
| `events` | List<Int>? | allowed global event numbers in this dungeon |
| `ambientLight` | Double? | 0..1, default 1 |
| `tileset` | String? | per-dungeon tileset override |
| `music` | String? | path under `static/` |
| `collapsedCorridor` | Char? | corridor letter that resets to collapsed |
| `portal` | Position? | |
| `onRoomDiscovered` | Map<Char, String>? | room letter -> translation key of a log message |

### DoorDoc

| Field | Type |
|---|---|
| `position` | Position |
| `side` | `Side` enum (`UP`, `DOWN`, `LEFT`, `RIGHT` — edge of the cell the door sits on) |
| `locked`, `trapped`, `hidden`, `open`, `reinforced` | Boolean (default false) |
| `trapAttacks` | Int (only when `trapped`) |
| `id` | String? |

### WallDoc

An edge wall on the boundary between two adjacent floor cells — for rooms
that are not separated by a full `#` cell. Blocks movement, line of sight,
search and light like a closed door.

| Field | Type |
|---|---|
| `position` | Position |
| `side` | `Side` enum (`UP`, `DOWN`, `LEFT`, `RIGHT` — edge of the cell the wall sits on) |
| `colour` | String? (per-wall fill colour override; `wallColour` is the layout-wide default) |

Rendering: flat strip on the cell boundary, same thickness and positioning
as a closed door leaf. A door on the same edge replaces the wall while open
or visible; a hidden closed door stays covered by the wall. The wall renders
once at least one adjacent cell is discovered.

### MonsterDoc

| Field | Type |
|---|---|
| `type` | catalog monster type id (e.g. `ORC`) |
| `colour` | `Colour` enum (`Red`, `Yellow`, `Green`, `Blue` — verify exact members in `src/types.ts`) |
| `position` | Position |
| `inventory` | List<catalog item refs> (usually a single magic item) |
| `id` | String? |

### SecretDoc

| Field | Type |
|---|---|
| `type` | `SecretType` enum: `EQUIPMENT`, `MAGIC_ITEM`, `TRAP_DOOR`, `NOTE` |
| `position` | Position |
| `nameKey` | String? (required for non-note secrets; `campaign.<ns>.secrets.<id>.name`) |
| `item` | catalog item ref? |
| `revealedBy` | String? |

### NoteDoc

| Field | Type |
|---|---|
| `position` | Position |
| `messageKey` | String | `campaign.<ns>.<dungeonId>.notes.<id>` |
| `id` | String |

### ItemPlacement / InteractableDoc / LightDoc

- `ItemPlacement`: position + optional catalog item ref.
- `InteractableDoc`: position, `effect` (string key from the catalog's
  interactable-effect list), optional `args` (JSON object), `icon`, `id`,
  `oneTime`, `triggerOn` (`interact` / `step` / `both`), `secret`, and optional
  name/description translation keys.
- `LightDoc`: position, `alignment` (`CellAlignment`: `CENTER` default,
  `CEILING`, corner alignments), `color` (CSS hex), `radius`, `intensity`
  (0..1), `softness` (0..1), `effect` (`static`, `pulse`, `flicker`, `sweep`,
  `blink`, `sparkle`, `aura`, `gas`), `rate`, `enabled`, `id`.

### WinConditionDoc

| Field | Type |
|---|---|
| `type` | `ConditionType`: `KILL_ALL`, `KILL_ALL_OF_TYPE`, `REACH_CELL`, `OPEN_DOOR`, `KILL_AT_LEAST`, `SECRET_FOUND` |
| `targetCell` | Position? (required for `REACH_CELL`) |
| `targetMonsterType` | catalog ref? (`KILL_ALL_OF_TYPE`) |
| `targetSecretId` | String? (`SECRET_FOUND`) |
| `killMinCount` | Int? (`KILL_AT_LEAST`) |
| `additionalDescriptionKey` | String? |

### TranslationsDoc

| Field | Type |
|---|---|
| `languages` | List<String> | v1 ships `en` and `sv` (game convention) |
| `entries` | Map<String, Map<String, String>> | key -> language -> text |

Keys are auto-derived from campaign content (name, intros, notes, secrets,
interactables, `onRoomDiscovered` messages) and the author edits the texts.
Structure of the emitted JSON files follows the nested convention in 04.

## Catalog references

Items and monster types are not embedded in the editor project; they are
**references** into the shared game content (see 03). A reference is:

```kotlin
@Serializable
data class CatalogRef(
    val id: String,          // e.g. "sword_of_chaos", "ORC"
    val version: Int,        // catalog snapshot version it was picked from
)
```

The generator resolves `id -> (import path, export name, index)` via the
catalog at generation time (e.g. `magicItems[4]`). Resolution failures are
generation errors, not silent fallbacks.

## Defaults

Always apply the same defaults as `defineDungeon`/`defineLayout` so the
generated code and the in-memory preview agree:

- `ambientLight` default 1, `discoveredRooms` default `['A']`,
  `beaten`/`killCount` always generated as `false`/`0`,
  door defaults `locked=trapped=hidden=open=reinforced=false`,
  light defaults: `alignment=CENTER`, `color` game default, `radius`,
  `intensity`, `softness`, `effect='static'`, `rate=1`, `enabled=true`.
