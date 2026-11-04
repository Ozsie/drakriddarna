// The public surface of the package — the single entry consumers (and the
// game's `src/uikit`) are meant to import. Everything the package offers is
// re-exported here deliberately; a module that is not exported from this
// file is a missing surface, not a reason to deep-import (the
// completeness test fails first).

export * from './theme';
export * from './defaultTheme';
export * from './resolveTheme';
export * from './geometry';
export * from './roundedRect';
export * from './text';
