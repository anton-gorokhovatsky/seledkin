import { defineConfig } from "@playwright/test";
import base from "./playwright.config.mjs";

export default defineConfig({
  ...base,
  testMatch: "editorial-publication.spec.mjs",
  timeout: 30000,
  workers: 1,
  projects: process.env.CI
    ? [{ name: "editorial-chrome", use: { browserName: "chromium", channel: "chrome" } }]
    : base.projects,
});
