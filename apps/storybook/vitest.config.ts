import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The addon gives every project for this configDir the same name in panel mode.
// Keep one project there; the CLI still tests both pinned themes.
const themes = process.env.VITEST_STORYBOOK === "true" ? [undefined] : ["light", "dark"];

export default defineConfig({
  test: {
    projects: themes.map((theme) => ({
      plugins: [
        storybookTest({
          configDir: fileURLToPath(new URL(".storybook", import.meta.url)),
          initialGlobals: theme ? { theme } : {},
        }),
      ],
      test: {
        name: theme ? `ui-${theme}` : "ui-storybook",
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
