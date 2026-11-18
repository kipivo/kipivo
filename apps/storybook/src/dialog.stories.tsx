import type { Meta, StoryObj } from "@storybook/react-vite";
import { DialogExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Dialog",
  component: DialogExample,
  tags: ["autodocs"],
  parameters: docsFor("dialog"),
  args: {
    title: "Delete this run?",
    description: "This removes the run and its saved logs. You cannot undo this action.",
  },
} satisfies Meta<typeof DialogExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
