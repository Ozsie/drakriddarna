# Drakriddarna Welcome Screen

A welcome (title) screen at app start instead of booting straight into a
campaign: New Game, Load Game and Settings over a full-canvas background
image, a build/version footer, a Settings sub screen with music/audio
toggles, volumes and Credits, and a hero selection step in the New Game
flow (select and rename 1 to `Campaign.maxHeroes` heroes). All screens in
the existing between-dungeons / save-load dialog style.

## Specification

The full spec lives in [`docs/welcome-screen-spec/`](./). It is
authoritative for the phase model, screen behavior, settings persistence
and milestones.

Read it in this order before writing any code:

1. `README.md` — scope, decisions already made
2. `01-architecture.md` — integration points, module layout, state model
3. `02-welcome-screen.md` — the welcome screen behavior
4. `03-settings-screen.md` — settings and credits behavior
5. `04-hero-selection.md` — hero selection, `maxHeroes`, renaming
6. `05-milestones.md` — M1–M6 with definitions of done

Where the spec and the game source disagree, **the game source wins**
(`src/store/gameStateStore.ts` for boot, `src/components/DungeonBoardController.ts`
for rendering and input, `src/ui/` for the layout/hit/render pattern,
`src/menu/MenuLogic.ts` for menu items and callbacks, `src/audio/` for the
audio managers).

## Repository layout

- New code: `src/store/appPhaseStore.ts`, `src/settings/AppSettings.ts`,
  `src/ui/WelcomeRendering.ts`, `src/ui/SettingsRendering.ts`,
  `src/ui/HeroSelectionRendering.ts` (each with a colocated `*.test.ts`),
  new i18n keys in `src/lib/translations/{en,sv}/content.json`, and the
  background image in `static/images/`.
- Existing surfaces are consumed, not forked: the new-game and load
  dialogs, `MenuLogic` callbacks and the audio managers. The only edits to
  existing files are the boot branch in `getInitialState()`, the phase gate
  in `DungeonBoardController`, the exports in `UIRendering.ts`, the
  music-toggle re-pointing, the optional `Campaign.maxHeroes` field and
  `init()`/`onNewGame` heroes override, the campaign spec doc sync
  (`docs/campaign-definition.md`, `src/campaigns/README.md`), and
  `TECHNICAL.md`.

## AI policy

Per the project AI Policy (see the repo `README.md`): AI tools are used to
produce, test, and review code, and to create translations of in-game
texts.

For this spec that means: AI writes, tests, and reviews the screen, phase,
settings and hero-selection code. The **background image is human-authored
art** — AI must not generate, edit or placeholder-generate it; the code
renders a solid fallback until the artist delivers. Any new user-facing
text (welcome, settings and hero-selection labels, headings) is authored by
a human in at least one language first — the spec lists the needed i18n
keys and their meaning, not the wording. The credits rows and the default
hero names (`Fearik`, `Helbran`, `Siedel`, `Wulf`) are existing
human-authored content; do not rewrite, extend or translate-rename them.
Player-typed hero names are user content — pass them through, never
generate or correct them. Once a text exists in one language, AI may
create the translation into the other language (`en`/`sv`).

## Non-negotiable rules

- The phase lives outside `GameState`; the save format, `saveMigration.ts`
  and game logic are untouched. The registered campaign objects are never
  mutated — the selected heroes reach the run only through the `init()`
  heroes override. If a core change seems required beyond the two specified
  ones (`Campaign.maxHeroes`, the `init()` override), stop and surface it —
  do not slip it in.
- New Game and Load Game reuse the existing dialogs and their callbacks;
  do not rebuild or fork those flows. Hero selection extends the New Game
  flow after the dialog, it does not modify the dialog itself.
- Update `docs/campaign-definition.md` and `src/campaigns/README.md` in
  the same change as the `Campaign.maxHeroes` field — do not let the
  campaign spec drift.
- All user-facing strings in both `en` and `sv` via sveltekit-i18n; no
  hardcoded text.
- Strict TypeScript, no `any`, no `console` (use the logger if logging is
  genuinely needed); colocated `*.test.ts` per module; prettier single
  quotes and 2-space indent.
- Keep the visual tokens of the existing dialogs (backdrop, panel, gold
  border, fonts, button styles); do not invent a second visual language.
- Do not add v1 non-goals from the spec README (exit-to-welcome menu item,
  keyboard navigation, animated background, per-save volumes, editing hero
  stats or colours, roster growth). Do not build these unasked.

## Working discipline

Work through milestones M1–M6 in `05-milestones.md` strictly in order; each
milestone's definition of done must be satisfied before the next begins.
Run `npm run check`, `npm test`, `npm run lint` and `npm run prettier`
before considering work done.
