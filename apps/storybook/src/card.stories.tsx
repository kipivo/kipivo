import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Card",
  component: CardExample,
  tags: ["autodocs"],
  parameters: docsFor("card"),
  args: {
    title: "Project checks",
    description: "Review the latest local verification.",
    compact: false,
  },
} satisfies Meta<typeof CardExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Compact: Story = { args: { compact: true } };
