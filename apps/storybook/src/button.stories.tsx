import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Run checks", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["xs", "sm", "default", "lg"] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Run checks" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Secondary: Story = { args: { variant: "secondary" } };
export const PrimaryHover: Story = { args: { className: "bg-primary-hover" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Delete run" } };
export const DestructiveHover: Story = {
  args: {
    variant: "destructive",
    children: "Delete run",
    className: "bg-destructive/15 dark:bg-destructive/20",
  },
};
export const Link: Story = { args: { variant: "link", children: "View logs" } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = {
  args: { disabled: true, "aria-busy": true, children: "Running checks…" },
};
