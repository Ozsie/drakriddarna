# 05 — Milestones

Work through the milestones in order; each definition of done must be
satisfied before the next begins.

## M1 — Phase state and boot change

Create `src/store/appPhaseStore.ts`; change `getInitialState()` so a fresh
visit (no `reloadGuard`) starts in the `'welcome'` phase without creating a
`GameState`. The reload-resume branch is untouched. The game side
(`Dungeon`, `DungeonBoardController`) tolerates having no game state while
in `'welcome'` (nothing crashes, nothing gameplay-related renders).

**Definition of done**

- Fresh visit shows the (fallback-background) welcome phase; no campaign is
  initialized.
- Reloading mid-game resumes the game directly.
- `appPhaseStore` unit tests cover phase transitions.
- Existing tests pass; `npm run check` clean.

## M2 — Welcome screen rendering

`src/ui/WelcomeRendering.ts`: layout/hit/render for the main view —
cover-fit background image (with `#121418` fallback), panel, three buttons,
build footer. Wired into the UI layer behind the phase check, with board
and gameplay input gated off in `'welcome'`.

**Definition of done**

- Main view renders in the between-dungeons/save-load style with the three
  buttons and the build footer.
- Background image covers the whole canvas when present; fallback renders
  when absent (tests run without the asset).
- Layout and hit functions are unit-tested (bounds, hover targets, footer).
- No board or gameplay UI is visible or interactive while in `'welcome'`.

## M3 — New Game and Load Game wiring

The welcome buttons open the existing new-game and load dialogs via the
same callbacks the canvas menu uses; starting/loading switches the phase
to `'game'`; cancel/back returns to the welcome screen.

**Definition of done**

- New Game → dialog; choosing campaign, game master and game mode and
  pressing Begin proceeds to the hero selection screen (M4) — in this
  milestone Begin may still start the game directly, to be superseded by
  M4.
- Load Game → dialog → save loads exactly as from the canvas menu; with no
  saves the dialog shows only Back.
- Cancel/Back/Escape return to the welcome main view.
- Dialog input capture works while the welcome screen is behind it.

## M4 — Hero selection

`Campaign.maxHeroes` (optional, default `heroes.length`), the hero
selection screen (`src/ui/HeroSelectionRendering.ts`), rename inputs, and
the `heroes` override through `init()` / `onNewGame` (see 04). Begin in the
new-game dialog now advances to the hero selection screen; Start there
begins the run with the selected, possibly renamed party.

**Definition of done**

- The selection screen shows the campaign roster with the default names
  from `iceDragonTreasure`; all heroes up to `maxHeroes` start selected.
- The player can deselect down to 1 and select up to `maxHeroes`;
  selection is capped and Start is disabled below 1 selected.
- Renaming works per 04 (empty-name rule pinned by a test), and the run
  starts with the selected heroes replacing `campaign.heroes` via the
  `init()` override — the registered campaign object is never mutated.
- Renamed heroes keep the original roster `id` and get the new name as
  `nameTranslationKey`.
- `docs/campaign-definition.md` and `src/campaigns/README.md` are updated
  in the same change as the `Campaign` type.
- Unit tests: layout/hit/render bounds, selection cap logic, rename
  fallback, `init()` override (selected heroes present in the new state,
  campaign registry unchanged).
- Existing tests pass unchanged except where the Begin flow intentionally
  moves to hero selection.

## M5 — Settings, credits and audio settings

`src/settings/AppSettings.ts` (load/apply/persist/mirror) and
`src/ui/SettingsRendering.ts` (settings + credits views). Sliders, toggles,
persistence, live application to the audio managers, `musicOn` mirroring to
`GameState.settings['music']`, and the in-game Music menu item re-pointed
at the app setting.

**Definition of done**

- All five settings rows behave as specified in 03 (including slider drag,
  clamping, dimmed-when-muted, live volume changes).
- Settings survive a reload; invalid stored JSON falls back to defaults.
- Credits view shows the rights rows and opens links in a new tab.
- In-game Music toggle keeps working and stays in sync with the setting.
- Unit tests for AppSettings (defaults, invalid JSON, mirroring) and for
  the settings/credits layout and hit functions.

## M6 — Polish and documentation

Human-authored strings (welcome/settings/hero-selection labels, and the
background image) are in place; the write-up is updated.

**Definition of done**

- All new i18n keys exist in both `en` and `sv` (human-authored wording,
  AI-translated).
- The background image asset exists (human art) and renders cover-fit on
  desktop and narrow/compact widths without covering the buttons or
  footer.
- `TECHNICAL.md` is updated in the same change (app entry/phase model,
  welcome/settings/hero-selection rendering, app settings persistence,
  the `maxHeroes` field and the hero override).
- `npm run check`, `npm test`, `npm run lint` and `npm run prettier` all
  pass.
