# 02 — Generation Algorithm

Brogue's generator produces open organic caves; this game's `Layout` model
requires discrete, lettered rooms with doors (room discovery, fog and
monster AI all depend on the letters). The algorithm is therefore a
Brogue-inspired adaptation: each room is grown as its own organic blob, and
the caves-of-one-room are then forced into a connected, door-separated
whole. The dungeons in `src/campaigns/iceDragonTreasure/dungeons/` and
`src/campaigns/earthHour/dungeons/` are the visual reference for the
intended output.

All randomness goes through the deterministic rig (`generator/rng.ts`),
seeded per dungeon as `seed = hash(CAMPAIGN_SEED, depth, attempt)`. Every
step below is a pure function of that seed.

## Step 1 — Room seeding

- Take the depth's configured room count `N` and grid size from
  `config.ts` (see 03).
- Place `N` room seeds on a jittered lattice: divide the grid into an
  approximate `ceil(sqrt(N)) x ceil(sqrt(N))` cell layout, place one seed
  per cell at a jittered position (rng). This gives spread-out rooms the
  way Brogue's cavern seeds do, without overlap by construction.
- Assign letters `A`..`J` in seed order (the grid letter space is uppercase
  `A`-`Z`, per `docs/dungeon-definition.md` and every existing campaign;
  lowercase letters are not a supported room namespace).

## Step 2 — Blob growth

For each room, grow an organic blob from its seed:

1. Target area `A(room)` from `config.ts` (with rng variance of roughly
   ±25%), subject to fitting the grid.
2. Random-walk growth: repeatedly pick a random cell already in the blob,
   pick one of its 4 neighbours, and add the neighbour if it is free: inside
   the grid bounds, outside the void margin, not another room's cell and
   **not orthogonally adjacent to another room's cell** (the one-cell rock
   gap is what keeps rooms separable — see step 4). This produces the
   irregular, connected shapes visible in the reference dungeons — a
   connected flood of a chosen size is exactly what a random walk gives.
3. Optional smoothing pass: fill single-cell holes and shave single-cell
   spikes so the blob reads as a cave, not as a crack pattern.

If any room cannot reach its target area (boxed in by neighbours), the
whole dungeon attempt is rejected (step 6) — do not grow rooms into each
other.

### Step 2b — connectivity tendrils

Pure random-walk blobs only end up door-adjacent by luck (measured raw
success: 1-6%), which would leave the retry loop doing all the work. After
organic growth, while the candidate-adjacency graph is disconnected, the
two closest yet-unconnected rooms grow a **directed tendril** toward each
other: repeatedly add the free cell (gap rule still enforced) that most
reduces the distance to the nearest cell of the other room, until a door
candidate exists between them. The one-cell gap rule stops the tendril
exactly where a doorway can be carved. Tendril cells belong to the growing
room's own letter — no corridor letters, no `corridorCells`; this is blob
growth, not corridor carving. If a pair cannot be connected (blocked by a
third room), the pair is marked failed and the next-closest pair is tried;
when no pair remains the attempt is rejected. With tendrils, raw success
is ~85% per attempt, so the bounded retry loop is effectively guaranteed
to succeed.

## Step 3 — Walls and adjacency

- A cell is wall (`#`) if it is not floor and touches at least one floor
  cell (8-neighbourhood); everything else is void (space). This matches the
  reference grids, where wall cells occupy full grid cells between rooms.
- Two rooms are **adjacent** when a wall cell has floor cells of both rooms
  among its orthogonal neighbours. Because blobs grow with a one-cell gap
  (step 2), rooms never touch directly before doors are carved.
- Build the adjacency graph over the `N` rooms. If it is not connected,
  reject the attempt (step 6). Do not carve artificial corridors to force
  connectivity in v1 — the reference dungeons have `corridors: []`.

## Step 4 — Doors

The engine's doors are **edge-based between two floor cells** — a door on
`(x, y)` with `side: Side.RIGHT` occupies the edge between `(x, y)` and
`(x+1, y)` (`docs/dungeon-definition.md`, `isDoorEdge` in
`src/core/grid.ts`). A `#` cell is never walkable (`isWalkable`), so a door
placed on a wall cell could never be crossed; doors therefore cannot sit on
rock. Instead, each connection **carves a doorway**:

