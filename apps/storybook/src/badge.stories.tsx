import { Badge } from "@kipivo/ui/components/badge";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Running" },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Queued" } };
export const Outline: Story = { args: { variant: "outline", children: "Completed" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Failed" } };
