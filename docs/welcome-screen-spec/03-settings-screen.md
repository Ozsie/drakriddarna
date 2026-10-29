# 03 — Settings & Credits Screens

Settings is a sub screen of the welcome phase (`WelcomeView = 'settings'`),
and Credits a sub screen of Settings (`'credits'`). Both reuse the welcome
screen's panel style (see 02): same centered panel, sizing, fonts, row and
button styles, same background image and build footer behind them.

## Settings view

A centered panel titled with the human-authored settings header, containing
five rows and a Back button:

| Row          | Type          | Behavior                                                                                         |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------ |
| Music        | On/Off toggle | Toggles `appSettings.musicOn`. Off = `MusicManager.setMuted(true)`; the volume value is kept     |
| Audio        | On/Off toggle | Toggles `appSettings.sfxOn`. Off = `SoundEffectManager.setMuted(true)`; the volume value is kept |
| Music volume | Slider        | 0–100 percent, maps linearly to `[0, 1]` via `MusicManager.setVolume`                            |
| Audio volume | Slider        | 0–100 percent, maps linearly to `[0, 1]` via `SoundEffectManager.setVolume`                      |
| Credits      | Button row    | Switches to the credits view                                                                     |

- **Back button** in the primary action position (bottom-right of the
  panel, the position the load dialog's Back uses) returns to the welcome
  main view. `Escape` behaves as Back.
- **Toggles** render as rows whose label carries the state, following the
  existing menu label pattern (e.g. the canvas menu's `Music: On/Off`).
  Click anywhere on the row toggles.
- **Sliders**: a track with a handle inside the row.
  - Pointer down on the track sets the value from the x position; dragging
    updates it live (the volume changes audibly as you drag); release
    commits.
  - The value is drawn on the row (e.g. `50%`).
  - When the corresponding toggle is Off, its slider is drawn dimmed and
    does not respond to input.
  - A drag that leaves the track vertically still tracks until pointer
    up (standard slider behavior); values clamp to `[0, 100]`.
- Every change writes `appSettings` to `localStorage` and applies to the
  managers immediately (see 01, persistence format).

### Relationship to the existing in-game Music toggle

- The app setting `musicOn` is the single source of truth.
- When a `GameState` exists, every change mirrors to
  `GameState.settings['music']` (so saves keep working and
  `musicModeStore` keeps deriving correctly).
- The in-game canvas menu's Music item toggles the app setting instead of
  writing `settings['music']` directly; the mirror keeps both in sync.
- Loading a save does **not** overwrite the app setting; the mirror is
  one-directional (app setting → save field).

## Credits view

A centered panel in the same style listing the rights and licenses — the
same content the canvas menu's Rights view shows today, from
`content.menu.rights.*`:

| Row            | Content today                                                                  |
| -------------- | ------------------------------------------------------------------------------ |
| Implementation | `content.menu.rights.implementation`                                           |
| Music          | `content.menu.rights.musicLicense` — opens the music license link in a new tab |
| SFX            | `content.menu.rights.sfx` — opens the sfx license link in a new tab            |
| Graphics       | `content.menu.rights.graphics`                                                 |

- External rows open their link with `window.open(url, '_blank',
'noopener, noreferrer')`, exactly like `getRightsMenuItems` does today;
  the URLs live next to the row definitions, not hardcoded in the renderer.
- The wording of these rows is human-authored content and may be extended
  by a human (e.g. replacing the Graphics placeholder) — do not author,
  rewrite or extend it as AI.
- **Back button** in the primary action position returns to the settings
  view. `Escape` behaves as Back.

## i18n keys

| Key                                  | Meaning                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `content.menu.settings.header`       | Settings panel heading                                                              |
| `content.menu.settings.music`        | Music toggle row label                                                              |
| `content.menu.settings.audio`        | Audio toggle row label                                                              |
| `content.menu.settings.musicVolume`  | Music volume row label                                                              |
| `content.menu.settings.audioVolume`  | Audio volume row label                                                              |
| `content.menu.settings.credits`      | Credits row label                                                                   |
| `content.menu.settings.buttons.back` | Back button (may reuse `content.menu.loadGame.buttons.back` if the wording matches) |
| `content.menu.rights.header`         | Credits heading — reuse of the existing key                                         |

The `On`/`Off` state suffix follows whatever solution the existing menu
labels use (`getMusicMenuLabel`); if new state words are needed, they are
human-authored too.
