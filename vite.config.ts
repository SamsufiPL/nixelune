import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same bundle loads from the Capacitor WebView and from a web host.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
