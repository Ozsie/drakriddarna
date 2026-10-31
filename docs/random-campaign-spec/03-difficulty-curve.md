# 03 — Difficulty Curve

One table in `generator/config.ts` drives the whole 10-floor progression.
The numbers below are the starting points, not final truth — they are tuned
against `npm run balanceAnalysis` in milestone M5.

## Depth configuration (tuned values)

| Depth | Grid size | Rooms | Blob area (cells) | Monster XP budget | Hidden/trapped/locked door chance | Ambient light | Secrets | Items | Blockers / lights |
| ----- | --------- | ----- | ----------------- | ----------------- | --------------------------------- | ------------- | ------- | ----- | ----------------- |
| 1     | 16x16     | 4     | 6–10              | 4                 | 0 / 0 / 0                         | 1.0           | 0–1     | 2     | —                 |
| 2     | 17x17     | 4     | 6–11              | 6                 | 5% / 0 / 0                        | 0.9           | 1       | 2     | torch rig         |
| 3     | 18x18     | 5     | 7–12              | 6                 | 5% / 5% / 0                       | 0.8           | 1       | 3     | 2–4 pits          |
| 4     | 19x19     | 5     | 7–13              | 8                 | 10% / 5% / 0                      | 0.7           | 1–2     | 3     | 3–5 glows         |
| 5     | 20x20     | 5     | 9–18              | 5 (+boss)         | 10% / 10% / 5%                    | 0.6           | 2       | 3     | arena, brazier    |
| 6     | 21x21     | 6     | 8–15              | 11                | 10% / 10% / 5%                    | 0.5           | 2       | 4     | 4–6 pillars       |
| 7     | 22x22     | 7     | 9–16              | 7                 | 20% / 15% / 10%                   | 0.4           | 2–3     | 4     | 3–5 pillars       |
| 8     | 23x23     | 10    | 5–10              | 16                | 15% / 15% / 10%                   | 0.3           | 3       | 4     | city, 40% loops   |
| 9     | 24x24     | 8     | 10–18             | 13                | 15% / 15% / 15%                   | 0.2           | 3       | 5     | 4–6 pits, golden  |
| 10    | 26x26     | 9     | 10–20             | 10 (+boss)        | 20% / 15% / 15%                   | 0.1           | 3–4     | 5     | 4–6 pillars       |

Interpretation:

- **Grid size / rooms / blob area** control dungeon size and exploration
  length; the growth is roughly linear so floor 10 takes about twice as
  long to clear as floor 1. Room counts are deliberately not monotonic:
  floor 5 (The Black Lake) is a small set of very large rooms — the
  colossal cavern and its boss arena — and floor 8 (The Lost City) is
  ten small rooms with a high loop-door chance — the dense house
  clusters and alleys of a ruined city.
- **Monster XP budget** is the summed `experience` of all placed monsters;
  it is the primary difficulty dial (see the pool below). The tuned table
  is deliberately NOT monotonic: it is shaped to hit the hero level
  thresholds at the right depths (see the balancing procedure below), and
  the boss floors trade regular budget for the boss itself.
- **Ambient light** decreases strictly with depth — every floor is darker
  than the one above, from fully lit at depth 1 down to 0.1 at depth 10
  (darker than any hand-authored dungeon). Dark floors stay readable
  because population places one light per room on the cell closest to the
  room's centre, drawn from the floor's light rig — mine torches high
  up, chandeliers in the crystal chamber (6) and the temple (10), a warm
  golden glow in the abyss (9) — and every hidden door gets a flickering
  `ember` light on the floor cell beside it — the same hint convention
  the hand-authored dungeons use — so the darkness itself points at
  where to search. The mushroom grotto (4) additionally scatters dim
  bioluminescent glow lights along the room edges.
- **Blockers** (see 02, step 5b) are thematic, not a difficulty dial:
  pits on the sunken shaft (3) and the abyss (9), pillars in the crystal
  chamber (6), the graves (7) and the temple hall around the final boss
  (10). They shape movement but never wall anything in.
- **Secrets, items** scale modestly with depth.
- **Events**: every floor's deck contains all 16 shared world events.
  `getEventsForDungeon` (`src/events/EventsLogic.ts`) shuffles the deck at
  dungeon load and reshuffles when exhausted, so a full deck gives maximum
  variety — a small per-floor subset would repeat the same events every
  few rounds. (An empty deck is still forbidden: `drawNextEvent` recurses
  forever on one; the full deck is always non-empty.)

## Monster pool and budget system

The built-in pool is thin between Knight and Lord, which is why the
campaign registers one or two mid-tier templates of its own
(`monsters/templates.ts`, via `registerMonsterTemplate` — no core edits).

Engine constraints on template authoring (verified against the code):

- The template's type string is the in-game display name, rendered as
  `'<type> (<colour>)'` — monster names do not go through i18n, so use a
  plain name (like the built-in 'Orc'/'Troll'), not a translation key.
- A monster's `weapon` is melee-only regardless of its `range`; ranged
  attacks require `rangedWeapon` (MonsterLogic falls back to `weapon` when
  the target is adjacent).
- `armour.defense` overrides the template's `defense` field, it does not
  add to it (`combat.ts` uses `armour?.defense ?? defense`) — the
  effective defense comes from the armour while one is equipped.
