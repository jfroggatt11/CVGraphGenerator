import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    proxy: {
      // Proxy all /mcp requests to the FastAPI backend
      '/mcp': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mcp/, '/mcp'),
      },
    },
  },
  build: { outDir: 'build' }
});