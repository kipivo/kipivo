import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

function getAbsolutePath(name: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  storySorts: [{ order: ["Foundations", "Components", "Patterns"] }],
  addons: [
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-themes"),
    getAbsolutePath("@storybook/addon-vitest"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        paraglideVitePlugin({
          project: fileURLToPath(new URL("../../../packages/i18n/project.inlang", import.meta.url)),
          outdir: fileURLToPath(new URL("../../../packages/i18n/generated", import.meta.url)),
        }),
        tailwindcss(),
      ],
      optimizeDeps: {
        include: ["@kipivo/ui > @base-ui/react/select", "@kipivo/ui > @base-ui/react/separator"],
        // Serve individual ESM glyphs directly so adding one doesn't reload running stories.
        exclude: ["@hugeicons/core-free-icons"],
      },
      // The component previews are client-rendered and do not use React Server Components.
      build: { rolldownOptions: { checks: { moduleLevelDirective: false } } },
    });
  },
};

export default config;
