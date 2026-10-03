import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Build « page unique » : tout (JS, CSS, polices, WASM) est inliné dans un seul fichier HTML.
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.artifact.ts',
      output: { entryFileNames: 'app.js', assetFileNames: 'app[extname]', inlineDynamicImports: true },
    },
  },
});
