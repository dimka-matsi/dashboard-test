/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Единый .env в корне репозитория: его читают и docker-compose, и сервер, и Vite.
const rootDir = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = env.VITE_DEV_API_TARGET ?? `http://localhost:${env.SERVER_PORT ?? '3001'}`;
  // Общий прокси и для `vite dev`, и для `vite preview` — иначе продакшен-сборку
  // не проверить локально без Docker.
  const apiProxy = {
    '/api': { target: apiTarget, changeOrigin: true },
    '/ws': { target: apiTarget, ws: true, changeOrigin: true },
  };

  return {
    envDir: rootDir,
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: Number(env.WEB_DEV_PORT ?? 5173),
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    build: {
      sourcemap: false,
      reportCompressedSize: true,
    },
    test: {
      name: 'web',
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
    },
  };
});