1. For each edge in the adjacency graph, collect the wall cells that can
   serve as the doorway: a wall cell `W` whose orthogonal neighbours
   contain floor cells of exactly the two rooms being connected (any
   number of one room's cells, exactly one of the other), while every
   other orthogonal neighbour is rock or void — never floor of a third
   room, and never floor of the second room on a second side (that would
   open an uncontrolled gap once `W` is converted).
2. Convert `W` into a floor cell of one of the two rooms (the doorway stub
   belongs to that room's letter, exactly like the corridor stubs in the
   reference dungeons).
3. Place the door tuple `[Side, x, y, options?]` on `W`'s cell, with the
   `Side` pointing from `W` toward the single floor cell of the other
   room — the convention of the existing dungeons, where the door sits on
   the near room's cell and opens into the far room.

Carves are applied one at a time with re-validation (a carve turns `W` into
floor and can invalidate a neighbouring candidate); spanning-tree doors are
applied first so connectivity is secured before optional loops are added.

- Not every adjacency must get a door: keep enough doors that the room
  graph (doors = edges) stays connected; extra adjacencies get a door with
  probability from `config.ts` (more loops on deeper floors).
- Door options scale with depth: probability of `hidden`, `trapped`,
  `locked` rises with depth (see 03). Locked doors must not be required for
  `KILL_ALL` completion — a locked door may never gate the only path to a
  room containing monsters. The validator does not know about key
  availability, so the generator enforces this rule itself: `locked: true`
  only on doors that are not articulation points of the door graph.
- Every hidden door gets a visible hint: population places a flickering
  `ember` light (the deep-red torch from `src/dungeon/LightSources.ts`, the
  same convention the hand-authored dungeons use) on the floor cell
  orthogonally adjacent to the doorway, in the doorway's own room and on
  the opposite side from the door's target cell, with the cell alignment
  pointing at the doorway.
- If the door graph would leave a room unreachable, the attempt is
  rejected.

## Step 5 — Start room and metadata

- The start room is the largest room; `startingPositions` is one cell in
  it (more positions if the campaign uses multiple heroes), and
  `discoveredRooms` is that room's letter.
- `winConditions`: `[{ type: ConditionType.KILL_ALL, fulfilled: false }]`.

## Step 5b — Pillars and pits (population)

Thematic floors emit impassable blockers through the declarative layout's
`pillars` and `pits` fields (both render and block movement via
`isWalkable`; no core edits). The per-floor counts come from `config.ts`
(`pillarMin/Max`, `pitMin/Max`): pits on the sunken shaft (3) and the
abyss (9), pillars in the crystal chamber (6), the graves (7) and around
the final boss's temple hall (10).

Placement rules, enforced before any monster, item or secret is placed:

- Blockers only go on room floor cells — never in the void, never on
  walls, never on door cells and never orthogonally adjacent to a door
  cell, so the mouth of every doorway stays open.
- A candidate is only accepted when, with it blocked, every free floor
  cell of the whole dungeon stays reachable from a single hero start cell
  without passing through a locked door (a global flood fill per
  candidate). A per-room check is not enough: a pit in a one-cell-wide
  passage between two doors leaves both sides connected to a door of
  their own while severing the only route through the dungeon. And the
  flood fill must seed from one start, not from all of them together:
  seeding from every start would let a pillar wall a single hero into a
  pocket that the other heroes simply reach around. This is what makes
  the blockers safe: nothing placed later — monster, item, secret or
  hero start — can ever be cut off, and no hero can be sealed in,
  because every free cell stays connected to every hero start.
- Wall-adjacent cells are preferred (pillars read as columns or
  sarcophagi along the room edge, pits as floor that has given way at
  the room's rim); pillars on boss floors prefer the boss room.
- Fewer blockers than configured is acceptable (placement stops when no
  valid candidate remains); the floor is never rejected over blockers.
- Later placements see blockers as occupied, so monsters, items, secrets
  and lights never share a cell with a pillar or pit.

## Step 6 — Rejection sampling

Wrap the whole per-depth generation in a retry loop:

```ts
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const seed = hash(CAMPAIGN_SEED, depth, attempt);
  try {
    return generateDungeon(depth, seed); // defineDungeon validates inside
  } catch {
    continue; // layout invalid or unconnected — try the next attempt seed
  }
}
// Bounded fallback: a hardcoded seed per depth, verified green ahead of
// time. Generation must never throw at app start.
return generateDungeon(depth, FALLBACK_SEEDS[depth]);
```

- `MAX_ATTEMPTS` = 50 is expected to be far more than needed; measure in
  tests and lower it if a handful of attempts always suffices.
- The failure path must stay quiet: no logger output per retry at app
  start, only test-visible counters.
- The fallback seeds (and their attempt indices) are checked into
  `generateCampaign.ts` and covered by the property tests so they can
  never silently rot.

## Output shape

The layout generator returns a `GeneratedLayout`: the `DeclarativeLayout`
(grid strings, door tuples) plus what assembly needs from the layout pass —
the start room letter, the starting positions (distinct non-door cells of
the start room, one per hero) and the cells doors sit on (the carved
doorway cells and their targets, which population keeps free of entities).
`populationGenerator` (see 03) fills monsters, items and secrets, places
the blockers from step 5b, places one light per room on the cell closest
to the room's centre on floors with `ambientLight < 1` — drawn from the
floor's light rig (`lightRig` in `config.ts`; mine torches high up,
chandeliers in the crystal chamber and the temple, a warm golden glow in
the abyss) — adds the hidden-door ember hints from step 4, and on glow
floors (`glowMin/Max`, the mushroom grotto) scatters extra dim
bioluminescent lights along the room edges, then emits the full
shared-world event deck, and `generateCampaign.ts` calls `defineDungeon`
with the dungeon-level fields.
Corners are **not** generated — `defineLayout` runs `autoDetectCorners` on
the grid.

## Invariants the generator must uphold

- Every room letter in the grid has at least one door connecting it to the
  rest of the dungeon (via the door graph).
- All monsters, items, secrets and the start position lie on floor cells
  of a room (never walls, never void) and never on a door cell.
- Pillars and pits lie on room floor cells, never on or orthogonally
  adjacent to a door cell, and never cut any free floor cell off from
  the hero start cells (see step 5b).
- The start room contains no monsters on depth 1 (and at most one on any
  depth) so a campaign never opens with an unavoidable first-round fight.
- Grid rows are all the same length (the validator enforces bounds; the
  generator pads with void).
- Determinism: identical `(CAMPAIGN_SEED, depth, attempt)` always yields a
  byte-identical `DeclarativeLayout`. (One engine caveat: `createMonster`
  draws each monster's `temperament` from the _global_ rng via
  `nextRandom()` — the same is true for every hand-authored campaign at
  module load. The generator's own output is deterministic; tests that
  deep-compare built `Dungeon` objects must seed the global rng first via
  `setRng(createSeededRng(...))`.)
