# 03 — Sync Model

What travels on the wire, how big it is, and why full state wins over
diffs. The numbers below are **measured**, not estimated: full headless
playthroughs of all three benchmark dungeons (tactician Game Master, bot
driver, seeded rng), serializing the live `GameState` every 5 turns.

## Measured state sizes

| Dungeon                          | At init | Peak during play | Gzipped peak |
| -------------------------------- | ------- | ---------------- | ------------ |
| e1m0 — Troll Cave                | 125 KB  | 314 KB           | ~35 KB       |
| e1m1 — The Three Gates of Power  | 119 KB  | 320 KB           | ~39 KB       |
| e2m1 — The Five Mounds of Terror | 32 KB   | 137 KB           | ~22 KB       |

Composition at peak (e1m0), largest keys first:

| Key                                              | Size         | Mutability                                          |
| ------------------------------------------------ | ------------ | --------------------------------------------------- |
| `dungeon`                                        | ~106 KB      | Mostly static after init; `layout.monsters` mutates |
| `betweenDungeons`                                | ~104 KB      | Static after init                                   |
| `actionLog`                                      | ~44 KB       | Append-only; ~500 entries per dungeon               |
| `bloodSplatters`                                 | ~39 KB       | Visual-only                                         |
| `damageIndicators`                               | ~8 KB        | Visual-only                                         |
| `heroes`                                         | ~3 KB        | Mutates                                             |
| decks (`eventDeck`, `magicItemDeck`, `itemDeck`) | ~3–5 KB each | Mutates (draw)                                      |

Two facts follow. First: at turn-based pace (a handful of actions per
player per turn), a 320 KB JSON snapshot — ~35 KB with permessage-deflate —
is a non-event. Second: a naive diff would mostly be computing changes in
the two-thirds of the state that never changes after init.

## The design: full state, three exclusions

**v1 syncs the full `GameState` after every resolved action.** No diff
layer, no patching, no per-entity replication. `SerializedState` is the
`GameState` with exactly three keys removed:

```ts
type SerializedState = Omit<
  GameState,
  'bloodSplatters' | 'damageIndicators' | 'shakeEffects'
>;
```

Excluded because they are **client-local cosmetics**:

- `bloodSplatters` — decal placement from combat; each client synthesizes
  its own from the log entries it receives (combat already logs attacker,
  target, position, outcome).
- `damageIndicators` — floating numbers; purely transient, replayed locally
  from log/state deltas.
- `shakeEffects` — screen shake; transient, position-derived.

Divergent cosmetics between clients are acceptable; they are gameplay-neutral.
This also removes the only reconciliation question full-state sync would
otherwise have ("whose decal wins").

Everything else syncs, including the full `actionLog` on every snapshot.
Log entries are locale-independent (`{ key, properties, turn }`), so each
client renders the shared log in its own language with no extra protocol.

**Reconnect is free by construction.** Any snapshot is complete. A client
that joins, rejoins, or wakes from a lost connection needs exactly one
`SNAPSHOT` to be correct, regardless of what it missed.

## What is _not_ sent

- **Seeds / rng state.** The host owns the rng. Guests never roll and never
  need the sequence.
- **Static content blobs** in v1. See the phase 2 note below.
- **UI state** — hover, inventory panels, locale, debug, music mode. These
  are per-client.

## Snapshot frequency

| Event                                         | Snapshot sent?                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Any intent applied by host (MOVE, ATTACK, …)  | Yes, after the action resolves                                                                                 |
| `END_ACTION` / `NEXT_TURN`                    | Yes, after the full turn pipeline settles (04)                                                                 |
| Monster phase (inside `next()`/`endAction()`) | No per-monster snapshots in v1; one snapshot at the end. Monsters animate from log + state on each client (04) |
| Event card drawn                              | Yes (state carries `currentEvent`)                                                                             |
| Guest joins mid-lobby                         | One full snapshot to the joiner only                                                                           |
| Host saves                                    | No network traffic; persistence is local (04)                                                                  |

One snapshot per resolved action is the ceiling. If profiling ever shows
per-message deflate cost, the fix is batching (coalescing snapshots within
a short window), never diffing.

## Phase 2 (documented, out of v1 scope): static blob split

The partition is obvious from the table above: `betweenDungeons`, the
dungeon layout structure (grid, rooms, doors definitions, lights), and
campaign-constant content are send-once material. The protocol reserves a
`STATIC_BLOB` + `staticContentHash` handshake for this. It is deliberately
**not** in v1: it adds a key-management problem (blob identity, invalidation
on content change) to save bandwidth the measurements say is irrelevant.
Implement only if real sessions show a problem.

## Anti-patterns (rejected, with reasons)

- **JSON patch / diff sync** — needs ordering, gap recovery, and per-client
  sequence state; saves bytes nobody needs saved (see measurements).
- **Lockstep with shared seed** — guests re-simulating from shared inputs
  would require determinism guarantees the codebase only partially claims
  (TECHNICAL.md: a seed reproduces the random sequence, not a playthrough
  unless every input is recorded), and gains nothing over host authority.
- **Server-side game logic** — duplicates the logic engine in a second
  package/deployment; host authority gets identical rules for free.
- **Sending visuals** (damage numbers, shakes, decals) — turns cosmetics
  into consensus problems.
