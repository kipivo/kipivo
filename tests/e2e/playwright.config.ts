import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  // Docker fixture startup/teardown can interrupt Chromium module loads on Linux.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "api", testMatch: "api.spec.ts" },
    {
      name: "auth",
      testMatch: ["auth.spec.ts", "setup.spec.ts"],
      use: { browserName: "chromium" },
    },
    { name: "resources", testMatch: "resources.spec.ts" },
    {
      name: "chromium",
      testMatch: [
        "local-runs.spec.ts",
        "workbench.spec.ts",
        "workspace-nav.spec.ts",
        "not-found.spec.ts",
      ],
      use: { browserName: "chromium" },
    },
  ],
});
