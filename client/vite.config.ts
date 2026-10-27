import { defineConfig, loadEnv } from 'vite';
import type { ConfigEnv, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
