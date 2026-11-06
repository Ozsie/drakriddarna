import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),

      adapter: adapter(),

      paths: {
        base: process.env.NODE_ENV === 'production' ? '/drakriddarna' : ''
      }
    })
  ],
  test: {
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      // In-repo engine packages (docs/engine-packages.md) run under the
      // root suite while they live under packages/.
      'packages/*/src/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      'node_modules/**',
      ...process.env.BENCHMARK || process.env.npm_lifecycle_event === 'benchmark' ? [] : ['src/benchmark/**']
    ]
  }
});
