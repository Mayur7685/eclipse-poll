import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath, URL } from 'node:url';

// Suppress "Sourcemap for X points to missing source files" warnings.
const logger = createLogger('warn');
const originalWarn = logger.warn.bind(logger);
logger.warn = (msg, options) => {
  if (msg.includes('Sourcemap for') && msg.includes('points to missing source files')) return;
  originalWarn(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [
    react(),
    wasm(),
  ],
  resolve: {
    alias: {
      // isomorphic-ws/browser.js only has `export default ws` but the Midnight
      // indexer does `import { WebSocket } from 'isomorphic-ws'`.
      // Point to a local shim that provides the named export.
      'isomorphic-ws': fileURLToPath(new URL('./src/shims/isomorphic-ws.js', import.meta.url)),
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/attest': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // OAuth routes — proxied so popup is same-origin (localhost:5173)
      // enabling BroadcastChannel to work between popup and main window.
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/submissions': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['object-inspect'],
    exclude: ['@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/ledger-v8', 'eclipse-poll-contract'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (
          warning.message?.includes('Module "fs"') ||
          warning.message?.includes('Module "path"') ||
          warning.message?.includes('Module "assert"') ||
          warning.message?.includes('"WebSocket" is not exported') ||
          warning.message?.includes('dynamic import will not move')
        ) return;
        warn(warning);
      },
    },
  },
});
