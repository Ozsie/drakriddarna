# 02 — Generation Algorithm

Brogue's generator produces open organic caves; this game's `Layout` model
requires discrete, lettered rooms with doors (room discovery, fog and
monster AI all depend on the letters). The algorithm is therefore a
Brogue-inspired adaptation: each room is grown as its own organic blob, and
the caves-of-one-room are then forced into a connected, door-separated
whole. The three existing dungeons in `src/campaigns/brogue/dungeons/`
are the visual reference for the intended output.

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
- Assign letters `a`..`j` in seed order.

## Step 2 — Blob growth

For each room, grow an organic blob from its seed:

1. Target area `A(room)` from `config.ts` (with rng variance of roughly
   ±25%), subject to fitting the grid.
2. Random-walk growth: repeatedly pick a random cell already in the blob,
   pick one of its 4 neighbours, and add the neighbour if it is free (not
   another room's cell, not void margin, inside the grid bounds). This
   produces the irregular, connected shapes visible in the reference
   dungeons — a connected flood of a chosen size is exactly what a random
   walk gives.
3. Optional smoothing pass: fill single-cell holes and shave single-cell
   spikes so the blob reads as a cave, not as a crack pattern.

If any room cannot reach its target area (boxed in by neighbours), the
whole dungeon attempt is rejected (step 6) — do not grow rooms into each
other.

## Step 3 — Walls and adjacency

- A cell is wall (`#`) if it is not floor and touches at least one floor
  cell; everything else is void (space). This matches the reference grids,
  where wall cells occupy full grid cells between rooms.
- Two rooms are **adjacent** when any of their cells are orthogonally
  adjacent with a wall cell between them (or share a boundary when blobs
  touch through a one-cell wall).
- Build the adjacency graph over the `N` rooms. If it is not connected,
  reject the attempt (step 6). Do not carve artificial corridors to force
  connectivity in v1 — the reference dungeons have `corridors: []`.

## Step 4 — Doors

For each edge in the adjacency graph, choose one wall cell on the shared
boundary (rng, preferring boundaries where the two rooms face each other
broadly) and place a door tuple `[Side, x, y, options?]`:

- The `Side` points from the wall cell toward the room the door opens into
  (follow the convention of the existing dungeons and
  `docs/dungeon-definition.md`).
- Not every adjacency must get a door: keep enough doors that the room
  graph (doors = edges) stays connected; extra adjacencies get a door with
  probability from `config.ts` (more loops on deeper floors).
- Door options scale with depth: probability of `hidden`, `trapped`,
  `locked` rises with depth (see 03). Locked doors must not be required for
  `KILL_ALL` completion — a locked door may never gate the only path to a
  room containing monsters. The validator does not know about key
  availability, so the generator enforces this rule itself: `locked: true`
  only on doors that are not articulation points of the door graph.
- If the door graph would leave a room unreachable, the attempt is
  rejected.

## Step 5 — Start room and metadata

- The start room is the largest room; `startingPositions` is one cell in
  it (more positions if the campaign uses multiple heroes), and
  `discoveredRooms` is that room's letter.
- `winConditions`: `[{ type: ConditionType.KILL_ALL, fulfilled: false }]`.

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

The layout generator returns a `DeclarativeLayout` (grid strings, door
tuples). `populationGenerator` (see 03) fills monsters, items and secrets,
then `generateCampaign.ts` calls `defineDungeon` with the dungeon-level
fields. Corners are **not** generated — `defineLayout` runs
`autoDetectCorners` on the grid.

## Invariants the generator must uphold

- Every room letter in the grid has at least one door connecting it to the
  rest of the dungeon (via the door graph).
- All monsters, items, secrets and the start position lie on floor cells
  of a room (never walls, never void) and never on a door cell.
- The start room contains no monsters on depth 1 (and at most one on any
  depth) so a campaign never opens with an unavoidable first-round fight.
- Grid rows are all the same length (the validator enforces bounds; the
  generator pads with void).
- Determinism: identical `(CAMPAIGN_SEED, depth, attempt)` always yields a
  byte-identical `DeclarativeLayout`.
