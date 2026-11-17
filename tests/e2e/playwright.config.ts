import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "api", testMatch: "api.spec.ts" },
    { name: "auth", testMatch: "auth.spec.ts" },
    { name: "chromium", testMatch: "local-runs.spec.ts", use: { browserName: "chromium" } },
  ],
});
