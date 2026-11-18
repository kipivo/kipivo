import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Badge",
  component: BadgeExample,
  tags: ["autodocs"],
  parameters: docsFor("badge"),
  args: { label: "Passed", variant: "secondary" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
  },
} satisfies Meta<typeof BadgeExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Passed: Story = {};
export const Running: Story = { args: { label: "Running", variant: "default" } };
export const Failed: Story = { args: { label: "Failed", variant: "destructive" } };
