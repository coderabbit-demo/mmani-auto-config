import { defineConfig, devices } from '@playwright/test';
const external = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: './e2e', fullyParallel: true, forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  workers: 3, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: external ?? 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: external ? undefined : { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
