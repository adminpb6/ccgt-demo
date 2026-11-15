import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  use: { baseURL: 'http://localhost:4173/ccgt-demo/', acceptDownloads: true },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/ccgt-demo/', reuseExistingServer: true, timeout: 180_000 },
});
