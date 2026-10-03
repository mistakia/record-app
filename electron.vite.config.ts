import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

// The renderer's index.html carries the shipped CSP (spec §8.10.4). The dev
// server alone needs inline scripts and styles for the React Refresh preamble
// and injected CSS, so this plugin relaxes the meta tag under `dev` only;
// `build` never runs it.
const relax_csp_for_dev_server = (): Plugin => ({
  name: 'record-app:relax-csp-for-dev-server',
  apply: 'serve',
  transformIndexHtml: (html) => html
    .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
    .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
})

export default defineConfig({
  main: {
    // A release build refuses Chromium's remote debugging switches; only a
    // build made for the packaged smoke (RECORD_TEST_BUILD=1) accepts them.
    define: { __RECORD_TEST_BUILD__: JSON.stringify(process.env.RECORD_TEST_BUILD === '1') },
    build: { sourcemap: false }
  },
  preload: {
    build: {
      sourcemap: false,
      // A sandboxed preload must be CommonJS (spec §8.10.2 sets sandbox: true).
      rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } }
    }
  },
  renderer: {
    plugins: [react(), relax_csp_for_dev_server()],
    build: { sourcemap: false }
  }
})
