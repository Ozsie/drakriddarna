import { loadTranslations } from '$lib/translations';

export const prerender = true;

export const load = async () => {
  const initialLocale = 'sv'; // get from cookie / url / fetch from server...

  await loadTranslations(initialLocale); // keep this just before the `return`

  return {};
};
