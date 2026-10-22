import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: "./tests/browser",
  globalSetup: "./tests/browser/setup.mjs",
  timeout: 45000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 2),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || `http://127.0.0.1:${port}/`,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: `node scripts/serve-site.mjs --port ${port} --directory ${process.env.PLAYWRIGHT_SITE_DIR || "."}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_SITE_DIR,
  },
});
