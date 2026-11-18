import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Button",
  component: ButtonExample,
  tags: ["autodocs"],
  parameters: docsFor("button"),
  args: {
    label: "Run checks",
    variant: "default",
    size: "default",
    disabled: false,
    loading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["xs", "sm", "default", "lg"] },
  },
} satisfies Meta<typeof ButtonExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { label: "View logs", variant: "secondary" } };
export const Outline: Story = { args: { label: "View logs", variant: "outline" } };
export const Ghost: Story = { args: { label: "View logs", variant: "ghost" } };
export const Destructive: Story = { args: { label: "Delete run", variant: "destructive" } };
export const Link: Story = { args: { label: "View logs", variant: "link" } };
export const Disabled: Story = { args: { label: "Waiting for runner", disabled: true } };
export const Loading: Story = { args: { loading: true } };
