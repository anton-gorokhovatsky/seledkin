import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  expect: { timeout: 8000 },
  // Avoid connection resets from the small local HTTP server's request queue.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:4173/",
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
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
