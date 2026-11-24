import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const frontendUrl = 'http://127.0.0.1:5173';
const apiPort = '3001';
const apiUrl = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: [
    {
      name: 'CampusHub API',
      command: 'npm exec --offline -- ts-node src/test/startE2eApi.ts',
      cwd: resolve(import.meta.dirname, '..'),
      url: `${apiUrl}/api/v1/health`,
      env: { PORT: apiPort, NODE_ENV: 'test' },
      timeout: 120_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      name: 'CampusHub client',
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: frontendUrl,
      env: { API_PROXY_TARGET: apiUrl, VITE_API_BASE_URL: '/api/v1' },
      reuseExistingServer: false,
    },
  ],
});
