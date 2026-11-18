import type { Meta, StoryObj } from "@storybook/react-vite";
import { DropdownMenuExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Dropdown menu",
  component: DropdownMenuExample,
  tags: ["autodocs"],
  parameters: docsFor("dropdown-menu"),
  args: { label: "Run actions", retryDisabled: true },
} satisfies Meta<typeof DropdownMenuExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
