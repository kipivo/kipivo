import { ThemeSelector, type ThemePreference } from "@kipivo/ui/components/theme-selector";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";

const meta = {
  title: "Components/Theme Selector",
  component: ThemeSelector,
  tags: ["autodocs"],
  args: { theme: "dark", onThemeChange: fn() },
} satisfies Meta<typeof ThemeSelector>;
export default meta;
type Story = StoryObj<typeof meta>;

function ThemeExample() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  return <ThemeSelector theme={theme} onThemeChange={setTheme} />;
}

export const Default: Story = {
  render: () => <ThemeExample />,
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const group = within(canvas.getByRole("group", { name: "Theme" }));
    const option = (name: string) => group.getByRole("radio", { name });
    await userEvent.tab();
    await expect(option("Dark")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(option("System")).toHaveFocus();
    await expect(option("System")).toBeChecked();
    await userEvent.click(option("Light"));
    await expect(option("Light")).toBeChecked();
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const Localized: Story = {
  args: { labels: { label: "主题", light: "浅色", dark: "深色", system: "跟随系统" } },
  play: async ({ canvas }) => {
    const group = within(canvas.getByRole("group", { name: "主题" }));
    await expect(group.getByRole("radio", { name: "深色" })).toBeChecked();
  },
};
