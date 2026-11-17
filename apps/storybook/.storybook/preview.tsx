import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import "../src/styles.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "dark",
      parentSelector: "html",
    }),
  ],
  parameters: {
    layout: "centered",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    options: { storySort: { order: ["Foundations", "Components"] } },
  },
};

export default preview;
