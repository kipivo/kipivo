import type { Meta, StoryObj } from "@storybook/react-vite";
import { Palette as ColorPalette } from "./palette";

function ThemePage() {
  return (
    <main className="mx-auto max-w-3xl py-4">
      <h1 className="text-3xl font-semibold tracking-tight">Theme & colors</h1>
      <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
        Warm white and charcoal surfaces, coral actions, and amber accents. Use the theme toolbar to
        compare the same tokens used by the application.
      </p>
      <ColorPalette />
    </main>
  );
}

const meta = {
  title: "Foundations/Theme",
  component: ThemePage,
  parameters: { layout: "fullscreen", controls: { disable: true } },
} satisfies Meta<typeof ThemePage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {};
