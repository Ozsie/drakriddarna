# @hoard-engine/primitives

Theme tokens and canvas drawing primitives for the HOARD engine: the
theme-token contract (`UiTheme`) with its default values and a deep-merge
resolver, plus text (measuring, ellipsized truncation, wrapping, font
composition), geometry (`Rect`, `Point`, hit testing) and rounded-rect
clipping. A dependency-free leaf of the HOARD engine — pure computation
and rendering contracts, no game or framework knowledge.

## Install

```bash
npm install @hoard-engine/primitives
```

## Usage

```ts
import {
  UiTheme,
  defaultTheme,
  resolveTheme,
  composeFont,
  measureTextWidth,
  truncateText,
  wrapText,
  drawRoundedRect,
  roundRectPath,
  isPointInRect,
  Rect,
  Point,
} from '@hoard-engine/primitives';

// The theme is data: merge overrides over the defaults (frozen result).
const theme = resolveTheme({ palette: { text: { body: '#e2e8f0' } } });

// Fonts compose from theme tokens; text measures through a context or
// falls back to a per-character approximation, so layout stays
// deterministic without a canvas.
const font = composeFont(theme, theme.typography.sizes.sm);
const width = measureTextWidth(null, 'Hello', font, 6.5);
const lines = wrapText(null, 'Hello world', 60, font, 6.5);
const fitted = truncateText(null, 'Hello world', 30, font, 6.5);

// Hit testing shares one geometry with layout.
const rect: Rect = { x: 0, y: 0, width: 60, height: 20 };
if (isPointInRect(10, 10, rect)) {
  /* ... */
}

// Rounded rects trace the current path (the caller fills or strokes);
// roundRectPath prefers the native ctx.roundRect when available.
drawRoundedRect(ctx, 0, 0, 60, 20, 8);
```

The package never asks for your world state or your framework — every
canvas arrives as a caller-owned `CanvasRenderingContext2D`, every color
and font through the tokens. The same primitives serve UI chrome
(`@hoard-engine/uikit`) and world rendering (the future `scene`
package): both draw, so both consume this package.