- Campaign-local items never enter the hero item deck (the deck draws
  from the global item arrays only), so `amountInDeck` on a
  campaign-local item is inert; use 0 to signal monster-only.

| Monster                                                          | Tier       | XP   | Availability                                               |
| ---------------------------------------------------------------- | ---------- | ---- | ---------------------------------------------------------- |
| ORC (built-in)                                                   | Apprentice | 1    | All depths                                                 |
| TROLL (built-in)                                                 | Knight     | 2    | Depth 3+                                                   |
| New template A (campaign-local, Knight/Lord-tier stat overrides) | —          | ~3   | Depth 5+                                                   |
| New template B (campaign-local, Lord-tier stat overrides)        | —          | ~4   | Depth 7+                                                   |
| Dark lords (built-in YELLOW/GREEN/BLUE)                          | Lord+      | boss | Floor 5 (one, mid-campaign peak) and floor 10 (final boss) |

Placement rules:

1. Compute the floor's monster budget from the table; subtract the boss's
   cost first on floors 5 and 10, then fill the remainder from the
   available pool by weighted pick (weight rising with depth for higher
   XP monsters).
2. Distribute monsters over non-start rooms, at most 2 per room on depths
   1–4 and at most 3 after, never on door cells or the room the heroes
   start in (except the single allowed start-room monster on depth > 1).
3. The final floor's boss is placed in the room farthest from the start
   room in door-graph hops, and that room must have at least two doors
   (so the fight is not a one-chokepoint stalemate); otherwise the attempt
   is rejected.
4. Inventory-carrying monsters (`createMonsterWithInventory`) may carry an
   item from the campaign deck with depth-rising probability — a natural
   way to hand out loot in `KILL_ALL` dungeons.

## Items, secrets and decks

- The campaign keeps the existing deck construction from
  `src/campaigns/brogue/campaign.ts` (weapons, armour, shields, magic items
  with `amountInDeck` expansion). The runtime decks still serve equipment
  secrets and room effects.
- **Floor loot is depth-progressive.** Every floor item is an explicit
  placement (a bare item spot would draw uniformly from the campaign deck
  at pickup time, which cannot be depth-aware). Equipment (weapons,
  armour, shields with `amountInDeck > 0`) is picked by weighted draw
  where the weight favours the item `value` closest to a target that rises
  linearly from 1 at depth 1 to 4 at depth 10 — cheap gear early, the
  best gear last. Monster-carried inventory items use the same pick.
- **One magic item per floor**, placed with the same weighted draw over a
  per-item target depth: healing herbs are weighted to depth 1 (the early
  healing bias), the sword of chaos to depth 10. Each unique magic item
  is placed at most once per campaign (the generator threads the already
  placed ids through the depth loop); once all are placed the deepest
  floors repeat the consumables only.
- Secrets use the existing secret types (hidden item, hidden door notes,
  etc. via the declarative secret shorthands); their count rises with
  depth as scored content (each secret found is worth points). Note that
  `parseSecret`'s built-in default names for `EQUIPMENT`/`TRAP_DOOR`
  secrets point at the `campaign.iceDragon.*` translation keys; the
  generator passes explicit `name` keys for the secrets it places (the
  texts are human-authored, see the AI policy).

## Balancing procedure

1. Generate the campaign, run `npm run balanceAnalysis`, and read the
   per-scenario output for the generated campaign.
2. The risk area is hero XP starvation: heroes gain experience from
   kills, and 10 escalating `KILL_ALL` floors can outrun the hero's level
   curve. Tune the monster budget table until the analysis shows the
   expected level progression.
3. Re-tune, never re-roll: the seed stays fixed; only `config.ts` values
   change, so the layouts stay identical between balancing iterations.

### M5 tuning outcome

The tuned budget table (4, 6, 6, 8, 5, 11, 7, 16, 13, 10) yields this
party level progression — modelled as the summed budget of all earlier
floors split over the four heroes, the same model the benchmark's
`heroExperience` option uses:

- **Knight** entering floor 5 (cumulative 24 XP → 6 per hero),
- **Hero** entering floor 7 (cumulative 40 → 10 per hero),
- **Lord** entering floor 10 (cumulative 76 → 19 per hero).

Master (28 XP per hero = 112 XP total) is not reachable with playable
budgets; the realistic curve is roughly one level per 2–3 floors, which
`config.test.ts` pins as an invariant.

The 20-run benchmark sweep (storyTeller | brutalOverlord, bot with
mid-campaign XP but no equipment progression) shows the intended shape:
floors 1–4 and 8–9 sit at 80–100% for both Game Masters, the mid-campaign
boss on floor 5 is the difficulty peak (45% | 30%), floor 7 is the
regular-floor valley (80% | 25%), and the final floor is comfortably
clearable by a lord-level party (95% | 95%). Two caveats when reading
these numbers: the bot never picks up floor loot, and the mid-campaign
model grants experience but not the equipment a real party would have
collected — both make deep-floor numbers pessimistic for human players.
Raising the floor 10 budget (tested up to 18) does not lower its win
rate; the bot's result there is dominated by party level, so a harder
finale is a design decision for the human authors, not a budget knob.
