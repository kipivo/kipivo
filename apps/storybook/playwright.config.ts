import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4384",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "light", use: { browserName: "chromium" } },
    { name: "dark", use: { browserName: "chromium" } },
  ],
  webServer: {
    command: "bun run --cwd ../.. build:storybook && bun run preview --port 4384",
    url: "http://127.0.0.1:4384",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
