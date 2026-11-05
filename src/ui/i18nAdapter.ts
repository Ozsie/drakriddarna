// The translator port: sveltekit-i18n (via the core re-export) behind the
// kit's `Translator` shape. Renderers receive this through `UiEnv.t` and
// never import i18n themselves (M3).

import { i18n } from '../core';
import type { Translator } from '@hoard-engine/uikit';

const toI18nParams = (
  params?: Record<string, string | number>,
): Record<string, string> | undefined =>
  params
    ? Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      )
    : undefined;

/**
 * The translator used when a renderer is called without an env (tests).
 * Reads the current locale exactly like the pre-kit `i18n()` calls did.
 */
export const i18nTranslator: Translator = (key, params) =>
  i18n(key, toI18nParams(params));
