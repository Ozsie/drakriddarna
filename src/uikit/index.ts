// The public surface of the UI kit — the single entry the game side (and,
// eventually, a published package) is meant to consume. Everything the
// kit offers is re-exported here deliberately; if you need something
// that is not exported from this file, that is a missing surface, not a
// reason to deep-import (the boundary rules keep deep imports honest).
//
// The surface is organized top-down: the theme (design tokens), the
// environment contracts, the drawing primitives, the kit widgets and the
// components. The testing helpers are deliberately NOT part of this
// surface: they exist for this repo's parity and sentinel suites and stay
// under src/uikit/testing/ (a packaging step can expose them as a
// subpath export if a consumer wants the harness).

export * from './theme';
export * from './env';
export * from './primitives/geometry';
export * from './primitives/roundedRect';
export * from './primitives/text';
export * from './kit/modalFrame';
export * from './kit/button';
export * from './kit/listRow';
export * from './kit/textInput';
export * from './kit/spriteFrame';
export * from './components/topBar';
export * from './components/heroCards';
export * from './components/monsterCards';
export * from './components/dungeonIntro';
export * from './components/menu';
export * from './components/welcome';
export * from './components/saveLoadDialog';
export * from './components/newGameDialog';
export * from './components/heroSelection';
export * from './components/settings';
export * from './components/eventCard';
export * from './components/diary';
export * from './components/betweenDungeons';
export * from './components/radialMenu';
