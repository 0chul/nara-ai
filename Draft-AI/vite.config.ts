import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative base path to support deployment to any subpath (e.g., GitHub Pages)
  build: {
    outDir: 'dist',
  },
  define: {
    'process.env': {} // Polyfill process.env to prevent runtime errors in browser
  }
});