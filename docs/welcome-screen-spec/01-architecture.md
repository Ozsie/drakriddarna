# 01 — Architecture

The welcome screen is a thin layer over existing surfaces: a phase store that
gates boot, three new rendering modules that follow the `src/ui/` layout/hit/
render pattern, and a small settings module that drives the existing audio
managers. The only game-logic changes are an optional `Campaign.maxHeroes`
field and a heroes override parameter on `init()`.

## Integration points

| Concern             | Surface                                                                                            | Notes                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boot behavior       | `getInitialState()` in `src/store/gameStateStore.ts`                                               | Today: `reloadGuard` → resume, otherwise `init()` straight into the default campaign. Change: otherwise → welcome phase, and **no** `GameState` is created. The `reloadGuard` branch is untouched                                                                            |
| Rendering & input   | `src/components/DungeonBoardController.ts`                                                         | Layered canvas rendering (`renderUiLayer` etc.) and all pointer/key routing. The controller gains a phase check: in `'welcome'` it renders the welcome UI and routes input to it, and skips board input and game UI                                                          |
| UI exports          | `src/ui/UIRendering.ts`                                                                            | New render/hit functions are exported from here alongside the existing ones, same pattern                                                                                                                                                                                    |
| New Game flow       | `src/ui/NewGameDialogRendering.ts`                                                                 | Reused; opened via the same callback the canvas menu uses (`MenuCallbacks.openNewGameDialog`). Its Begin no longer starts the run: it advances to the hero selection screen (04) with the chosen campaign, game master and mode                                              |
| Hero selection      | `src/game.ts` `init()`, `onNewGame` in `src/menu/MenuLogic.ts`, `Campaign` in `src/types.ts`       | `init()` gains an optional `heroes?: Hero[]` override that replaces `campaign.heroes` inside the existing `structuredClone` construction; `Campaign` gains optional `maxHeroes?: number` (default `heroes.length`). The registered campaign object is never mutated (see 04) |
| Load Game flow      | `src/ui/SaveLoadDialogRendering.ts` + `getSavedGameMenuItems` in `src/menu/MenuLogic.ts`           | Reused unchanged, load mode (`mode: 'load'`); loading calls the existing `onClickLoad`                                                                                                                                                                                       |
| Credits content     | `getRightsMenuItems` in `src/menu/MenuLogic.ts` and the `content.menu.rights.*` translations       | The credits sub screen renders the same rows (implementation, music, sfx, graphics) with the same links                                                                                                                                                                      |
| Music on/off today  | `GameState.settings['music']`, `musicModeStore`, `setMusic` in `gameStateStore.ts`                 | The app-level `musicOn` setting becomes authoritative; it mirrors into `settings['music']` whenever a game state exists so saves stay self-contained                                                                                                                         |
| Volume / mute       | `MusicManager.setVolume` / `setMuted`, `SoundEffectManager.setVolume` / `setMuted` in `src/audio/` | Already implemented; settings only call them. Defaults today: music 0.5, sfx 0.8                                                                                                                                                                                             |
| Background image    | `getReadyImage` in `src/core/ImageCache.ts`; asset in `static/`                                    | Same cache the sprite sheets use; `getReadyImage` returns `null` while loading, which drives the fallback                                                                                                                                                                    |
| Build info          | `$lib/buildInfo.json`                                                                              | `{ date, hash }`, written by the deploy workflow (`.github/workflows/deploy.yaml`); same source as the canvas menu footer                                                                                                                                                    |
| Translations        | `src/lib/translations/{en,sv}/content.json`                                                        | New keys under `content.menu.welcome.*`, `content.menu.settings.*` and `content.menu.heroSelection.*`; existing keys reused where they already exist                                                                                                                         |
| Campaign spec sync  | `docs/campaign-definition.md`, `src/campaigns/README.md`                                           | Repository rule: both are updated in the same change as the `Campaign` type change (`maxHeroes`)                                                                                                                                                                             |
| Music toggle wiring | `src/audio/index.ts` and the store subscription that applies `musicModeStore`                      | The subscription is re-pointed at the app settings store; `settings['music']` remains the saved mirror                                                                                                                                                                       |

## Module layout

New files only; the edits to existing files are listed in the integration
points above (plus `TECHNICAL.md`).

