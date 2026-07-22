import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Gerçek backend ayaktayken tek dış port olan Edge Gateway'e proxy'leriz.
    // VITE_API_MODE=live olduğunda mock katmanı devre dışı kalır ve istekler buraya düşer.
    proxy: {
      '/api': {
        target: process.env.VITE_GATEWAY_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
