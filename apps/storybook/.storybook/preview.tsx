import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="min-w-0 bg-background p-5 text-foreground sm:p-8">
          <Story />
        </div>
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
    controls: { expanded: true },
  },
};

export default preview;
