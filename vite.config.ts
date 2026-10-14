import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/dist/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      ...(process.env.BENCHMARK || process.env.npm_lifecycle_event === 'benchmark'
        ? []
        : ['src/benchmark/**']),
    ],
  },
});
