import { defineConfig } from 'vite';

// The in-app preview runs behind a proxy host like {port}-{id}.e2b.app.
// allowedHosts: true lets the dev server accept that host header.
export default defineConfig({
  root: '.',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443 }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true
  }
});
