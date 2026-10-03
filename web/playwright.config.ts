import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Dans l'environnement distant, Chromium est préinstallé ; ailleurs, Playwright utilise le sien.
const chromium = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: existsSync(chromium) ? { executablePath: chromium } : {},
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'bureau', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 800 }, hasTouch: true } },
  ],
});
