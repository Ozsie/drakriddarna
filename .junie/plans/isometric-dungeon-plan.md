---
sessionId: session-261115-141628-jszj
---

# Requirements

### Overview & Goals

Implement an optional isometric dungeon presentation in Drakriddarna, using the `@hoard-engine/scene` package pipeline selected by the user. Preserve the existing top-down renderer and add a persisted settings-menu switch between modes.

### Scope

- Keep dungeon data, game rules, pathfinding, fog-of-war state, and saves on the existing logical grid.
- Keep top-down rendering as the default and preserve it as a selectable mode.
- Implement the feature in stages, beginning with floor, walls/doors, and a hero before expanding to remaining dungeon features.
- Put reusable isometric projection, depth sorting, and compositing in `../scene`; keep dungeon-specific view construction in Drakriddarna adapters/facades.
- Treat asset reuse, sizing, anchoring, and licensing as verification work; do not generate or author game art or user-facing copy.
- The plan is implementation guidance and must be revised to match any confirmed scope changes.

# Technical Design

### Current Implementation

- `src/components/DungeonBoardController.ts` composes cached static and dynamic canvas layers and handles settings-menu hits. Static dungeon elements and dynamic actors/effects are currently drawn through separate passes.
- `src/dungeon/DungeonRendering.ts`, `src/scene/ActorRendering.ts`, `src/items/ItemRendering.ts`, and `src/scene/adapters.ts` are game-side rendering facades/adapters over `@hoard-engine/scene`.
- `src/settings/AppSettings.ts` owns app-level settings persistence in `localStorage['appSettings']`; `src/ui/viewmodels/settings.ts` builds localized menu rows; `src/ui/SettingsRendering.ts` adapts settings layout and hit results to the HOARD UI kit. Existing labels are sourced from `src/lib/translations/{en,sv}/content.json`.
- `src/hero/ClickInputLogic.ts` maps screen coordinates to grid cells for top-down rendering. Rpg demonstrates isometric projection adaptation in `../rpg/src/game/scene/render.ts`; the shared scene package exports projection helpers, but not Drakriddarnas full dungeon renderer.

### Key Decisions

- Put reusable isometric projection, depth sorting, and compositing in the `@hoard-engine/scene` package, following the selected scene-package pipeline and the existing engine-package boundary. Keep game vocabulary and dungeon-specific view construction in Drakriddarnas adapters/facades.
- Model the renderer choice as an app-level persisted preference, defaulting to top-down. It is a presentation preference, not a game-rule or saved-run setting.
- Preserve the logical `x/y` grid; adapt mouse picking and screen-relative movement through inverse projection rather than changing dungeon coordinates.

### Proposed Changes

Implement a selectable rendering path, not a game-logic rewrite. Cover the isometric scene-package API and game adapter/controller integration; floor, wall/door, terrain/prop, actor, lighting/fog, and effect rendering; painter/depth ordering across layers; camera/pan/zoom alignment; and asset-fit checks. Add the renderer preference through the existing app-settings flow and switch paths in `DungeonBoardController.ts`, invalidating cached layers as needed. Any new menu copy must be supplied by a human and translated through the existing English and Swedish translation files; do not invent labels.

### File Structure

- Implement shared isometric scene functionality in `../scene` and integrate it through Drakriddarna rendering, input, settings, translation, and documentation entry points.
- Keep `docs/isometric-dungeon-plan.md` as the durable implementation roadmap and update `TECHNICAL.md` with completed architecture changes.
- The app currently resolves `@hoard-engine/scene` through the local sibling link; publish and consume a matching package release before validating an independent clean install.

### Risks

- Existing static/dynamic layer separation may prevent correct occlusion between tall geometry and actors; the plan must call out layer interleaving or compositing changes.
- Switching modes must invalidate cached render signatures and keep hover, targeting, radial-menu anchors, camera transforms, and lighting aligned with the active projection.
- Reusing Rpg tiles requires human verification of dimensions, anchors, consistency, and licensing.
- The isometric app path requires the updated scene API; the locally linked package must be released before clean installs can use it.

# Validation

### Validation Approach

- Test app-settings parsing/defaults and persistence; verify old or partial `appSettings` data safely defaults to top-down.
- Test settings-row labeling, toggling, and hit mapping through the settings view model/facade and `DungeonBoardController.ts`.
- Test world-to-screen and screen-to-grid round trips, including pan/zoom, and projected depth ordering in the scene package.
- Verify mode changes redraw affected layers, preserve top-down behavior, and keep picking, hover, targeting, radial menus, and lighting aligned.
- Run `npm run check`, `npm test`, and `npm run lint` after implementation; run relevant tests/build checks for `../scene` changes.
- Update `TECHNICAL.md` alongside implementation changes to rendering architecture.

# Delivery Steps

### ✓ Step 1: Build shared isometric scene pipeline

Implement and test the reusable package-level projection/rendering/compositing API in `../scene`, maintaining its dependency boundary and public exports.

- Support floor-cell projection, painter/depth ordering, and interleaving geometry and actors where required.
- Preserve existing scene behavior and add projection/depth-order tests.

### ✓ Step 2: Add Drakriddarna isometric prototype and picking

Integrate the package API with dungeon views for the initial floor, wall/door, and hero prototype while preserving logical grid state.

- Adapt camera transforms and screen-to-grid picking; check pan/zoom and screen-relative interaction alignment.
- Verify reused assets' dimensions, anchors, consistency, and licensing; do not create or alter art.

### ✓ Step 3: Add persisted render-mode setting and UI path

Add a top-down-default app preference and connect it through settings view-model rows, localized labels, hit mapping, and `DungeonBoardController.ts` renderer selection.

- Preserve compatibility with existing and partial `appSettings` values.
- Obtain human-authored labels before introducing new user-facing copy; do not generate labels or translations.
- Invalidate relevant cached render layers when changing modes.

### ✓ Step 4: Expand isometric coverage and interaction alignment

Extend rendering to remaining dungeon features and align lighting, fog, actors, items, interactables, effects, hover, targeting, radial-menu anchors, and camera behavior.

- Resolve occlusion across current static/dynamic layers using scene-package compositing.
- Mask undiscovered cells, floor treatments, pits, and room contents until discovery; cover the hidden-cell contract and found-secret views with regression tests.
- Keep top-down rendering as the default and regression-test both paths.

### ✓ Step 5: Document and validate completed implementation

Update `TECHNICAL.md` and this roadmap to reflect the delivered architecture, then run required checks.

- Test settings compatibility/toggling, projection/picking, pan/zoom, depth ordering, occlusion, cache invalidation, and top-down regression.
- Run `npm run check`, `npm test`, and `npm run lint`, plus relevant scene-package validation.