```
src/store/appPhaseStore.ts        // AppPhase + WelcomeView, persisted nowhere
src/settings/AppSettings.ts       // load/save/apply app settings (+ mirror logic)
src/settings/AppSettings.test.ts
src/ui/WelcomeRendering.ts        // background image + main view layout/hit/render
src/ui/WelcomeRendering.test.ts
src/ui/SettingsRendering.ts       // settings + credits views layout/hit/render
src/ui/SettingsRendering.test.ts
src/ui/HeroSelectionRendering.ts // hero selection view layout/hit/render
src/ui/HeroSelectionRendering.test.ts
static/images/welcome.png         // human-authored art (see AI policy)
src/lib/translations/{en,sv}/content.json   // new keys (human-authored wording)
```

All three rendering modules follow the existing convention: a `get…Layout`
function producing pure bounds data, a `get…Hit` function mapping a pointer
position to a hit result, and a `render…` function painting from the layout —
each with colocated tests. The layout/hit split is what keeps them testable
without a real canvas.

## Phase and state model

```
AppPhase = 'welcome' | 'game'
WelcomeView = 'main' | 'settings' | 'credits' | 'heroSelection'
// only meaningful in 'welcome'; 'heroSelection' is reached only from the
// new-game dialog and returns there on Back
```

Flow:

```
app start
  └─ getInitialState()
       ├─ localStorage.reloadGuard exists → load it, phase = 'game'   (unchanged)
       └─ otherwise → phase = 'welcome', no GameState created         (new)

welcome 'main'
  ├─ New Game  → open new-game dialog
  │     └─ Begin → welcome view = 'heroSelection'
  │           ├─ select 1..maxHeroes heroes from the campaign roster, rename as desired
  │           ├─ Start → onNewGame(campaign, gameMaster, seed, selectedHeroes)
  │           │           → init(..., heroes) → phase = 'game'
  │           └─ Back → new-game dialog (previous selections remembered)
  ├─ Load Game → open load dialog → onClickLoad(...) → phase = 'game'
  └─ Settings  → welcome view = 'settings'
       ├─ Music/Audio toggles + volume sliders → AppSettings
       ├─ Credits → welcome view = 'credits' → Back → 'settings'
       └─ Back → welcome view = 'main'

in game ('game')
  └─ existing menu, dialogs and gameplay are untouched;
     the in-game Music toggle now writes the app setting (mirrored to settings['music'])
```

The phase store is a plain Svelte `writable` in `src/store/appPhaseStore.ts`.
It is deliberately not persisted: a fresh visit always starts at the welcome
screen, and the `reloadGuard` is the only thing that resumes a game
automatically.

## Draw order

When the phase is `'welcome'`, the UI layer renders, in order:

1. The background image, cover-fit over the entire canvas (see 02). It
   covers the board and all other UI components — nothing of the game is
   visible behind it.
2. The active welcome view's panel (main buttons, settings rows, credits
   rows, or hero selection rows) on top of the image.
3. The build footer text at the bottom center.
4. Any open dialog (new-game, load) on top, using the dialog's own existing
   backdrop and panel.

While a dialog is open it captures all input, exactly as it does from the
canvas menu today. The hero selection screen also captures keyboard input
while a rename input is focused, like the save dialog does.

## Input gating

`DungeonBoardController` already gates board input on modal state
(`isCanvasMenuOpen`, open dialogs). The phase adds one more, outermost
condition: in `'welcome'`, pointer and key events are routed only to the
welcome UI (hover, clicks, slider drags, rename input capture, Escape on sub
views) and never reach board or gameplay handlers. `Escape` on the welcome
main view does nothing (there is nothing to dismiss); on `'settings'`,
`'credits'` and `'heroSelection'` it acts as Back (see 04 for the
hero-selection Escape nuance while an input is focused).

## Persistence format

`localStorage['appSettings']` — one JSON object, written on every change
(debounced like the reload guard is not necessary; the object is tiny):

```json
{
  "musicOn": true,
  "sfxOn": true,
  "musicVolume": 0.5,
  "sfxVolume": 0.8
}
```

- Volumes are stored as numbers in `[0, 1]`; the UI presents them as
  0–100 percent.
- Missing, partial or invalid JSON falls back to the defaults above
  (the current manager defaults).
- Settings load once at boot and are applied immediately to both managers;
  changes apply live while a slider is dragged.
- `musicOn: false` is equivalent to `setMuted(true)` on the music manager;
  `sfxOn: false` equivalently mutes the sound-effect manager. The volume
  values are kept so unmuting restores them.
