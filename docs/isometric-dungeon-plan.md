# Isometric Dungeon Presentation

## Goal and invariants

Offer an optional isometric presentation of the existing dungeon. Top-down
remains the default, and the settings menu lets the player switch between the
two renderers. Dungeon definitions, game rules, pathfinding, fog-of-war state,
and saves continue to use the current logical `x/y` grid.

The renderer preference is an app-level presentation setting, stored in
`localStorage['appSettings']`. Missing, partial, or invalid stored values
default safely to `topDown`; it is not copied into a saved run.

## Architecture

- `../scene` owns reusable isometric projection, depth sorting, floor and wall
  compositing, light projection, and hero-overlay rendering. Its
  `SceneIsoWorldView` and painter views contain rendering data, not game rules.
- `src/dungeon/IsometricDungeonRendering.ts` adapts the existing fog-resolved
  dungeon, actor, item, decorator, found-secret, and light-sprite views into
  that API. The world view supplies floor/terrain colors, room overlays, pits,
  visible doors, and wall cells; tall game sprites join walls in a shared depth
  queue.
- `src/components/DungeonBoardController.ts` selects the rendering path,
  invalidates cached layers on mode changes, projects light masks and transient
  effects, and keeps settings and radial-menu hit mapping aligned with the
  active camera.
- `src/camera/IsometricCamera.ts` provides the camera view and inverse
  screen-to-world/grid projection. Pan, zoom, and pointer-anchored zoom use the
  same projection as rendering.

## Cell graphics indexes

The renderer loads its default `version: 1` tile catalog from
`static/isometric/index.json`. A dungeon may set `isometricGraphics` to a
folder relative to `static/campaigns/<campaignId>/`; that folder contains its
own `index.json` and image files. Campaign `cells`, `wallShapes`, and `tiles`
entries merge over the shared catalog by key, and each tile image path is
relative to the index folder. Grid-character mappings take precedence over
the `floor`, `wall`, and `door` cell-kind mappings. `wallShapes` covers the
16 possible four-way wall-side masks; the renderer derives sides from adjacent
visible room floors (for example, a north wall has floor immediately south)
and falls back to connected-wall masks when no floor is visible. Cardinal
column sprites mark room turns and corridor ends; closed doors retain their
door sprite and add column caps where adjoining walls terminate. Entries can
list multiple image layers for composites. Door mappings can distinguish open
and closed art for each side. The scene package draws image-backed floors in
its floor pass and image-backed walls and doors in the same depth queue as
actors and props; image sizing follows the active projection and cell size.

## Settings flow

`src/settings/AppSettings.ts` persists `renderMode: 'topDown' | 'isometric'`
with a `topDown` default. `src/ui/viewmodels/settings.ts` adds the localized
`Camera Mode` toggle; its English source label was supplied by a human and the
Swedish translation is in `src/lib/translations/sv/content.json`. Typed hit
mapping in `src/ui/SettingsRendering.ts` dispatches the toggle to
`DungeonBoardController.ts`.

## Delivery stages

1. **Shared scene pipeline — implemented.** The scene package supports
   per-cell colors and overlays, pits, depth-sorted game painters, isometric
   light compositing, and projected turn overlays. Its tests cover painter
   ordering, floor treatments, and overlay drawing.
2. **Game prototype and interaction — implemented.** The first game adapter
   renders the sealed grid, visible doors, walls, actors, items and props.
   Input, hover, camera pan/zoom, and radial-menu anchors use inverse or
   forward projection while the logical grid remains unchanged.
3. **Preference and selection — implemented.** The app setting defaults and
   parses compatibly, the settings toggle is localized and typed, and mode
   changes invalidate the render signatures.
4. **Remaining scene layers — initial coverage implemented.** Terrain colors,
   room overlays, pits, pillars, interactable markers, portal, lighting,
   hero turn feedback, and transient combat effects have isometric paths.
   Undiscovered cells and their terrain, overlays, pits, and room contents are
   masked until discovery, including while debug overlays are enabled; hidden
   rooms do not contribute isometric lights. Discovered room fog absorbs its
   configured density from the projected light mask before it drives visible
   glow and ambient darkness; fog that blocks light remains part of light
   occlusion. Visual parity and animation timing still need manual review; the
   current room/terrain treatment is a projected cell overlay rather than a
   full reproduction of every top-down animation.
5. **Release and visual verification — pending.** Verify image dimensions,
   anchors, visual consistency, and licensing before reusing any Rpg assets;
   no Rpg art has been added and no art was generated or altered. Test both
   renderers in a browser at multiple viewport sizes, including zoom and
   radial-menu interactions. Update the published `@hoard-engine/scene`
   package and the app dependency to a matching release before validating a
   clean install outside the sibling-repository workspace.

## Validation gates

- Check old, partial, malformed, and valid `appSettings` data; verify the
  renderer preference persists without entering run saves.
- Exercise the settings row labels, toggle hit, and mode change in both
  languages; confirm the default remains top-down.
- Test world/screen/grid round trips with pan and zoom, plus pointer-anchored
  zoom and projected radial-menu positioning.
- Verify floor/wall/actor/prop ordering, light alignment, fog visibility,
  undiscovered rooms and contents stay hidden in normal and debug modes,
  transient effects, cache invalidation, and top-down regression.
- Run `npm run check`, `npm test`, `npm run lint`, and `npm run build` in the
  game; run the scene package's tests, lint, formatting check, and build.
