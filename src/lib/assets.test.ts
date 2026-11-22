import { asset } from '$app/paths';
import { describe, expect, it } from 'vitest';
import { assetUrl } from './assets';

describe('assetUrl', () => {
  it('resolves a static asset path through the SvelteKit asset function', () => {
    expect(assetUrl('favicon.png')).toBe(asset('favicon.png'));
  });

  it('accepts dynamic strings that are not in the generated AssetPath union', () => {
    const dynamic = `isometric/${'index'}.json`;
    expect(assetUrl(dynamic)).toBe(asset('isometric/index.json'));
  });
});
