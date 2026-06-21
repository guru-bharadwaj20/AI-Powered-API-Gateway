import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Treat all .js files in src/ as potential JSX (matching CRA behavior)
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    // Proxy API calls to the gateway so relative URLs work in dev
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/metrics': { target: 'http://localhost:4000', changeOrigin: true },
      '/logs': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'build'
  }
});
