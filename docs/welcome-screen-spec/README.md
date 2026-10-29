# Welcome Screen — Specification & Agent Guidelines

This folder contains the complete specification for a **welcome screen** (title
screen): the app opens on a dedicated screen instead of booting straight into
a campaign. The screen offers **New Game**, **Load Game** and **Settings**,
shows the current build information at the bottom, and is drawn over a
full-canvas background image that covers the game board and every other UI
component. Settings opens a sub screen with music/audio toggles, music/audio
volume sliders and Credits (rights and licenses). Every screen in the feature
uses the same visual style as the existing between-dungeons screen and the
save/load dialogs.

## Scope decisions (already made — do not relitigate)

| Decision | Choice |
| --- | --- |
| App entry | A fresh visit lands on the welcome screen. No campaign is initialized and no `GameState` is created until the player picks New Game or Load Game |
| Reload protection | The existing `reloadGuard` resume behavior is preserved: reloading mid-game still returns straight into the running game, not the welcome screen |
| Phase state | A new `appPhaseStore` holds `'welcome' \| 'game'` plus the welcome sub views `'main' | 'settings' | 'credits'`. The phase is **not** part of `GameState` and is never saved |
| Background image | One human-authored image, drawn cover-fit over the whole canvas, above the board and all UI layers. Solid-color fallback while the image is loading or missing |
| New Game / Load Game | Reuse the existing new-game and load dialog flows. New Game gains a **hero selection step** between the new-game dialog and the run: the player selects 1 to `Campaign.maxHeroes` heroes from the campaign roster (default `heroes.length`), can rename them (defaults are the `iceDragonTreasure` names), and the selection replaces `campaign.heroes` for the run via an `init()` override — the campaign module is never mutated |
| Hero limits | Minimum is always 1. Maximum is the campaign's `maxHeroes` when set, otherwise the campaign's roster size |
| Settings persistence | A new app-level settings object in `localStorage` (key `appSettings`): `musicOn`, `sfxOn`, `musicVolume`, `sfxVolume`. `musicOn` mirrors into `GameState.settings['music']` so saves stay self-contained |
| Audio plumbing | Only the existing `MusicManager` / `SoundEffectManager` `setVolume` / `setMuted` APIs; no new audio code paths |
| Credits | Reuses the existing rights & licenses content (`content.menu.rights.*` translations and links) rendered as a styled sub screen |
| Build footer | `$lib/buildInfo.json` (`date` + `hash`), bottom center, same format as the existing menu footer: `${date} - ${hash}` |
| Visual style | The between-dungeons / save-load dialog tokens: backdrop `rgba(10, 12, 16, 0.85)`, panel `#181b22`, gold border `#d4af37`, corner radius 10, Arial font stack |
| Title treatment | No canvas-drawn game title in v1; the title/logo is part of the human-authored background image (or absent) |
| Non-goals (v1) | Exit-to-welcome from the in-game menu, keyboard/controller navigation of welcome buttons, animated or parallax background, per-save volume settings, profile/save-slot management, editing hero stats or colours, adding heroes beyond the campaign roster |

### Rationale for the two biggest calls

**The phase lives outside `GameState`.** `GameState` requires a dungeon,
heroes and decks; the welcome screen exists precisely when there is no game
yet. Putting the phase in a small dedicated store keeps `GameState`, the save
format and `saveMigration.ts` untouched, and lets `gameStateStore` keep its
current shape (it still holds `null`-able "no game yet" semantics via the
phase store rather than a fake state).

**Reuse the dialogs, do not rebuild them.** The new-game dialog
(`src/ui/NewGameDialogRendering.ts`) and the load dialog
(`src/ui/SaveLoadDialogRendering.ts`) already implement exactly what New
Game and Load Game must do, including hit testing, hover, keyboard capture
and the speedrunner seed. The welcome buttons call the same open-dialog
callbacks the canvas menu uses (`MenuCallbacks.openNewGameDialog` /
`openLoadDialog`), so behavior stays identical by construction. New Game is
extended, not replaced: Begin now advances to hero selection (04) instead
of starting the run.

**The hero selection replaces the party per run, via an `init()` override.**
The campaign objects registered in `src/campaigns/index.ts` are module
singletons shared by every run; mutating `campaign.heroes` would leak the
selection into the next run. Passing the selected heroes as an override
into `init()` — which already `structuredClone`s the campaign — keeps the
registry untouched and every downstream consumer (starting equipment, live
heroes, game-master hooks) working without changes.

## Reading order

| Doc | Contents |
| --- | --- |
| [01-architecture.md](./01-architecture.md) | Integration points, module layout, phase/state model, draw order, persistence format |
| [02-welcome-screen.md](./02-welcome-screen.md) | The welcome screen: background image, buttons, build footer, input behavior |
| [03-settings-screen.md](./03-settings-screen.md) | The settings and credits sub screens: toggles, sliders, persistence, audio application |
| [04-hero-selection.md](./04-hero-selection.md) | The hero selection screen: roster, `maxHeroes` limits, renaming, `init()` override |
| [05-milestones.md](./05-milestones.md) | Implementation phases M1–M6, each with a definition of done |

## How to brief an agent

Give the agent this folder as its specification and tell it:

- The game repository is the authority for every surface the spec references:
  `src/store/gameStateStore.ts` (boot), `src/components/DungeonBoardController.ts`
  (rendering and input), `src/ui/` (the layout/hit/render pattern),
  `src/menu/MenuLogic.ts` (menu items and callbacks), `src/audio/` (managers).
  Where the spec and the game source disagree, the game source wins.
- Read the docs in numbered order before writing code.
- Work milestone by milestone (04); each milestone has an explicit definition
  of done including tests.
- Obey the repo's existing constraints: strict TypeScript (no `any`, no
  `console` — use the logger in `src/core/logger.ts`), colocated `*.test.ts`,
  prettier single quotes / 2-space indent, every user-facing string in both
  `en` and `sv` via sveltekit-i18n.
- **Text and art are human-authored.** The background image is produced by a
  human artist; AI must not generate it. New user-facing strings (welcome
  buttons, settings labels, credits heading) are authored by a human in at
  least one language first — the spec lists the needed i18n keys and their
  meaning, not the final wording. Once a text exists in one language, AI may
  translate it into the other.
- Run `npm run check`, `npm test`, `npm run lint` and `npm run prettier`
  before considering work done.

## Glossary

- **Welcome screen** — the title screen shown on app start; welcome view
  `'main'`.
- **Phase** — whether the app is on the welcome screen or in the game
  (`appPhaseStore`: `'welcome' | 'game'`).
- **Welcome view** — which sub screen of the welcome phase is visible:
  `'main'`, `'settings'` or `'credits'`.
- **App settings** — the `localStorage`-persisted audio settings object
  (`appSettings`), independent of any save.
- **Cover fit** — the background image is scaled uniformly so it covers the
  whole canvas, cropping overflow (CSS `background-size: cover` semantics).
- **Build info** — `{ date, hash }` from `$lib/buildInfo.json`, written by
  the deploy workflow.
- **Hero selection** — the screen between the new-game dialog and the run
  start, where the player picks and renames the party.
- **Roster** — the selected campaign's `heroes`; the default names in
  every campaign today are the `iceDragonTreasure` ones
  (Fearik, Helbran, Siedel, Wulf).
- **`maxHeroes`** — the new optional `Campaign` field capping the party
  size; defaults to the roster size when omitted.
