import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes", "@storybook/addon-vitest"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      // This preview is entirely client-rendered and has no React Server Components.
      build: { rolldownOptions: { checks: { moduleLevelDirective: false } } },
    });
  },
};

export default config;
