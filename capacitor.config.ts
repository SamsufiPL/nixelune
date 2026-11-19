import type { CapacitorConfig } from '@capacitor/cli';

const INK = '#0E1522';

const config: CapacitorConfig = {
  // Placeholder application id; the final one is an open decision (docs/decisions.md, D-08).
  appId: 'com.nixelune.game',
  appName: 'NIXELUNE',
  webDir: 'dist',
  // Ink colour behind the WebView so nothing white shows before the first paint.
  backgroundColor: INK,
  android: {
    allowMixedContent: false,
    // WebView debugging is deliberately not set here: Capacitor then enables it only
    // when the APK is debuggable, i.e. never in a release build.
  },
  plugins: {
    SystemBars: {
      // Edge-to-edge; the web layer pads itself with the safe-area insets
      // (`--safe-area-inset-*` injected by Capacitor, `env(safe-area-inset-*)` as fallback).
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // Light icons on the ink background.
      style: 'DARK',
    },
  },
};

export default config;
