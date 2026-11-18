import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

function getAbsolutePath(name: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  storySorts: [{ order: ["Foundations", "Components"] }],
  addons: [getAbsolutePath("@storybook/addon-docs"), getAbsolutePath("@storybook/addon-themes")],
  framework: getAbsolutePath("@storybook/react-vite"),
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      // The component previews are client-rendered and do not use React Server Components.
      build: { rolldownOptions: { checks: { moduleLevelDirective: false } } },
    });
  },
};

export default config;
