# Derived-store recomputation profile

The `gameStateStore` deriveds (`liveHeroesStore`, `visibleMonsters`,
`isGameOver`, ...) re-derive on every state publication: the game mutates
state in place and each publish wraps it in a fresh top-level envelope, so
every subscribed derived recomputes even when nothing it depends on changed.
This profile measures what that recomputation and subscriber notification
cost during repeated publication, as the input to the derived-store items in
[TODO-architecture.md](TODO-architecture.md). It is a Node microbenchmark;
the predicates are plain JS, so their timings transfer to the browser main
thread closely.

## Run and conditions

Run the derived-store benchmark with:

```bash
npm run benchmark:derived-stores
```

The recorded run used Node `v22.19.0` on macOS `arm64` / Apple M3 Pro. Each
existing authored dungeon (`e1m0`, `e1m5`, and Testing Grounds) is fully
explored (`createExploredState`) and measured with 200 warm-up iterations
followed by 2,000 iterations; publish timings likewise use 200 warm-up and
2,000 `gameStateStore.set()` calls. The command enables `--expose-gc`; after
a forced collection it reports positive heap growth per call while retaining
each derived result. Timings are single-run means and should be treated as
indicative, not a cross-device target.

## Subscriber inventory

The cost only exists where a derived has subscribers: `derived` stores are
lazy, so publishes without subscribers never run the predicates (covered by
the laziness regression test in `src/store/gameStateStore.test.ts`).

- The only always-on `gameStateStore` subscription is the module-level
  sound-cue drain (`drainSoundCues`) inside the store module.
- No production component subscribes to the derived stores. The board
  (`src/components/Dungeon.svelte` and `DungeonBoardController.ts`) reads
  `gameStateStore` directly and builds view models from the state. The
  derived stores' consumers are `get()` calls in tests and the benchmark
  harness.
- Derived subscriber notification is synchronous inside `set()`: the
  benchmark verifies one recompute per publish inside the publish timing,
  so the publish numbers below include the recomputation and notification
  work.

## Measurements

| Cost                                              | e1m0 (4 heroes, 5 monsters) | e1m5 (4 heroes, 8 monsters) | Testing Grounds (4 heroes, 3 monsters) |
| ------------------------------------------------- | --------------------------: | --------------------------: | -------------------------------------: |
| `liveHeroes` (liveHeroesStore predicate)          |       0.17 µs / ~378 B/call |       0.16 µs / ~379 B/call |                  0.06 µs / ~264 B/call |
| `findVisibleMonsters` (visibleMonsters predicate) |       0.77 µs / ~285 B/call |       0.68 µs / ~292 B/call |                  0.19 µs / ~280 B/call |
| Remaining derived predicates combined             |                0.10 µs/call |                0.11 µs/call |                           0.03 µs/call |
| Publish, module-level subscriber only             |                 0.22 µs/set |                 0.11 µs/set |                            0.10 µs/set |
| Publish, all 13 deriveds subscribed               |                 2.29 µs/set |                 1.83 µs/set |                            1.27 µs/set |

The worst case — publishing to every subscribed derived on the largest
authored map — is `2.29 µs`, about `0.014%` of a `16.7 ms` frame, and the
dominant part of that is notification plumbing, not the predicates
themselves (the two array derivations together stay under `1 µs`). In the
production configuration (no derived subscribers) a publication costs under
`0.25 µs`.

## Caching decision

No caching is worthwhile at these costs:

- The production configuration has no derived subscribers at all, so the
  recomputation happens at most once per `get()`, not per publication.
- Even the all-subscribed worst case is three orders of magnitude below
  the frame budget that the signature profile treats as its threshold
  ([render-invalidation.md](render-invalidation.md)).
- Caching against "complete explicit dependencies/revisions" would require
  invalidation hooks across the same distributed mutation owners that the
  render-invalidation review already declined to instrument.

What did change: `isGameOver` now derives from `liveHeroesStore`'s result
instead of recomputing `liveHeroes()` on the same publication, and it keeps
the "no active run" value `false` by also guarding on the raw store. The
state-envelope publication behavior for in-place mutations is unchanged and
covered by the recomputation tests in `src/store/gameStateStore.test.ts`
(in-place visibility reveals, hero deaths and revivals, mid-turn
publications from an asynchronous turn, and the null-state welcome phase).
