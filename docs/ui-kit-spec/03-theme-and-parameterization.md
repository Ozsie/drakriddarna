# 03 — Theme and Parameterization

Tokens, not per-component styles.

## Theme

| Group      | Contents                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| palette    | surface, surfaceRaised, overlayScrim, border, borderStrong, text, textMuted, textOnAccent, accent, danger, success, warning |
| status     | hp good/low/critical, disabled, hover, pressed, selected                                                                    |
| typography | font families; size scale xs to xl; weights; line-height factors                                                            |
| spacing    | a small scale used for padding and gaps                                                                                     |
| shape      | radii, stroke widths                                                                                                        |
| alpha      | scrim, shadow and tint opacities                                                                                            |

```ts
export interface UiTheme {
  /* groups above, all readonly */
}
export const defaultTheme: UiTheme; // values copied verbatim from today's literals
export function resolveTheme(overrides: DeepPartial<UiTheme>): UiTheme; // deep-merged, frozen
```

- `defaultTheme` reproduces current output exactly. M2 clusters the roughly
  99 literals by value and by role. The same value used in different roles
  becomes separate tokens, so a theme can split them later.
- Per-component theme slots (`theme.components.heroCard`) are added only
  when a real second theme needs one. Default: none.
- The theme object is created once and is identity-stable, so it is safe in
  cache keys and signatures.

## Parameterization model

Three channels, one rule each.

| Channel    | Use for                                                                                              | Not for                |
| ---------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| Theme      | Anything visual and global: color, font, radius, spacing                                             | Per-instance structure |
| Options    | Per-instance structural choices: density, which sections show, alignment, max rows, animation on/off | Data, colors           |
| View model | Data and text                                                                                        | Style, structure       |

A thing becomes an option only when a call site needs it. Otherwise it is a
theme token or a constant. This keeps "configurable" from turning into
speculative generality.

Compact UI becomes one `LayoutMode` value plus per-component rules for what
collapses (corner panels to buttons, only the active card, shrunken chips),
documented next to each component.
