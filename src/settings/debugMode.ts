// The debug-mode gate. Debug mode — the settings toggle, the top bar's
// Debug button and the debug menu behind it — is a development tool:
// production builds compile this to `false`, hiding every debug surface
// so shipped players cannot use it to cheat. `dev` from
// `$app/environment` is statically replaced at build time: true in the
// dev server and vitest, false in production builds (`npm run build`).
import { dev } from '$app/env';

export const isDebugModeAvailable = (): boolean => dev;
