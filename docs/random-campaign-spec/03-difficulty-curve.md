# 03 — Difficulty Curve

One table in `generator/config.ts` drives the whole 10-floor progression.
The numbers below are the starting points, not final truth — they are tuned
against `npm run balanceAnalysis` in milestone M5.

## Depth configuration (starting values)

| Depth | Grid size | Rooms | Blob area (cells) | Monster XP budget | Hidden/trapped/locked door chance | Ambient light | Secrets | Items | Events |
| ----- | --------- | ----- | ----------------- | ----------------- | --------------------------------- | ------------- | ------- | ----- | ------ |
| 1     | 16x16     | 4     | 6–10              | 3                 | 0 / 0 / 0                         | 1.0           | 0–1     | 2     | 0–1    |
| 2     | 17x17     | 4     | 6–11              | 4                 | 5% / 0 / 0                        | 1.0           | 1       | 2–3   | 1      |
| 3     | 18x18     | 5     | 7–12              | 5                 | 5% / 5% / 0                       | 0.9           | 1       | 3     | 1–2    |
| 4     | 19x19     | 5     | 7–13              | 6                 | 10% / 5% / 0                      | 0.8           | 1–2     | 3     | 2      |
| 5     | 20x20     | 6     | 8–14              | 7                 | 10% / 10% / 5%                    | 0.7           | 2       | 3–4   | 2      |
| 6     | 21x21     | 6     | 8–15              | 9                 | 10% / 10% / 5%                    | 0.6           | 2       | 4     | 2      |
| 7     | 22x22     | 7     | 9–16              | 11                | 15% / 10% / 10%                   | 0.5           | 2–3     | 4     | 2–3    |
| 8     | 23x23     | 7     | 9–17              | 13                | 15% / 15% / 10%                   | 0.4           | 3       | 4–5   | 3      |
| 9     | 24x24     | 8     | 10–18             | 16                | 15% / 15% / 15%                   | 0.3           | 3       | 5     | 3      |
| 10    | 26x26     | 9     | 10–20             | 20 (+boss)        | 20% / 15% / 15%                   | 0.3           | 3–4     | 5     | 3      |

Interpretation:

- **Grid size / rooms / blob area** control dungeon size and exploration
  length; the growth is roughly linear so floor 10 takes about twice as
  long to clear as floor 1.
- **Monster XP budget** is the summed `experience` of all placed monsters;
  it is the primary difficulty dial (see the pool below).
- **Ambient light** decreases with depth; from depth ~3 on, the campaign
  leans on the light system (light sources, interactable lights) so dark
  floors remain playable. Place 1–2 light sources in the larger rooms of
  dark floors.
- **Secrets, items, events** scale modestly. `events` indexes the
  campaign's event deck (`dungeon.events`); the deck reuses the existing
  shared world events.

## Monster pool and budget system

The built-in pool is thin between Knight and Lord, which is why the
campaign registers one or two mid-tier templates of its own
(`monsters/templates.ts`, via `registerMonsterTemplate` — no core edits).

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
  with `amountInDeck` expansion).
- Floor loot: place the table's item count as floor items in non-start
  rooms; at least one magic item on depths 1, 5 and 10 so the run's power
  curve keeps pace with the monster budget.
- Secrets use the existing secret types (hidden item, hidden door notes,
  etc. via the declarative secret shorthands); their count rises with
  depth as scored content (each secret found is worth points).

## Balancing procedure

1. Generate the campaign, run `npm run balanceAnalysis`, and read the
   per-scenario output for the generated campaign.
2. The risk area is hero XP starvation: heroes gain experience from
   kills, and 10 escalating `KILL_ALL` floors can outrun the hero's level
   curve. Tune the monster budget table until the analysis shows the
   expected level progression (roughly one hero level per 1.5–2 floors).
3. Re-tune, never re-roll: the seed stays fixed; only `config.ts` values
   change, so the layouts stay identical between balancing iterations.
