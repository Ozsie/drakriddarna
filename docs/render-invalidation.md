# Render invalidation profile

`DungeonBoardSignatures` builds value-based strings so the board can detect
changes to state that is intentionally mutated in place. The profile measures
the unchanged-state cost: signatures are rebuilt even when they compare equal
and no canvas layer is redrawn. It is a Node microbenchmark, not a browser
rendering benchmark; browser rasterization, drawing, and the construction of
the camera view and active-light list are outside these timings.

## Run and conditions

Run the explored-dungeon signature benchmark with:

```bash
npm run benchmark:signatures
```

The recorded run used Node `v22.19.0` on macOS `arm64` / Apple M3 Pro. Each
existing authored dungeon (`e1m0`, `e1m5`, and Testing Grounds) was fully
explored and measured at a 48-pixel cell size. Each signature warms for 200
iterations, then runs 2,000 iterations. The isometric light-mask key uses a
fixed `1440 × 960` view, zoom 1, and pixel ratio 1. The command enables
`--expose-gc`; after a forced collection it reports positive heap growth per
call while retaining each output string. This is a rough retained-heap signal,
not gross allocation rate: temporary values may be collected during a run.
Timings are single-run means and should be treated as indicative, not a
cross-device target.

## Measurements

| Signature cost                       |               e1m0 |               e1m5 |    Testing Grounds |
| ------------------------------------ | -----------------: | -----------------: | -----------------: |
| Static                               |   4.69 µs / 4.1 KB |   6.60 µs / 5.3 KB |   7.26 µs / 6.7 KB |
| Dynamic, top-down                    |  16.84 µs / 9.9 KB | 26.91 µs / 14.3 KB | 35.21 µs / 18.1 KB |
| Dynamic, isometric (includes static) | 20.44 µs / 12.8 KB | 33.48 µs / 17.7 KB | 41.84 µs / 17.6 KB |
| Isometric light-mask key             | 21.82 µs / 11.7 KB | 41.71 µs / 22.8 KB | 48.66 µs / 24.0 KB |
| Overlay                              |   0.41 µs / 0.5 KB |   0.42 µs / 0.5 KB |   0.17 µs / 0.5 KB |
| Unchanged dynamic frame, top-down    |           20.31 µs |           31.35 µs |           39.43 µs |
| Unchanged dynamic frame, isometric   |           45.73 µs |           79.64 µs |           94.72 µs |

The frame totals add the dynamic signature, the isometric mask key where
applicable, and the animated-light, item-aura, and portal-aura signatures. The
isometric dynamic signature embeds the static signature; top-down static
signature work is separate from the dynamic-frame total. The largest total,
`94.72 µs`, is about `0.57%` of a `16.7 ms` frame. The standalone mask key,
which the earlier profile scope omitted, costs `21.82–48.66 µs` and retains
about `11.7–24.0 KB` per call in this measurement. That is a scope addition to
the measured total, not a measured regression from a code optimization.

## Mutation inventory

The signatures intentionally track fields that affect visible output, not all
gameplay state. Their values must be rebuilt from current fields because
objects and arrays are updated in place.

| Layer     | Signature dependencies                                                                                                                                                                                                                               | Mutation owners / adapters                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry  | Dungeon identity; doors, secrets, interactables, floor items, decorators, pits, terrain, collapsed corridors and portal; isometric grid and corner geometry                                                                                          | `src/dungeon/`, `src/secrets/SecretsLogic.ts`, `src/interactables/InteractableLogic.ts`, `src/items/ItemLogic.ts`; controller builds the isometric mask key                               |
| Discovery | Discovered room letters and room fog; discovery gates animated light sprites and portal aura                                                                                                                                                         | `src/core/grid.ts`, `src/secrets/SecretsLogic.ts`, `src/dungeon/RoomEffectsLogic.ts`; aura/light adapters in `src/components/` and `src/dungeon/`                                         |
| Actors    | Hero name, position, health, actions, movement and incapacitation; monster name, position and health; current actor position/name                                                                                                                    | `src/hero/HeroLogic.ts`, `src/monsters/MonsterLogic.ts`, `src/core/combat.ts`, and turn orchestration in `src/game.ts`                                                                    |
| Items     | Floor-item location and decorator; carried-light item identity and aura seed/disabled state                                                                                                                                                          | `src/items/ItemLogic.ts`, hero inventory mutations in `src/hero/HeroLogic.ts`, and aura view adaptation in `src/scene/ItemAuraViews.ts`                                                   |
| Lighting  | Light positions/enabled state/sprite fields; carried lights and aura eligibility; hero light-affecting flags; event lights, interactable lights, room fog and collapsed corridors; active lights plus isometric mask geometry/view/canvas dimensions | `src/dungeon/LightRendering.ts`, `src/events/EventsLogic.ts`, `src/interactables/InteractableLogic.ts`, `src/dungeon/RoomEffectsLogic.ts`, and `src/components/DungeonBoardController.ts` |
| Overlay   | Current actor position and counts of damage indicators, blood splatters, projectiles, and flame effects                                                                                                                                              | `src/core/combat.ts`, `src/events/EventsLogic.ts`, and the controller's transient-effect lifecycle                                                                                        |

`src/components/DungeonBoardSignatures.test.ts` exercises these paths with
in-place nested edits and collection pushes/removals: door flags, secret and
interactable state, item pickup and decorators, terrain and discovery,
collapsed corridors, hero fields and inventory lights, disabled/blinded
flags, monster removal, room and event lights, and all overlay effect lists.
It also verifies that reverting a mutation returns the signature to its
original value. The isometric key tests grid, door, pit, corner, room-fog,
discovery, isometric-graphics, and active-light mutations.

## Revision-counter decision

Do not introduce revision counters based on this profile. Even the largest
measured unchanged isometric signature workload is under `0.6%` of a 60 Hz
frame, while relevant mutations are spread across roughly ten game modules
and use in-place nested writes. Counters would add synchronization obligations
and risk stale rendering for a small measured saving. Reference-only caching
is not valid for this state model.

Revisit counters only if a repeatable browser profile attributes material
frame-time or GC pressure to signature construction, or if mutation ownership
is centralized behind controlled APIs. Any future counters should be added
incrementally at those mutation points and tested against the value-based
signature paths, including nested in-place edits, before replacing them.
