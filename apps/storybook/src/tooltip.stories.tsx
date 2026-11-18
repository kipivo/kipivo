import type { Meta, StoryObj } from "@storybook/react-vite";
import { TooltipExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Tooltip",
  component: TooltipExample,
  tags: ["autodocs"],
  parameters: docsFor("tooltip"),
  args: { label: "Run checks", description: "Run the project's configured checks." },
} satisfies Meta<typeof TooltipExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
