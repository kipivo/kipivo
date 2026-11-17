import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    projects: ["light", "dark"].map((theme) => ({
      plugins: [
        storybookTest({
          configDir: fileURLToPath(new URL(".storybook", import.meta.url)),
          initialGlobals: { theme },
        }),
      ],
      test: {
        name: `ui-${theme}`,
        browser: {
          enabled: true,
          provider: playwright(),
          headless: true,
          instances: [{ browser: "chromium" as const }],
        },
      },
    })),
  },
});
