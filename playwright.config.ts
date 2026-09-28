import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8091",
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "node tests/ui/serve.mjs",
    url: "http://127.0.0.1:8091",
    reuseExistingServer: false,
  },
});
