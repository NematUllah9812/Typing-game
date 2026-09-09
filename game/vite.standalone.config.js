import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds the entire game (JS + CSS) into ONE self-contained index.html that
// runs by double-clicking it — no server, no install, works offline from file://
export default defineConfig({
  root: '.',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'standalone',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
