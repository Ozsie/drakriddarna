# Lighting realism roadmap

Complementary to [TODO.md](TODO.md) and its [lighting performance tasks](TODO.md#lighting). This roadmap turns the lighting review into a staged implementation checklist for top-down and isometric views. These are proposals, not implemented behavior; revalidate each observation and source reference before starting work.

The current system has a useful visibility foundation and already shares discovery and occlusion policy across projections. Its main realism gap is that visibility, surface illumination, source emission and soft shadows are not yet represented as distinct stages. Evolve the existing 2.5D rendering path rather than replacing it with a full 3D renderer.

## Ownership and handoff

| Area          | Owns                                                                                                                                                  | Handoff                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../lighting` | Projection-independent attenuation and animation math, visibility and shadow geometry, optional height/receiver calculations, and cache correctness.  | Export dependency-free contracts through the package entry point; retain legacy behavior until consumers adopt alternatives. See the [package roadmap](../lighting/TODO.md). |
| `../scene`    | Canvas rendering, projection, surface/light-mask compositing, artwork response, source emission and glow.                                             | Adopt package capabilities without taking ownership of game rules, presets or asset measurements.                                                                            |
| This game     | Light presets and authored values, discovery and occlusion policy, actor visual positions, asset measurements, integration and end-to-end acceptance. | Map game state to the package and scene contracts; preserve rules and existing content intent.                                                                               |

Milestones use the same labels as the package roadmap. Each follows **package capability → scene renderer adoption → game integration**; a package helper alone does not complete the game-facing outcome.

## Ordered work packages

### M1 — Projection parity and correctness

Top-down and isometric renderers currently use different attenuation behavior; isometric light-view adaptation also needs to preserve the resolved light properties required by its renderer. Top-down gradients in `../scene/src/lightsCanvas.ts` and isometric gradients in `../scene/src/isoCanvas.ts` are scene-owned. The game facade and its `buildIsometricLightViews` adapter are in `src/dungeon/LightRendering.ts`.

- [ ] **Package capability:** Add pure shared falloff evaluation and sampled scalar profiles, retaining an explicit legacy profile for compatibility; do not move CSS color parsing or canvas work into `../lighting`.
- [ ] **Scene adoption:** Use the shared profile in both renderers, preserve effect, resolved intensity and softness through both view contracts, and handle supported CSS colors and alpha without assuming six-digit hex.
- [ ] **Game integration:** Carry the resolved values through `buildIsometricLightViews` and the top-down facade. Keep illumination softness separate from shadow penumbra; preserve hard visibility boundaries and current discovery behavior.

**Dependencies:** Agree on the additive profile and light-view contract before changing visual defaults; renderer adoption must be coordinated with the published package version.

**Acceptance:** At fixed time, compare both projections for a torch beside a wall corner and overlapping colored lights. Verify matching falloff, supported CSS color forms and alpha, effect parity, legacy-profile compatibility, and no light leaking across hard visibility or discovery boundaries. Extend `src/dungeon/LightRendering.test.ts`; add scene rendering coverage with the renderer change.

### M2 — Animation and movement synchronization

Actor rendering resolves interpolated positions in `src/scene/adapters.ts`; carried lights and dynamic occlusion must follow the same visual clock rather than changing only at logical cell steps. Repaint scheduling and render signatures are game-owned in `src/components/DungeonBoardController.ts` and `src/dungeon/LightRendering.ts`.

- [ ] **Package capability:** Add deterministic interpolated flicker and compatible animation signatures. Keep legacy animation available during adoption; record sweep-edge continuity and corner behavior as separately validated follow-ups.
- [ ] **Scene adoption:** Consume resolved animation values without quantizing away the intended smoothness; expose the required light data in both projection contracts.
- [ ] **Game integration:** Resolve carried-light positions and dynamic shadow proxies from the actor visual position and the same animation time. Update light invalidation and render signatures so moving lights and flicker repaint continuously without invalidating unrelated static work.

**Dependencies:** M1 resolved-light contracts; package animation must be coordinated with consumer repaint behavior. Do not change gameplay positions or actor movement rules.

**Acceptance:** Compare a moving carrier and a flickering light at fixed timestamps in both views. Verify that actor, light and dynamic occlusion move continuously together, animation is deterministic for the same time/input, and render invalidation updates the visible result without stale cached polygons. Extend the light facade tests and add synthetic package animation tests.

### M3 — Height-aware surface lighting

`buildIsometricWallLightPainters` in `src/dungeon/IsometricDungeonRendering.ts` currently maps floor illumination onto exposed wall faces. Replace that approximation incrementally with explicit emitter and receiver geometry, not projection or asset knowledge in the lighting package.

- [ ] **Package capability:** Define optional emitter/receiver geometry and pure distance and diffuse-facing calculations. Specify coordinate units, defaults and compatibility behavior before implementation; treat proposed API shapes as provisional.
- [ ] **Scene adoption:** Shade projected floor and wall receivers from the returned geometry while preserving depth ordering, sprite-alpha clipping and existing painter integration.
- [ ] **Game integration:** Supply intentional emitter heights and geometric wall/floor receiver data through game adapters and asset measurements. Do not infer authored measurements in `../lighting` or `../scene`.

**Dependencies:** M1 attenuation contract. Define units and defaults with both consumers before exposing height fields; retain the current renderer path as a compatibility profile until parity is established.

**Acceptance:** Compare a light beside floor, wall and corner receivers from multiple directions. Verify distance falloff and facing response, expected wall-side differences, texture/alpha preservation, depth ordering, and unchanged discovery limits. Extend `src/dungeon/IsometricDungeonRendering.test.ts`; add synthetic geometry tests in the package. Proposed height behavior must not silently change occlusion or wall-penetration rules.

### M4 — Surface illumination, actor response and emission

Separate the light that modulates existing artwork from the bright source itself and restrained glow. The game already integrates its isometric light mask with darkness; build on that integration instead of treating it as absent. Top-down veil composition lives in `../scene/src/lightsCanvas.ts`; isometric light drawing lives in `../scene/src/isoCanvas.ts` and game integration in `src/dungeon/IsometricDungeonRendering.ts`.

- [ ] **Package capability:** Provide only the light samples or optional visual-occluder data needed by consumers; keep surface compositing, emission, glow and projection out of the package.
- [ ] **Scene adoption:** Separate artwork-modulating illumination, source emission and restrained glow so overlapping light does not simply wash out the image. Provide consistent actor-level illumination sampling for both projections, using the existing isometric light-mask/darkness path.
- [ ] **Game integration:** Wire actor receiver positions and light values through existing adapters. Consider compact visual actor-shadow proxies only after reviewing compatibility and rules; do not replace full-cell actor blocking until its behavior is explicitly approved.

**Dependencies:** M1–M3 light contracts and scene compositing decision. Any change to actor blocking or ceiling-light behavior requires a compatibility and rules review before implementation.

**Acceptance:** Compare an actor beneath a ceiling light and overlapping colored lights in both views. Verify consistent actor illumination, preserved artwork texture, restrained emission/glow, expected darkness integration, and unchanged discovery boundaries. Add facade coverage in `src/dungeon/LightRendering.test.ts` and `src/dungeon/IsometricDungeonRendering.test.ts`; scene visual/raster behavior requires browser validation, not only no-op canvas tests.

### M5 — Height-aware shadows and later refinements

Build projected actor shadows and finite-emitter visibility on the explicit geometry contracts from M3. Do not increase sample counts before measuring the cost.

- [ ] **Package capability:** Add optional visual occluder proxies, hit-distance metadata and deterministic finite-emitter visibility samples in stages; preserve existing ceiling-light, diagonal-gap and opaque-cell penetration semantics unless separately reviewed.
- [ ] **Scene adoption:** Project geometry and shadow data into contact-aware shadows whose penumbra varies with emitter and blocker geometry; keep illumination softness independent.
- [ ] **Game integration:** Supply visual proxy geometry and integrate shadows without exposing undiscovered content or replacing existing readability cues without review.

**Dependencies:** M2 moving-proxy invalidation, M3 geometry contracts, and M4 compatibility review. Profile before adding samples or adopting heavier compositing.

**Acceptance:** Verify shadow contact and direction at fixed times, deterministic sampling, actor movement synchronization, discovery boundaries, and unchanged door/corner behavior. Measure browser frame-time percentiles and memory at high device-pixel density before accepting heavier sampling; report browser/device and cache conditions. Keep the existing no-op canvas benchmark for JavaScript/draw-call costs, but do not treat it as raster-performance evidence.

## Cross-cutting safeguards and deferred work

- Preserve intentional hero torches and door glows; realism work must not expose undiscovered rooms, actors or content.
- Link performance work to the existing [lighting tasks in `TODO.md`](TODO.md#lighting) and establish browser baselines before optimization, using the [real-browser baseline checklist](TODO-architecture.md). Do not move or duplicate those tasks here.
- Preserve current visibility, door, diagonal-gap, ceiling-light and opaque-cell behavior until a compatibility/rules review explicitly approves a change.
- Update `TECHNICAL.md` and relevant authoring specifications in the same implementation change whenever documented rendering behavior or authored light fields change.
- Keep normal maps, per-material response, bounce approximation, fog scattering and a shader backend explicitly deferred; none is a prerequisite for these milestones.
