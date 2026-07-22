// defineConfig'i vitest/config'ten alıyoruz; aksi hâlde `test` anahtarı
// Vite'ın kendi tipinde bulunmadığı için typecheck kırılır.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * DESIGN.MD "Production topolojisi": tarayıcı yalnızca Gateway ile konuşur.
 * Development'ta Vite çalışır, /api ve /events isteklerini Gateway'e proxy eder;
 * böylece dev ile production arasında origin farkı oluşmaz ve CORS'a hiç
 * girmeyiz. Gateway ayakta değilken VITE_API_MODE=mock ile MSW devreye girer.
 */
const gateway = process.env.VITE_GATEWAY_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: gateway, changeOrigin: true },
      // SSE: proxy buffering kapalı olmalı, aksi hâlde event'ler birikir.
      '/events': { target: gateway, changeOrigin: true, ws: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
